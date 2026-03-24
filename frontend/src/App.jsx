import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Admin from './pages/Admin';

function App() {
  const location = useLocation();

  return (
    <div className="mobile-container">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile bg-white border-t border-gray-200 safe-bottom z-50">
        <div className="flex justify-around items-center py-2">
          <Link
            to="/"
            className={`flex flex-col items-center py-2 px-4 ${
              location.pathname === '/' ? 'text-orange-500' : 'text-gray-400'
            }`}
          >
            <span className="text-2xl">🏠</span>
            <span className="text-xs font-medium mt-1">Trang chủ</span>
          </Link>
          <Link
            to="/admin"
            className={`flex flex-col items-center py-2 px-4 ${
              location.pathname === '/admin' ? 'text-orange-500' : 'text-gray-400'
            }`}
          >
            <span className="text-2xl">⚙️</span>
            <span className="text-xs font-medium mt-1">Admin</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

export default App;
