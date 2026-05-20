import React, { useState, useEffect, useCallback } from 'react';
import { getRevenueStats, getFinanceStats } from '../services/api';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

// Format date to YYYY-MM-DD for API and input
const toDateString = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Format date to DD/MM/YYYY for display
const toDisplayDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

export default function Revenue() {
  const [selectedDate, setSelectedDate] = useState(() => toDateString(new Date()));
  const [stats, setStats] = useState({
    totalRevenue: 0,
    dailyRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0
  });
  const [stats15, setStats15] = useState({
    dailyDiscount: 0,
    weeklyDiscount: 0,
    monthlyDiscount: 0,
    yearlyDiscount: 0
  });
  const [stats20, setStats20] = useState({
    dailyDiscount: 0,
    weeklyDiscount: 0,
    monthlyDiscount: 0,
    yearlyDiscount: 0
  });
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  const fetchRevenueData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getRevenueStats(selectedDate);
      const financeRes = await getFinanceStats();
      if (res.success && res.data) {
        setStats(res.data.stats);
        setDrivers(res.data.drivers);
      }
      if (financeRes.success && financeRes.data) {
        setStats15(financeRes.data.stats15 || { dailyDiscount: 0, weeklyDiscount: 0, monthlyDiscount: 0, yearlyDiscount: 0 });
        setStats20(financeRes.data.stats20 || { dailyDiscount: 0, weeklyDiscount: 0, monthlyDiscount: 0, yearlyDiscount: 0 });
      }
    } catch (error) {
      console.error('Lỗi tải doanh thu:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchRevenueData();
  }, [fetchRevenueData]);

  // Date navigation helpers
  const goToPreviousDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(toDateString(d));
  };

  const goToNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    // Cho phép xem đến ngày hôm nay
    if (d <= todayDate) {
      setSelectedDate(toDateString(d));
    }
  };

  const goToToday = () => {
    setSelectedDate(toDateString(new Date()));
  };

  const isToday = selectedDate === toDateString(new Date());
  const displayDate = toDisplayDate(selectedDate);

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

      {/* THỐNG KÊ DOANH THU & CHIẾT KHẤU XẾP CHỒNG */}
      <div className="flex flex-col space-y-6">
        {/* BẢNG DOANH THU CƯỚC */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
          <div className="bg-emerald-50 border-b border-emerald-100 p-3 text-center">
            <h2 className="font-bold text-emerald-700 text-sm tracking-widest uppercase">Tổng Doanh Thu Cước</h2>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Ngày:</h3>
              <p className="text-xl font-black text-slate-800">{formatCurrency(stats.dailyRevenue)}</p>
            </div>
            <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Tuần:</h3>
              <p className="text-xl font-black text-slate-800">{formatCurrency(stats.weeklyRevenue)}</p>
            </div>
            <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Tháng:</h3>
              <p className="text-xl font-black text-slate-800">{formatCurrency(stats.monthlyRevenue)}</p>
            </div>
            <div className="p-4 sm:p-5 flex items-center justify-between bg-emerald-50/30 hover:bg-emerald-50/50 transition-colors">
              <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Tổng Cước:</h3>
              <p className="text-xl font-black text-emerald-600">{formatCurrency(stats.totalRevenue)}</p>
            </div>
          </div>
        </div>

        {/* BẢNG CHIẾT KHẤU 15% */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
          <div className="bg-purple-50 border-b border-purple-100 p-3 text-center">
            <h2 className="font-bold text-purple-700 text-sm tracking-widest uppercase">Tổng Doanh Thu Chiết Khấu (15%)</h2>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Ngày:</h3>
              <p className="text-xl font-black text-slate-800">{formatCurrency(stats15.dailyDiscount)}</p>
            </div>
            <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Tuần:</h3>
              <p className="text-xl font-black text-slate-800">{formatCurrency(stats15.weeklyDiscount)}</p>
            </div>
            <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Tháng:</h3>
              <p className="text-xl font-black text-slate-800">{formatCurrency(stats15.monthlyDiscount)}</p>
            </div>
            <div className="p-4 sm:p-5 flex items-center justify-between bg-purple-50/30 hover:bg-purple-50/50 transition-colors">
              <h3 className="text-sm font-bold text-purple-600 uppercase tracking-widest">Tổng (Năm):</h3>
              <p className="text-xl font-black text-purple-600">{formatCurrency(stats15.yearlyDiscount)}</p>
            </div>
          </div>
        </div>

        {/* BẢNG CHIẾT KHẤU 20% */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
          <div className="bg-orange-50 border-b border-orange-100 p-3 text-center">
            <h2 className="font-bold text-orange-700 text-sm tracking-widest uppercase">Tổng Doanh Thu Chiết Khấu (20%)</h2>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Ngày:</h3>
              <p className="text-xl font-black text-slate-800">{formatCurrency(stats20.dailyDiscount)}</p>
            </div>
            <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Tuần:</h3>
              <p className="text-xl font-black text-slate-800">{formatCurrency(stats20.weeklyDiscount)}</p>
            </div>
            <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Tháng:</h3>
              <p className="text-xl font-black text-slate-800">{formatCurrency(stats20.monthlyDiscount)}</p>
            </div>
            <div className="p-4 sm:p-5 flex items-center justify-between bg-orange-50/30 hover:bg-orange-50/50 transition-colors">
              <h3 className="text-sm font-bold text-orange-600 uppercase tracking-widest">Tổng (Năm):</h3>
              <p className="text-xl font-black text-orange-600">{formatCurrency(stats20.yearlyDiscount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* BẢNG CÔNG NỢ TÀI XẾ */}
      <div className="flex-1 rounded-2xl bg-white border-slate-200 shadow flex flex-col overflow-hidden">
        <div className="border-b border-blue-100 p-4 sm:p-5 bg-gradient-to-r from-blue-50 to-white">
          <h2 className="text-lg sm:text-xl font-bold text-blue-800 flex items-center gap-2">
            <span>🧾</span> Bảng Doanh Thu Chi Tiết
          </h2>
        </div>

        {/* DESKTOP VIEW BẢNG DOANH THU HOẠT ĐỘNG */}
        <div className="flex-1 overflow-x-auto">
          {/* Header filter - BỘ LỌC NGÀY */}
          <div className="border-b border-slate-200 p-4 bg-white flex items-center gap-3 flex-wrap">
             <span className="font-bold text-slate-700">Bộ lọc hoạt động</span>
             
             {/* Nút lùi ngày */}
             <button
               onClick={goToPreviousDay}
               className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition-all hover:shadow-sm active:scale-95"
               title="Ngày trước"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
               </svg>
             </button>

             {/* Ô chọn ngày + hiển thị */}
             <div className="relative">
               <input
                 type="date"
                 value={selectedDate}
                 max={toDateString(new Date())}
                 onChange={(e) => {
                   if (e.target.value) setSelectedDate(e.target.value);
                 }}
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
               />
               <span className="bg-orange-50 text-orange-600 border border-orange-200 px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer select-none hover:bg-orange-100 transition-colors">
                  📅 Ngày: {displayDate}
               </span>
             </div>

             {/* Nút tiến ngày */}
             <button
               onClick={goToNextDay}
               disabled={isToday}
               className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all active:scale-95 ${
                 isToday 
                   ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed' 
                   : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 hover:shadow-sm'
               }`}
               title="Ngày sau"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
               </svg>
             </button>

             {/* Nút về Hôm nay */}
             {!isToday && (
               <button
                 onClick={goToToday}
                 className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-all hover:shadow-md active:scale-95"
               >
                 Hôm nay
               </button>
             )}
          </div>
          <table className="w-full text-left text-sm text-slate-700 font-medium">
            <thead className="bg-white border-b border-slate-200 text-slate-800 text-sm">
              <tr>
                <th className="px-4 py-4 font-bold">#</th>
                <th className="px-4 py-4 font-bold">Tài xế</th>
                <th className="px-4 py-4 font-bold">Đơn Ngày</th>
                <th className="px-4 py-4 font-bold">Ship Ngày</th>
                <th className="px-4 py-4 font-bold">Đơn Tháng</th>
                <th className="px-4 py-4 font-bold">Bonus tháng</th>
                <th className="px-4 py-4 font-bold">Ship tháng</th>
                <th className="px-4 py-4 font-bold">Đơn Tổng</th>
                <th className="px-4 py-4 font-bold">Bonus Tổng</th>
                <th className="px-4 py-4 font-bold">Ship Tổng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-slate-500 italic text-base">
                    {isToday ? 'Chưa có tài xế nào hoàn thành đơn hàng.' : `Không có dữ liệu cho ngày ${displayDate}.`}
                  </td>
                </tr>
              ) : (
                drivers.map((d, idx) => (
                  <tr key={d.driverId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 font-bold text-slate-800">{idx + 1}</td>
                    <td className="px-4 py-4 font-bold text-slate-800 whitespace-nowrap">{d.name || 'Không tên'}</td>
                    <td className="px-4 py-4 text-emerald-500 font-bold whitespace-nowrap flex items-center gap-1.5">
                      <span className="text-lg">☀️</span> {d.todayOrders || 0}
                    </td>
                    <td className="px-4 py-4 text-emerald-500 font-bold whitespace-nowrap">{formatCurrency(d.todayFee || 0)}</td>
                    <td className="px-4 py-4 text-orange-500 font-bold whitespace-nowrap flex items-center gap-1.5">
                      <span className="text-lg">📅</span> {d.monthOrders || 0}
                    </td>
                    <td className="px-4 py-4 font-bold whitespace-nowrap">{formatCurrency(d.monthBonus || 0)}</td>
                    <td className="px-4 py-4 text-orange-500 font-bold whitespace-nowrap">{formatCurrency(d.monthFee || 0)}</td>
                    <td className="px-4 py-4 text-blue-600 font-bold whitespace-nowrap flex items-center gap-1.5">
                      <span className="text-lg">📄</span> {d.totalOrders || 0}
                    </td>
                    <td className="px-4 py-4 font-bold whitespace-nowrap">{formatCurrency(d.totalBonus || 0)}</td>
                    <td className="px-4 py-4 text-blue-600 font-bold whitespace-nowrap">{formatCurrency(d.totalFee || 0)}</td>
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
