import { Router } from 'express';
import db from '../models/database.js';
import quotaService from '../services/quota-service.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * 获取配额列表
 * GET /api/quotas
 */
router.get('/', (req, res) => {
    try {
        const { owner_user_id, scope_type, page = 1, limit = 20 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        let query = `
            SELECT q.*, 
                   u.name as owner_name,
                   u.department as owner_department,
                   CASE 
                     WHEN q.scope_type = 'organization' THEN o.name
                     WHEN q.scope_type = 'tag' THEN t.name
                     ELSE q.scope_id
                   END as scope_name
            FROM quota_definitions q
            LEFT JOIN users u ON q.owner_user_id = u.id
            LEFT JOIN organizations o ON q.scope_type = 'organization' AND q.scope_id = o.id
            LEFT JOIN tags t ON q.scope_type = 'tag' AND q.scope_id = t.id
            WHERE 1=1
        `;
        const params = [];

        if (owner_user_id) {
            query += ` AND q.owner_user_id = ?`;
            params.push(owner_user_id);
        }

        if (scope_type) {
            query += ` AND q.scope_type = ?`;
            params.push(scope_type);
        }

        // 获取总数
        const countQuery = query.replace(/SELECT q\.\*.*?FROM/, 'SELECT COUNT(*) as count FROM');
        const total = db.prepare(countQuery).get(...params)?.count || 0;

        query += ` ORDER BY q.created_at DESC LIMIT ? OFFSET ?`;
        params.push(Number(limit), offset);

        const quotas = db.prepare(query).all(...params);

        // 为每个配额添加使用情况
        const quotasWithUsage = quotas.map(quota => {
            const periodKey = quotaService.getPeriodKey(quota.period_type);
            const used = quotaService.getQuotaUsage(quota.id, periodKey);
            return {
                ...quota,
                period_key: periodKey,
                used_count: used,
                remaining_count: quota.max_grants - used,
                period_label: quotaService.getPeriodLabel(quota.period_type)
            };
        });

        res.json({
            success: true,
            data: quotasWithUsage,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                total_pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取单个配额详情
 * GET /api/quotas/:id
 */
router.get('/:id', (req, res) => {
    try {
        const quota = db.prepare(`
            SELECT q.*, 
                   u.name as owner_name,
                   u.department as owner_department,
                   CASE 
                     WHEN q.scope_type = 'organization' THEN o.name
                     WHEN q.scope_type = 'tag' THEN t.name
                     ELSE q.scope_id
                   END as scope_name
            FROM quota_definitions q
            LEFT JOIN users u ON q.owner_user_id = u.id
            LEFT JOIN organizations o ON q.scope_type = 'organization' AND q.scope_id = o.id
            LEFT JOIN tags t ON q.scope_type = 'tag' AND q.scope_id = t.id
            WHERE q.id = ?
        `).get(req.params.id);

        if (!quota) {
            return res.status(404).json({ success: false, error: '配额不存在' });
        }

        const periodKey = quotaService.getPeriodKey(quota.period_type);
        const used = quotaService.getQuotaUsage(quota.id, periodKey);

        res.json({
            success: true,
            data: {
                ...quota,
                period_key: periodKey,
                used_count: used,
                remaining_count: quota.max_grants - used,
                period_label: quotaService.getPeriodLabel(quota.period_type)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 创建配额定义
 * POST /api/quotas
 */
router.post('/', (req, res) => {
    try {
        const { owner_user_id, scope_type, scope_id, badge_category, period_type, max_grants } = req.body;

        if (!owner_user_id || !scope_type || !scope_id) {
            return res.status(400).json({
                success: false,
                error: '负责人、范围类型和范围ID为必填项'
            });
        }

        // 验证用户存在
        const user = db.prepare('SELECT id FROM users WHERE id = ?').get(owner_user_id);
        if (!user) {
            return res.status(400).json({ success: false, error: '负责人不存在' });
        }

        // 验证范围存在
        if (scope_type === 'organization') {
            const org = db.prepare('SELECT id FROM organizations WHERE id = ?').get(scope_id);
            if (!org) {
                return res.status(400).json({ success: false, error: '组织不存在' });
            }
        } else if (scope_type === 'tag') {
            const tag = db.prepare('SELECT id FROM tags WHERE id = ?').get(scope_id);
            if (!tag) {
                return res.status(400).json({ success: false, error: '标签不存在' });
            }
        }

        // 检查是否已存在相同配额
        const existing = db.prepare(`
            SELECT id FROM quota_definitions 
            WHERE owner_user_id = ? AND scope_type = ? AND scope_id = ? 
              AND (badge_category = ? OR (badge_category IS NULL AND ? IS NULL))
        `).get(owner_user_id, scope_type, scope_id, badge_category, badge_category);

        if (existing) {
            return res.status(400).json({ success: false, error: '该配额已存在' });
        }

        const id = uuidv4();
        db.prepare(`
            INSERT INTO quota_definitions 
            (id, owner_user_id, scope_type, scope_id, badge_category, period_type, max_grants)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, owner_user_id, scope_type, scope_id, badge_category || null, period_type || 'monthly', max_grants || 5);

        const created = db.prepare('SELECT * FROM quota_definitions WHERE id = ?').get(id);

        res.status(201).json({ success: true, data: created });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 更新配额定义
 * PUT /api/quotas/:id
 */
router.put('/:id', (req, res) => {
    try {
        const { badge_category, period_type, max_grants, is_active } = req.body;

        const quota = db.prepare('SELECT * FROM quota_definitions WHERE id = ?').get(req.params.id);
        if (!quota) {
            return res.status(404).json({ success: false, error: '配额不存在' });
        }

        db.prepare(`
            UPDATE quota_definitions SET
              badge_category = ?,
              period_type = ?,
              max_grants = ?,
              is_active = ?,
              updated_at = datetime('now')
            WHERE id = ?
        `).run(
            badge_category !== undefined ? badge_category : quota.badge_category,
            period_type || quota.period_type,
            max_grants !== undefined ? max_grants : quota.max_grants,
            is_active !== undefined ? (is_active ? 1 : 0) : quota.is_active,
            req.params.id
        );

        const updated = db.prepare('SELECT * FROM quota_definitions WHERE id = ?').get(req.params.id);
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 删除配额定义
 * DELETE /api/quotas/:id
 */
router.delete('/:id', (req, res) => {
    try {
        const quota = db.prepare('SELECT * FROM quota_definitions WHERE id = ?').get(req.params.id);
        if (!quota) {
            return res.status(404).json({ success: false, error: '配额不存在' });
        }

        // 删除使用记录
        db.prepare('DELETE FROM quota_usage WHERE quota_id = ?').run(req.params.id);
        // 删除配额定义
        db.prepare('DELETE FROM quota_definitions WHERE id = ?').run(req.params.id);

        res.json({ success: true, message: '配额已删除' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取当前用户的配额概览
 * GET /api/quotas/my/:userId
 */
router.get('/my/:userId', (req, res) => {
    try {
        const summary = quotaService.getUserQuotaSummary(req.params.userId);
        res.json({ success: true, data: summary });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 获取徽章分类列表（用于配额配置）
 */
router.get('/meta/categories', (req, res) => {
    try {
        const categories = db.prepare(`
            SELECT DISTINCT category FROM badge_definitions 
            WHERE is_deleted = 0 
            ORDER BY category
        `).all();

        res.json({ success: true, data: categories.map(c => c.category) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
