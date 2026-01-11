import { useState, useEffect } from 'react';
import api from '../services/api';
import DrillDownModal from '../components/DrillDownModal';

export default function Admin() {
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState(null);
    const [rules, setRules] = useState([]);
    const [events, setEvents] = useState([]);
    const [users, setUsers] = useState([]);
    const [badges, setBadges] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [statsRes, rulesRes, eventsRes, usersRes, badgesRes, orgsRes, tagsRes] = await Promise.all([
                api.getStatsOverview(),
                api.getRules(),
                api.getEvents({ limit: 20 }),
                api.getUsers({ limit: 100 }),
                api.getBadges(),
                api.getOrganizationTree(),
                api.getTags(),
            ]);
            setStats(statsRes.data);
            setRules(rulesRes.data);
            setEvents(eventsRes.data);
            setUsers(usersRes.data);
            setBadges(badgesRes.data);
            setOrganizations(orgsRes.data);
            setTags(tagsRes.data);
        } catch (error) {
            console.error('加载数据失败:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner" />
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: '📊 概览' },
        { id: 'grant', label: '🎁 发放徽章' },
        { id: 'manage', label: '✏️ 徽章管理' },
        { id: 'quotas', label: '📋 配额管理' },
        { id: 'rules', label: '⚙️ 规则管理' },
        { id: 'config', label: '🔧 配置管理' },
        { id: 'events', label: '📡 事件日志' },
        { id: 'users', label: '👥 用户管理' },
    ];

    return (
        <div className="admin-page">
            <header className="page-header">
                <h1 className="page-title">管理后台</h1>
                <p className="page-subtitle">徽章系统配置与运营管理</p>
            </header>

            <div className="tabs" style={{ marginBottom: '32px' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && <OverviewTab stats={stats} />}
            {activeTab === 'grant' && <GrantBadgeTab users={users} badges={badges} organizations={organizations} tags={tags} onRefresh={loadData} />}
            {activeTab === 'manage' && <ManageBadgesTab badges={badges} onRefresh={loadData} />}
            {activeTab === 'quotas' && <QuotasTab users={users} organizations={organizations} tags={tags} />}
            {activeTab === 'rules' && <RulesTab rules={rules} badges={badges} onRefresh={loadData} />}
            {activeTab === 'config' && <ConfigTab />}
            {activeTab === 'events' && <EventsTab events={events} />}
            {activeTab === 'users' && <UsersTab users={users} tags={tags} />}
        </div>
    );
}

// ==================== 概览 Tab ====================
function OverviewTab({ stats }) {
    const [drillDown, setDrillDown] = useState(null);

    function openDrillDown(type, title) {
        setDrillDown({ type, title });
    }

    function closeDrillDown() {
        setDrillDown(null);
    }

    return (
        <div className="animate-fade-in">
            <div className="stats-grid">
                <div
                    className="stat-card clickable"
                    onClick={() => openDrillDown('users', '👥 用户列表')}
                >
                    <div className="stat-icon">👥</div>
                    <div className="stat-value">{stats?.total_users || 0}</div>
                    <div className="stat-label">总用户数</div>
                </div>
                <div
                    className="stat-card success clickable"
                    onClick={() => openDrillDown('badges', '🏅 已发放徽章')}
                >
                    <div className="stat-icon">🏅</div>
                    <div className="stat-value">{stats?.total_badges_granted || 0}</div>
                    <div className="stat-label">已发放徽章</div>
                </div>
                <div
                    className="stat-card warning clickable"
                    onClick={() => openDrillDown('coverage', '📊 持有徽章的用户')}
                >
                    <div className="stat-icon">📊</div>
                    <div className="stat-value">{stats?.coverage_rate || 0}%</div>
                    <div className="stat-label">覆盖率</div>
                </div>
                <div
                    className="stat-card gold clickable"
                    onClick={() => openDrillDown('points', '⭐ 积分排行榜')}
                >
                    <div className="stat-icon">⭐</div>
                    <div className="stat-value">{(stats?.total_points_distributed || 0).toLocaleString()}</div>
                    <div className="stat-label">累计积分</div>
                </div>
            </div>

            <div className="card" style={{ marginTop: '24px' }}>
                <div className="card-header">
                    <h3 className="card-title">系统健康状态</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <HealthItem label="API 服务" status="healthy" />
                    <HealthItem label="数据库连接" status="healthy" />
                    <HealthItem label="规则引擎" status="healthy" />
                </div>
            </div>

            {/* Drill-Down Modal */}
            {drillDown && (
                <DrillDownModal
                    type={drillDown.type}
                    title={drillDown.title}
                    onClose={closeDrillDown}
                />
            )}
        </div>
    );
}

function HealthItem({ label, status }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
            <div style={{
                width: '12px', height: '12px', borderRadius: '50%',
                background: status === 'healthy' ? 'var(--success)' : 'var(--error)',
                boxShadow: `0 0 10px ${status === 'healthy' ? 'var(--success)' : 'var(--error)'}`,
            }} />
            <span>{label}</span>
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: status === 'healthy' ? 'var(--success)' : 'var(--error)' }}>
                {status === 'healthy' ? '正常' : '异常'}
            </span>
        </div>
    );
}

// ==================== 发放徽章 Tab ====================
function GrantBadgeTab({ users, badges, organizations, tags, onRefresh }) {
    const [selectMode, setSelectMode] = useState('individual');
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [selectedOrgs, setSelectedOrgs] = useState(new Set());
    const [selectedTags, setSelectedTags] = useState(new Set());
    const [selectedBadge, setSelectedBadge] = useState(null);
    const [reason, setReason] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);

    const filteredUsers = users.filter(u =>
        u.name.includes(searchTerm) || u.employee_id.includes(searchTerm)
    );

    const activeBadges = badges.filter(b => b.is_active && !b.is_deleted);

    const getSelectedCount = () => {
        let count = selectedUsers.size;
        // 粗略估算组织和标签的用户数
        selectedOrgs.forEach(orgId => {
            const org = findOrgById(organizations, orgId);
            if (org) count += org.user_count || 0;
        });
        selectedTags.forEach(tagId => {
            const tag = tags.find(t => t.id === tagId);
            if (tag) count += tag.user_count || 0;
        });
        return count;
    };

    async function handleSubmit() {
        if (!selectedBadge) {
            alert('请选择要发放的徽章');
            return;
        }
        if (selectedUsers.size === 0 && selectedOrgs.size === 0 && selectedTags.size === 0) {
            alert('请至少选择一个发放对象');
            return;
        }

        setSubmitting(true);
        setResult(null);

        try {
            const response = await api.batchGrantBadge(selectedBadge.id, {
                user_ids: Array.from(selectedUsers),
                org_ids: Array.from(selectedOrgs),
                tag_ids: Array.from(selectedTags),
            }, reason);

            setResult(response.data);
            onRefresh();
        } catch (error) {
            setResult({ error: error.message });
        } finally {
            setSubmitting(false);
        }
    }

    function handleReset() {
        setSelectedUsers(new Set());
        setSelectedOrgs(new Set());
        setSelectedTags(new Set());
        setSelectedBadge(null);
        setReason('');
        setResult(null);
    }

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* 左侧：选择用户 */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">选择发放对象</h3>
                    </div>

                    {/* 模式切换 */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        {[
                            { id: 'individual', label: '👤 个人', icon: '👤' },
                            { id: 'org', label: '🏢 组织', icon: '🏢' },
                            { id: 'tag', label: '🏷️ 标签', icon: '🏷️' },
                        ].map(mode => (
                            <button
                                key={mode.id}
                                className={`filter-chip ${selectMode === mode.id ? 'active' : ''}`}
                                onClick={() => setSelectMode(mode.id)}
                            >
                                {mode.label}
                            </button>
                        ))}
                    </div>

                    {/* 个人选择模式 */}
                    {selectMode === 'individual' && (
                        <div>
                            <input
                                type="text"
                                className="input"
                                placeholder="🔍 搜索姓名或工号..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ marginBottom: '12px' }}
                            />
                            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                                {filteredUsers.map(user => (
                                    <label
                                        key={user.id}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px',
                                            borderRadius: '8px', cursor: 'pointer', marginBottom: '4px',
                                            background: selectedUsers.has(user.id) ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.has(user.id)}
                                            onChange={(e) => {
                                                const newSet = new Set(selectedUsers);
                                                if (e.target.checked) newSet.add(user.id);
                                                else newSet.delete(user.id);
                                                setSelectedUsers(newSet);
                                            }}
                                        />
                                        <div className="leaderboard-avatar" style={{ width: '32px', height: '32px', fontSize: '14px' }}>
                                            {user.name[0]}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 500 }}>{user.name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {user.employee_id} · {user.department}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 组织选择模式 */}
                    {selectMode === 'org' && (
                        <div style={{ maxHeight: '350px', overflow: 'auto' }}>
                            <OrgTree
                                organizations={organizations}
                                selectedOrgs={selectedOrgs}
                                setSelectedOrgs={setSelectedOrgs}
                            />
                        </div>
                    )}

                    {/* 标签选择模式 */}
                    {selectMode === 'tag' && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {tags.map(tag => (
                                <button
                                    key={tag.id}
                                    className={`filter-chip ${selectedTags.has(tag.id) ? 'active' : ''}`}
                                    style={{ borderColor: tag.color, background: selectedTags.has(tag.id) ? tag.color : 'transparent' }}
                                    onClick={() => {
                                        const newSet = new Set(selectedTags);
                                        if (newSet.has(tag.id)) newSet.delete(tag.id);
                                        else newSet.add(tag.id);
                                        setSelectedTags(newSet);
                                    }}
                                >
                                    {tag.name} ({tag.user_count})
                                </button>
                            ))}
                        </div>
                    )}

                    {/* 已选择提示 */}
                    <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                        <strong>已选择约 {getSelectedCount()} 人</strong>
                        {selectedUsers.size > 0 && <span> | 个人: {selectedUsers.size}</span>}
                        {selectedOrgs.size > 0 && <span> | 组织: {selectedOrgs.size}</span>}
                        {selectedTags.size > 0 && <span> | 标签: {selectedTags.size}</span>}
                    </div>
                </div>

                {/* 右侧：选择徽章 */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">选择徽章</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                        {activeBadges.map(badge => (
                            <div
                                key={badge.id}
                                onClick={() => setSelectedBadge(badge)}
                                style={{
                                    padding: '16px', textAlign: 'center', borderRadius: '12px', cursor: 'pointer',
                                    border: selectedBadge?.id === badge.id ? '2px solid var(--primary-500)' : '1px solid var(--border-color)',
                                    background: selectedBadge?.id === badge.id ? 'rgba(102, 126, 234, 0.1)' : 'var(--bg-tertiary)',
                                }}
                            >
                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                                    {badge.icon_type === 'emoji' ? badge.icon_value : '🏅'}
                                </div>
                                <div style={{ fontWeight: 600, fontSize: '14px' }}>{badge.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    {badge.level} · {badge.points}分
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 授予原因 */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>授予原因（可选）</label>
                        <textarea
                            className="input"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            placeholder="例如：项目攻坚期间表现突出"
                        />
                    </div>

                    {/* 操作按钮 */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn btn-secondary" onClick={handleReset}>重置</button>
                        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ flex: 1 }}>
                            {submitting ? '发放中...' : `🚀 确认发放${selectedBadge ? ` "${selectedBadge.name}"` : ''}`}
                        </button>
                    </div>

                    {/* 结果展示 */}
                    {result && (
                        <div style={{
                            marginTop: '16px', padding: '16px', borderRadius: '8px',
                            background: result.error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            border: `1px solid ${result.error ? 'var(--error)' : 'var(--success)'}`,
                        }}>
                            {result.error ? (
                                <div style={{ color: 'var(--error)' }}>❌ {result.error}</div>
                            ) : (
                                <div>
                                    <div style={{ color: 'var(--success)', fontWeight: 600, marginBottom: '8px' }}>
                                        ✅ 发放成功！
                                    </div>
                                    <div style={{ fontSize: '14px' }}>
                                        目标用户: {result.target_count} | 成功: {result.granted_count} | 跳过: {result.skipped_count}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// 组织树组件
function OrgTree({ organizations, selectedOrgs, setSelectedOrgs, level = 0 }) {
    return (
        <div style={{ paddingLeft: level * 20 }}>
            {organizations.map(org => (
                <div key={org.id}>
                    <label style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px',
                        borderRadius: '6px', cursor: 'pointer',
                        background: selectedOrgs.has(org.id) ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
                    }}>
                        <input
                            type="checkbox"
                            checked={selectedOrgs.has(org.id)}
                            onChange={(e) => {
                                const newSet = new Set(selectedOrgs);
                                if (e.target.checked) newSet.add(org.id);
                                else newSet.delete(org.id);
                                setSelectedOrgs(newSet);
                            }}
                        />
                        <span>{org.level === 1 ? '🏢' : org.level === 2 ? '📁' : '📂'}</span>
                        <span style={{ fontWeight: org.level < 3 ? 600 : 400 }}>{org.name}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>({org.user_count}人)</span>
                    </label>
                    {org.children?.length > 0 && (
                        <OrgTree
                            organizations={org.children}
                            selectedOrgs={selectedOrgs}
                            setSelectedOrgs={setSelectedOrgs}
                            level={level + 1}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

function findOrgById(orgs, id) {
    for (const org of orgs) {
        if (org.id === id) return org;
        if (org.children) {
            const found = findOrgById(org.children, id);
            if (found) return found;
        }
    }
    return null;
}

// ==================== 徽章管理 Tab ====================
function ManageBadgesTab({ badges, onRefresh }) {
    const [showForm, setShowForm] = useState(false);
    const [editingBadge, setEditingBadge] = useState(null);
    const [filter, setFilter] = useState('all');

    const filteredBadges = badges.filter(b => {
        if (filter === 'all') return !b.is_deleted;
        if (filter === 'active') return b.is_active && !b.is_deleted;
        if (filter === 'inactive') return !b.is_active && !b.is_deleted;
        return true;
    });

    async function handleToggle(badge) {
        try {
            await api.toggleBadge(badge.id);
            onRefresh();
        } catch (error) {
            alert('操作失败: ' + error.message);
        }
    }

    async function handleDelete(badge) {
        if (!confirm(`确定要删除徽章"${badge.name}"吗？已发放的徽章将保留。`)) return;
        try {
            await api.deleteBadge(badge.id);
            onRefresh();
        } catch (error) {
            alert('删除失败: ' + error.message);
        }
    }

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div className="badge-filters">
                    {['all', 'active', 'inactive'].map(f => (
                        <button
                            key={f}
                            className={`filter-chip ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'all' ? '全部' : f === 'active' ? '已启用' : '已禁用'}
                        </button>
                    ))}
                </div>
                <button className="btn btn-primary" onClick={() => { setEditingBadge(null); setShowForm(true); }}>
                    + 新建徽章
                </button>
            </div>

            {/* 徽章列表 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredBadges.map(badge => (
                    <div key={badge.id} className="card" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '60px', height: '60px', borderRadius: '12px',
                                background: `var(--gradient-${getLevelClass(badge.level)})`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
                            }}>
                                {badge.icon_type === 'emoji' ? badge.icon_value : '🏅'}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '18px' }}>{badge.name}</span>
                                    <span className={`badge-level-tag ${getLevelClass(badge.level)}`} style={{ position: 'static' }}>
                                        {badge.level}
                                    </span>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                                        background: badge.is_active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                        color: badge.is_active ? 'var(--success)' : 'var(--error)',
                                    }}>
                                        {badge.is_active ? '启用' : '禁用'}
                                    </span>
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>
                                    {badge.description}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                    {badge.category} · {badge.points}积分 · 已发放: {badge.holder_count || 0}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => { setEditingBadge(badge); setShowForm(true); }}
                                >
                                    编辑
                                </button>
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => handleToggle(badge)}
                                >
                                    {badge.is_active ? '禁用' : '启用'}
                                </button>
                                <button
                                    className="btn btn-ghost"
                                    style={{ color: 'var(--error)' }}
                                    onClick={() => handleDelete(badge)}
                                >
                                    删除
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 新建/编辑弹窗 */}
            {showForm && (
                <BadgeFormModal
                    badge={editingBadge}
                    onClose={() => setShowForm(false)}
                    onSave={() => { setShowForm(false); onRefresh(); }}
                />
            )}
        </div>
    );
}

// 徽章表单弹窗
function BadgeFormModal({ badge, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: badge?.name || '',
        description: badge?.description || '',
        category: badge?.category || '项目贡献',
        level: badge?.level || '金',
        icon_type: badge?.icon_type || 'emoji',
        icon_value: badge?.icon_value || '🏅',
        points: badge?.points || 500,
        expires_days: badge?.expires_days || '',
    });
    const [saving, setSaving] = useState(false);

    const categories = ['项目贡献', '学习成长', '团队协作', '创新贡献', '技术贡献', '文化类', '成长类'];
    const levels = ['铜', '银', '金', '钻'];
    const emojis = ['🏅', '🚀', '💡', '📚', '🤝', '💻', '🌟', '🏆', '🎯', '🔥', '⭐', '💎', '🎖️', '🌈', '🛡️', '⚡', '🎨', '🤖', '🎤', '🌉', '🌱'];

    async function handleSubmit(e) {
        e.preventDefault();
        if (!formData.name || !formData.description) {
            alert('请填写完整信息');
            return;
        }

        setSaving(true);
        try {
            if (badge) {
                await api.updateBadge(badge.id, formData);
            } else {
                await api.createBadge(formData);
            }
            onSave();
        } catch (error) {
            alert('保存失败: ' + error.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const res = await api.uploadImage(reader.result, file.name.replace(/\.[^/.]+$/, ''));
                setFormData({ ...formData, icon_type: 'image', icon_value: res.data.url });
            } catch (error) {
                alert('上传失败: ' + error.message);
            }
        };
        reader.readAsDataURL(file);
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
        }} onClick={onClose}>
            <div className="card" style={{ width: '500px', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                <div className="card-header">
                    <h3 className="card-title">{badge ? '编辑徽章' : '新建徽章'}</h3>
                    <button className="btn btn-ghost" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>徽章名称 *</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="例如：攻坚先锋"
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>徽章描述 *</label>
                        <textarea
                            className="input"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            placeholder="描述获得这个徽章的条件和意义"
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>分类 *</label>
                            <select
                                className="input select"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>等级 *</label>
                            <select
                                className="input select"
                                value={formData.level}
                                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                            >
                                {levels.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>积分值 *</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.points}
                                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>有效期（天）</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.expires_days}
                                onChange={(e) => setFormData({ ...formData, expires_days: e.target.value ? parseInt(e.target.value) : '' })}
                                placeholder="留空为永久"
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>图标</label>

                        {/* 图标类型切换 */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <button
                                type="button"
                                className={`filter-chip ${formData.icon_type === 'emoji' ? 'active' : ''}`}
                                onClick={() => setFormData({ ...formData, icon_type: 'emoji', icon_value: '🏅' })}
                            >
                                Emoji
                            </button>
                            <button
                                type="button"
                                className={`filter-chip ${formData.icon_type === 'image' ? 'active' : ''}`}
                                onClick={() => document.getElementById('icon-upload').click()}
                            >
                                上传图片
                            </button>
                            <input
                                id="icon-upload"
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleImageUpload}
                            />
                        </div>

                        {/* Emoji 选择 */}
                        {formData.icon_type === 'emoji' && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {emojis.map(emoji => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        style={{
                                            width: '40px', height: '40px', fontSize: '20px', borderRadius: '8px',
                                            border: formData.icon_value === emoji ? '2px solid var(--primary-500)' : '1px solid var(--border-color)',
                                            background: formData.icon_value === emoji ? 'rgba(102, 126, 234, 0.2)' : 'var(--bg-tertiary)',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => setFormData({ ...formData, icon_value: emoji })}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* 图片预览 */}
                        {formData.icon_type === 'image' && formData.icon_value && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img src={formData.icon_value} alt="徽章图标" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>已上传图片</span>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? '保存中...' : '💾 保存徽章'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function getLevelClass(level) {
    const map = { '铜': 'bronze', '银': 'silver', '金': 'gold', '钻': 'diamond' };
    return map[level] || 'bronze';
}

// ==================== 规则管理 Tab ====================
function RulesTab({ rules: initialRules, badges, onRefresh }) {
    const [rules, setRules] = useState(initialRules);
    const [showForm, setShowForm] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        setRules(initialRules);
    }, [initialRules]);

    const filteredRules = rules.filter(r => {
        if (filter === 'all') return true;
        if (filter === 'enabled') return r.is_enabled;
        if (filter === 'disabled') return !r.is_enabled;
        return true;
    });

    async function handleToggle(rule) {
        try {
            await api.toggleRule(rule.id, !rule.is_enabled);
            onRefresh?.();
        } catch (error) {
            alert('操作失败: ' + error.message);
        }
    }

    async function handleDelete(rule) {
        if (!confirm(`确定要删除规则 "${rule.name}" 吗？`)) return;
        try {
            await api.deleteRule(rule.id);
            onRefresh?.();
        } catch (error) {
            alert('删除失败: ' + error.message);
        }
    }

    return (
        <div className="animate-fade-in">
            <div className="card">
                <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <h3 className="card-title">规则列表</h3>
                        <div className="badge-filters">
                            {['all', 'enabled', 'disabled'].map(f => (
                                <button
                                    key={f}
                                    className={`filter-chip ${filter === f ? 'active' : ''}`}
                                    onClick={() => setFilter(f)}
                                >
                                    {f === 'all' ? '全部' : f === 'enabled' ? '已启用' : '已禁用'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={() => { setEditingRule(null); setShowForm(true); }}>
                        + 新建规则
                    </button>
                </div>

                {filteredRules.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        暂无规则，点击上方按钮创建
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {filteredRules.map(rule => (
                            <div key={rule.id} style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ fontWeight: 600, fontSize: '16px' }}>{rule.name}</span>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                                                background: rule.is_enabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                color: rule.is_enabled ? 'var(--success)' : 'var(--error)',
                                            }}>
                                                {rule.is_enabled ? '启用' : '禁用'}
                                            </span>
                                        </div>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px' }}>{rule.description}</p>

                                        <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
                                            <div>
                                                <span style={{ color: 'var(--text-tertiary)' }}>触发条件: </span>
                                                <span style={{ color: 'var(--primary-400)' }}>
                                                    {rule.condition?.event || '任意事件'}
                                                    {rule.condition?.metric && ` (${rule.condition.metric})`}
                                                </span>
                                            </div>
                                            <div>
                                                <span style={{ color: 'var(--text-tertiary)' }}>授予徽章: </span>
                                                <span style={{ color: 'var(--warning)' }}>{rule.action?.grant_badge || '-'}</span>
                                            </div>
                                            <div>
                                                <span style={{ color: 'var(--text-tertiary)' }}>优先级: </span>
                                                <span>{rule.priority}</span>
                                            </div>
                                            <div>
                                                <span style={{ color: 'var(--text-tertiary)' }}>冷却期: </span>
                                                <span>{rule.cooldown_days || 0}天</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                                        <button className="btn btn-ghost" onClick={() => { setEditingRule(rule); setShowForm(true); }}>
                                            编辑
                                        </button>
                                        <button className="btn btn-ghost" onClick={() => handleToggle(rule)}>
                                            {rule.is_enabled ? '禁用' : '启用'}
                                        </button>
                                        <button className="btn btn-ghost" style={{ color: 'var(--error)' }} onClick={() => handleDelete(rule)}>
                                            删除
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showForm && (
                <RuleFormModal
                    rule={editingRule}
                    badges={badges}
                    onClose={() => setShowForm(false)}
                    onSave={() => { setShowForm(false); onRefresh?.(); }}
                />
            )}
        </div>
    );
}

// 规则表单弹窗
function RuleFormModal({ rule, badges, onClose, onSave }) {
    const [form, setForm] = useState({
        name: rule?.name || '',
        description: rule?.description || '',
        priority: rule?.priority || 100,
        cooldown_days: rule?.cooldown_days || 0,
        is_enabled: rule?.is_enabled ?? true,
        // 条件
        event_name: rule?.condition?.event || '',
        metric_field: '',
        metric_operator: '>=',
        metric_value: '',
        // 动作
        grant_badge: rule?.action?.grant_badge || '',
        points: rule?.action?.points || 0,
    });
    const [saving, setSaving] = useState(false);
    const [eventTypes, setEventTypes] = useState([]);
    const [metricFields, setMetricFields] = useState([]);

    // 加载事件类型和指标字段
    useEffect(() => {
        async function loadConfig() {
            try {
                const [eventsRes, metricsRes] = await Promise.all([
                    api.getEventTypes({ is_active: true }),
                    api.getMetricFields({ is_active: true }),
                ]);
                setEventTypes(eventsRes.data || []);
                setMetricFields(metricsRes.data || []);
            } catch (error) {
                console.error('加载配置失败:', error);
            }
        }
        loadConfig();
    }, []);

    // 解析已有规则的 metric
    useEffect(() => {
        if (rule?.condition?.metric) {
            const match = rule.condition.metric.match(/^(\w+)\s*(>=|<=|>|<|==|!=)\s*(.+)$/);
            if (match) {
                setForm(prev => ({
                    ...prev,
                    metric_field: match[1],
                    metric_operator: match[2],
                    metric_value: match[3],
                }));
            }
        }
    }, [rule]);

    const operators = [
        { value: '>=', label: '>= 大于等于' },
        { value: '<=', label: '<= 小于等于' },
        { value: '>', label: '> 大于' },
        { value: '<', label: '< 小于' },
        { value: '==', label: '== 等于' },
        { value: '!=', label: '!= 不等于' },
    ];

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.name || !form.event_name || !form.grant_badge) {
            alert('请填写规则名称、触发事件和授予徽章');
            return;
        }

        setSaving(true);
        try {
            // 构建条件
            const condition = { event: form.event_name };
            if (form.metric_field && form.metric_value) {
                condition.metric = `${form.metric_field} ${form.metric_operator} ${form.metric_value}`;
            }

            // 构建动作
            const action = {
                grant_badge: form.grant_badge,
                points: form.points || 0,
            };

            const ruleData = {
                name: form.name,
                description: form.description,
                priority: form.priority,
                cooldown_days: form.cooldown_days,
                is_enabled: form.is_enabled,
                condition,
                action,
            };

            if (rule) {
                await api.updateRule(rule.id, ruleData);
            } else {
                await api.createRule(ruleData);
            }
            onSave();
        } catch (error) {
            alert('保存失败: ' + error.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
        }} onClick={onClose}>
            <div className="card" style={{ width: '600px', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                <div className="card-header">
                    <h3 className="card-title">{rule ? '编辑规则' : '新建规则'}</h3>
                    <button className="btn btn-ghost" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '0 24px 24px' }}>
                    {/* 基本信息 */}
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>📋 基本信息</h4>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>规则名称 *</label>
                                <input
                                    className="input"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="例如：攻坚先锋规则"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>规则描述</label>
                                <textarea
                                    className="input"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    rows={2}
                                    placeholder="描述这条规则的触发条件和效果"
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>优先级</label>
                                    <input
                                        className="input"
                                        type="number"
                                        value={form.priority}
                                        onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>冷却期（天）</label>
                                    <input
                                        className="input"
                                        type="number"
                                        value={form.cooldown_days}
                                        onChange={e => setForm({ ...form, cooldown_days: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 触发条件 */}
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>⚡ 触发条件</h4>
                        <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>触发事件 *</label>
                                <select
                                    className="input select"
                                    value={form.event_name}
                                    onChange={e => setForm({ ...form, event_name: e.target.value })}
                                >
                                    <option value="">请选择事件类型</option>
                                    {eventTypes.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>指标条件（可选）</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <select
                                        className="input select"
                                        style={{ flex: 1 }}
                                        value={form.metric_field}
                                        onChange={e => setForm({ ...form, metric_field: e.target.value })}
                                    >
                                        <option value="">选择指标</option>
                                        {metricFields.map(f => <option key={f.id} value={f.field_key}>{f.label}</option>)}
                                    </select>
                                    <select
                                        className="input select"
                                        style={{ width: '140px' }}
                                        value={form.metric_operator}
                                        onChange={e => setForm({ ...form, metric_operator: e.target.value })}
                                    >
                                        {operators.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                    <input
                                        className="input"
                                        style={{ width: '100px' }}
                                        value={form.metric_value}
                                        onChange={e => setForm({ ...form, metric_value: e.target.value })}
                                        placeholder="值"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 执行动作 */}
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>🎯 执行动作</h4>
                        <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>授予徽章 *</label>
                                    <select
                                        className="input select"
                                        value={form.grant_badge}
                                        onChange={e => setForm({ ...form, grant_badge: e.target.value })}
                                    >
                                        <option value="">请选择徽章</option>
                                        {badges?.filter(b => b.is_active && !b.is_deleted).map(b => (
                                            <option key={b.id} value={b.id}>{b.name} ({b.level})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>额外积分</label>
                                    <input
                                        className="input"
                                        type="number"
                                        value={form.points}
                                        onChange={e => setForm({ ...form, points: parseInt(e.target.value) || 0 })}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 提交按钮 */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? '保存中...' : '💾 保存规则'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ==================== 事件日志 Tab ====================
function EventsTab({ events }) {
    return (
        <div className="animate-fade-in">
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">事件日志</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>事件ID</th>
                                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>名称</th>
                                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>来源</th>
                                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>用户</th>
                                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>状态</th>
                                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>时间</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map(event => (
                                <tr key={event.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '12px', fontSize: '12px', fontFamily: 'monospace' }}>{event.id}</td>
                                    <td style={{ padding: '12px' }}>{event.name}</td>
                                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{event.source || '-'}</td>
                                    <td style={{ padding: '12px' }}>{event.user_id}</td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                                            background: event.processed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                            color: event.processed ? 'var(--success)' : 'var(--warning)',
                                        }}>
                                            {event.processed ? '已处理' : '待处理'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                        {new Date(event.created_at).toLocaleString('zh-CN')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ==================== 用户管理 Tab ====================
function UsersTab({ users, tags }) {
    return (
        <div className="animate-fade-in">
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">用户列表</h3>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>共 {users.length} 名用户</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {users.map(user => (
                        <div key={user.id} style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="leaderboard-avatar">{user.name?.[0]}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{user.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.employee_id}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--warning)' }}>⭐ {user.total_points?.toLocaleString() || 0}</div>
                                </div>
                            </div>
                            <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                {user.department} · {user.position}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ==================== 配额管理 Tab ====================
function QuotasTab({ users, organizations, tags }) {
    const [quotas, setQuotas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingQuota, setEditingQuota] = useState(null);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        loadQuotas();
        loadCategories();
    }, []);

    async function loadQuotas() {
        try {
            const res = await api.getQuotas();
            setQuotas(res.data || []);
        } catch (error) {
            console.error('加载配额失败:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadCategories() {
        try {
            const res = await api.getQuotaCategories();
            setCategories(res.data || []);
        } catch (error) {
            console.error('加载分类失败:', error);
        }
    }

    async function handleSave(quotaData) {
        try {
            if (editingQuota) {
                await api.updateQuota(editingQuota.id, quotaData);
            } else {
                await api.createQuota(quotaData);
            }
            await loadQuotas();
            setShowModal(false);
            setEditingQuota(null);
        } catch (error) {
            alert(error.message);
        }
    }

    async function handleDelete(id) {
        if (!confirm('确定要删除此配额吗？')) return;
        try {
            await api.deleteQuota(id);
            await loadQuotas();
        } catch (error) {
            alert(error.message);
        }
    }

    if (loading) {
        return <div className="loading"><div className="spinner" /></div>;
    }

    return (
        <div className="animate-fade-in">
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">配额管理</h3>
                    <button className="btn btn-primary" onClick={() => { setEditingQuota(null); setShowModal(true); }}>
                        + 新建配额
                    </button>
                </div>

                {quotas.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        暂无配额规则，点击上方按钮创建
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>负责人</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>范围</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>徽章分类</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>周期</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>配额</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>本期已用</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>状态</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotas.map(quota => (
                                    <tr key={quota.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div className="leaderboard-avatar" style={{ width: 32, height: 32, fontSize: 14 }}>
                                                    {quota.owner_name?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{quota.owner_name}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{quota.owner_department}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{ padding: '2px 8px', background: 'var(--bg-tertiary)', borderRadius: 4, fontSize: 12 }}>
                                                {quota.scope_type === 'organization' ? '🏢' : '🏷️'} {quota.scope_name}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            {quota.badge_category || <span style={{ color: 'var(--text-tertiary)' }}>全部分类</span>}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            每{quota.period_label}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>
                                            {quota.max_grants}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <span style={{
                                                fontWeight: 600,
                                                color: quota.remaining_count <= 0 ? 'var(--error)' : quota.remaining_count <= 2 ? 'var(--warning)' : 'var(--success)'
                                            }}>
                                                {quota.used_count} / {quota.max_grants}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: 4, fontSize: 12,
                                                background: quota.is_active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                                                color: quota.is_active ? 'var(--success)' : 'var(--text-tertiary)'
                                            }}>
                                                {quota.is_active ? '启用' : '禁用'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setEditingQuota(quota); setShowModal(true); }}>编辑</button>
                                            <button className="btn btn-ghost" style={{ padding: '4px 8px', color: 'var(--error)' }} onClick={() => handleDelete(quota.id)}>删除</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <QuotaFormModal
                    quota={editingQuota}
                    users={users}
                    organizations={organizations}
                    tags={tags}
                    categories={categories}
                    onSave={handleSave}
                    onClose={() => { setShowModal(false); setEditingQuota(null); }}
                />
            )}
        </div>
    );
}

// 配额表单弹窗
function QuotaFormModal({ quota, users, organizations, tags, categories, onSave, onClose }) {
    const [form, setForm] = useState({
        owner_user_id: quota?.owner_user_id || '',
        scope_type: quota?.scope_type || 'organization',
        scope_id: quota?.scope_id || '',
        badge_category: quota?.badge_category || '',
        period_type: quota?.period_type || 'monthly',
        max_grants: quota?.max_grants || 5,
        is_active: quota?.is_active ?? true
    });

    const flatOrgs = flattenOrgs(organizations);

    function flattenOrgs(orgs, level = 0) {
        let result = [];
        for (const org of orgs) {
            result.push({ ...org, level });
            if (org.children?.length) {
                result = result.concat(flattenOrgs(org.children, level + 1));
            }
        }
        return result;
    }

    return (
        <div className="drill-down-overlay" onClick={onClose}>
            <div className="drill-down-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                <div className="drill-down-header">
                    <h2 className="drill-down-title">{quota ? '编辑配额' : '新建配额'}</h2>
                    <button className="drill-down-close" onClick={onClose}>×</button>
                </div>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>负责人</label>
                        <select className="input select" value={form.owner_user_id} onChange={e => setForm({ ...form, owner_user_id: e.target.value })} disabled={!!quota}>
                            <option value="">请选择负责人</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.department})</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>范围类型</label>
                        <select className="input select" value={form.scope_type} onChange={e => setForm({ ...form, scope_type: e.target.value, scope_id: '' })} disabled={!!quota}>
                            <option value="organization">组织</option>
                            <option value="tag">标签</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>{form.scope_type === 'organization' ? '组织' : '标签'}</label>
                        <select className="input select" value={form.scope_id} onChange={e => setForm({ ...form, scope_id: e.target.value })} disabled={!!quota}>
                            <option value="">请选择{form.scope_type === 'organization' ? '组织' : '标签'}</option>
                            {form.scope_type === 'organization'
                                ? flatOrgs.map(o => <option key={o.id} value={o.id}>{'　'.repeat(o.level)}{o.name}</option>)
                                : tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                            }
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>徽章分类（留空=全部）</label>
                        <select className="input select" value={form.badge_category} onChange={e => setForm({ ...form, badge_category: e.target.value })}>
                            <option value="">全部分类</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>周期</label>
                            <select className="input select" value={form.period_type} onChange={e => setForm({ ...form, period_type: e.target.value })}>
                                <option value="daily">每日</option>
                                <option value="weekly">每周</option>
                                <option value="monthly">每月</option>
                                <option value="yearly">每年</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>最大发放数</label>
                            <input className="input" type="number" min="1" value={form.max_grants} onChange={e => setForm({ ...form, max_grants: parseInt(e.target.value) || 1 })} />
                        </div>
                    </div>
                    {quota && (
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                                <span>启用配额</span>
                            </label>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>取消</button>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onSave(form)} disabled={!form.owner_user_id || !form.scope_id}>保存</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ==================== 配置管理 Tab ====================
function ConfigTab() {
    const [activeSection, setActiveSection] = useState('events');
    const [eventTypes, setEventTypes] = useState([]);
    const [metricFields, setMetricFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [eventsRes, metricsRes] = await Promise.all([
                api.getEventTypes(),
                api.getMetricFields(),
            ]);
            setEventTypes(eventsRes.data || []);
            setMetricFields(metricsRes.data || []);
        } catch (error) {
            console.error('加载配置失败:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleToggle(item, type) {
        try {
            if (type === 'event') {
                await api.updateEventType(item.id, { is_active: !item.is_active });
            } else {
                await api.updateMetricField(item.id, { is_active: !item.is_active });
            }
            loadData();
        } catch (error) {
            alert('操作失败: ' + error.message);
        }
    }

    async function handleDelete(item, type) {
        if (!confirm(`确定要删除 "${type === 'event' ? item.name : item.label}" 吗？`)) return;
        try {
            if (type === 'event') {
                await api.deleteEventType(item.id);
            } else {
                await api.deleteMetricField(item.id);
            }
            loadData();
        } catch (error) {
            alert('删除失败: ' + error.message);
        }
    }

    if (loading) {
        return <div className="loading"><div className="spinner" /></div>;
    }

    return (
        <div className="animate-fade-in">
            {/* 切换按钮 */}
            <div className="badge-filters" style={{ marginBottom: '24px' }}>
                <button
                    className={`filter-chip ${activeSection === 'events' ? 'active' : ''}`}
                    onClick={() => setActiveSection('events')}
                >
                    ⚡ 事件类型 ({eventTypes.length})
                </button>
                <button
                    className={`filter-chip ${activeSection === 'metrics' ? 'active' : ''}`}
                    onClick={() => setActiveSection('metrics')}
                >
                    📊 指标字段 ({metricFields.length})
                </button>
            </div>

            {/* 事件类型管理 */}
            {activeSection === 'events' && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">事件类型配置</h3>
                        <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowForm(true); }}>
                            + 添加事件类型
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {eventTypes.map(item => (
                            <div key={item.id} style={{
                                padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: '8px',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                opacity: item.is_active ? 1 : 0.5,
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '2px 8px', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
                                            {item.source || '手动'}
                                        </span>
                                        {!item.is_active && (
                                            <span style={{ fontSize: '12px', color: 'var(--error)', padding: '2px 8px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '4px' }}>
                                                已禁用
                                            </span>
                                        )}
                                    </div>
                                    {item.description && (
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{item.description}</p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn btn-ghost" onClick={() => { setEditingItem({ ...item, type: 'event' }); setShowForm(true); }}>编辑</button>
                                    <button className="btn btn-ghost" onClick={() => handleToggle(item, 'event')}>{item.is_active ? '禁用' : '启用'}</button>
                                    <button className="btn btn-ghost" style={{ color: 'var(--error)' }} onClick={() => handleDelete(item, 'event')}>删除</button>
                                </div>
                            </div>
                        ))}
                        {eventTypes.length === 0 && (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                暂无事件类型，点击上方按钮添加
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 指标字段管理 */}
            {activeSection === 'metrics' && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">指标字段配置</h3>
                        <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowForm(true); }}>
                            + 添加指标字段
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {metricFields.map(item => (
                            <div key={item.id} style={{
                                padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: '8px',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                opacity: item.is_active ? 1 : 0.5,
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: 600 }}>{item.label}</span>
                                        <code style={{ fontSize: '12px', color: 'var(--primary-400)', padding: '2px 8px', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
                                            {item.field_key}
                                        </code>
                                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                            ({item.data_type})
                                        </span>
                                        {!item.is_active && (
                                            <span style={{ fontSize: '12px', color: 'var(--error)', padding: '2px 8px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '4px' }}>
                                                已禁用
                                            </span>
                                        )}
                                    </div>
                                    {item.description && (
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{item.description}</p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn btn-ghost" onClick={() => { setEditingItem({ ...item, type: 'metric' }); setShowForm(true); }}>编辑</button>
                                    <button className="btn btn-ghost" onClick={() => handleToggle(item, 'metric')}>{item.is_active ? '禁用' : '启用'}</button>
                                    <button className="btn btn-ghost" style={{ color: 'var(--error)' }} onClick={() => handleDelete(item, 'metric')}>删除</button>
                                </div>
                            </div>
                        ))}
                        {metricFields.length === 0 && (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                暂无指标字段，点击上方按钮添加
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 表单弹窗 */}
            {showForm && (
                <ConfigFormModal
                    item={editingItem}
                    type={activeSection === 'events' ? 'event' : 'metric'}
                    onClose={() => setShowForm(false)}
                    onSave={() => { setShowForm(false); loadData(); }}
                />
            )}
        </div>
    );
}

// 配置项表单弹窗
function ConfigFormModal({ item, type: defaultType, onClose, onSave }) {
    const type = item?.type || defaultType;
    const isEvent = type === 'event';

    const [form, setForm] = useState(isEvent ? {
        name: item?.name || '',
        description: item?.description || '',
        source: item?.source || '',
    } : {
        field_key: item?.field_key || '',
        label: item?.label || '',
        data_type: item?.data_type || 'number',
        description: item?.description || '',
    });
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (isEvent && !form.name) {
            alert('请填写事件名称'); return;
        }
        if (!isEvent && (!form.field_key || !form.label)) {
            alert('请填写字段键和标签'); return;
        }

        setSaving(true);
        try {
            if (item) {
                if (isEvent) {
                    await api.updateEventType(item.id, form);
                } else {
                    await api.updateMetricField(item.id, form);
                }
            } else {
                if (isEvent) {
                    await api.createEventType(form);
                } else {
                    await api.createMetricField(form);
                }
            }
            onSave();
        } catch (error) {
            alert('保存失败: ' + error.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
        }} onClick={onClose}>
            <div className="card" style={{ width: '480px' }} onClick={e => e.stopPropagation()}>
                <div className="card-header">
                    <h3 className="card-title">{item ? '编辑' : '添加'}{isEvent ? '事件类型' : '指标字段'}</h3>
                    <button className="btn btn-ghost" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit} style={{ padding: '0 24px 24px' }}>
                    {isEvent ? (
                        <>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>事件名称 *</label>
                                <input
                                    className="input"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="例如：项目交付评审通过"
                                />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>来源系统</label>
                                <input
                                    className="input"
                                    value={form.source}
                                    onChange={e => setForm({ ...form, source: e.target.value })}
                                    placeholder="例如：project-platform"
                                />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>描述</label>
                                <textarea
                                    className="input"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    rows={2}
                                    placeholder="事件触发条件说明"
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>字段键 *</label>
                                <input
                                    className="input"
                                    value={form.field_key}
                                    onChange={e => setForm({ ...form, field_key: e.target.value })}
                                    placeholder="例如：completion_rate"
                                    disabled={!!item}
                                />
                                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>用于规则条件中的字段标识，创建后不可修改</p>
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>显示标签 *</label>
                                <input
                                    className="input"
                                    value={form.label}
                                    onChange={e => setForm({ ...form, label: e.target.value })}
                                    placeholder="例如：完成率"
                                />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>数据类型</label>
                                <select
                                    className="input select"
                                    value={form.data_type}
                                    onChange={e => setForm({ ...form, data_type: e.target.value })}
                                >
                                    <option value="number">数字 (number)</option>
                                    <option value="string">文本 (string)</option>
                                    <option value="boolean">布尔 (boolean)</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>描述</label>
                                <textarea
                                    className="input"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    rows={2}
                                    placeholder="字段用途说明"
                                />
                            </div>
                        </>
                    )}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>取消</button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                            {saving ? '保存中...' : '💾 保存'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
