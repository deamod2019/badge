import { Router } from 'express';
import db from '../models/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 获取所有用户
router.get('/', (req, res) => {
    try {
        const { department, role, limit = 50, offset = 0 } = req.query;

        let sql = 'SELECT * FROM users WHERE 1=1';
        const params = [];

        if (department) {
            sql += ' AND department = ?';
            params.push(department);
        }
        if (role) {
            sql += ' AND role = ?';
            params.push(role);
        }

        sql += ' ORDER BY total_points DESC LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));

        const users = db.prepare(sql).all(...params);
        const total = db.prepare('SELECT COUNT(*) as count FROM users').get();

        res.json({
            success: true,
            data: users,
            total: total.count,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取单个用户
router.get('/:id', (req, res) => {
    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: '用户不存在' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 创建用户
router.post('/', (req, res) => {
    try {
        const { employee_id, name, department, position, level, role = 'employee', avatar_url } = req.body;

        if (!employee_id || !name) {
            return res.status(400).json({ success: false, error: '工号和姓名为必填项' });
        }

        const id = uuidv4();
        db.prepare(`
      INSERT INTO users (id, employee_id, name, department, position, level, role, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, employee_id, name, department, position, level, role, avatar_url);

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        res.status(201).json({ success: true, data: user });
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ success: false, error: '工号已存在' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取用户的徽章
router.get('/:id/badges', (req, res) => {
    try {
        const badges = db.prepare(`
      SELECT ub.*, bd.name, bd.description, bd.category, bd.level, bd.icon_type, bd.icon_value, bd.points
      FROM user_badges ub
      JOIN badge_definitions bd ON ub.badge_id = bd.id
      WHERE ub.user_id = ? AND ub.status = 'active'
      ORDER BY ub.granted_at DESC
    `).all(req.params.id);

        res.json({ success: true, data: badges });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取用户的积分记录
router.get('/:id/points', (req, res) => {
    try {
        const transactions = db.prepare(`
      SELECT * FROM point_transactions 
      WHERE user_id = ? 
      ORDER BY created_at DESC
      LIMIT 50
    `).all(req.params.id);

        const user = db.prepare('SELECT total_points FROM users WHERE id = ?').get(req.params.id);

        res.json({
            success: true,
            data: {
                total_points: user?.total_points || 0,
                transactions,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取部门排行榜
router.get('/leaderboard/departments', (req, res) => {
    try {
        const leaderboard = db.prepare(`
      SELECT 
        department,
        COUNT(*) as employee_count,
        SUM(total_points) as total_points,
        AVG(total_points) as avg_points,
        (SELECT COUNT(*) FROM user_badges ub 
         JOIN users u ON ub.user_id = u.id 
         WHERE u.department = users.department) as total_badges
      FROM users
      WHERE department IS NOT NULL
      GROUP BY department
      ORDER BY total_points DESC
    `).all();

        res.json({ success: true, data: leaderboard });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取个人排行榜
router.get('/leaderboard/individuals', (req, res) => {
    try {
        const { limit = 20, department } = req.query;

        let sql = `
      SELECT 
        u.*,
        (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id AND status = 'active') as badge_count
      FROM users u
      WHERE 1=1
    `;
        const params = [];

        if (department) {
            sql += ' AND u.department = ?';
            params.push(department);
        }

        sql += ' ORDER BY u.total_points DESC LIMIT ?';
        params.push(Number(limit));

        const leaderboard = db.prepare(sql).all(...params);

        res.json({ success: true, data: leaderboard });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
