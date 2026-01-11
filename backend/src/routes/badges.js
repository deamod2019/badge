import { Router } from 'express';
import db from '../models/database.js';
import { v4 as uuidv4 } from 'uuid';
import rulesEngine from '../rules/rules-engine.js';
import quotaService from '../services/quota-service.js';

const router = Router();

// 获取所有徽章定义
router.get('/', (req, res) => {
    try {
        const { category, level, is_active, include_deleted } = req.query;

        let sql = 'SELECT * FROM badge_definitions WHERE 1=1';
        const params = [];

        // 默认不包含已删除的
        if (include_deleted !== 'true') {
            sql += ' AND is_deleted = 0';
        }

        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }
        if (level) {
            sql += ' AND level = ?';
            params.push(level);
        }
        if (is_active !== undefined) {
            sql += ' AND is_active = ?';
            params.push(is_active === 'true' ? 1 : 0);
        }

        sql += ' ORDER BY category, level DESC';
        const badges = db.prepare(sql).all(...params);

        // 添加持有者数量
        const badgesWithCount = badges.map(badge => ({
            ...badge,
            holder_count: db.prepare(`
        SELECT COUNT(DISTINCT user_id) as count 
        FROM user_badges 
        WHERE badge_id = ? AND status = 'active'
      `).get(badge.id)?.count || 0,
        }));

        res.json({ success: true, data: badgesWithCount });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取徽章分类
router.get('/categories', (req, res) => {
    try {
        const categories = db.prepare(`
      SELECT DISTINCT category, COUNT(*) as count
      FROM badge_definitions
      WHERE is_active = 1 AND is_deleted = 0
      GROUP BY category
    `).all();

        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取单个徽章
router.get('/:id', (req, res) => {
    try {
        const badge = db.prepare('SELECT * FROM badge_definitions WHERE id = ?').get(req.params.id);
        if (!badge) {
            return res.status(404).json({ success: false, error: '徽章不存在' });
        }

        const holderCount = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count FROM user_badges WHERE badge_id = ? AND status = 'active'
    `).get(req.params.id);

        res.json({
            success: true,
            data: {
                ...badge,
                holder_count: holderCount.count,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 创建徽章定义
router.post('/', (req, res) => {
    try {
        const {
            name,
            description,
            category,
            level,
            icon_type = 'emoji',
            icon_value = '🏅',
            points = 0,
            expires_days,
            cooldown_days = 0,
            condition,
        } = req.body;

        if (!name || !category || !level) {
            return res.status(400).json({ success: false, error: '名称、分类和等级为必填项' });
        }

        const id = `B${String(Date.now()).slice(-6)}`;
        const conditionJson = condition ? JSON.stringify(condition) : null;

        db.prepare(`
      INSERT INTO badge_definitions 
      (id, name, description, category, level, icon_type, icon_value, points, expires_days, cooldown_days, condition_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, description, category, level, icon_type, icon_value, points, expires_days, cooldown_days, conditionJson);

        const badge = db.prepare('SELECT * FROM badge_definitions WHERE id = ?').get(id);
        res.status(201).json({ success: true, data: badge });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 更新徽章定义
router.put('/:id', (req, res) => {
    try {
        const { name, description, category, level, icon_type, icon_value, points, expires_days, cooldown_days, is_active, condition } = req.body;

        const existing = db.prepare('SELECT * FROM badge_definitions WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, error: '徽章不存在' });
        }

        const updates = ['updated_at = datetime("now")'];
        const params = [];

        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (description !== undefined) { updates.push('description = ?'); params.push(description); }
        if (category !== undefined) { updates.push('category = ?'); params.push(category); }
        if (level !== undefined) { updates.push('level = ?'); params.push(level); }
        if (icon_type !== undefined) { updates.push('icon_type = ?'); params.push(icon_type); }
        if (icon_value !== undefined) { updates.push('icon_value = ?'); params.push(icon_value); }
        if (points !== undefined) { updates.push('points = ?'); params.push(points); }
        if (expires_days !== undefined) { updates.push('expires_days = ?'); params.push(expires_days); }
        if (cooldown_days !== undefined) { updates.push('cooldown_days = ?'); params.push(cooldown_days); }
        if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
        if (condition !== undefined) { updates.push('condition_json = ?'); params.push(JSON.stringify(condition)); }

        params.push(req.params.id);
        db.prepare(`UPDATE badge_definitions SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        const badge = db.prepare('SELECT * FROM badge_definitions WHERE id = ?').get(req.params.id);
        res.json({ success: true, data: badge });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 软删除徽章
router.delete('/:id', (req, res) => {
    try {
        const badge = db.prepare('SELECT * FROM badge_definitions WHERE id = ?').get(req.params.id);
        if (!badge) {
            return res.status(404).json({ success: false, error: '徽章不存在' });
        }

        // 软删除
        db.prepare(`
      UPDATE badge_definitions 
      SET is_deleted = 1, is_active = 0, updated_at = datetime('now') 
      WHERE id = ?
    `).run(req.params.id);

        res.json({ success: true, message: '徽章已删除' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 切换徽章状态
router.patch('/:id/toggle', (req, res) => {
    try {
        const badge = db.prepare('SELECT * FROM badge_definitions WHERE id = ?').get(req.params.id);
        if (!badge) {
            return res.status(404).json({ success: false, error: '徽章不存在' });
        }

        const newStatus = badge.is_active ? 0 : 1;
        db.prepare(`UPDATE badge_definitions SET is_active = ?, updated_at = datetime('now') WHERE id = ?`).run(newStatus, req.params.id);

        const updated = db.prepare('SELECT * FROM badge_definitions WHERE id = ?').get(req.params.id);
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 手动授予单个用户徽章
router.post('/:id/grant', (req, res) => {
    try {
        const { user_id, granted_by, reason } = req.body;

        if (!user_id) {
            return res.status(400).json({ success: false, error: '用户ID为必填项' });
        }

        const badge = db.prepare('SELECT * FROM badge_definitions WHERE id = ? AND is_deleted = 0').get(req.params.id);
        if (!badge) {
            return res.status(404).json({ success: false, error: '徽章不存在' });
        }

        const result = grantBadgeToUser(user_id, req.params.id, badge.points, granted_by, reason);
        if (!result.success) {
            return res.status(400).json(result);
        }

        res.status(201).json({ success: true, data: result.data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 批量发放徽章
router.post('/batch-grant', (req, res) => {
    try {
        const { badge_id, selection, reason, granted_by } = req.body;

        if (!badge_id) {
            return res.status(400).json({ success: false, error: '徽章ID为必填项' });
        }

        const badge = db.prepare('SELECT * FROM badge_definitions WHERE id = ? AND is_deleted = 0 AND is_active = 1').get(badge_id);
        if (!badge) {
            return res.status(404).json({ success: false, error: '徽章不存在或已禁用' });
        }

        // 收集目标用户和发放范围信息
        const targetUserIds = new Set();
        let scopeType = null;
        let scopeId = null;

        // 1. 直接选择的用户
        if (selection?.user_ids?.length) {
            selection.user_ids.forEach(id => targetUserIds.add(id));
        }

        // 2. 按组织选择的用户（含子组织）
        if (selection?.org_ids?.length) {
            const allOrgs = db.prepare('SELECT * FROM organizations').all();

            const getChildOrgIds = (parentId) => {
                const children = allOrgs.filter(o => o.parent_id === parentId);
                let ids = [parentId];
                children.forEach(child => {
                    ids = ids.concat(getChildOrgIds(child.id));
                });
                return ids;
            };

            for (const orgId of selection.org_ids) {
                const orgIds = getChildOrgIds(orgId);
                const placeholders = orgIds.map(() => '?').join(',');
                const users = db.prepare(`SELECT id FROM users WHERE org_id IN (${placeholders})`).all(...orgIds);
                users.forEach(u => targetUserIds.add(u.id));

                // 记录发放范围（用于配额检查）
                if (!scopeType) {
                    scopeType = 'organization';
                    scopeId = orgId;
                }
            }
        }

        // 3. 按标签选择的用户
        if (selection?.tag_ids?.length) {
            for (const tagId of selection.tag_ids) {
                const users = db.prepare(`
          SELECT u.id FROM users u
          JOIN user_tags ut ON u.id = ut.user_id
          WHERE ut.tag_id = ?
        `).all(tagId);
                users.forEach(u => targetUserIds.add(u.id));

                // 记录发放范围
                if (!scopeType) {
                    scopeType = 'tag';
                    scopeId = tagId;
                }
            }
        }

        if (targetUserIds.size === 0) {
            return res.status(400).json({ success: false, error: '未选择任何用户' });
        }

        // 配额检查：检查发放者是否有足够配额
        if (granted_by) {
            const quotaCheck = quotaService.checkQuota(granted_by, badge.category, scopeType, scopeId);
            if (!quotaCheck.allowed) {
                return res.status(400).json({
                    success: false,
                    error: quotaCheck.message,
                    quota_exceeded: true,
                    quota_info: quotaCheck.quota ? {
                        max_grants: quotaCheck.quota.max_grants,
                        period_type: quotaCheck.quota.period_type,
                        badge_category: quotaCheck.quota.badge_category
                    } : null
                });
            }

            // 如果有配额限制，检查剩余配额是否足够
            if (quotaCheck.quota && quotaCheck.remaining < targetUserIds.size) {
                return res.status(400).json({
                    success: false,
                    error: `配额不足：本${quotaService.getPeriodLabel(quotaCheck.quota.period_type)}剩余 ${quotaCheck.remaining} 个，需发放 ${targetUserIds.size} 个`,
                    quota_exceeded: true,
                    quota_info: {
                        remaining: quotaCheck.remaining,
                        required: targetUserIds.size
                    }
                });
            }
        }

        // 执行批量发放
        const results = [];
        let grantedCount = 0;
        let skippedCount = 0;

        for (const userId of targetUserIds) {
            const result = grantBadgeToUser(userId, badge_id, badge.points, granted_by, reason);
            results.push({
                user_id: userId,
                status: result.success ? 'granted' : 'skipped',
                message: result.message || '',
            });

            if (result.success) {
                grantedCount++;
            } else {
                skippedCount++;
            }
        }

        // 消费配额（按实际发放数量）
        if (granted_by && grantedCount > 0) {
            const quotaCheck = quotaService.checkQuota(granted_by, badge.category, scopeType, scopeId);
            if (quotaCheck.quota) {
                const periodKey = quotaService.getPeriodKey(quotaCheck.quota.period_type);
                // 批量消费配额
                for (let i = 0; i < grantedCount; i++) {
                    quotaService.consumeQuota(quotaCheck.quota.id, periodKey);
                }
            }
        }

        res.json({
            success: true,
            data: {
                target_count: targetUserIds.size,
                granted_count: grantedCount,
                skipped_count: skippedCount,
                results,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 辅助函数：授予徽章给用户
function grantBadgeToUser(userId, badgeId, points, grantedBy, reason) {
    // 检查用户是否已有该徽章
    const existing = db.prepare(`
    SELECT * FROM user_badges 
    WHERE user_id = ? AND badge_id = ? AND status = 'active'
  `).get(userId, badgeId);

    if (existing) {
        return { success: false, message: '用户已拥有该徽章' };
    }

    const badge = db.prepare('SELECT * FROM badge_definitions WHERE id = ?').get(badgeId);
    if (!badge) {
        return { success: false, message: '徽章不存在' };
    }

    const userBadgeId = uuidv4();
    let expiresAt = null;

    if (badge.expires_days) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + badge.expires_days);
        expiresAt = expDate.toISOString();
    }

    // 插入用户徽章记录
    db.prepare(`
    INSERT INTO user_badges (id, user_id, badge_id, granted_by, grant_reason, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userBadgeId, userId, badgeId, grantedBy, reason, expiresAt);

    // 添加积分
    const actualPoints = points || badge.points || 0;
    if (actualPoints > 0) {
        const transactionId = uuidv4();
        db.prepare(`
      INSERT INTO point_transactions (id, user_id, amount, type, reference_type, reference_id, description)
      VALUES (?, ?, ?, 'earn', 'badge', ?, ?)
    `).run(transactionId, userId, actualPoints, userBadgeId, `获得徽章: ${badge.name}`);

        db.prepare(`
      UPDATE users SET total_points = total_points + ?, updated_at = datetime('now') WHERE id = ?
    `).run(actualPoints, userId);
    }

    return {
        success: true,
        data: {
            user_badge_id: userBadgeId,
            badge_name: badge.name,
            points: actualPoints,
        },
    };
}

// 获取徽章持有者
router.get('/:id/holders', (req, res) => {
    try {
        const holders = db.prepare(`
      SELECT u.id, u.name, u.department, u.avatar_url, ub.granted_at, ub.grant_reason
      FROM user_badges ub
      JOIN users u ON ub.user_id = u.id
      WHERE ub.badge_id = ? AND ub.status = 'active'
      ORDER BY ub.granted_at DESC
      LIMIT 50
    `).all(req.params.id);

        res.json({ success: true, data: holders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取徽章统计
router.get('/stats/overview', (req, res) => {
    try {
        const totalBadges = db.prepare('SELECT COUNT(*) as count FROM badge_definitions WHERE is_active = 1 AND is_deleted = 0').get();
        const totalGranted = db.prepare('SELECT COUNT(*) as count FROM user_badges WHERE status = \'active\'').get();
        const totalUsers = db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM user_badges').get();

        const byCategory = db.prepare(`
      SELECT bd.category, COUNT(ub.id) as count
      FROM badge_definitions bd
      LEFT JOIN user_badges ub ON bd.id = ub.badge_id AND ub.status = 'active'
      WHERE bd.is_active = 1 AND bd.is_deleted = 0
      GROUP BY bd.category
    `).all();

        const byLevel = db.prepare(`
      SELECT bd.level, COUNT(ub.id) as count
      FROM badge_definitions bd
      LEFT JOIN user_badges ub ON bd.id = ub.badge_id AND ub.status = 'active'
      WHERE bd.is_active = 1 AND bd.is_deleted = 0
      GROUP BY bd.level
    `).all();

        const recentGranted = db.prepare(`
      SELECT ub.*, bd.name, bd.category, bd.level, bd.icon_type, bd.icon_value, u.name as user_name
      FROM user_badges ub
      JOIN badge_definitions bd ON ub.badge_id = bd.id
      JOIN users u ON ub.user_id = u.id
      WHERE ub.status = 'active'
      ORDER BY ub.granted_at DESC
      LIMIT 10
    `).all();

        res.json({
            success: true,
            data: {
                total_badges: totalBadges.count,
                total_granted: totalGranted.count,
                total_users_with_badges: totalUsers.count,
                by_category: byCategory,
                by_level: byLevel,
                recent_granted: recentGranted,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
