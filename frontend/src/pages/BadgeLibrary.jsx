import { useState, useEffect } from 'react';
import api from '../services/api';

export default function BadgeLibrary() {
    const [badges, setBadges] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filter, setFilter] = useState('all');
    const [levelFilter, setLevelFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [badgesRes, categoriesRes] = await Promise.all([
                api.getBadges(),
                api.getBadgeCategories(),
            ]);
            setBadges(badgesRes.data);
            setCategories(categoriesRes.data);
        } catch (error) {
            console.error('加载数据失败:', error);
        } finally {
            setLoading(false);
        }
    }

    const levels = ['all', '钻', '金', '银', '铜'];

    const filteredBadges = badges.filter(b => {
        if (filter !== 'all' && b.category !== filter) return false;
        if (levelFilter !== 'all' && b.level !== levelFilter) return false;
        return true;
    });

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="badge-library">
            <header className="page-header">
                <h1 className="page-title">徽章库</h1>
                <p className="page-subtitle">浏览所有可获得的徽章</p>
            </header>

            {/* 分类统计 */}
            <div className="stats-grid" style={{ marginBottom: '32px' }}>
                {categories.map((cat, index) => (
                    <div
                        key={cat.category}
                        className={`stat-card animate-fade-in`}
                        style={{
                            animationDelay: `${index * 0.1}s`,
                            cursor: 'pointer',
                            borderColor: filter === cat.category ? 'var(--primary-500)' : 'var(--border-color)',
                        }}
                        onClick={() => setFilter(filter === cat.category ? 'all' : cat.category)}
                    >
                        <div className="stat-icon">{getCategoryIcon(cat.category)}</div>
                        <div className="stat-value">{cat.count}</div>
                        <div className="stat-label">{cat.category}</div>
                    </div>
                ))}
            </div>

            {/* 筛选器 */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div className="badge-filters">
                    <button
                        className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        全部分类
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.category}
                            className={`filter-chip ${filter === cat.category ? 'active' : ''}`}
                            onClick={() => setFilter(cat.category)}
                        >
                            {cat.category}
                        </button>
                    ))}
                </div>

                <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
                    <div className="badge-filters">
                        {levels.map(level => (
                            <button
                                key={level}
                                className={`filter-chip ${levelFilter === level ? 'active' : ''}`}
                                onClick={() => setLevelFilter(level)}
                            >
                                {level === 'all' ? '全部等级' : `${getLevelIcon(level)} ${level}`}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 徽章列表 */}
            {filteredBadges.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <h3 className="empty-title">没有找到徽章</h3>
                    <p className="empty-description">尝试调整筛选条件</p>
                </div>
            ) : (
                <div className="badges-grid">
                    {filteredBadges.map((badge, index) => (
                        <LibraryBadgeCard key={badge.id} badge={badge} index={index} />
                    ))}
                </div>
            )}
        </div>
    );
}

function LibraryBadgeCard({ badge, index }) {
    const levelClass = getLevelClass(badge.level);

    return (
        <div
            className="badge-card animate-scale-in"
            style={{ animationDelay: `${index * 0.03}s` }}
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

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '16px' }}>
                <div className="badge-points">
                    <span>⭐</span>
                    <span>{badge.points} 积分</span>
                </div>
            </div>

            {badge.condition_json && (
                <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                }}>
                    <strong>获取条件：</strong>
                    <div style={{ marginTop: '4px' }}>
                        {formatCondition(badge.condition_json)}
                    </div>
                </div>
            )}
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

function formatCondition(conditionJson) {
    try {
        const condition = typeof conditionJson === 'string'
            ? JSON.parse(conditionJson)
            : conditionJson;

        if (condition.event) {
            return `触发事件: ${condition.event}`;
        }
        if (condition.metric) {
            return `指标要求: ${condition.metric}`;
        }
        return JSON.stringify(condition);
    } catch {
        return '自动或手动授予';
    }
}
