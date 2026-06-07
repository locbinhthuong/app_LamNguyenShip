const Order = require('../models/Order');

const revenueController = {
  // GET /api/revenue/stats - Thống kê doanh thu & công nợ tài xế
  getRevenueStats: async (req, res) => {
    try {
      // Xác định các mốc thời gian
      // Hỗ trợ bộ lọc ngày: ?date=YYYY-MM-DD
      const dateParam = req.query.date;
      const today = dateParam ? new Date(dateParam + 'T00:00:00') : new Date();
      today.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      
      const startOfWeek = new Date(today);
      // getDay() trả về 0: Chủ nhật, 1: Thứ 2... (Giả sử tuần bắt đầu từ Thứ Hai)
      const dayOfWeek = startOfWeek.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(today.getDate() + diffToMonday);

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfYear = new Date(today.getFullYear(), 0, 1);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      const endOfYear = new Date(today.getFullYear(), 11, 31);
      endOfYear.setHours(23, 59, 59, 999);

      // Dùng Aggregation để đẩy tải tính toán xuống MongoDB (tránh tràn RAM)
      const statsAgg = await Order.aggregate([
        { $match: { status: 'COMPLETED' } },
        {
          $project: {
            fee: { $ifNull: ['$deliveryFee', 0] },
            bonus: { $add: [{ $ifNull: ['$adminBonus', 0] }, { $ifNull: ['$kpiBonus', 0] }] },
            date: { $ifNull: ['$deliveredAt', '$updatedAt'] },
            driverId: '$assignedTo'
          }
        },
        {
          $group: {
            _id: '$driverId',
            totalOrders: { $sum: 1 },
            totalFee: { $sum: '$fee' },
            totalBonus: { $sum: '$bonus' },
            todayOrders: { $sum: { $cond: [{ $and: [{ $gte: ['$date', today] }, { $lte: ['$date', endOfDay] }] }, 1, 0] } },
            todayFee: { $sum: { $cond: [{ $and: [{ $gte: ['$date', today] }, { $lte: ['$date', endOfDay] }] }, '$fee', 0] } },
            todayBonus: { $sum: { $cond: [{ $and: [{ $gte: ['$date', today] }, { $lte: ['$date', endOfDay] }] }, '$bonus', 0] } },
            weekOrders: { $sum: { $cond: [{ $and: [{ $gte: ['$date', startOfWeek] }, { $lte: ['$date', endOfWeek] }] }, 1, 0] } },
            weekFee: { $sum: { $cond: [{ $and: [{ $gte: ['$date', startOfWeek] }, { $lte: ['$date', endOfWeek] }] }, '$fee', 0] } },
            weekBonus: { $sum: { $cond: [{ $and: [{ $gte: ['$date', startOfWeek] }, { $lte: ['$date', endOfWeek] }] }, '$bonus', 0] } },
            monthOrders: { $sum: { $cond: [{ $and: [{ $gte: ['$date', startOfMonth] }, { $lte: ['$date', endOfMonth] }] }, 1, 0] } },
            monthFee: { $sum: { $cond: [{ $and: [{ $gte: ['$date', startOfMonth] }, { $lte: ['$date', endOfMonth] }] }, '$fee', 0] } },
            monthBonus: { $sum: { $cond: [{ $and: [{ $gte: ['$date', startOfMonth] }, { $lte: ['$date', endOfMonth] }] }, '$bonus', 0] } },
            yearOrders: { $sum: { $cond: [{ $and: [{ $gte: ['$date', startOfYear] }, { $lte: ['$date', endOfYear] }] }, 1, 0] } },
            yearFee: { $sum: { $cond: [{ $and: [{ $gte: ['$date', startOfYear] }, { $lte: ['$date', endOfYear] }] }, '$fee', 0] } },
            yearBonus: { $sum: { $cond: [{ $and: [{ $gte: ['$date', startOfYear] }, { $lte: ['$date', endOfYear] }] }, '$bonus', 0] } }
          }
        }
      ]);

      let totalRevenue = 0;
      let dailyRevenue = 0;
      let weeklyRevenue = 0;
      let monthlyRevenue = 0;

      // Lấy danh sách ID tài xế để truy vấn thông tin
      const driverIds = statsAgg.map(s => s._id).filter(id => id != null);
      const Driver = require('../models/Driver');
      const driversInfo = await Driver.find({ _id: { $in: driverIds } }).select('name phone walletDebt');
      const driverMap = {};
      driversInfo.forEach(d => {
        driverMap[d._id.toString()] = d;
      });

      const driversResult = statsAgg.filter(s => s._id != null).map(stat => {
        const dId = stat._id.toString();
        const info = driverMap[dId];

        // Cộng dồn tổng doanh thu toàn hệ thống
        totalRevenue += stat.totalFee;
        dailyRevenue += stat.todayFee;
        weeklyRevenue += stat.weekFee;
        monthlyRevenue += stat.monthFee;

        return {
          driverId: dId,
          name: info ? info.name : 'Tài xế đã xóa',
          phone: info ? info.phone : '',
          totalOrders: stat.totalOrders,
          totalFee: stat.totalFee,
          totalBonus: stat.totalBonus,
          todayOrders: stat.todayOrders,
          todayFee: stat.todayFee,
          todayBonus: stat.todayBonus,
          weekOrders: stat.weekOrders,
          weekFee: stat.weekFee,
          weekBonus: stat.weekBonus,
          monthOrders: stat.monthOrders,
          monthFee: stat.monthFee,
          monthBonus: stat.monthBonus,
          yearOrders: stat.yearOrders,
          yearFee: stat.yearFee,
          yearBonus: stat.yearBonus,
          debt: info && info.walletDebt > 0 ? info.walletDebt : 0
        };
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
          drivers: driversResult.sort((a, b) => {
            if (b.todayOrders !== a.todayOrders) return b.todayOrders - a.todayOrders;
            if (b.todayFee !== a.todayFee) return b.todayFee - a.todayFee;
            if (b.monthOrders !== a.monthOrders) return b.monthOrders - a.monthOrders;
            if (b.monthFee !== a.monthFee) return b.monthFee - a.monthFee;
            return b.totalOrders - a.totalOrders;
          })
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
