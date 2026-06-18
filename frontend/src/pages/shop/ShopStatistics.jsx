import React, { useState, useEffect, useMemo } from 'react';
import { PackageCheck, CheckCircle, XCircle, TrendingUp, DollarSign, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line } from 'recharts';

const ShopStatistics = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statFilter, setStatFilter] = useState('day');
  const [showShippingModal, setShowShippingModal] = useState(false); // 'day', 'week', 'month'
  const [mainTab, setMainTab] = useState('revenue'); // 'revenue' or 'orders'
  const [selectedStatus, setSelectedStatus] = useState('placed');

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/customer/my');
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const handleRefresh = (e) => {
      fetchOrders();
    };

    const handleDeleted = (e) => {
      if (typeof e.detail === 'string') {
        setOrders(prev => prev.filter(o => o._id !== e.detail));
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchOrders();
      }
    };

    window.addEventListener('refresh_orders_data', handleRefresh);
    window.addEventListener('order_deleted_event', handleDeleted);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('refresh_orders_data', handleRefresh);
      window.removeEventListener('order_deleted_event', handleDeleted);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const getStatusConfig = (order) => {
    const { status, serviceType } = order;
    switch(status) {
      case 'COMPLETED': return { text: 'Đã hoàn thành', color: 'text-green-500', bg: 'bg-green-50', icon: <CheckCircle size={16}/> };
      case 'CANCELLED': return { text: 'Đã hủy', color: 'text-red-500', bg: 'bg-red-50', icon: <XCircle size={16}/> };
      default: return { text: 'Khác', color: 'text-gray-500', bg: 'bg-gray-100', icon: <PackageCheck size={16}/> };
    }
  };

  const historyOrders = orders.filter(o => ['COMPLETED', 'CANCELLED'].includes(o.status));

  // Thống kê logic
  const statsData = useMemo(() => {
    const completedOrders = orders.filter(o => o.status === 'COMPLETED');
    const now = new Date();
    now.setHours(23, 59, 59, 999); // Tính đến cuối ngày hôm nay
    
    let chartData = [];
    let totalRevenue = 0;
    let totalShipping = 0;
    let totalOrders = 0;
    let shopPaidShipping = 0;
    let customerPaidShipping = 0;

    const formatDate = (d) => `${d.getDate()}/${d.getMonth() + 1}`;

    if (statFilter === 'day') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        chartData.push({ name: formatDate(d), revenue: 0, shipping: 0, shopPaid: 0, customerPaid: 0, orders: 0, time: d.getTime() });
      }

      completedOrders.forEach(o => {
        const od = new Date(o.createdAt);
        const match = chartData.find(c => c.name === formatDate(od));
        if (match) {
          match.revenue += (o.codAmount || 0);
          match.shipping += (o.deliveryFee || 0);
          if (o.feePaidBy === 'SENDER') match.shopPaid += (o.deliveryFee || 0);
          else match.customerPaid += (o.deliveryFee || 0);
          match.orders += 1;
        }
      });
    } else if (statFilter === 'week') {
      for (let i = 3; i >= 0; i--) {
        chartData.push({ name: i === 0 ? 'Tuần này' : `-${i} Tuần`, revenue: 0, shipping: 0, shopPaid: 0, customerPaid: 0, orders: 0, weekOffset: i });
      }
      
      completedOrders.forEach(o => {
        const od = new Date(o.createdAt);
        const diffTime = Math.abs(now - od);
        const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
        if (diffWeeks < 4) {
          const match = chartData.find(c => c.weekOffset === diffWeeks);
          if (match) {
            match.revenue += (o.codAmount || 0);
            match.shipping += (o.deliveryFee || 0);
          if (o.feePaidBy === 'SENDER') match.shopPaid += (o.deliveryFee || 0);
          else match.customerPaid += (o.deliveryFee || 0);
            match.orders += 1;
          }
        }
      });
    } else if (statFilter === 'month') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        chartData.push({ name: `T${d.getMonth() + 1}`, revenue: 0, shipping: 0, shopPaid: 0, customerPaid: 0, orders: 0, month: d.getMonth(), year: d.getFullYear() });
      }

      completedOrders.forEach(o => {
        const od = new Date(o.createdAt);
        const match = chartData.find(c => c.month === od.getMonth() && c.year === od.getFullYear());
        if (match) {
          match.revenue += (o.codAmount || 0);
          match.shipping += (o.deliveryFee || 0);
          if (o.feePaidBy === 'SENDER') match.shopPaid += (o.deliveryFee || 0);
          else match.customerPaid += (o.deliveryFee || 0);
          match.orders += 1;
        }
      });
    }

    chartData.forEach(c => {
      totalRevenue += c.revenue;
      totalShipping += c.shipping;
      shopPaidShipping += c.shopPaid;
      customerPaidShipping += c.customerPaid;
      totalOrders += c.orders;
    });

    let statusCounts = { placed: 0, delivering: 0, completed: 0, cancelled: 0 };
    orders.forEach(o => {
      const od = new Date(o.createdAt);
      let matched = false;
      if (statFilter === 'day') {
        matched = !!chartData.find(c => c.name === formatDate(od));
      } else if (statFilter === 'week') {
        const diffTime = Math.abs(now - od);
        const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
        if (diffWeeks < 4) matched = true;
      } else if (statFilter === 'month') {
        matched = !!chartData.find(c => c.month === od.getMonth() && c.year === od.getFullYear());
      }

      if (matched) {
        if (['DRAFT', 'PENDING', 'ACCEPTED'].includes(o.status)) statusCounts.placed++;
        else if (['PICKED_UP', 'DELIVERING'].includes(o.status)) statusCounts.delivering++;
        else if (o.status === 'COMPLETED') statusCounts.completed++;
        else if (o.status === 'CANCELLED') statusCounts.cancelled++;
      }
    });

    return { chartData, totalRevenue, totalShipping, shopPaidShipping, customerPaidShipping, totalOrders, statusCounts, matchedOrders };
  }, [orders, statFilter]);

  const filteredOrders = useMemo(() => {
    if (!statsData.matchedOrders) return [];
    return statsData.matchedOrders.filter(o => {
      if (selectedStatus === 'placed') return ['DRAFT', 'PENDING', 'ACCEPTED'].includes(o.status);
      if (selectedStatus === 'delivering') return ['PICKED_UP', 'DELIVERING'].includes(o.status);
      if (selectedStatus === 'completed') return o.status === 'COMPLETED';
      if (selectedStatus === 'cancelled') return o.status === 'CANCELLED';
      return false;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [statsData.matchedOrders, selectedStatus]);

  const renderOrder = (order) => {
    const statusCfg = getStatusConfig(order);
    return (
      <div 
        key={order._id} 
        className="bg-white p-4 rounded-2xl border border-gray-100 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all mb-4 shadow-sm"
        onClick={() => navigate(`/shop/order/${order._id}`)}
      >
        <div className={`absolute top-0 left-0 w-1.5 h-full ${statusCfg.bg.replace('bg-', 'bg-').replace('-50', '-500')}`}></div>
        
        <div className="flex justify-between items-center mb-3 pl-2">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-800">
              {order.serviceType === 'GIAO_HANG' ? 'Giao Hàng' :
               order.serviceType === 'DON_GHEP' ? 'Đơn Ghép' :
               order.serviceType === 'DAT_XE' ? (order.subServiceType === 'XE_OM' ? 'Chở Khách' : order.subServiceType === 'LAI_HO_OTO' ? 'Lái Hộ Ô Tô' : 'Lái Hộ Xe Máy') :
               order.serviceType === 'DIEU_PHOI' ? (order.subServiceType === 'NAP_TIEN' ? 'Nạp Tiền' : order.subServiceType === 'RUT_TIEN' ? 'Rút Tiền' : 'Điều Phối') :
               'Mua Hộ'}
            </span>
            <span className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${statusCfg.bg} ${statusCfg.color}`}>
            {statusCfg.icon}
            {statusCfg.text}
          </div>
        </div>

        <div className="space-y-2 pl-2 border-t border-gray-50 pt-3">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5"></div>
            <p className="text-xs text-gray-600 line-clamp-1 flex-1 font-medium">{order.pickupAddress}</p>
          </div>
          {order.deliveryAddress && (
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5"></div>
              <p className="text-xs text-gray-600 line-clamp-1 flex-1 font-medium">{order.deliveryAddress}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs">
          <p className="font-bold text-gray-800 mb-1">{label}</p>
          <p className="text-blue-600 font-bold mb-0.5">Tiền thu hộ: {payload[0].value.toLocaleString('vi-VN')}đ</p>
          {payload[1] && <p className="text-emerald-500 font-bold mb-0.5">Tiền ship: {payload[1].value.toLocaleString('vi-VN')}đ</p>}
          {payload[2] && <p className="text-orange-500 font-bold">Số đơn: {payload[2].value}</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-gray-50 font-sans overflow-hidden">
      <div className="shrink-0 bg-white safe-pt relative z-40 border-b border-gray-100 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-center border-b border-gray-50">
          <span className="font-bold text-gray-800 text-lg">Thống Kê</span>
        </div>
        <div className="flex px-4 pt-1">
          <button 
            className={`flex-1 py-3 text-sm font-bold transition-all ${mainTab === 'revenue' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setMainTab('revenue')}
          >
            Doanh Thu
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-bold transition-all ${mainTab === 'orders' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setMainTab('orders')}
          >
            Đơn Hàng
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        
        {/* Bộ lọc thống kê */}
        <div className="bg-white rounded-xl p-1.5 flex gap-1 mb-6 shadow-sm border border-gray-100 max-w-sm mx-auto md:mx-0">
          <button onClick={() => setStatFilter('day')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${statFilter === 'day' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>Theo Ngày</button>
          <button onClick={() => setStatFilter('week')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${statFilter === 'week' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>Theo Tuần</button>
          <button onClick={() => setStatFilter('month')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${statFilter === 'month' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>Theo Tháng</button>
        </div>

        {mainTab === 'revenue' && (
          <>
            {/* Các thẻ tổng quan */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-4 text-white shadow-lg shadow-blue-500/30">
                <div className="flex items-center gap-2 mb-2 opacity-80">
                  <DollarSign size={18} />
                  <span className="text-xs font-medium uppercase tracking-wider">Tổng thu hộ (COD)</span>
                </div>
                <div className="text-2xl md:text-3xl font-black">
                  {statsData.totalRevenue.toLocaleString('vi-VN')}đ
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-4 text-white shadow-lg shadow-emerald-500/30 cursor-pointer active:scale-95 transition-transform" onClick={() => setShowShippingModal(true)}>
                <div className="flex items-center gap-2 mb-2 opacity-80">
                  <DollarSign size={18} />
                  <span className="text-xs font-medium uppercase tracking-wider">Doanh thu tiền ship</span>
                </div>
                <div className="text-2xl md:text-3xl font-black">
                  {statsData.totalShipping.toLocaleString('vi-VN')}đ
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl p-4 text-white shadow-lg shadow-orange-500/30">
                <div className="flex items-center gap-2 mb-2 opacity-80">
                  <Package size={18} />
                  <span className="text-xs font-medium uppercase tracking-wider">Số đơn giao thành công</span>
                </div>
                <div className="text-2xl md:text-3xl font-black">
                  {statsData.totalOrders}
                </div>
              </div>
            </div>

            {/* Biểu đồ */}
            <div className="bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-gray-100 mb-8">
              <h3 className="text-sm font-bold text-gray-600 mb-6 flex items-center gap-2"><TrendingUp size={16} /> Biểu đồ biến động</h3>
              <div className="w-full h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={statsData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(val) => (val >= 1000 ? `${val/1000}k` : val)} />
                    <YAxis yAxisId="right" orientation="right" hide={true} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                    <Bar yAxisId="left" dataKey="revenue" name="Tiền thu hộ (đ)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar yAxisId="left" dataKey="shipping" name="Tiền ship (đ)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Line yAxisId="right" type="monotone" dataKey="orders" name="Số đơn" stroke="#f97316" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {mainTab === 'orders' && (
          <>
            {/* Tình trạng đơn hàng */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div onClick={() => setSelectedStatus('placed')} className={`cursor-pointer p-4 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 ${selectedStatus === 'placed' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'bg-sky-50 border border-sky-100 hover:bg-sky-100'}`}>
                <span className={`text-2xl font-black ${selectedStatus === 'placed' ? 'text-white' : 'text-sky-600'}`}>{statsData.statusCounts.placed}</span>
                <span className={`text-[11px] font-bold uppercase mt-1 text-center ${selectedStatus === 'placed' ? 'text-sky-100' : 'text-sky-500'}`}>Đã Đặt / Tìm Xế</span>
              </div>
              <div onClick={() => setSelectedStatus('delivering')} className={`cursor-pointer p-4 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 ${selectedStatus === 'delivering' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-amber-50 border border-amber-100 hover:bg-amber-100'}`}>
                <span className={`text-2xl font-black ${selectedStatus === 'delivering' ? 'text-white' : 'text-amber-600'}`}>{statsData.statusCounts.delivering}</span>
                <span className={`text-[11px] font-bold uppercase mt-1 ${selectedStatus === 'delivering' ? 'text-amber-100' : 'text-amber-500'}`}>Đang Giao</span>
              </div>
              <div onClick={() => setSelectedStatus('completed')} className={`cursor-pointer p-4 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 ${selectedStatus === 'completed' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-emerald-50 border border-emerald-100 hover:bg-emerald-100'}`}>
                <span className={`text-2xl font-black ${selectedStatus === 'completed' ? 'text-white' : 'text-emerald-600'}`}>{statsData.statusCounts.completed}</span>
                <span className={`text-[11px] font-bold uppercase mt-1 ${selectedStatus === 'completed' ? 'text-emerald-100' : 'text-emerald-500'}`}>Hoàn Thành</span>
              </div>
              <div onClick={() => setSelectedStatus('cancelled')} className={`cursor-pointer p-4 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 ${selectedStatus === 'cancelled' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-red-50 border border-red-100 hover:bg-red-100'}`}>
                <span className={`text-2xl font-black ${selectedStatus === 'cancelled' ? 'text-white' : 'text-red-600'}`}>{statsData.statusCounts.cancelled}</span>
                <span className={`text-[11px] font-bold uppercase mt-1 ${selectedStatus === 'cancelled' ? 'text-red-100' : 'text-red-500'}`}>Đã Hủy</span>
              </div>
            </div>

            {/* Danh sách đơn hàng theo trạng thái */}
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Package size={20} className="text-blue-500" /> Danh sách đơn hàng ({filteredOrders.length})</h2>
              {loading ? (
                <div className="text-center text-gray-500 mt-10">Đang tải...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center text-gray-500 mt-10 flex flex-col items-center bg-white p-8 rounded-2xl shadow-sm border border-gray-50">
                  <span className="text-4xl mb-3">📦</span>
                  <p>Không có đơn hàng nào.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map(renderOrder)}
                </div>
              )}
            </div>
          </>
        )}

      </div>

      {/* SHIPPING REVENUE BREAKDOWN MODAL */}
      {showShippingModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex flex-col justify-end md:justify-center md:items-center">
          <div className="bg-white w-full md:w-[400px] rounded-t-3xl md:rounded-3xl p-6 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-gray-800 text-lg">Chi Tiết Tiền Ship</h3>
              <button onClick={() => setShowShippingModal(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <span className="font-bold text-gray-500 text-sm">Tổng tiền ship</span>
                <span className="font-black text-emerald-600 text-lg">{statsData.totalShipping.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between items-center bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <span className="font-bold text-blue-700 text-sm">Ship Khách Trả</span>
                <span className="font-black text-blue-700 text-lg">{statsData.customerPaidShipping.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <span className="font-bold text-emerald-700 text-sm">Ship Shop Trả</span>
                <span className="font-black text-emerald-700 text-lg">{statsData.shopPaidShipping.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
            
            <button 
              onClick={() => setShowShippingModal(false)}
              className="w-full mt-6 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3.5 rounded-xl transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ShopStatistics;
