const Order = require('../models/Order');

const revenueController = {
  // GET /api/revenue/stats - Thống kê doanh thu & công nợ tài xế
  getRevenueStats: async (req, res) => {
    try {
      // Xác định các mốc thời gian
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const startOfWeek = new Date(today);
      // getDay() trả về 0: Chủ nhật, 1: Thứ 2... (Giả sử tuần bắt đầu từ Thứ Hai)
      const dayOfWeek = startOfWeek.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(today.getDate() + diffToMonday);

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfYear = new Date(today.getFullYear(), 0, 1);

      // 1. Lấy tất cả đơn hoàn thành (Có doanh thu thực)
      const completedOrders = await Order.find({ status: 'COMPLETED' })
        .populate('assignedTo', 'name phone')
        .sort({ createdAt: -1 });

      let totalRevenue = 0;
      let dailyRevenue = 0;
      let weeklyRevenue = 0;
      let monthlyRevenue = 0;

      const driverDebts = {}; 

      // 2. Chạy vòng lặp cộng dồn (Do dữ liệu MongoDB đã cache in-memory nhanh)
      completedOrders.forEach(order => {
        const fee = order.deliveryFee || 0;
        const bonus = (order.adminBonus || 0) + (order.kpiBonus || 0);
        const date = order.deliveredAt || order.updatedAt;
        
        // Cộng dồn thống kê Admin
        totalRevenue += fee;
        if (date >= today) dailyRevenue += fee;
        if (date >= startOfWeek) weeklyRevenue += fee;
        if (date >= startOfMonth) monthlyRevenue += fee;

        // Quản lý Công Nợ Tài Xế (Mảng) theo ngày
        if (order.assignedTo) {
          const driverId = order.assignedTo._id.toString();
          if (!driverDebts[driverId]) {
            driverDebts[driverId] = {
              driverId: driverId,
              name: order.assignedTo.name,
              phone: order.assignedTo.phone,
              totalOrders: 0, totalFee: 0, totalBonus: 0,
              todayOrders: 0, todayFee: 0, todayBonus: 0,
              weekOrders: 0, weekFee: 0, weekBonus: 0,
              monthOrders: 0, monthFee: 0, monthBonus: 0,
              yearOrders: 0, yearFee: 0, yearBonus: 0,
              debt: 0  // Đây sẽ là công nợ HÔM NAY
            };
          }
          
          // Tổng số đơn và tổng doanh thu mọi thời đại
          driverDebts[driverId].totalOrders += 1;
          driverDebts[driverId].totalFee += fee;
          driverDebts[driverId].totalBonus += bonus;

          // Cập nhật các KPI con
          if (date >= today) {
            driverDebts[driverId].todayOrders += 1;
            driverDebts[driverId].todayFee += fee;
            driverDebts[driverId].todayBonus += bonus;
            driverDebts[driverId].debt += fee * 0.15; // Công nợ
          }
          if (date >= startOfWeek) {
            driverDebts[driverId].weekOrders += 1;
            driverDebts[driverId].weekFee += fee;
            driverDebts[driverId].weekBonus += bonus;
          }
          if (date >= startOfMonth) {
            driverDebts[driverId].monthOrders += 1;
            driverDebts[driverId].monthFee += fee;
            driverDebts[driverId].monthBonus += bonus;
          }
          if (date >= startOfYear) {
            driverDebts[driverId].yearOrders += 1;
            driverDebts[driverId].yearFee += fee;
            driverDebts[driverId].yearBonus += bonus;
          }
        }
      });

      res.status(200).json({
        success: true,
        data: {
          stats: {
            totalRevenue,
            dailyRevenue,
            weeklyRevenue,
            monthlyRevenue
          },
          drivers: Object.values(driverDebts).sort((a, b) => b.debt - a.debt) // Sắp xếp ai nợ nhiều lên đầu
        }
      });
      
    } catch (error) {
      console.error('Lỗi lấy thống kê doanh thu:', error);
      res.status(500).json({ success: false, message: 'Lỗi server khi thống kê doanh thu' });
    }
  },

  // GET /api/revenue/driver/me - Tài xế tự xem doanh thu của mình
  getDriverOwnStats: async (req, res) => {
    try {
      const driverId = req.user.id;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const startOfWeek = new Date(today);
      const dayOfWeek = startOfWeek.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(today.getDate() + diffToMonday);

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Lấy các đơn hàng của driver này đã hoàn thành
      const completedOrders = await Order.find({ 
        assignedTo: driverId,
        status: 'COMPLETED' 
      }).sort({ createdAt: -1 });

      let totalFee = 0;
      let dailyFee = 0;
      let weeklyFee = 0;
      let monthlyFee = 0;
      let totalWalletBonus = 0;

      // Danh sách lịch sử hiển thị
      const recentOrders = [];

      // Khởi tạo mảng dữ liệu biểu đồ 7 ngày
      const chartDataArray = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dayMap = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        chartDataArray.push({
          dateObj: d,
          dateStr: `${d.getDate()}/${d.getMonth() + 1}`,
          label: dayMap[d.getDay()],
          fee: 0,
          orders: 0
        });
      }

      completedOrders.forEach(order => {
        const fee = order.deliveryFee || 0;
        const bonus = order.adminBonus || 0;
        const dateStrFromDB = order.deliveredAt || order.updatedAt;
        const date = new Date(dateStrFromDB);
        
        totalFee += fee;
        totalWalletBonus += bonus;
        if (date >= today) dailyFee += fee;
        if (date >= startOfWeek) weeklyFee += fee;
        if (date >= startOfMonth) monthlyFee += fee;

        // Điền vào biểu đồ
        for (let i = 0; i < 7; i++) {
          const chartDate = chartDataArray[i].dateObj;
          if (date.getDate() === chartDate.getDate() && 
              date.getMonth() === chartDate.getMonth() && 
              date.getFullYear() === chartDate.getFullYear()) {
             chartDataArray[i].fee += fee;
             chartDataArray[i].orders += 1;
             break;
          }
        }

        if (recentOrders.length < 20) {
          recentOrders.push({
            id: order._id,
            orderCode: order.orderCode || order._id.toString().slice(-8).toUpperCase(),
            customerName: order.customerName,
            deliveryFee: fee,
            date: date
          });
        }
      });

      const driver = await require('../models/Driver').findById(driverId).select('walletDebt walletBalance');
      const totalDebt = driver ? driver.walletDebt : 0;
      totalWalletBonus = driver ? driver.walletBalance : 0;

      res.status(200).json({
        success: true,
        data: {
          totalOrders: completedOrders.length,
          totalFee,
          dailyFee, // Trả lại key cũ dailyFee
          weeklyFee, // Trả lại...
          monthlyFee, 
          totalDebt,
          totalWalletBonus,
          chartData: chartDataArray,
          recentOrders 
        }
      });
      
    } catch (error) {
      console.error('Lỗi lấy thống kê doanh thu tài xế:', error);
      res.status(500).json({ success: false, message: 'Lỗi server khi tải doanh thu cá nhân' });
    }
  },

  // GET /api/revenue/driver-stats/:id - Admin xem chi tiết doanh thu 1 tài xế
  getDriverStatsAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const startOfWeek = new Date(today);
      const dayOfWeek = startOfWeek.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(today.getDate() + diffToMonday);

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Lấy các đơn hàng của driver này đã hoàn thành
      const completedOrders = await Order.find({ 
        assignedTo: id,
        status: 'COMPLETED' 
      }).sort({ createdAt: -1 });

      let totalFee = 0;
      let dailyFee = 0;
      let weeklyFee = 0;
      let monthlyFee = 0;
      let dailyOrders = 0;
      let totalOrdersCount = 0;

      // Danh sách lịch sử hiển thị
      const recentOrders = [];

      // Khởi tạo mảng dữ liệu biểu đồ 7 ngày
      const chartDataArray = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dayMap = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        chartDataArray.push({
          dateObj: d,
          dateStr: `${d.getDate()}/${d.getMonth() + 1}`,
          label: dayMap[d.getDay()],
          fee: 0,
          orders: 0
        });
      }

      completedOrders.forEach(order => {
        const fee = order.deliveryFee || 0;
        const dateStrFromDB = order.deliveredAt || order.updatedAt;
        const date = new Date(dateStrFromDB);
        
        totalOrdersCount++;
        totalFee += fee;
        if (date >= today) {
          dailyFee += fee;
          dailyOrders++;
        }
        if (date >= startOfWeek) weeklyFee += fee;
        if (date >= startOfMonth) monthlyFee += fee;

        // Điền vào biểu đồ
        for (let i = 0; i < 7; i++) {
          const chartDate = chartDataArray[i].dateObj;
          if (date.getDate() === chartDate.getDate() && 
              date.getMonth() === chartDate.getMonth() && 
              date.getFullYear() === chartDate.getFullYear()) {
             chartDataArray[i].fee += fee;
             chartDataArray[i].orders += 1;
             break;
          }
        }

        if (recentOrders.length < 20) {
          recentOrders.push({
            id: order._id,
            orderCode: order.orderCode || order._id.toString().slice(-8).toUpperCase(),
            customerName: order.customerName,
            deliveryFee: fee,
            date: date
          });
        }
      });

      const driver = await require('../models/Driver').findById(id).select('walletDebt walletBalance');
      const totalDebt = driver ? driver.walletDebt : 0;
      const totalWalletBonus = driver ? driver.walletBalance : 0;

      res.status(200).json({
        success: true,
        data: {
          todayOrders: dailyOrders,
          todayRevenue: dailyFee,
          weeklyRevenue: weeklyFee,
          monthlyRevenue: monthlyFee,
          totalRevenue: totalFee,
          totalOrders: totalOrdersCount,
          totalDebt: totalDebt > 0 ? totalDebt : 0,
          totalWalletBonus,
          chartData: chartDataArray,
          recentOrders
        }
      });
    } catch (error) {
      console.error('Lỗi lấy thống kê doanh thu tài xế (Admin):', error);
      res.status(500).json({ success: false, message: 'Lỗi server khi tải doanh thu cá nhân của tài xế' });
    }
  }
};

module.exports = revenueController;
