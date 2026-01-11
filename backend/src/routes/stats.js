import { Router } from 'express';
import db from '../models/database.js';

const router = Router();

// 获取整体统计概览
router.get('/overview', (req, res) => {
    try {
        const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
        const usersWithBadges = db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM user_badges').get();
        const totalBadgesGranted = db.prepare('SELECT COUNT(*) as count FROM user_badges WHERE status = \'active\'').get();
        const totalPoints = db.prepare('SELECT SUM(total_points) as total FROM users').get();
        const totalEvents = db.prepare('SELECT COUNT(*) as count FROM events').get();
        const processedEvents = db.prepare('SELECT COUNT(*) as count FROM events WHERE processed = 1').get();

        // 覆盖率
        const coverageRate = totalUsers.count > 0
            ? ((usersWithBadges.count / totalUsers.count) * 100).toFixed(1)
            : 0;

        // 人均徽章数
        const avgBadgesPerUser = usersWithBadges.count > 0
            ? (totalBadgesGranted.count / usersWithBadges.count).toFixed(1)
            : 0;

        res.json({
            success: true,
            data: {
                total_users: totalUsers.count,
                users_with_badges: usersWithBadges.count,
                coverage_rate: parseFloat(coverageRate),
                total_badges_granted: totalBadgesGranted.count,
                avg_badges_per_user: parseFloat(avgBadgesPerUser),
                total_points_distributed: totalPoints.total || 0,
                total_events: totalEvents.count,
                processed_events: processedEvents.count,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取徽章发放趋势（按天）
router.get('/badges/trend', (req, res) => {
    try {
        const { days = 30 } = req.query;

        const trend = db.prepare(`
      SELECT 
        date(granted_at) as date,
        COUNT(*) as count
      FROM user_badges
      WHERE granted_at >= date('now', '-${Number(days)} days')
      GROUP BY date(granted_at)
      ORDER BY date ASC
    `).all();

        res.json({ success: true, data: trend });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取徽章分类分布
router.get('/badges/distribution', (req, res) => {
    try {
        const byCategory = db.prepare(`
      SELECT 
        bd.category,
        COUNT(ub.id) as count,
        SUM(bd.points) as total_points
      FROM badge_definitions bd
      LEFT JOIN user_badges ub ON bd.id = ub.badge_id AND ub.status = 'active'
      WHERE bd.is_active = 1
      GROUP BY bd.category
      ORDER BY count DESC
    `).all();

        const byLevel = db.prepare(`
      SELECT 
        bd.level,
        COUNT(ub.id) as count
      FROM badge_definitions bd
      LEFT JOIN user_badges ub ON bd.id = ub.badge_id AND ub.status = 'active'
      WHERE bd.is_active = 1
      GROUP BY bd.level
      ORDER BY 
        CASE bd.level 
          WHEN '钻' THEN 1 
          WHEN '金' THEN 2 
          WHEN '银' THEN 3 
          WHEN '铜' THEN 4 
        END
    `).all();

        res.json({
            success: true,
            data: {
                by_category: byCategory,
                by_level: byLevel,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取部门统计
router.get('/departments', (req, res) => {
    try {
        const departments = db.prepare(`
      SELECT 
        u.department,
        COUNT(DISTINCT u.id) as employee_count,
        COUNT(DISTINCT ub.user_id) as employees_with_badges,
        COUNT(ub.id) as total_badges,
        SUM(u.total_points) as total_points,
        ROUND(AVG(u.total_points), 1) as avg_points
      FROM users u
      LEFT JOIN user_badges ub ON u.id = ub.user_id AND ub.status = 'active'
      WHERE u.department IS NOT NULL
      GROUP BY u.department
      ORDER BY total_badges DESC
    `).all();

        res.json({ success: true, data: departments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取热门徽章
router.get('/badges/popular', (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const popular = db.prepare(`
      SELECT 
        bd.*,
        COUNT(ub.id) as holder_count
      FROM badge_definitions bd
      LEFT JOIN user_badges ub ON bd.id = ub.badge_id AND ub.status = 'active'
      WHERE bd.is_active = 1
      GROUP BY bd.id
      ORDER BY holder_count DESC
      LIMIT ?
    `).all(Number(limit));

        res.json({ success: true, data: popular });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取最近活动
router.get('/activity', (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const activity = db.prepare(`
      SELECT 
        ub.id,
        ub.granted_at,
        u.id as user_id,
        u.name as user_name,
        u.department,
        u.avatar_url,
        bd.id as badge_id,
        bd.name as badge_name,
        bd.category,
        bd.level,
        bd.icon_type,
        bd.icon_value,
        bd.points
      FROM user_badges ub
      JOIN users u ON ub.user_id = u.id
      JOIN badge_definitions bd ON ub.badge_id = bd.id
      WHERE ub.status = 'active'
      ORDER BY ub.granted_at DESC
      LIMIT ?
    `).all(Number(limit));

        res.json({ success: true, data: activity });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== Drill-Down APIs ====================

// 分页辅助函数
function paginate(page, limit) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (p - 1) * l;
    return { page: p, limit: l, offset };
}

// 获取用户列表（带分页和搜索）
router.get('/users', (req, res) => {
    try {
        const { search = '', page = 1, limit = 20 } = req.query;
        const { page: p, limit: l, offset } = paginate(page, limit);

        let whereClause = '1=1';
        const params = [];

        if (search.trim()) {
            whereClause = '(u.name LIKE ? OR u.employee_id LIKE ? OR u.department LIKE ?)';
            const searchPattern = `%${search.trim()}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        // 获取总数
        const totalResult = db.prepare(`
            SELECT COUNT(*) as count FROM users u WHERE ${whereClause}
        `).get(...params);
        const total = totalResult.count;

        // 获取分页数据
        const users = db.prepare(`
            SELECT 
                u.id, u.name, u.employee_id, u.department, u.position, u.avatar_url, u.total_points,
                (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = u.id AND ub.status = 'active') as badge_count
            FROM users u
            WHERE ${whereClause}
            ORDER BY u.total_points DESC, u.name ASC
            LIMIT ? OFFSET ?
        `).all(...params, l, offset);

        res.json({
            success: true,
            data: users,
            pagination: {
                page: p,
                limit: l,
                total,
                total_pages: Math.ceil(total / l)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取已发放徽章列表（带分页和搜索）
router.get('/granted-badges', (req, res) => {
    try {
        const { search = '', page = 1, limit = 20 } = req.query;
        const { page: p, limit: l, offset } = paginate(page, limit);

        let whereClause = "ub.status = 'active'";
        const params = [];

        if (search.trim()) {
            whereClause += ' AND (u.name LIKE ? OR bd.name LIKE ?)';
            const searchPattern = `%${search.trim()}%`;
            params.push(searchPattern, searchPattern);
        }

        // 获取总数
        const totalResult = db.prepare(`
            SELECT COUNT(*) as count 
            FROM user_badges ub
            JOIN users u ON ub.user_id = u.id
            JOIN badge_definitions bd ON ub.badge_id = bd.id
            WHERE ${whereClause}
        `).get(...params);
        const total = totalResult.count;

        // 获取分页数据
        const grants = db.prepare(`
            SELECT 
                ub.id, ub.granted_at, ub.grant_reason, ub.granted_by,
                u.id as user_id, u.name as user_name, u.department, u.avatar_url,
                bd.id as badge_id, bd.name as badge_name, bd.category, bd.level, 
                bd.icon_type, bd.icon_value, bd.points
            FROM user_badges ub
            JOIN users u ON ub.user_id = u.id
            JOIN badge_definitions bd ON ub.badge_id = bd.id
            WHERE ${whereClause}
            ORDER BY ub.granted_at DESC
            LIMIT ? OFFSET ?
        `).all(...params, l, offset);

        res.json({
            success: true,
            data: grants,
            pagination: {
                page: p,
                limit: l,
                total,
                total_pages: Math.ceil(total / l)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取持有徽章的用户列表（带分页和搜索）
router.get('/users-with-badges', (req, res) => {
    try {
        const { search = '', page = 1, limit = 20 } = req.query;
        const { page: p, limit: l, offset } = paginate(page, limit);

        let whereClause = '1=1';
        const params = [];

        if (search.trim()) {
            whereClause = '(u.name LIKE ? OR u.department LIKE ?)';
            const searchPattern = `%${search.trim()}%`;
            params.push(searchPattern, searchPattern);
        }

        // 获取总数（只计算有徽章的用户）
        const totalResult = db.prepare(`
            SELECT COUNT(DISTINCT u.id) as count 
            FROM users u
            JOIN user_badges ub ON u.id = ub.user_id AND ub.status = 'active'
            WHERE ${whereClause}
        `).get(...params);
        const total = totalResult.count;

        // 获取分页数据
        const users = db.prepare(`
            SELECT 
                u.id, u.name, u.employee_id, u.department, u.position, u.avatar_url, u.total_points,
                COUNT(ub.id) as badge_count,
                MAX(ub.granted_at) as latest_badge_at
            FROM users u
            JOIN user_badges ub ON u.id = ub.user_id AND ub.status = 'active'
            WHERE ${whereClause}
            GROUP BY u.id
            ORDER BY badge_count DESC, u.total_points DESC
            LIMIT ? OFFSET ?
        `).all(...params, l, offset);

        res.json({
            success: true,
            data: users,
            pagination: {
                page: p,
                limit: l,
                total,
                total_pages: Math.ceil(total / l)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取积分排行榜（带分页和搜索）
router.get('/points-leaderboard', (req, res) => {
    try {
        const { search = '', page = 1, limit = 20 } = req.query;
        const { page: p, limit: l, offset } = paginate(page, limit);

        let whereClause = 'u.total_points > 0';
        const params = [];

        if (search.trim()) {
            whereClause += ' AND (u.name LIKE ? OR u.department LIKE ?)';
            const searchPattern = `%${search.trim()}%`;
            params.push(searchPattern, searchPattern);
        }

        // 获取总数
        const totalResult = db.prepare(`
            SELECT COUNT(*) as count FROM users u WHERE ${whereClause}
        `).get(...params);
        const total = totalResult.count;

        // 获取分页数据
        const users = db.prepare(`
            SELECT 
                u.id, u.name, u.employee_id, u.department, u.position, u.avatar_url, u.total_points,
                (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = u.id AND ub.status = 'active') as badge_count
            FROM users u
            WHERE ${whereClause}
            ORDER BY u.total_points DESC
            LIMIT ? OFFSET ?
        `).all(...params, l, offset);

        res.json({
            success: true,
            data: users,
            pagination: {
                page: p,
                limit: l,
                total,
                total_pages: Math.ceil(total / l)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;

