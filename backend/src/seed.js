import db from './models/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * 初始化种子数据
 */
export function initSeedData() {
    // 检查是否已有数据
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount.count > 0) {
        console.log('📦 数据库已有数据，跳过种子数据初始化');
        return;
    }

    console.log('🌱 正在初始化种子数据...');

    // 创建组织架构
    const organizations = [
        { id: 'ORG001', name: '总行科技部', parent_id: null, level: 1, sort_order: 1 },
        { id: 'ORG002', name: '研发中心', parent_id: 'ORG001', level: 2, sort_order: 1 },
        { id: 'ORG003', name: '前端开发组', parent_id: 'ORG002', level: 3, sort_order: 1 },
        { id: 'ORG004', name: '后端开发组', parent_id: 'ORG002', level: 3, sort_order: 2 },
        { id: 'ORG005', name: '测试组', parent_id: 'ORG002', level: 3, sort_order: 3 },
        { id: 'ORG006', name: '数据中心', parent_id: 'ORG001', level: 2, sort_order: 2 },
        { id: 'ORG007', name: '数据分析组', parent_id: 'ORG006', level: 3, sort_order: 1 },
        { id: 'ORG008', name: '数据工程组', parent_id: 'ORG006', level: 3, sort_order: 2 },
        { id: 'ORG009', name: 'AI创新中心', parent_id: 'ORG001', level: 2, sort_order: 3 },
        { id: 'ORG010', name: '产品部', parent_id: 'ORG001', level: 2, sort_order: 4 },
    ];

    const insertOrg = db.prepare(`
    INSERT INTO organizations (id, name, parent_id, level, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);

    for (const org of organizations) {
        insertOrg.run(org.id, org.name, org.parent_id, org.level, org.sort_order);
    }

    // 创建标签
    const tags = [
        { id: 'TAG001', name: '核心系统升级', category: 'project', color: '#667eea' },
        { id: 'TAG002', name: '移动银行3.0', category: 'project', color: '#10b981' },
        { id: 'TAG003', name: 'AI平台建设', category: 'project', color: '#f59e0b' },
        { id: 'TAG004', name: 'React', category: 'skill', color: '#61dafb' },
        { id: 'TAG005', name: 'Java', category: 'skill', color: '#f89820' },
        { id: 'TAG006', name: 'Python', category: 'skill', color: '#3776ab' },
        { id: 'TAG007', name: '技术负责人', category: 'role', color: '#ef4444' },
        { id: 'TAG008', name: '项目经理', category: 'role', color: '#8b5cf6' },
        { id: 'TAG009', name: '新员工', category: 'custom', color: '#ec4899' },
        { id: 'TAG010', name: '导师', category: 'custom', color: '#14b8a6' },
    ];

    const insertTag = db.prepare(`
    INSERT INTO tags (id, name, category, color)
    VALUES (?, ?, ?, ?)
  `);

    for (const tag of tags) {
        insertTag.run(tag.id, tag.name, tag.category, tag.color);
    }

    // 创建示例用户（关联组织）
    const users = [
        { id: 'U001', employee_id: 'EMP001', name: '张三', department: '前端开发组', position: '高级工程师', level: 'P7', role: 'employee', org_id: 'ORG003' },
        { id: 'U002', employee_id: 'EMP002', name: '李四', department: '后端开发组', position: '技术经理', level: 'P8', role: 'department_admin', org_id: 'ORG004' },
        { id: 'U003', employee_id: 'EMP003', name: '王五', department: '数据分析组', position: '数据分析师', level: 'P6', role: 'employee', org_id: 'ORG007' },
        { id: 'U004', employee_id: 'EMP004', name: '赵六', department: '数据工程组', position: '数据工程师', level: 'P7', role: 'employee', org_id: 'ORG008' },
        { id: 'U005', employee_id: 'EMP005', name: '钱七', department: '产品部', position: '产品经理', level: 'P7', role: 'employee', org_id: 'ORG010' },
        { id: 'U006', employee_id: 'EMP006', name: '孙八', department: '产品部', position: '高级产品经理', level: 'P8', role: 'department_admin', org_id: 'ORG010' },
        { id: 'U007', employee_id: 'EMP007', name: '周九', department: 'AI创新中心', position: 'AI工程师', level: 'P7', role: 'employee', org_id: 'ORG009' },
        { id: 'U008', employee_id: 'EMP008', name: '吴十', department: 'AI创新中心', position: '算法专家', level: 'P8', role: 'employee', org_id: 'ORG009' },
        { id: 'U009', employee_id: 'EMP009', name: '郑十一', department: '前端开发组', position: '前端工程师', level: 'P6', role: 'employee', org_id: 'ORG003' },
        { id: 'U010', employee_id: 'EMP010', name: '冯十二', department: '后端开发组', position: '后端工程师', level: 'P6', role: 'employee', org_id: 'ORG004' },
    ];

    const insertUser = db.prepare(`
    INSERT INTO users (id, employee_id, name, department, position, level, role, org_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

    for (const user of users) {
        insertUser.run(user.id, user.employee_id, user.name, user.department, user.position, user.level, user.role, user.org_id);
    }

    // 用户标签关联
    const userTags = [
        { user_id: 'U001', tag_id: 'TAG001' },
        { user_id: 'U001', tag_id: 'TAG004' },
        { user_id: 'U002', tag_id: 'TAG001' },
        { user_id: 'U002', tag_id: 'TAG005' },
        { user_id: 'U002', tag_id: 'TAG007' },
        { user_id: 'U003', tag_id: 'TAG002' },
        { user_id: 'U003', tag_id: 'TAG006' },
        { user_id: 'U004', tag_id: 'TAG002' },
        { user_id: 'U004', tag_id: 'TAG006' },
        { user_id: 'U005', tag_id: 'TAG002' },
        { user_id: 'U005', tag_id: 'TAG008' },
        { user_id: 'U006', tag_id: 'TAG008' },
        { user_id: 'U006', tag_id: 'TAG010' },
        { user_id: 'U007', tag_id: 'TAG003' },
        { user_id: 'U007', tag_id: 'TAG006' },
        { user_id: 'U008', tag_id: 'TAG003' },
        { user_id: 'U008', tag_id: 'TAG007' },
        { user_id: 'U009', tag_id: 'TAG001' },
        { user_id: 'U009', tag_id: 'TAG004' },
        { user_id: 'U009', tag_id: 'TAG009' },
        { user_id: 'U010', tag_id: 'TAG001' },
        { user_id: 'U010', tag_id: 'TAG005' },
        { user_id: 'U010', tag_id: 'TAG009' },
    ];

    const insertUserTag = db.prepare(`
    INSERT INTO user_tags (user_id, tag_id)
    VALUES (?, ?)
  `);

    for (const ut of userTags) {
        insertUserTag.run(ut.user_id, ut.tag_id);
    }

    // 创建徽章定义（使用新的 icon_type 和 icon_value 字段）
    const badges = [
        { id: 'B001', name: '攻坚先锋', description: '在重大攻坚项目中表现卓越，交付评分达到90分以上', category: '项目贡献', level: '金', icon_type: 'emoji', icon_value: '🚀', points: 500 },
        { id: 'B002', name: '学习达人', description: '年度累计学习时长达到40小时以上', category: '学习成长', level: '银', icon_type: 'emoji', icon_value: '📚', points: 200 },
        { id: 'B003', name: '协作之星', description: '积极参与团队协作，文档贡献达到10份以上', category: '团队协作', level: '铜', icon_type: 'emoji', icon_value: '🤝', points: 100 },
        { id: 'B004', name: '创新先锋', description: '提交创新案例并获得评审通过', category: '创新贡献', level: '金', icon_type: 'emoji', icon_value: '💡', points: 800 },
        { id: 'B005', name: '代码卫士', description: '代码质量评估连续3个月达到A级', category: '技术贡献', level: '钻', icon_type: 'emoji', icon_value: '💻', points: 1500 },
        { id: 'B006', name: '知识布道者', description: '完成5次以上内部技术分享', category: '学习成长', level: '金', icon_type: 'emoji', icon_value: '🎤', points: 600 },
        { id: 'B007', name: '新锐之星', description: '入职一年内获得3个以上徽章', category: '成长类', level: '银', icon_type: 'emoji', icon_value: '🌱', points: 300 },
        { id: 'B008', name: '跨界达人', description: '参与3个以上跨部门协作项目', category: '团队协作', level: '金', icon_type: 'emoji', icon_value: '🌉', points: 500 },
        { id: 'B009', name: 'AI先行者', description: '在AI平台贡献优秀模型或案例', category: '创新贡献', level: '钻', icon_type: 'emoji', icon_value: '🤖', points: 1200 },
        { id: 'B010', name: '文化大使', description: '积极传播企业文化，获得文化贡献认可', category: '文化类', level: '银', icon_type: 'emoji', icon_value: '🌟', points: 250 },
    ];

    const insertBadge = db.prepare(`
    INSERT INTO badge_definitions (id, name, description, category, level, icon_type, icon_value, points)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

    for (const badge of badges) {
        insertBadge.run(badge.id, badge.name, badge.description, badge.category, badge.level, badge.icon_type, badge.icon_value, badge.points);
    }

    // 创建规则
    const rules = [
        {
            id: 'RULE-001',
            name: '攻坚先锋规则',
            description: '项目交付评分达到90分以上自动授予攻坚先锋徽章',
            condition: { event: '项目交付里程碑达成', metric: 'deliverable_score >= 90' },
            action: { grant_badge: 'B001', points: 500 },
            priority: 100,
            cooldown_days: 90,
        },
        {
            id: 'RULE-002',
            name: '学习达人规则',
            description: '累计学习时长达到40小时自动授予学习达人徽章',
            condition: { event: '课程完成', metric: 'course_hours >= 40' },
            action: { grant_badge: 'B002', points: 200 },
            priority: 90,
            cooldown_days: 365,
        },
        {
            id: 'RULE-003',
            name: '协作之星规则',
            description: '文档贡献达到10份自动授予协作之星徽章',
            condition: { event: '文档贡献', metric: 'contribution_count >= 10' },
            action: { grant_badge: 'B003', points: 100 },
            priority: 80,
            cooldown_days: 30,
        },
        {
            id: 'RULE-004',
            name: '创新先锋规则',
            description: '创新案例通过评审自动授予创新先锋徽章',
            condition: { event: '创新案例通过', metric: 'approval_status == approved' },
            action: { grant_badge: 'B004', points: 800 },
            priority: 100,
            cooldown_days: 0,
        },
    ];

    const insertRule = db.prepare(`
    INSERT INTO rules (id, name, description, condition_json, action_json, priority, cooldown_days)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

    for (const rule of rules) {
        insertRule.run(
            rule.id,
            rule.name,
            rule.description,
            JSON.stringify(rule.condition),
            JSON.stringify(rule.action),
            rule.priority,
            rule.cooldown_days
        );
    }

    // 为部分用户授予徽章
    const userBadges = [
        { user_id: 'U001', badge_id: 'B001', points: 500 },
        { user_id: 'U001', badge_id: 'B002', points: 200 },
        { user_id: 'U001', badge_id: 'B005', points: 1500 },
        { user_id: 'U002', badge_id: 'B001', points: 500 },
        { user_id: 'U002', badge_id: 'B006', points: 600 },
        { user_id: 'U002', badge_id: 'B008', points: 500 },
        { user_id: 'U003', badge_id: 'B002', points: 200 },
        { user_id: 'U003', badge_id: 'B003', points: 100 },
        { user_id: 'U004', badge_id: 'B004', points: 800 },
        { user_id: 'U005', badge_id: 'B003', points: 100 },
        { user_id: 'U005', badge_id: 'B010', points: 250 },
        { user_id: 'U007', badge_id: 'B004', points: 800 },
        { user_id: 'U007', badge_id: 'B009', points: 1200 },
        { user_id: 'U008', badge_id: 'B005', points: 1500 },
        { user_id: 'U008', badge_id: 'B009', points: 1200 },
        { user_id: 'U009', badge_id: 'B002', points: 200 },
        { user_id: 'U009', badge_id: 'B007', points: 300 },
        { user_id: 'U010', badge_id: 'B001', points: 500 },
    ];

    const insertUserBadge = db.prepare(`
    INSERT INTO user_badges (id, user_id, badge_id)
    VALUES (?, ?, ?)
  `);

    const updateUserPoints = db.prepare(`
    UPDATE users SET total_points = total_points + ? WHERE id = ?
  `);

    for (const ub of userBadges) {
        const id = uuidv4();
        insertUserBadge.run(id, ub.user_id, ub.badge_id);
        updateUserPoints.run(ub.points, ub.user_id);
    }

    console.log('✅ 种子数据初始化完成');
    console.log(`   - ${organizations.length} 个组织`);
    console.log(`   - ${tags.length} 个标签`);
    console.log(`   - ${users.length} 个用户`);
    console.log(`   - ${userTags.length} 个用户标签关联`);
    console.log(`   - ${badges.length} 个徽章定义`);
    console.log(`   - ${rules.length} 条规则`);
    console.log(`   - ${userBadges.length} 个用户徽章`);
}
