import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getRevenueStats, getFinanceStats, updateDriver } from '../services/api';

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

const formatClockTime = (dateStr) => {
  if (!dateStr) return '---';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

export default function Revenue() {
  const [selectedDate, setSelectedDate] = useState(() => toDateString(new Date()));
  const [viewTab, setViewTab] = useState('revenue'); // 'revenue' | 'online' | 'late'
  const [onlineSortBy, setOnlineSortBy] = useState('pointsDay'); // 'pointsDay' | 'pointsWeek' | 'onlineDay' | 'ordersDay' | 'onlineWeek'
  const [lateScope, setLateScope] = useState('week'); // 'day' | 'week'
  const [lateDriverFilter, setLateDriverFilter] = useState('ALL');
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
  const [lateOrders, setLateOrders] = useState({
    todayCount: 0,
    weekCount: 0,
    todayList: [],
    weekList: []
  });
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  // Sắp xếp danh sách tài xế cho Tab Thống Kê Online
  const sortedOnlineDrivers = useMemo(() => {
    if (!drivers || drivers.length === 0) return [];
    const list = [...drivers];
    return list.sort((a, b) => {
      if (onlineSortBy === 'pointsWeek') {
        if ((b.weekTotalPoints || 0) !== (a.weekTotalPoints || 0)) {
          return (b.weekTotalPoints || 0) - (a.weekTotalPoints || 0);
        }
        return (b.weekOrders || 0) - (a.weekOrders || 0);
      }
      if (onlineSortBy === 'ordersDay') {
        if ((b.todayOrders || 0) !== (a.todayOrders || 0)) return (b.todayOrders || 0) - (a.todayOrders || 0);
        return (b.todayOnlineSeconds || 0) - (a.todayOnlineSeconds || 0);
      }
      if (onlineSortBy === 'onlineDay') {
        if ((b.todayOnlineSeconds || 0) !== (a.todayOnlineSeconds || 0)) {
          return (b.todayOnlineSeconds || 0) - (a.todayOnlineSeconds || 0);
        }
        return (b.todayOrders || 0) - (a.todayOrders || 0);
      }
      if (onlineSortBy === 'onlineWeek') {
        if ((b.weekOnlineSeconds || 0) !== (a.weekOnlineSeconds || 0)) {
          return (b.weekOnlineSeconds || 0) - (a.weekOnlineSeconds || 0);
        }
        return (b.weekOrders || 0) - (a.weekOrders || 0);
      }
      // Mặc định: Điểm Ngày (1 đơn = 1đ, 30p online = 1đ)
      if ((b.todayTotalPoints || 0) !== (a.todayTotalPoints || 0)) {
        return (b.todayTotalPoints || 0) - (a.todayTotalPoints || 0);
      }
      if ((b.todayOrders || 0) !== (a.todayOrders || 0)) {
        return (b.todayOrders || 0) - (a.todayOrders || 0);
      }
      return (b.todayOnlineSeconds || 0) - (a.todayOnlineSeconds || 0);
    });
  }, [drivers, onlineSortBy]);

  // Danh sách tài xế có đơn trễ (sắp xếp giảm dần theo số đơn giao trễ tuần)
  const lateDriversSummary = useMemo(() => {
    if (!drivers || drivers.length === 0) return [];
    return [...drivers]
      .filter(d => (d.weekLateOrders || 0) > 0 || (d.todayLateOrders || 0) > 0 || (d.weekLatePickupOrders || 0) > 0)
      .sort((a, b) => {
        if ((b.weekLateOrders || 0) !== (a.weekLateOrders || 0)) {
          return (b.weekLateOrders || 0) - (a.weekLateOrders || 0);
        }
        return (b.todayLateOrders || 0) - (a.todayLateOrders || 0);
      });
  }, [drivers]);

  // Danh sách chi tiết đơn giao trễ theo bộ lọc Ngày/Tuần và Tài xế
  const filteredLateOrdersList = useMemo(() => {
    const rawList = lateScope === 'day' ? (lateOrders.todayList || []) : (lateOrders.weekList || []);
    if (lateDriverFilter === 'ALL') return rawList;
    return rawList.filter(item => item.driverId === lateDriverFilter);
  }, [lateOrders, lateScope, lateDriverFilter]);

  const fetchRevenueData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getRevenueStats(selectedDate);
      const financeRes = await getFinanceStats(selectedDate);
      if (res.success && res.data) {
        setStats(res.data.stats);
        setDrivers(res.data.drivers);
        setLateOrders(res.data.lateOrders || { todayCount: 0, weekCount: 0, todayList: [], weekList: [] });
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

      {/* BẢNG CÔNG NỢ TÀI XẾ & THỐNG KÊ ONLINE */}
      <div className="flex-1 rounded-2xl bg-white border-slate-200 shadow flex flex-col overflow-hidden">
        {/* TAB CHUYỂN ĐỔI: DOANH THU, THỐNG KÊ ONLINE & ĐƠN TRỄ */}
        <div className="border-b border-blue-100 p-3 sm:p-4 bg-gradient-to-r from-blue-50/70 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setViewTab('revenue')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                viewTab === 'revenue'
                  ? 'bg-blue-600 text-white shadow-blue-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>🧾</span> Bảng Doanh Thu Chi Tiết
            </button>
            <button
              type="button"
              onClick={() => setViewTab('online')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                viewTab === 'online'
                  ? 'bg-emerald-600 text-white shadow-emerald-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>⏱️</span> Thống Kê Online & Hiệu Suất
            </button>
            <button
              type="button"
              onClick={() => setViewTab('late')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                viewTab === 'late'
                  ? 'bg-red-600 text-white shadow-red-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
              }`}
            >
              <span>🚨</span> Thống Kê Đơn Trễ (&gt;35p)
              {(lateOrders.weekCount > 0 || lateOrders.todayCount > 0) && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-black ${
                    viewTab === 'late'
                      ? 'bg-white text-red-600'
                      : 'bg-red-100 text-red-700 border border-red-200'
                  }`}
                >
                  {lateOrders.weekCount} tuần / {lateOrders.todayCount} ngày
                </span>
              )}
            </button>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {viewTab === 'revenue'
              ? '📊 Báo cáo doanh thu & công nợ'
              : viewTab === 'online'
              ? '⚡ Thời gian hoạt động & điểm thưởng tài xế'
              : '🚨 Quản lý đơn giao trễ (>35 phút từ lúc Đã lấy hàng -> Hoàn thành)'}
          </span>
        </div>

        {/* DESKTOP VIEW BẢNG */}
        <div className="flex-1 overflow-x-auto">
          {/* Header filter - BỘ LỌC NGÀY & SẮP XẾP */}
          <div className="border-b border-slate-200 p-4 bg-white flex items-center justify-between gap-3 flex-wrap">
             <div className="flex items-center gap-2 flex-wrap">
               <span className="font-bold text-slate-700 text-sm">Bộ lọc ngày:</span>
               
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
                 <span className="bg-orange-50 text-orange-600 border border-orange-200 px-3.5 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer select-none hover:bg-orange-100 transition-colors">
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
                   className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:shadow-md active:scale-95"
                 >
                   Hôm nay
                 </button>
               )}
             </div>

             {/* Nút sắp xếp dành riêng cho Tab Online */}
              {viewTab === 'online' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-slate-500">Sắp xếp:</span>
                  <button
                    type="button"
                    onClick={() => setOnlineSortBy('pointsDay')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      onlineSortBy === 'pointsDay'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    🏆 Điểm Ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnlineSortBy('pointsWeek')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      onlineSortBy === 'pointsWeek'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    🏆 Điểm Tuần
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnlineSortBy('onlineDay')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      onlineSortBy === 'onlineDay'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ⏱️ Online Ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnlineSortBy('ordersDay')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      onlineSortBy === 'ordersDay'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ☀️ Đơn Ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnlineSortBy('onlineWeek')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      onlineSortBy === 'onlineWeek'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ⏱️ Online Tuần
                  </button>
                </div>
              )}

              {/* Bộ lọc dành riêng cho Tab Đơn Trễ */}
              {viewTab === 'late' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setLateScope('day')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        lateScope === 'day'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      ☀️ Trong Ngày ({lateOrders.todayCount || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLateScope('week')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        lateScope === 'week'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      📊 Trong Tuần ({lateOrders.weekCount || 0})
                    </button>
                  </div>

                  <select
                    value={lateDriverFilter}
                    onChange={(e) => setLateDriverFilter(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-red-500"
                  >
                    <option value="ALL">👤 Tất cả tài xế</option>
                    {drivers.map(d => (
                      <option key={d.driverId} value={d.driverId}>
                        {d.name} ({d.weekLateOrders || 0} trễ tuần)
                      </option>
                    ))}
                  </select>
                </div>
              )}
          </div>

          {/* TAB 1: BẢNG DOANH THU CHI TIẾT */}
          {viewTab === 'revenue' ? (
            <table className="w-full text-left text-sm text-slate-700 font-medium">
              <thead className="bg-white border-b border-slate-200 text-slate-800 text-sm">
                <tr>
                  <th className="px-4 py-4 font-bold">#</th>
                  <th className="px-4 py-4 font-bold">Tài xế</th>
                  <th className="px-4 py-4 font-bold">Đơn Ngày</th>
                  <th className="px-4 py-4 font-bold">Ship Ngày</th>
                  <th className="px-4 py-4 font-bold text-indigo-600 bg-indigo-50/50">Đơn Tuần</th>
                  <th className="px-4 py-4 font-bold text-indigo-600 bg-indigo-50/50">Ship Tuần</th>
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
                    <td colSpan="12" className="px-6 py-12 text-center text-slate-500 italic text-base">
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
                      <td className="px-4 py-4 text-indigo-600 font-bold whitespace-nowrap bg-indigo-50/30 flex items-center gap-1.5">
                        <span className="text-lg">📊</span> {d.weekOrders || 0}
                      </td>
                      <td className="px-4 py-4 text-indigo-600 font-bold whitespace-nowrap bg-indigo-50/30">{formatCurrency(d.weekFee || 0)}</td>
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
          ) : viewTab === 'online' ? (
            /* TAB 2: BẢNG THỐNG KÊ ONLINE & HIỆU SUẤT THEO NGÀY */
            <table className="w-full text-left text-sm text-slate-700 font-medium whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 text-xs uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-4 py-3.5 text-center w-14">#</th>
                  <th className="px-4 py-3.5">Tài xế</th>
                  <th className="px-4 py-3.5 text-center">Trạng thái</th>
                  <th className="px-4 py-3.5 text-center bg-emerald-50/60 text-emerald-800">⏱️ Online Ngày</th>
                  <th className="px-4 py-3.5 text-center bg-emerald-50/60 text-emerald-800">☀️ Đơn Ngày</th>
                  <th className="px-4 py-3.5 text-center bg-emerald-50/60 text-amber-800">🏆 Điểm Ngày</th>
                  <th className="px-4 py-3.5 text-right bg-emerald-50/60 text-emerald-800">Ship Ngày</th>
                  <th className="px-4 py-3.5 text-center bg-indigo-50/50 text-indigo-800">⏱️ Online Tuần</th>
                  <th className="px-4 py-3.5 text-center bg-indigo-50/50 text-indigo-800">📊 Đơn Tuần</th>
                  <th className="px-4 py-3.5 text-center bg-indigo-50/50 text-amber-800">🏆 Điểm Tuần</th>
                  <th className="px-4 py-3.5 text-right bg-indigo-50/50 text-indigo-800">Ship Tuần</th>
                  <th className="px-4 py-3.5 text-center bg-red-50/60 text-red-700">🚨 Đơn Trễ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedOnlineDrivers.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="px-6 py-12 text-center text-slate-500 italic text-base">
                      Không có dữ liệu cho ngày {displayDate}.
                    </td>
                  </tr>
                ) : (
                  sortedOnlineDrivers.map((d, idx) => {
                    return (
                      <tr key={d.driverId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 text-center font-bold text-slate-600">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                            {d.name || 'Không tên'}
                            {d.driverCode && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {d.driverCode}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-medium">{d.phone || '---'}</div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {d.isOnline ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                                <span className="w-2 h-2 rounded-full bg-slate-400" /> Offline
                              </span>
                            )}
                            {((d.idleLockedUntil && new Date(d.idleLockedUntil).getTime() > Date.now()) || (d.idleWarningLevel > 0)) && (
                              <div className="flex flex-col items-center gap-1 mt-0.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  d.idleLockedUntil && new Date(d.idleLockedUntil).getTime() > Date.now()
                                    ? 'bg-red-100 text-red-700 border-red-300'
                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                                }`}>
                                  {d.idleLockedUntil && new Date(d.idleLockedUntil).getTime() > Date.now()
                                    ? `🔒 Khóa treo Lần ${d.idleWarningLevel || 2}`
                                    : `⚠️ Cảnh báo treo Lần ${d.idleWarningLevel}`}
                                </span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!window.confirm(`Mở khóa / gỡ cảnh báo treo app cho tài xế "${d.name}"?`)) return;
                                    try {
                                      await updateDriver(d.driverId, { unlockIdle: true });
                                      await fetchRevenueData();
                                      alert(`Đã mở khóa treo app cho tài xế "${d.name}"!`);
                                    } catch (err) {
                                      alert('Lỗi mở khóa cảnh báo treo app');
                                    }
                                  }}
                                  className="px-2.5 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-sm transition-colors"
                                >
                                  🔓 Mở khóa
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center bg-emerald-50/20">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 shadow-sm">
                            <span>⏱️</span> {d.todayOnlineTimeStr || '0p'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center bg-emerald-50/20">
                          <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-full bg-blue-50 border border-blue-100 px-2 text-xs font-black text-blue-600 shadow-sm">
                            {d.todayOrders || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center bg-emerald-50/20">
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 shadow-sm">
                              🏆 {d.todayTotalPoints || 0} điểm
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                              {d.todayOrderPoints || 0}đ đơn + {d.todayTimePoints || 0}đ giờ
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-emerald-600 bg-emerald-50/20">
                          {formatCurrency(d.todayFee || 0)}
                        </td>
                        <td className="px-4 py-3.5 text-center bg-indigo-50/20">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100 shadow-sm">
                            <span>⏱️</span> {d.weekOnlineTimeStr || '0p'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center bg-indigo-50/20">
                          <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 px-2 text-xs font-black text-indigo-600 shadow-sm">
                            {d.weekOrders || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center bg-indigo-50/20">
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-300 shadow-sm">
                              🏆 {d.weekTotalPoints || 0} điểm
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                              {d.weekOrderPoints || 0}đ đơn + {d.weekTimePoints || 0}đ giờ
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-indigo-600 bg-indigo-50/20">
                          {formatCurrency(d.weekFee || 0)}
                        </td>
                        <td className="px-4 py-3.5 text-center bg-red-50/10">
                          {(d.weekLateOrders || 0) > 0 || (d.todayLateOrders || 0) > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setLateDriverFilter(d.driverId);
                                setViewTab('late');
                              }}
                              className="inline-flex flex-col items-center px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                              title="Bấm để xem chi tiết các đơn trễ của tài xế này"
                            >
                              <span className="text-xs font-black">🚨 {d.todayLateOrders || 0} ngày / {d.weekLateOrders || 0} tuần</span>
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              ✓ Đúng giờ
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* TAB 3: BẢNG THỐNG KÊ ĐƠN TRỄ (>35 PHÚT) */
            <div className="p-4 space-y-6 bg-slate-50/40">
              {/* PHẦN A: BẢNG TỔNG HỢP TÀI XẾ CÓ ĐƠN TRỄ */}
              <div className="bg-white rounded-xl border border-red-100 overflow-hidden shadow-sm">
                <div className="bg-red-50/80 border-b border-red-100 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📊</span>
                    <h3 className="text-sm font-black text-red-800 uppercase tracking-wide">
                      Tổng Hợp Tài Xế Có Đơn Đi Trễ (Tuần Của Ngày {displayDate})
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-red-600">
                    Quy chuẩn: Lấy hàng &lt; 15 phút | Giao hàng ≤ 35 phút (từ lúc bấm Đã lấy hàng)
                  </span>
                </div>

                {lateDriversSummary.length === 0 ? (
                  <div className="p-6 text-center text-emerald-700 font-semibold text-sm bg-emerald-50/30">
                    🎉 Tuyệt vời! Không có tài xế nào bị trễ đơn trong tuần này.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-600">
                        <tr>
                          <th className="px-4 py-3 text-center w-12">#</th>
                          <th className="px-4 py-3">Tài xế</th>
                          <th className="px-4 py-3 text-center">Trễ Lấy Hàng (≥15p)</th>
                          <th className="px-4 py-3 text-center bg-red-50/50 text-red-700">🚨 Giao Trễ Ngày (&gt;35p)</th>
                          <th className="px-4 py-3 text-center bg-red-50/50 text-red-700">🚨 Giao Trễ Tuần (&gt;35p)</th>
                          <th className="px-4 py-3 text-center">Tổng Đơn Tuần</th>
                          <th className="px-4 py-3 text-center">Tỷ Lệ Giao Trễ Tuần</th>
                          <th className="px-4 py-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lateDriversSummary.map((d, index) => {
                          const lateRate = d.weekOrders > 0
                            ? Math.round(((d.weekLateOrders || 0) / d.weekOrders) * 100)
                            : 0;
                          return (
                            <tr key={d.driverId} className="hover:bg-red-50/20 transition-colors">
                              <td className="px-4 py-3 text-center font-bold text-slate-600">{index + 1}</td>
                              <td className="px-4 py-3">
                                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                  {d.name}
                                  {d.driverCode && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                      {d.driverCode}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-400">{d.phone}</div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  ⏳ {d.todayLatePickupOrders || 0} ngày / {d.weekLatePickupOrders || 0} tuần
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center bg-red-50/20">
                                <span className={`inline-flex h-6 min-w-[28px] items-center justify-center rounded-full px-2.5 text-xs font-black ${
                                  (d.todayLateOrders || 0) > 0
                                    ? 'bg-red-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {d.todayLateOrders || 0} đơn
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center bg-red-50/20">
                                <span className={`inline-flex h-6 min-w-[28px] items-center justify-center rounded-full px-2.5 text-xs font-black ${
                                  (d.weekLateOrders || 0) > 0
                                    ? 'bg-red-100 text-red-700 border border-red-300'
                                    : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {d.weekLateOrders || 0} đơn
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-slate-700">
                                {d.weekOrders || 0} đơn
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-xs font-black px-2 py-0.5 rounded ${
                                  lateRate >= 30 ? 'bg-red-100 text-red-700' : 'bg-orange-50 text-orange-700'
                                }`}>
                                  {lateRate}%
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => setLateDriverFilter(lateDriverFilter === d.driverId ? 'ALL' : d.driverId)}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    lateDriverFilter === d.driverId
                                      ? 'bg-red-600 text-white'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  {lateDriverFilter === d.driverId ? 'Đang lọc (Bỏ lọc)' : '🔍 Xem đơn trễ'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* PHẦN B: DANH SÁCH CHI TIẾT CÁC ĐƠN GIAO TRỄ (>35 PHÚT) */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span>🚨</span>
                    <h3 className="text-sm font-bold uppercase tracking-wide">
                      Chi Tiết Đơn Giao Trễ (&gt;35 Phút) — {lateScope === 'day' ? `Ngày ${displayDate}` : `Tuần Của Ngày ${displayDate}`}
                    </h3>
                  </div>
                  <span className="text-xs font-bold bg-red-500/20 text-red-200 border border-red-400/30 px-2.5 py-0.5 rounded-full">
                    Hiển thị: {filteredLateOrdersList.length} đơn trễ
                  </span>
                </div>

                {filteredLateOrdersList.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 italic">
                    Không có đơn hàng nào giao trễ (&gt;35 phút) trong khoảng thời gian đang chọn.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-600">
                        <tr>
                          <th className="px-4 py-3 text-center w-12">#</th>
                          <th className="px-4 py-3">Mã Đơn</th>
                          <th className="px-4 py-3">Tài Xế</th>
                          <th className="px-4 py-3">Khách Hàng & Lộ Trình</th>
                          <th className="px-4 py-3">Mốc Thời Gian</th>
                          <th className="px-4 py-3 text-center">Thời Gian Giao</th>
                          <th className="px-4 py-3">Lý Do Giao Trễ (Tài xế báo)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLateOrdersList.map((ord, idx) => (
                          <tr key={ord._id} className="hover:bg-red-50/10 transition-colors">
                            <td className="px-4 py-3.5 text-center font-bold text-slate-500">{idx + 1}</td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="font-mono font-black text-blue-600 text-sm">
                                #{ord.orderCode}
                              </div>
                              <div className="mt-1">
                                {ord.status === 'COMPLETED' ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                    Đã hoàn tất
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 animate-pulse">
                                    Đang đi giao
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="font-bold text-slate-800">{ord.driverName}</div>
                              <div className="text-xs text-slate-400">{ord.driverPhone || ord.driverCode}</div>
                            </td>
                            <td className="px-4 py-3.5 max-w-xs">
                              <div className="font-bold text-slate-800 text-xs">
                                KH: {ord.customerName} {ord.customerPhone ? `(${ord.customerPhone})` : ''}
                              </div>
                              <div className="text-xs text-slate-500 truncate mt-0.5" title={ord.pickupAddress}>
                                <span className="font-semibold text-orange-600">Lấy:</span> {ord.pickupAddress}
                              </div>
                              {ord.deliveryAddress && (
                                <div className="text-xs text-slate-500 truncate" title={ord.deliveryAddress}>
                                  <span className="font-semibold text-blue-600">Giao:</span> {ord.deliveryAddress}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600">
                              <div><span className="font-semibold text-slate-700">Nhận:</span> {formatClockTime(ord.acceptedAt)}</div>
                              <div className="mt-0.5">
                                <span className="font-semibold text-orange-600">Lấy hàng:</span> {formatClockTime(ord.pickedUpAt)}
                                {ord.pickupDurationMinutes > 0 && (
                                  <span className={`ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    ord.isLatePickup ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    ({ord.pickupDurationMinutes}p)
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5">
                                <span className="font-semibold text-emerald-600">Giao xong:</span> {ord.deliveredAt ? formatClockTime(ord.deliveredAt) : 'Đang giao...'}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                              <div className="inline-flex flex-col items-center">
                                <span className="px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-700 border border-red-300 shadow-sm">
                                  🚨 {ord.deliveryDurationMinutes} phút
                                </span>
                                <span className="text-[11px] font-bold text-red-600 mt-1">
                                  Trễ +{ord.overtimeMinutes} phút (vượt mốc 35p)
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {ord.lateReason ? (
                                <div className="inline-flex items-start gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold max-w-xs">
                                  <span>💬</span>
                                  <span>{ord.lateReason}</span>
                                </div>
                              ) : (
                                <span className="text-xs italic text-slate-400">
                                  Chưa ghi lý do
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
