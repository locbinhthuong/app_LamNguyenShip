import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = () => {
    if (confirm('Đăng xuất?')) { logout(); navigate('/login'); }
  };

  const navClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${isActive
      ? 'bg-orange-500/20 text-orange-400'
      : 'text-gray-300 hover:bg-gray-700 hover:text-orange-300'
    }`;

  const NAV_ITEMS = [
    { to: '/',         end: true,  icon: '📊', label: 'Dashboard' },
    { to: '/orders',               icon: '📦', label: 'Đơn hàng' },
    { to: '/orders/create',        icon: '➕', label: 'Tạo đơn hàng' },
    { to: '/driver-map',           icon: '🗺️', label: 'Bản đồ GPS' },
    { to: '/revenue',              icon: '💰', label: 'Doanh thu' },
    { to: '/drivers',              icon: '🚗', label: 'Tài xế' },
    { to: '/drivers/create',       icon: '👤', label: 'Thêm tài xế' },
  ];

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-gray-900">

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          style={{ display: 'block' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className="fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col bg-gray-800 shadow-2xl"
        style={{
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div className="border-b border-gray-700 p-5">
          <h1 className="text-lg font-bold text-orange-500">🚚 LamNguyenShip</h1>
          <p className="mt-0.5 text-xs text-gray-400">Quản trị hệ thống</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={navClass}
              onClick={() => setSidebarOpen(false)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-700 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 font-bold text-white">
              {admin?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{admin?.name || 'Admin'}</p>
              <p className="truncate text-xs text-gray-400">{admin?.role || 'Quản trị'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-red-400 transition-all hover:bg-red-500/10 active:bg-red-500/20"
          >
            🚪 Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-gray-700 bg-gray-800 px-4 shadow-sm">
          <button
            type="button"
            aria-label="Mở menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white transition-colors hover:bg-gray-700 active:bg-gray-600"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="truncate text-sm font-bold text-orange-400">🚚 LamNguyenShip</span>
        </header>

        <main className="min-w-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
