import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import BadgeWall from './pages/BadgeWall';
import Leaderboard from './pages/Leaderboard';
import BadgeLibrary from './pages/BadgeLibrary';
import Admin from './pages/Admin';

function App() {
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        // 模拟当前登录用户
        setCurrentUser({
            id: 'U001',
            name: '张三',
            department: '科技研发部',
            position: '高级工程师',
        });
    }, []);

    return (
        <BrowserRouter>
            <div className="app">
                <Sidebar currentUser={currentUser} />
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/badges" element={<BadgeWall userId={currentUser?.id} />} />
                        <Route path="/library" element={<BadgeLibrary />} />
                        <Route path="/leaderboard" element={<Leaderboard />} />
                        <Route path="/admin" element={<Admin />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

function Sidebar({ currentUser }) {
    const navItems = [
        { path: '/', icon: '🏠', label: '首页概览' },
        { path: '/badges', icon: '🏅', label: '我的徽章' },
        { path: '/library', icon: '📚', label: '徽章库' },
        { path: '/leaderboard', icon: '🏆', label: '排行榜' },
        { path: '/admin', icon: '⚙️', label: '管理后台' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">🏅</div>
                <div>
                    <div className="sidebar-title">微徽章 2.0</div>
                    <div className="sidebar-subtitle">MicroBadge System</div>
                </div>
            </div>

            <nav>
                <ul className="nav-menu">
                    {navItems.map((item) => (
                        <li key={item.path} className="nav-item">
                            <NavLink
                                to={item.path}
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span>{item.label}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            {currentUser && (
                <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="leaderboard-avatar">{currentUser.name[0]}</div>
                        <div>
                            <div style={{ fontWeight: 600 }}>{currentUser.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{currentUser.department}</div>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}

export default App;
