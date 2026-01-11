import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * 统计下钻弹窗组件
 * 支持分页、搜索、多种列表类型
 */
export default function DrillDownModal({ type, title, onClose }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);

    // 300ms debounce for search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1); // Reset to first page on search
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch data with pagination and search
    useEffect(() => {
        fetchData();
    }, [type, debouncedSearch, page]);

    async function fetchData() {
        setLoading(true);
        try {
            const params = { search: debouncedSearch, page, limit: 20 };
            let response;

            switch (type) {
                case 'users':
                    response = await api.getUsersList(params);
                    break;
                case 'badges':
                    response = await api.getGrantedBadgesList(params);
                    break;
                case 'coverage':
                    response = await api.getUsersWithBadges(params);
                    break;
                case 'points':
                    response = await api.getPointsLeaderboard(params);
                    break;
                default:
                    response = { data: [], pagination: null };
            }

            setData(response.data || []);
            setPagination(response.pagination || null);
        } catch (error) {
            console.error('加载数据失败:', error);
            setData([]);
        } finally {
            setLoading(false);
        }
    }

    const renderContent = () => {
        if (loading) {
            return (
                <div className="drill-down-loading">
                    <div className="spinner" />
                </div>
            );
        }

        if (data.length === 0) {
            return (
                <div className="drill-down-empty">
                    暂无数据
                </div>
            );
        }

        switch (type) {
            case 'users':
                return <UsersList data={data} />;
            case 'badges':
                return <BadgesList data={data} />;
            case 'coverage':
                return <CoverageList data={data} />;
            case 'points':
                return <PointsList data={data} />;
            default:
                return null;
        }
    };

    const getSearchPlaceholder = () => {
        switch (type) {
            case 'users':
                return '搜索姓名、工号或部门...';
            case 'badges':
                return '搜索用户姓名或徽章名称...';
            case 'coverage':
            case 'points':
                return '搜索姓名或部门...';
            default:
                return '搜索...';
        }
    };

    return (
        <div className="drill-down-overlay" onClick={onClose}>
            <div className="drill-down-modal" onClick={e => e.stopPropagation()}>
                <div className="drill-down-header">
                    <h2 className="drill-down-title">{title}</h2>
                    <button className="drill-down-close" onClick={onClose}>×</button>
                </div>

                <div className="drill-down-search">
                    <input
                        type="text"
                        className="input"
                        placeholder={getSearchPlaceholder()}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="drill-down-content">
                    {renderContent()}
                </div>

                {pagination && pagination.total_pages > 1 && (
                    <div className="drill-down-pagination">
                        <button
                            className="btn btn-ghost"
                            disabled={page <= 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                        >
                            ← 上一页
                        </button>
                        <span className="pagination-info">
                            第 {page} / {pagination.total_pages} 页（共 {pagination.total} 条）
                        </span>
                        <button
                            className="btn btn-ghost"
                            disabled={page >= pagination.total_pages}
                            onClick={() => setPage(p => p + 1)}
                        >
                            下一页 →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// 用户列表
function UsersList({ data }) {
    return (
        <div className="drill-down-list">
            {data.map(user => (
                <div key={user.id} className="drill-down-item">
                    <div className="drill-down-avatar">{user.name?.[0] || '?'}</div>
                    <div className="drill-down-item-content">
                        <div className="drill-down-item-title">{user.name}</div>
                        <div className="drill-down-item-subtitle">
                            {user.employee_id} · {user.department}
                        </div>
                    </div>
                    <div className="drill-down-item-stats">
                        <span className="stat-badge">{user.badge_count || 0} 个徽章</span>
                        <span className="stat-points">{user.total_points || 0} 积分</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// 徽章发放列表
function BadgesList({ data }) {
    return (
        <div className="drill-down-list">
            {data.map(grant => (
                <div key={grant.id} className="drill-down-item">
                    <div className="drill-down-badge-icon">
                        {grant.icon_type === 'emoji' ? grant.icon_value : '🏅'}
                    </div>
                    <div className="drill-down-item-content">
                        <div className="drill-down-item-title">
                            <span className="highlight">{grant.user_name}</span> 获得 <span className="highlight">{grant.badge_name}</span>
                        </div>
                        <div className="drill-down-item-subtitle">
                            {grant.department} · {grant.category} · {grant.level}
                            {grant.grant_reason && ` · ${grant.grant_reason}`}
                        </div>
                    </div>
                    <div className="drill-down-item-time">
                        {formatTime(grant.granted_at)}
                    </div>
                </div>
            ))}
        </div>
    );
}

// 持有徽章用户列表
function CoverageList({ data }) {
    return (
        <div className="drill-down-list">
            {data.map(user => (
                <div key={user.id} className="drill-down-item">
                    <div className="drill-down-avatar">{user.name?.[0] || '?'}</div>
                    <div className="drill-down-item-content">
                        <div className="drill-down-item-title">{user.name}</div>
                        <div className="drill-down-item-subtitle">
                            {user.department} · {user.position}
                        </div>
                    </div>
                    <div className="drill-down-item-stats">
                        <span className="stat-badge">{user.badge_count} 个徽章</span>
                        <span className="stat-time">最近获得: {formatTime(user.latest_badge_at)}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// 积分排行榜列表
function PointsList({ data }) {
    return (
        <div className="drill-down-list">
            {data.map((user, index) => (
                <div key={user.id} className="drill-down-item">
                    <div className={`drill-down-rank rank-${index < 3 ? index + 1 : 'other'}`}>
                        {index + 1}
                    </div>
                    <div className="drill-down-avatar">{user.name?.[0] || '?'}</div>
                    <div className="drill-down-item-content">
                        <div className="drill-down-item-title">{user.name}</div>
                        <div className="drill-down-item-subtitle">
                            {user.department} · {user.badge_count} 个徽章
                        </div>
                    </div>
                    <div className="drill-down-item-points">
                        <span className="points-value">{user.total_points}</span>
                        <span className="points-label">积分</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function formatTime(dateString) {
    if (!dateString) return '-';
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
