import { useState, useEffect } from 'react';
import api from '../services/api';
import DrillDownModal from '../components/DrillDownModal';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [activity, setActivity] = useState([]);
    const [distribution, setDistribution] = useState(null);
    const [loading, setLoading] = useState(true);
    const [drillDown, setDrillDown] = useState(null); // { type, title }

    useEffect(() => {
        loadData();

        // Refresh data when page becomes visible
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                loadData();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    async function loadData() {
        try {
            const [statsRes, activityRes, distributionRes] = await Promise.all([
                api.getStatsOverview(),
                api.getRecentActivity(10),
                api.getBadgeDistribution(),
            ]);
            setStats(statsRes.data);
            setActivity(activityRes.data);
            setDistribution(distributionRes.data);
        } catch (error) {
            console.error('加载数据失败:', error);
        } finally {
            setLoading(false);
        }
    }

    function openDrillDown(type, title) {
        setDrillDown({ type, title });
    }

    function closeDrillDown() {
        setDrillDown(null);
    }

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="dashboard">
            <header className="page-header">
                <h1 className="page-title">首页概览</h1>
                <p className="page-subtitle">实时查看徽章体系运营数据</p>
            </header>

            {/* 统计卡片 - 可点击下钻 */}
            <div className="stats-grid">
                <div
                    className="stat-card clickable animate-fade-in stagger-1"
                    onClick={() => openDrillDown('users', '👥 用户列表')}
                >
                    <div className="stat-icon">👥</div>
                    <div className="stat-value">{stats?.total_users || 0}</div>
                    <div className="stat-label">总用户数</div>
                    <div className="stat-trend up">
                        <span>↑ 12%</span>
                        <span>较上月</span>
                    </div>
                </div>

                <div
                    className="stat-card success clickable animate-fade-in stagger-2"
                    onClick={() => openDrillDown('badges', '🏅 已发放徽章')}
                >
                    <div className="stat-icon">🏅</div>
                    <div className="stat-value">{stats?.total_badges_granted || 0}</div>
                    <div className="stat-label">已发放徽章</div>
                    <div className="stat-trend up">
                        <span>↑ 25%</span>
                        <span>较上月</span>
                    </div>
                </div>

                <div
                    className="stat-card warning clickable animate-fade-in stagger-3"
                    onClick={() => openDrillDown('coverage', '📊 持有徽章的用户')}
                >
                    <div className="stat-icon">📊</div>
                    <div className="stat-value">{stats?.coverage_rate || 0}%</div>
                    <div className="stat-label">员工覆盖率</div>
                    <div className="stat-trend up">
                        <span>↑ 8%</span>
                        <span>较上月</span>
                    </div>
                </div>

                <div
                    className="stat-card gold clickable animate-fade-in stagger-4"
                    onClick={() => openDrillDown('points', '⭐ 积分排行榜')}
                >
                    <div className="stat-icon">⭐</div>
                    <div className="stat-value">{(stats?.total_points_distributed || 0).toLocaleString()}</div>
                    <div className="stat-label">累计发放积分</div>
                    <div className="stat-trend up">
                        <span>↑ 30%</span>
                        <span>较上月</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* 徽章分类分布 */}
                <div className="card animate-fade-in stagger-5">
                    <div className="card-header">
                        <h3 className="card-title">📊 徽章分类分布</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {distribution?.by_category?.map((cat, index) => (
                            <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '80px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    {cat.category}
                                </div>
                                <div style={{ flex: 1, height: '24px', background: 'var(--bg-tertiary)', borderRadius: '12px', overflow: 'hidden' }}>
                                    <div
                                        style={{
                                            height: '100%',
                                            width: `${Math.min((cat.count / Math.max(...distribution.by_category.map(c => c.count || 1))) * 100, 100)}%`,
                                            background: `hsl(${index * 60}, 70%, 60%)`,
                                            borderRadius: '12px',
                                            transition: 'width 0.5s ease',
                                        }}
                                    />
                                </div>
                                <div style={{ width: '40px', textAlign: 'right', fontWeight: 600 }}>{cat.count || 0}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 等级分布 */}
                <div className="card animate-fade-in stagger-6">
                    <div className="card-header">
                        <h3 className="card-title">🎖️ 徽章等级分布</h3>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-around', padding: '20px 0' }}>
                        {distribution?.by_level?.map((level) => (
                            <div key={level.level} style={{ textAlign: 'center' }}>
                                <div
                                    className={`badge-icon ${getLevelClass(level.level)}`}
                                    style={{ width: '60px', height: '60px', margin: '0 auto 12px', fontSize: '24px' }}
                                >
                                    {getLevelIcon(level.level)}
                                </div>
                                <div style={{ fontSize: '24px', fontWeight: 700 }}>{level.count || 0}</div>
                                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{level.level}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 最近动态 */}
            <div className="card animate-fade-in" style={{ marginTop: '24px' }}>
                <div className="card-header">
                    <h3 className="card-title">📣 最近动态</h3>
                    <button
                        className="btn btn-ghost"
                        onClick={() => openDrillDown('badges', '🏅 徽章发放记录')}
                    >
                        查看全部
                    </button>
                </div>
                <div className="activity-feed" style={{ background: 'transparent', border: 'none' }}>
                    {activity.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                            暂无最近动态
                        </div>
                    ) : (
                        activity.map((item) => (
                            <div key={item.id} className="activity-item">
                                <div className="activity-avatar">{item.user_name?.[0] || '?'}</div>
                                <div className="activity-content">
                                    <div className="activity-text">
                                        <span className="activity-highlight">{item.user_name}</span>
                                        {' '}获得了{' '}
                                        <span className="activity-highlight">{item.badge_name}</span>
                                        {' '}徽章
                                    </div>
                                    <div className="activity-time">{formatTime(item.granted_at)}</div>
                                </div>
                                <div className={`activity-badge-mini ${getLevelClass(item.level)}`}>
                                    {item.icon_type === 'emoji' ? item.icon_value : getLevelIcon(item.level)}
                                </div>
                            </div>
                        ))
                    )}
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

function getLevelClass(level) {
    const map = { '铜': 'bronze', '银': 'silver', '金': 'gold', '钻': 'diamond' };
    return map[level] || 'bronze';
}

function getLevelIcon(level) {
    const map = { '铜': '🥉', '银': '🥈', '金': '🥇', '钻': '💎' };
    return map[level] || '🏅';
}

function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
}
