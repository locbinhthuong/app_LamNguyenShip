import React, { useState, useEffect, useCallback } from 'react';
import OrderCard from '../components/OrderCard';
import { getOrders, acceptOrder, completeOrder, connectSocket, disconnectSocket } from '../services/api';

// Shipper ID - Trong production sẽ lấy từ login/auth
const SHIPPER_ID = 'shipper_001';
const SHIPPER_NAME = 'Nguyễn Văn Shipper';

const Home = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showToast, setShowToast] = useState(null);

  // Toast notification
  const showNotification = (message, type = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  // Load orders from API
  const loadOrders = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      setError(null);
      const response = await getOrders();
      setOrders(response.data || []);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError(err.message || 'Không thể tải danh sách đơn hàng. Vui lòng kiểm tra kết nối server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Pull to refresh
  const handleRefresh = () => {
    loadOrders(true);
  };

  // Accept order
  const handleAccept = async (orderId) => {
    try {
      setActionLoading(orderId);
      const result = await acceptOrder(orderId, SHIPPER_ID);
      showNotification('Bạn đã nhận đơn hàng thành công!', 'success');
      await loadOrders();
    } catch (err) {
      console.error('Error accepting order:', err);
      showNotification(err.message || 'Không thể nhận đơn. Đơn có thể đã được nhận bởi shipper khác.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Complete order
  const handleComplete = async (orderId) => {
    try {
      setActionLoading(orderId);
      const result = await completeOrder(orderId, SHIPPER_ID);
      showNotification('Đơn hàng đã được giao thành công!', 'success');
      await loadOrders();
    } catch (err) {
      console.error('Error completing order:', err);
      showNotification(err.message || 'Không thể hoàn thành đơn hàng.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Socket.IO event handlers
  const handleNewOrder = useCallback((order) => {
    console.log('New order received:', order);
    showNotification('Có đơn hàng mới!', 'info');
    setOrders((prev) => [order, ...prev]);
  }, []);

  const handleOrderTaken = useCallback((order) => {
    console.log('Order taken:', order);
    setOrders((prev) =>
      prev.map((o) => (o._id === order._id ? order : o))
    );
  }, []);

  const handleOrderDone = useCallback((order) => {
    console.log('Order done:', order);
    setOrders((prev) =>
      prev.map((o) => (o._id === order._id ? order : o))
    );
  }, []);

  // Initial load
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Connect Socket.IO
  useEffect(() => {
    connectSocket(handleNewOrder, handleOrderTaken, handleOrderDone);
    return () => {
      disconnectSocket();
    };
  }, [handleNewOrder, handleOrderTaken, handleOrderDone]);

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true;
    if (filter === 'mine') return order.acceptedBy === SHIPPER_ID;
    return order.status === filter;
  });

  // Stats
  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'PENDING').length,
    accepted: orders.filter((o) => o.status === 'ACCEPTED').length,
    completed: orders.filter((o) => o.status === 'COMPLETED').length,
    myOrders: orders.filter((o) => o.acceptedBy === SHIPPER_ID && o.status !== 'COMPLETED').length,
  };

  // Filter tabs
  const filterTabs = [
    { key: 'all', label: 'Tất cả', count: stats.total },
    { key: 'PENDING', label: 'Chờ nhận', count: stats.pending },
    { key: 'mine', label: 'Của tôi', count: stats.myOrders },
    { key: 'COMPLETED', label: 'Đã xong', count: stats.completed },
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Toast Notification */}
      {showToast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg text-white font-medium transition-all ${
          showToast.type === 'success' ? 'bg-green-500' : 
          showToast.type === 'error' ? 'bg-red-500' : 
          'bg-blue-500'
        }`}>
          {showToast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 pt-10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold">🚚 LamNguyenShip</h1>
            <p className="text-sm opacity-90">Xin chào, {SHIPPER_NAME}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-sm font-medium">Online</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-xs opacity-90 mt-1">Chờ nhận</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{stats.myOrders}</p>
            <p className="text-xs opacity-90 mt-1">Đang giao</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{stats.completed}</p>
            <p className="text-xs opacity-90 mt-1">Hoàn thành</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs opacity-90 mt-1">Tổng đơn</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white sticky top-0 z-10">
        <div className="flex gap-1 p-2 overflow-x-auto scrollbar-hide">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                filter === tab.key
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500 font-medium">Đang tải đơn hàng...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <p className="text-red-500 mb-4 font-medium">{error}</p>
            <button 
              onClick={handleRefresh} 
              className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold shadow-md active:scale-95 transition-transform"
            >
              Thử lại
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-500 font-medium">Không có đơn hàng nào</p>
            <p className="text-gray-400 text-sm mt-1">
              {filter === 'all' ? 'Hiện tại chưa có đơn hàng nào' : 'Không có đơn hàng trong danh mục này'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-3">{filteredOrders.length} đơn hàng</p>
            {filteredOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                onAccept={handleAccept}
                onComplete={handleComplete}
                currentShipperId={SHIPPER_ID}
                isLoading={actionLoading === order._id}
              />
            ))}
          </>
        )}
      </div>

      {/* Pull to refresh hint */}
      {loading === false && (
        <div className="text-center pb-4">
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-orange-500 text-sm font-medium flex items-center gap-2 mx-auto"
          >
            <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
            {refreshing ? 'Đang làm mới...' : 'Kéo xuống để làm mới'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
