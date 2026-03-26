import { useState, useEffect } from 'react';
import { getRevenueStats } from '../services/api';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

export default function Revenue() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    dailyRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0
  });
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const res = await getRevenueStats();
      if (res.success && res.data) {
        setStats(res.data.stats);
        setDrivers(res.data.drivers);
      }
    } catch (error) {
      console.error('Lỗi tải doanh thu:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white uppercase tracking-wider">💰 Quản Lý Doanh Thu</h1>
        <button 
          onClick={fetchRevenueData}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-500 shadow-lg shadow-emerald-500/20"
        >
          🔄 Làm mới
        </button>
      </div>

      {/* 4 THẺ THỐNG KÊ DOANH THU */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* DOANH THU NGÀY */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 to-gray-900 p-6 border border-emerald-800 shadow-lg">
          <div className="absolute -right-4 -top-4 text-emerald-500/10 h-24 w-24">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest relative z-10">Trong Ngày</h3>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-white relative z-10">{formatCurrency(stats.dailyRevenue)}</p>
        </div>

        {/* DOANH THU TUẦN */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-900 to-gray-900 p-6 border border-teal-800 shadow-lg">
          <div className="absolute -right-4 -top-4 text-teal-500/10 h-24 w-24">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-teal-400 uppercase tracking-widest relative z-10">Trong Tuần</h3>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-white relative z-10">{formatCurrency(stats.weeklyRevenue)}</p>
        </div>

        {/* DOANH THU THÁNG */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-900 to-gray-900 p-6 border border-cyan-800 shadow-lg">
          <div className="absolute -right-4 -top-4 text-cyan-500/10 h-24 w-24">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest relative z-10">Trong Tháng</h3>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-white relative z-10">{formatCurrency(stats.monthlyRevenue)}</p>
        </div>

        {/* TỔNG DOANH THU */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900 to-gray-900 p-6 border border-amber-800 shadow-lg">
          <div className="absolute -right-4 -top-4 text-amber-500/10 h-24 w-24">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest relative z-10">Tổng Doanh Thu Cước</h3>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-white relative z-10">{formatCurrency(stats.totalRevenue)}</p>
        </div>
      </div>

      {/* BẢNG CÔNG NỢ TÀI XẾ 15% */}
      <div className="flex-1 rounded-2xl bg-gray-800 border-gray-700 shadow flex flex-col overflow-hidden">
        <div className="border-b border-gray-700 p-4 sm:p-5 bg-gradient-to-r from-gray-800 to-gray-900">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span>🧾</span> Bảng Công Nợ Tài Xế <span className="text-sm font-normal text-emerald-400 bg-emerald-900/40 px-3 py-1 rounded-full whitespace-nowrap hidden sm:inline-block border border-emerald-800">Trích nộp phí nền tảng 15%</span>
          </h2>
        </div>
        
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-900/50 text-xs uppercase text-gray-400 sticky top-0">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-300">Tài xế / SĐT</th>
                <th className="px-6 py-4 font-semibold text-gray-300">Đơn Hoàn Thành</th>
                <th className="px-6 py-4 font-semibold text-gray-300 text-right">Tổng Cước (100%)</th>
                <th className="px-6 py-4 font-bold text-emerald-400 text-right bg-emerald-900/10">Cần Thu (15%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500 italic text-base">
                    Chưa có tài xế nào hoàn thành đơn hàng.
                  </td>
                </tr>
              ) : (
                drivers.map((d) => (
                  <tr key={d.driverId} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white text-base">{d.name || 'Không tên'}</p>
                      <p className="text-xs text-gray-500 mt-1">📞 {d.phone || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-3 py-1 bg-gray-900 rounded-full text-gray-300 font-medium">
                        {d.totalOrders} đơn
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-white font-medium">{formatCurrency(d.totalFee)}</span>
                    </td>
                    <td className="px-6 py-4 text-right bg-emerald-900/5">
                      <span className="text-lg font-bold text-emerald-400">{formatCurrency(d.debt)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
