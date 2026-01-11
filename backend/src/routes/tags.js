import { Router } from 'express';
import db from '../models/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 获取所有标签
router.get('/', (req, res) => {
    try {
        const { category } = req.query;

        let sql = 'SELECT * FROM tags WHERE 1=1';
        const params = [];

        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }

        sql += ' ORDER BY category, name';
        const tags = db.prepare(sql).all(...params);

        // 为每个标签添加用户数量
        const tagsWithCount = tags.map(tag => ({
            ...tag,
            user_count: db.prepare('SELECT COUNT(*) as count FROM user_tags WHERE tag_id = ?').get(tag.id)?.count || 0,
        }));

        res.json({ success: true, data: tagsWithCount });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取标签分类
router.get('/categories', (req, res) => {
    try {
        const categories = db.prepare(`
      SELECT DISTINCT category, COUNT(*) as count
      FROM tags
      GROUP BY category
    `).all();

        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取标签下的用户
router.get('/:id/users', (req, res) => {
    try {
        const users = db.prepare(`
      SELECT u.* FROM users u
      JOIN user_tags ut ON u.id = ut.user_id
      WHERE ut.tag_id = ?
    `).all(req.params.id);

        res.json({ success: true, data: users, count: users.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 创建标签
router.post('/', (req, res) => {
    try {
        const { name, category, color = '#667eea' } = req.body;

        if (!name || !category) {
            return res.status(400).json({ success: false, error: '名称和分类为必填项' });
        }

        const id = `TAG${String(Date.now()).slice(-6)}`;
        db.prepare(`
      INSERT INTO tags (id, name, category, color)
      VALUES (?, ?, ?, ?)
    `).run(id, name, category, color);

        const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
        res.status(201).json({ success: true, data: tag });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 删除标签
router.delete('/:id', (req, res) => {
    try {
        // 先删除关联
        db.prepare('DELETE FROM user_tags WHERE tag_id = ?').run(req.params.id);
        // 再删除标签
        const result = db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, error: '标签不存在' });
        }

        res.json({ success: true, message: '标签已删除' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 为用户添加标签
router.post('/users/:userId/tags', (req, res) => {
    try {
        const { tag_ids } = req.body;
        const userId = req.params.userId;

        if (!tag_ids || !Array.isArray(tag_ids)) {
            return res.status(400).json({ success: false, error: '请提供标签ID数组' });
        }

        for (const tagId of tag_ids) {
            try {
                db.prepare(`
          INSERT OR IGNORE INTO user_tags (user_id, tag_id)
          VALUES (?, ?)
        `).run(userId, tagId);
            } catch (e) {
                // 忽略重复插入
            }
        }

        const userTags = db.prepare(`
      SELECT t.* FROM tags t
      JOIN user_tags ut ON t.id = ut.tag_id
      WHERE ut.user_id = ?
    `).all(userId);

        res.json({ success: true, data: userTags });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取用户的标签
router.get('/users/:userId/tags', (req, res) => {
    try {
        const userTags = db.prepare(`
      SELECT t.* FROM tags t
      JOIN user_tags ut ON t.id = ut.tag_id
      WHERE ut.user_id = ?
    `).all(req.params.userId);

        res.json({ success: true, data: userTags });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
