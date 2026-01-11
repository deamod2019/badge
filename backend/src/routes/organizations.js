import { Router } from 'express';
import db from '../models/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 获取组织架构树
router.get('/tree', (req, res) => {
    try {
        const orgs = db.prepare('SELECT * FROM organizations ORDER BY level, sort_order').all();

        // 构建树形结构
        const buildTree = (parentId = null) => {
            return orgs
                .filter(org => org.parent_id === parentId)
                .map(org => ({
                    ...org,
                    children: buildTree(org.id),
                    user_count: db.prepare('SELECT COUNT(*) as count FROM users WHERE org_id = ?').get(org.id)?.count || 0,
                }));
        };

        const tree = buildTree(null);
        res.json({ success: true, data: tree });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取所有组织（扁平列表）
router.get('/', (req, res) => {
    try {
        const orgs = db.prepare('SELECT * FROM organizations ORDER BY level, sort_order').all();
        res.json({ success: true, data: orgs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取组织详情
router.get('/:id', (req, res) => {
    try {
        const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
        if (!org) {
            return res.status(404).json({ success: false, error: '组织不存在' });
        }
        res.json({ success: true, data: org });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取组织下的用户
router.get('/:id/users', (req, res) => {
    try {
        const { include_children } = req.query;
        let users;

        if (include_children === 'true') {
            // 获取该组织及所有子组织的用户
            const allOrgs = db.prepare('SELECT * FROM organizations').all();

            const getChildOrgIds = (parentId) => {
                const children = allOrgs.filter(o => o.parent_id === parentId);
                let ids = [parentId];
                children.forEach(child => {
                    ids = ids.concat(getChildOrgIds(child.id));
                });
                return ids;
            };

            const orgIds = getChildOrgIds(req.params.id);
            const placeholders = orgIds.map(() => '?').join(',');
            users = db.prepare(`SELECT * FROM users WHERE org_id IN (${placeholders})`).all(...orgIds);
        } else {
            users = db.prepare('SELECT * FROM users WHERE org_id = ?').all(req.params.id);
        }

        res.json({ success: true, data: users, count: users.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 创建组织
router.post('/', (req, res) => {
    try {
        const { name, parent_id, sort_order = 0 } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: '组织名称为必填项' });
        }

        // 计算层级
        let level = 1;
        if (parent_id) {
            const parent = db.prepare('SELECT level FROM organizations WHERE id = ?').get(parent_id);
            if (parent) {
                level = parent.level + 1;
            }
        }

        const id = `ORG${String(Date.now()).slice(-6)}`;
        db.prepare(`
      INSERT INTO organizations (id, name, parent_id, level, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, parent_id, level, sort_order);

        const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(id);
        res.status(201).json({ success: true, data: org });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
