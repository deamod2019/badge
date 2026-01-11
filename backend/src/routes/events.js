import { Router } from 'express';
import db from '../models/database.js';
import { v4 as uuidv4 } from 'uuid';
import rulesEngine from '../rules/rules-engine.js';

const router = Router();

// 获取所有事件
router.get('/', (req, res) => {
    try {
        const { user_id, processed, limit = 50 } = req.query;

        let sql = 'SELECT * FROM events WHERE 1=1';
        const params = [];

        if (user_id) {
            sql += ' AND user_id = ?';
            params.push(user_id);
        }
        if (processed !== undefined) {
            sql += ' AND processed = ?';
            params.push(processed === 'true' ? 1 : 0);
        }

        sql += ' ORDER BY created_at DESC LIMIT ?';
        params.push(Number(limit));

        const events = db.prepare(sql).all(...params);

        res.json({ success: true, data: events });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 提交新事件
router.post('/', (req, res) => {
    try {
        const { name, source, user_id, trigger_type = 'api', attributes } = req.body;

        if (!name || !user_id) {
            return res.status(400).json({ success: false, error: '事件名称和用户ID为必填项' });
        }

        // 验证用户存在
        const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
        if (!user) {
            return res.status(404).json({ success: false, error: '用户不存在' });
        }

        const id = `EVT-${uuidv4().slice(0, 8).toUpperCase()}`;
        const attributesJson = attributes ? JSON.stringify(attributes) : null;

        db.prepare(`
      INSERT INTO events (id, name, source, user_id, trigger_type, attributes_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, source, user_id, trigger_type, attributesJson);

        const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);

        // 立即处理事件
        const processingResults = rulesEngine.processEvent({
            ...event,
            attributes_json: attributes,
        });

        res.status(201).json({
            success: true,
            data: {
                event,
                processing_results: processingResults,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 批量提交事件
router.post('/batch', (req, res) => {
    try {
        const { events } = req.body;

        if (!events || !Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ success: false, error: '请提供事件数组' });
        }

        const results = [];

        for (const eventData of events) {
            const { name, source, user_id, trigger_type = 'batch', attributes } = eventData;

            if (!name || !user_id) continue;

            const id = `EVT-${uuidv4().slice(0, 8).toUpperCase()}`;
            const attributesJson = attributes ? JSON.stringify(attributes) : null;

            db.prepare(`
        INSERT INTO events (id, name, source, user_id, trigger_type, attributes_json)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, name, source, user_id, trigger_type, attributesJson);

            const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
            const processingResults = rulesEngine.processEvent({
                ...event,
                attributes_json: attributes,
            });

            results.push({
                event_id: id,
                processing_results: processingResults,
            });
        }

        res.status(201).json({
            success: true,
            data: results,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 重新处理未处理的事件
router.post('/reprocess', (req, res) => {
    try {
        const unprocessedEvents = db.prepare(`
      SELECT * FROM events WHERE processed = 0 ORDER BY created_at ASC
    `).all();

        const results = [];

        for (const event of unprocessedEvents) {
            const processingResults = rulesEngine.processEvent({
                ...event,
                attributes_json: event.attributes_json ? JSON.parse(event.attributes_json) : {},
            });

            results.push({
                event_id: event.id,
                processing_results: processingResults,
            });
        }

        res.json({
            success: true,
            data: {
                processed_count: results.length,
                results,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
