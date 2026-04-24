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

      {/* 4 THẺ THỐNG KÊ DOANH THU (GỘP CHUNG MỘT KHUNG) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
        {/* DOANH THU NGÀY */}
        <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Ngày:</h3>
          <p className="text-xl font-black text-slate-800">{formatCurrency(stats.dailyRevenue)}</p>
        </div>

        {/* DOANH THU TUẦN */}
        <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Tuần:</h3>
          <p className="text-xl font-black text-slate-800">{formatCurrency(stats.weeklyRevenue)}</p>
        </div>

        {/* DOANH THU THÁNG */}
        <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Tháng:</h3>
          <p className="text-xl font-black text-slate-800">{formatCurrency(stats.monthlyRevenue)}</p>
        </div>

        {/* TỔNG DOANH THU */}
        <div className="p-4 sm:p-5 flex items-center justify-between bg-amber-50/30 hover:bg-amber-50/50 transition-colors">
          <h3 className="text-sm font-bold text-amber-600 uppercase tracking-widest">Tổng Cước:</h3>
          <p className="text-xl font-black text-amber-600">{formatCurrency(stats.totalRevenue)}</p>
        </div>
      </div>

      {/* BẢNG CÔNG NỢ TÀI XẾ 15% */}
      <div className="flex-1 rounded-2xl bg-white border-slate-200 shadow flex flex-col overflow-hidden">
        <div className="border-b border-blue-100 p-4 sm:p-5 bg-gradient-to-r from-blue-50 to-white">
          <h2 className="text-lg sm:text-xl font-bold text-blue-800 flex items-center gap-2">
            <span>🧾</span> Bảng Doanh Thu Chi Tiết
          </h2>
        </div>

        {/* DESKTOP VIEW BẢNG DOANH THU HOẠT ĐỘNG */}
        <div className="flex-1 overflow-x-auto">
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
