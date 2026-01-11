import { useState, useEffect } from 'react';
import api from '../services/api';

export default function BadgeWall({ userId = 'U001' }) {
    const [badges, setBadges] = useState([]);
    const [userInfo, setUserInfo] = useState(null);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [userId]);

    async function loadData() {
        try {
            const [badgesRes, userRes, pointsRes] = await Promise.all([
                api.getUserBadges(userId),
                api.getUser(userId),
                api.getUserPoints(userId),
            ]);
            setBadges(badgesRes.data);
            setUserInfo({
                ...userRes.data,
                ...pointsRes.data,
            });
        } catch (error) {
            console.error('加载数据失败:', error);
        } finally {
            setLoading(false);
        }
    }

    const categories = ['all', ...new Set(badges.map(b => b.category))];
    const filteredBadges = filter === 'all'
        ? badges
        : badges.filter(b => b.category === filter);

    // 按等级统计
    const levelStats = badges.reduce((acc, b) => {
        acc[b.level] = (acc[b.level] || 0) + 1;
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="badge-wall">
            <header className="page-header">
                <h1 className="page-title">我的徽章墙</h1>
                <p className="page-subtitle">展示你的成就与荣誉</p>
            </header>

            {/* 用户概览 */}
            <div className="card animate-fade-in" style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div className="leaderboard-avatar" style={{ width: '80px', height: '80px', fontSize: '32px' }}>
                        {userInfo?.name?.[0] || '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>{userInfo?.name}</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {userInfo?.department} · {userInfo?.position}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '32px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--warning)' }}>
                                {userInfo?.total_points?.toLocaleString() || 0}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>累计积分</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', fontWeight: 700 }}>{badges.length}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>徽章数量</div>
                        </div>
                    </div>
                </div>

                {/* 等级统计 */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                    {['钻', '金', '银', '铜'].map(level => (
                        <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--bg-tertiary)', borderRadius: '20px' }}>
                            <span>{getLevelIcon(level)}</span>
                            <span style={{ fontWeight: 600 }}>{levelStats[level] || 0}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{level}级</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 筛选器 */}
            <div className="badge-wall-header">
                <div className="badge-filters">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`filter-chip ${filter === cat ? 'active' : ''}`}
                            onClick={() => setFilter(cat)}
                        >
                            {cat === 'all' ? '全部' : cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* 徽章网格 */}
            {filteredBadges.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🏅</div>
                    <h3 className="empty-title">暂无徽章</h3>
                    <p className="empty-description">完成更多任务来获取徽章吧！</p>
                </div>
            ) : (
                <div className="badges-grid">
                    {filteredBadges.map((badge, index) => (
                        <BadgeCard key={badge.id} badge={badge} index={index} />
                    ))}
                </div>
            )}
        </div>
    );
}

function BadgeCard({ badge, index }) {
    const levelClass = getLevelClass(badge.level);

    return (
        <div
            className={`badge-card animate-scale-in`}
            style={{ animationDelay: `${index * 0.05}s` }}
        >
            <span className={`badge-level-tag ${levelClass}`}>{badge.level}</span>

            <div className="badge-icon-wrapper">
                <div className={`badge-glow ${levelClass}`} />
                <div className={`badge-icon ${levelClass}`}>
                    {getCategoryIcon(badge.category)}
                </div>
            </div>

            <h3 className="badge-name">{badge.name}</h3>
            <span className="badge-category">{badge.category}</span>
            <p className="badge-description">{badge.description}</p>

            <div className="badge-points">
                <span>⭐</span>
                <span>{badge.points} 积分</span>
            </div>

            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                获得于 {formatDate(badge.granted_at)}
            </div>
        </div>
    );
}

function getLevelClass(level) {
    const map = { '铜': 'bronze', '银': 'silver', '金': 'gold', '钻': 'diamond' };
    return map[level] || 'bronze';
}

function getLevelIcon(level) {
    const map = { '铜': '🥉', '银': '🥈', '金': '🥇', '钻': '💎' };
    return map[level] || '🏅';
}

function getCategoryIcon(category) {
    const map = {
        '项目贡献': '🚀',
        '学习成长': '📚',
        '团队协作': '🤝',
        '创新贡献': '💡',
        '技术贡献': '💻',
        '文化类': '🌟',
        '成长类': '🌱',
    };
    return map[category] || '🏅';
}

function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('zh-CN');
}
