import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (confirm('Đăng xuất?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold text-orange-500">🚚 LamNguyenShip</h1>
          <p className="text-xs text-gray-400 mt-1">Quản trị hệ thống</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span>📊</span><span>Dashboard</span>
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span>📦</span><span>Đơn hàng</span>
          </NavLink>
          <NavLink to="/orders/create" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span>➕</span><span>Tạo đơn hàng</span>
          </NavLink>
          <NavLink to="/drivers" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span>🚗</span><span>Tài xế</span>
          </NavLink>
          <NavLink to="/drivers/create" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span>👤</span><span>Thêm tài xế</span>
          </NavLink>
        </nav>

        {/* Admin Info */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">A</div>
            <div>
              <p className="text-white font-medium text-sm">{admin?.name}</p>
              <p className="text-gray-400 text-xs">{admin?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-red-400 text-sm hover:bg-red-500/10 rounded-xl transition-all">
            🚪 Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
