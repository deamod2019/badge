import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Leaderboard() {
    const [tab, setTab] = useState('individual');
    const [individuals, setIndividuals] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [indRes, deptRes] = await Promise.all([
                api.getIndividualLeaderboard({ limit: 20 }),
                api.getDepartmentLeaderboard(),
            ]);
            setIndividuals(indRes.data);
            setDepartments(deptRes.data);
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

    return (
        <div className="leaderboard-page">
            <header className="page-header">
                <h1 className="page-title">排行榜</h1>
                <p className="page-subtitle">查看个人与部门的徽章成就排名</p>
            </header>

            {/* 标签切换 */}
            <div className="tabs" style={{ maxWidth: '400px', marginBottom: '32px' }}>
                <button
                    className={`tab ${tab === 'individual' ? 'active' : ''}`}
                    onClick={() => setTab('individual')}
                >
                    🏆 个人排行
                </button>
                <button
                    className={`tab ${tab === 'department' ? 'active' : ''}`}
                    onClick={() => setTab('department')}
                >
                    🏢 部门排行
                </button>
            </div>

            {tab === 'individual' ? (
                <IndividualLeaderboard data={individuals} />
            ) : (
                <DepartmentLeaderboard data={departments} />
            )}
        </div>
    );
}

function IndividualLeaderboard({ data }) {
    return (
        <div className="leaderboard animate-fade-in">
            <div className="leaderboard-header">
                <h3 className="leaderboard-title">个人积分排行</h3>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    共 {data.length} 人上榜
                </span>
            </div>

            {/* 前三名特殊展示 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', padding: '32px', background: 'var(--bg-tertiary)' }}>
                {data.slice(0, 3).map((user, index) => (
                    <TopThreeCard key={user.id} user={user} rank={index + 1} />
                ))}
            </div>

            {/* 其他排名 */}
            {data.slice(3).map((user, index) => (
                <div key={user.id} className="leaderboard-item">
                    <div className="leaderboard-rank">{index + 4}</div>
                    <div className="leaderboard-avatar">{user.name?.[0]}</div>
                    <div className="leaderboard-info">
                        <div className="leaderboard-name">{user.name}</div>
                        <div className="leaderboard-department">{user.department} · {user.position}</div>
                    </div>
                    <div className="leaderboard-stats">
                        <div className="leaderboard-points">⭐ {user.total_points?.toLocaleString()}</div>
                        <div className="leaderboard-badges">🏅 {user.badge_count} 徽章</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function TopThreeCard({ user, rank }) {
    const colors = {
        1: { bg: 'var(--gradient-gold)', shadow: 'rgba(255, 215, 0, 0.4)', size: '120px' },
        2: { bg: 'var(--gradient-silver)', shadow: 'rgba(192, 192, 192, 0.4)', size: '100px' },
        3: { bg: 'var(--gradient-bronze)', shadow: 'rgba(205, 127, 50, 0.4)', size: '100px' },
    };
    const config = colors[rank];

    return (
        <div style={{
            textAlign: 'center',
            order: rank === 1 ? 1 : rank === 2 ? 0 : 2,
            marginTop: rank === 1 ? 0 : '20px',
        }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{
                    width: config.size,
                    height: config.size,
                    borderRadius: '50%',
                    background: config.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: rank === 1 ? '48px' : '36px',
                    fontWeight: 700,
                    color: '#1a1a2e',
                    boxShadow: `0 0 30px ${config.shadow}`,
                    marginBottom: '16px',
                }}>
                    {user.name?.[0]}
                </div>
                <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: config.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#1a1a2e',
                    border: '3px solid var(--bg-tertiary)',
                }}>
                    {rank}
                </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: '18px', marginBottom: '4px' }}>{user.name}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                {user.department}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                    ⭐ {user.total_points?.toLocaleString()}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                    🏅 {user.badge_count}
                </span>
            </div>
        </div>
    );
}

function DepartmentLeaderboard({ data }) {
    const maxPoints = Math.max(...data.map(d => d.total_points || 0), 1);

    return (
        <div className="card animate-fade-in">
            <div className="card-header">
                <h3 className="card-title">部门积分排行</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {data.map((dept, index) => (
                    <div key={dept.department} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: index < 3 ? `var(--gradient-${['gold', 'silver', 'bronze'][index]})` : 'var(--bg-tertiary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: index < 3 ? '#1a1a2e' : 'var(--text-primary)',
                        }}>
                            {index + 1}
                        </div>

                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 600 }}>{dept.department}</span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                    {dept.employee_count} 人 · {dept.total_badges} 徽章
                                </span>
                            </div>
                            <div style={{
                                height: '12px',
                                background: 'var(--bg-tertiary)',
                                borderRadius: '6px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${(dept.total_points / maxPoints) * 100}%`,
                                    background: 'var(--gradient-primary)',
                                    borderRadius: '6px',
                                    transition: 'width 0.5s ease',
                                }} />
                            </div>
                        </div>

                        <div style={{
                            minWidth: '100px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: 'var(--warning)'
                        }}>
                            ⭐ {dept.total_points?.toLocaleString() || 0}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
