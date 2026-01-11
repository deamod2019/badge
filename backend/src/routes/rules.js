import { Router } from 'express';
import db from '../models/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 获取所有规则
router.get('/', (req, res) => {
    try {
        const { is_enabled } = req.query;

        let sql = 'SELECT * FROM rules WHERE 1=1';
        const params = [];

        if (is_enabled !== undefined) {
            sql += ' AND is_enabled = ?';
            params.push(is_enabled === 'true' ? 1 : 0);
        }

        sql += ' ORDER BY priority DESC';
        const rules = db.prepare(sql).all(...params);

        // 解析 JSON 字段
        const parsedRules = rules.map(rule => ({
            ...rule,
            condition: JSON.parse(rule.condition_json),
            action: JSON.parse(rule.action_json),
        }));

        res.json({ success: true, data: parsedRules });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取单个规则
router.get('/:id', (req, res) => {
    try {
        const rule = db.prepare('SELECT * FROM rules WHERE id = ?').get(req.params.id);
        if (!rule) {
            return res.status(404).json({ success: false, error: '规则不存在' });
        }

        res.json({
            success: true,
            data: {
                ...rule,
                condition: JSON.parse(rule.condition_json),
                action: JSON.parse(rule.action_json),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 创建规则
router.post('/', (req, res) => {
    try {
        const {
            name,
            description,
            condition,
            action,
            priority = 100,
            cooldown_days = 0,
        } = req.body;

        if (!name || !condition || !action) {
            return res.status(400).json({ success: false, error: '名称、条件和动作为必填项' });
        }

        const id = `RULE-${String(Date.now()).slice(-6)}`;
        const conditionJson = JSON.stringify(condition);
        const actionJson = JSON.stringify(action);

        db.prepare(`
      INSERT INTO rules (id, name, description, condition_json, action_json, priority, cooldown_days)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, description, conditionJson, actionJson, priority, cooldown_days);

        const rule = db.prepare('SELECT * FROM rules WHERE id = ?').get(id);

        res.status(201).json({
            success: true,
            data: {
                ...rule,
                condition: JSON.parse(rule.condition_json),
                action: JSON.parse(rule.action_json),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 更新规则
router.put('/:id', (req, res) => {
    try {
        const { name, description, condition, action, priority, cooldown_days, is_enabled } = req.body;

        const existing = db.prepare('SELECT * FROM rules WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, error: '规则不存在' });
        }

        const updates = [];
        const params = [];

        if (name !== undefined) {
            updates.push('name = ?');
            params.push(name);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description);
        }
        if (condition !== undefined) {
            updates.push('condition_json = ?');
            params.push(JSON.stringify(condition));
        }
        if (action !== undefined) {
            updates.push('action_json = ?');
            params.push(JSON.stringify(action));
        }
        if (priority !== undefined) {
            updates.push('priority = ?');
            params.push(priority);
        }
        if (cooldown_days !== undefined) {
            updates.push('cooldown_days = ?');
            params.push(cooldown_days);
        }
        if (is_enabled !== undefined) {
            updates.push('is_enabled = ?');
            params.push(is_enabled ? 1 : 0);
        }

        if (updates.length > 0) {
            params.push(req.params.id);
            db.prepare(`UPDATE rules SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }

        const rule = db.prepare('SELECT * FROM rules WHERE id = ?').get(req.params.id);

        res.json({
            success: true,
            data: {
                ...rule,
                condition: JSON.parse(rule.condition_json),
                action: JSON.parse(rule.action_json),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 删除规则
router.delete('/:id', (req, res) => {
    try {
        const result = db.prepare('DELETE FROM rules WHERE id = ?').run(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, error: '规则不存在' });
        }

        res.json({ success: true, message: '规则已删除' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
