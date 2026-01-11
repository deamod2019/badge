import { Router } from 'express';
import db from '../models/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ==================== 事件类型 API ====================

// 获取所有事件类型
router.get('/event-types', (req, res) => {
    try {
        const { is_active } = req.query;
        let sql = 'SELECT * FROM event_types WHERE 1=1';
        const params = [];

        if (is_active !== undefined) {
            sql += ' AND is_active = ?';
            params.push(is_active === 'true' ? 1 : 0);
        }

        sql += ' ORDER BY sort_order ASC, created_at DESC';
        const eventTypes = db.prepare(sql).all(...params);

        res.json({ success: true, data: eventTypes });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 创建事件类型
router.post('/event-types', (req, res) => {
    try {
        const { name, description, source } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: '事件名称为必填项' });
        }

        // 检查是否已存在
        const existing = db.prepare('SELECT id FROM event_types WHERE name = ?').get(name);
        if (existing) {
            return res.status(400).json({ success: false, error: '该事件类型已存在' });
        }

        const id = `EVT-${String(Date.now()).slice(-6)}`;
        db.prepare(`
            INSERT INTO event_types (id, name, description, source)
            VALUES (?, ?, ?, ?)
        `).run(id, name, description || null, source || null);

        const eventType = db.prepare('SELECT * FROM event_types WHERE id = ?').get(id);
        res.status(201).json({ success: true, data: eventType });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 更新事件类型
router.put('/event-types/:id', (req, res) => {
    try {
        const { name, description, source, is_active, sort_order } = req.body;

        const existing = db.prepare('SELECT * FROM event_types WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, error: '事件类型不存在' });
        }

        const updates = [];
        const params = [];

        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (description !== undefined) { updates.push('description = ?'); params.push(description); }
        if (source !== undefined) { updates.push('source = ?'); params.push(source); }
        if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
        if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }

        if (updates.length > 0) {
            params.push(req.params.id);
            db.prepare(`UPDATE event_types SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }

        const eventType = db.prepare('SELECT * FROM event_types WHERE id = ?').get(req.params.id);
        res.json({ success: true, data: eventType });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 删除事件类型
router.delete('/event-types/:id', (req, res) => {
    try {
        const result = db.prepare('DELETE FROM event_types WHERE id = ?').run(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, error: '事件类型不存在' });
        }

        res.json({ success: true, message: '事件类型已删除' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 指标字段 API ====================

// 获取所有指标字段
router.get('/metric-fields', (req, res) => {
    try {
        const { is_active } = req.query;
        let sql = 'SELECT * FROM metric_fields WHERE 1=1';
        const params = [];

        if (is_active !== undefined) {
            sql += ' AND is_active = ?';
            params.push(is_active === 'true' ? 1 : 0);
        }

        sql += ' ORDER BY sort_order ASC, created_at DESC';
        const metricFields = db.prepare(sql).all(...params);

        res.json({ success: true, data: metricFields });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 创建指标字段
router.post('/metric-fields', (req, res) => {
    try {
        const { field_key, label, data_type, description } = req.body;

        if (!field_key || !label) {
            return res.status(400).json({ success: false, error: '字段键和标签为必填项' });
        }

        // 检查是否已存在
        const existing = db.prepare('SELECT id FROM metric_fields WHERE field_key = ?').get(field_key);
        if (existing) {
            return res.status(400).json({ success: false, error: '该指标字段已存在' });
        }

        const id = `MET-${String(Date.now()).slice(-6)}`;
        db.prepare(`
            INSERT INTO metric_fields (id, field_key, label, data_type, description)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, field_key, label, data_type || 'number', description || null);

        const metricField = db.prepare('SELECT * FROM metric_fields WHERE id = ?').get(id);
        res.status(201).json({ success: true, data: metricField });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 更新指标字段
router.put('/metric-fields/:id', (req, res) => {
    try {
        const { field_key, label, data_type, description, is_active, sort_order } = req.body;

        const existing = db.prepare('SELECT * FROM metric_fields WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, error: '指标字段不存在' });
        }

        const updates = [];
        const params = [];

        if (field_key !== undefined) { updates.push('field_key = ?'); params.push(field_key); }
        if (label !== undefined) { updates.push('label = ?'); params.push(label); }
        if (data_type !== undefined) { updates.push('data_type = ?'); params.push(data_type); }
        if (description !== undefined) { updates.push('description = ?'); params.push(description); }
        if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
        if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }

        if (updates.length > 0) {
            params.push(req.params.id);
            db.prepare(`UPDATE metric_fields SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }

        const metricField = db.prepare('SELECT * FROM metric_fields WHERE id = ?').get(req.params.id);
        res.json({ success: true, data: metricField });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 删除指标字段
router.delete('/metric-fields/:id', (req, res) => {
    try {
        const result = db.prepare('DELETE FROM metric_fields WHERE id = ?').run(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, error: '指标字段不存在' });
        }

        res.json({ success: true, message: '指标字段已删除' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
