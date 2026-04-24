import React, { useState, useEffect } from 'react';
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
  const [expandedRow, setExpandedRow] = useState(null);

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
        <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wider">💰 Quản Lý Doanh Thu</h1>
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-white p-6 border border-blue-100">
          <div className="absolute -right-4 -top-4 text-blue-500/10 h-24 w-24">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest relative z-10">Trong Ngày</h3>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-800 relative z-10">{formatCurrency(stats.dailyRevenue)}</p>
        </div>

        {/* DOANH THU TUẦN */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-50 to-white p-6 border border-sky-100">
          <div className="absolute -right-4 -top-4 text-sky-500/10 h-24 w-24">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-sky-600 uppercase tracking-widest relative z-10">Trong Tuần</h3>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-800 relative z-10">{formatCurrency(stats.weeklyRevenue)}</p>
        </div>

        {/* DOANH THU THÁNG */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-50 to-white p-6 border border-cyan-100">
          <div className="absolute -right-4 -top-4 text-cyan-500/10 h-24 w-24">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-cyan-600 uppercase tracking-widest relative z-10">Trong Tháng</h3>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-800 relative z-10">{formatCurrency(stats.monthlyRevenue)}</p>
        </div>

        {/* TỔNG DOANH THU */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-white p-6 border border-amber-100">
          <div className="absolute -right-4 -top-4 text-amber-500/10 h-24 w-24">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-amber-600 uppercase tracking-widest relative z-10">Tổng Doanh Thu Cước</h3>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-800 relative z-10">{formatCurrency(stats.totalRevenue)}</p>
        </div>
      </div>

      {/* BẢNG CÔNG NỢ TÀI XẾ 15% */}
      <div className="flex-1 rounded-2xl bg-white border-slate-200 shadow flex flex-col overflow-hidden">
        <div className="border-b border-blue-100 p-4 sm:p-5 bg-gradient-to-r from-blue-50 to-white">
          <h2 className="text-lg sm:text-xl font-bold text-blue-800 flex items-center gap-2">
            <span>🧾</span> Bảng Công Nợ Tài Xế <span className="text-sm font-normal text-blue-600 bg-blue-100/50 px-3 py-1 rounded-full whitespace-nowrap hidden sm:inline-block border border-blue-200">Trích nộp phí nền tảng 15%</span>
          </h2>
        </div>
        
        {/* MOBILE VIEW BẢNG CÔNG NỢ */}
        <div className="grid grid-cols-1 gap-4 p-4 lg:hidden">
            {drivers.length === 0 ? (
                <div className="py-8 text-center text-slate-500 italic">Chưa có tài xế nào hoàn thành đơn hàng.</div>
            ) : (
                drivers.map(d => (
                    <div key={d.driverId} className="bg-white border text-sm border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <p className="font-bold text-slate-800 text-lg">{d.name || 'Không tên'}</p>
                                <p className="text-xs text-slate-500">📞 {d.phone || 'N/A'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-blue-500 uppercase">Thu 15% Hôm Nay</p>
                                <p className="text-xl font-black text-blue-600 ">{formatCurrency(d.debt || 0)}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-center bg-slate-50 rounded-lg p-3">
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Đơn Hoàn Thành</p>
                                <p className="text-base font-bold text-slate-700">{d.totalOrders || 0}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Tổng Cước (100%)</p>
                                <p className="text-base font-bold text-emerald-600">{formatCurrency(d.totalFee || 0)}</p>
                            </div>
                        </div>

                        <button 
                            onClick={() => setExpandedRow(expandedRow === d.driverId ? null : d.driverId)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {expandedRow === d.driverId ? 'Thu Gọn Chi Tiết 🔼' : 'Xem Chi Tiết 🔽'}
                        </button>

                        {expandedRow === d.driverId && (
                            <div className="grid grid-cols-2 gap-3 mt-1 pt-3 border-t border-slate-100">
                                <div className="bg-white rounded-xl p-3 border border-blue-100 col-span-2 relative overflow-hidden">
                                  <p className="text-[10px] font-bold text-blue-500 uppercase mb-1 relative z-10">Trong Ngày</p>
                                  <div className="flex items-center justify-between relative z-10">
                                    <p className="text-xl font-black text-slate-800">{formatCurrency(d.todayFee)}</p>
                                    <p className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{d.todayOrders || 0} đơn</p>
                                  </div>
                                </div>
                                
                                <div className="bg-gray-50 rounded-xl p-3 border border-slate-100 shadow-inner">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Tuần Này</p>
                                  <p className="text-sm font-bold text-slate-800">{formatCurrency(d.weekFee)}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">{d.weekOrders || 0} đơn</p>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-3 border border-slate-100 shadow-inner">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Tháng Này</p>
                                  <p className="text-sm font-bold text-slate-800">{formatCurrency(d.monthFee)}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">{d.monthOrders || 0} đơn</p>
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>

        {/* DESKTOP VIEW BẢNG DOANH THU HOẠT ĐỘNG */}
        <div className="hidden lg:block flex-1 overflow-x-auto">
          {/* Header filter (Mô phỏng như hình) */}
          <div className="border-b border-slate-200 p-4 bg-white flex items-center gap-3">
             <span className="font-bold text-slate-700">Bộ lọc hoạt động</span>
             <span className="bg-orange-50 text-orange-600 border border-orange-200 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer">
                Ngày: {new Date().toLocaleDateString('vi-VN')}
             </span>
          </div>
          <table className="w-full text-left text-sm text-slate-700 font-medium">
            <thead className="bg-white border-b border-slate-200 text-slate-800 text-sm">
              <tr>
                <th className="px-4 py-4 font-bold">#</th>
                <th className="px-4 py-4 font-bold">Tài xế</th>
                <th className="px-4 py-4 font-bold">Đơn Tổng</th>
                <th className="px-4 py-4 font-bold">Bonus Tổng</th>
                <th className="px-4 py-4 font-bold">Ship Tổng</th>
                <th className="px-4 py-4 font-bold">Đơn Tháng</th>
                <th className="px-4 py-4 font-bold">Bonus tháng</th>
                <th className="px-4 py-4 font-bold">Ship tháng</th>
                <th className="px-4 py-4 font-bold">Đơn Ngày</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-slate-500 italic text-base">
                    Chưa có tài xế nào hoàn thành đơn hàng.
                  </td>
                </tr>
              ) : (
                drivers.map((d, idx) => (
                  <tr key={d.driverId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 font-bold text-slate-800">{idx + 1}</td>
                    <td className="px-4 py-4 font-bold text-slate-800 whitespace-nowrap">{d.name || 'Không tên'}</td>
                    <td className="px-4 py-4 text-blue-600 font-bold whitespace-nowrap flex items-center gap-1.5">
                      <span className="text-lg">📄</span> {d.totalOrders || 0}
                    </td>
                    <td className="px-4 py-4 font-bold whitespace-nowrap">{formatCurrency(d.totalBonus || 0)}</td>
                    <td className="px-4 py-4 text-blue-600 font-bold whitespace-nowrap">{formatCurrency(d.totalFee || 0)}</td>
                    <td className="px-4 py-4 text-orange-500 font-bold whitespace-nowrap flex items-center gap-1.5">
                      <span className="text-lg">📅</span> {d.monthOrders || 0}
                    </td>
                    <td className="px-4 py-4 font-bold whitespace-nowrap">{formatCurrency(d.monthBonus || 0)}</td>
                    <td className="px-4 py-4 text-orange-500 font-bold whitespace-nowrap">{formatCurrency(d.monthFee || 0)}</td>
                    <td className="px-4 py-4 text-emerald-500 font-bold whitespace-nowrap flex items-center gap-1.5">
                      <span className="text-lg">☀️</span> {d.todayOrders || 0}
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
