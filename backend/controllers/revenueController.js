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
      const allActiveDrivers = await Driver.find({ 
        $or: [
          { _id: { $in: driverIds } },
          { status: 'active' }
        ]
      }).select('name phone walletDebt driverCode isOnline avatar');

      const driverMap = {};
      allActiveDrivers.forEach(d => {
        driverMap[d._id.toString()] = d;
      });

      const DriverOnlineSession = require('../models/DriverOnlineSession');
      const { 
        formatOnlineDuration, 
        ensureActiveDriversHaveSession, 
        backfillWeeklyOnlineSessionsFromOrders 
      } = require('../utils/onlineSessionHelper');

      // Tự động kiểm tra và tái tạo phiên online
      await ensureActiveDriversHaveSession();
      await backfillWeeklyOnlineSessionsFromOrders(startOfWeek, endOfWeek);

      // 1. Phiên online trong ngày đã chọn
      const dailySessions = await DriverOnlineSession.find({
        startTime: { $lte: endOfDay },
        $or: [
          { endTime: { $gte: today } },
          { endTime: null }
        ]
      }).lean();

      // 2. Phiên online trong tuần của ngày đã chọn
      const weeklySessions = await DriverOnlineSession.find({
        startTime: { $lte: endOfWeek },
        $or: [
          { endTime: { $gte: startOfWeek } },
          { endTime: null }
        ]
      }).lean();

      const now = new Date();
      const dailyOnlineMap = {};
      for (const s of dailySessions) {
        if (!s.driverId) continue;
        const dId = s.driverId.toString();
        const sStart = new Date(s.startTime);
        const sEnd = s.endTime ? new Date(s.endTime) : (now < endOfDay ? now : endOfDay);
        const effStart = Math.max(sStart.getTime(), today.getTime());
        const effEnd = Math.min(sEnd.getTime(), endOfDay.getTime());
        if (effEnd > effStart) {
          dailyOnlineMap[dId] = (dailyOnlineMap[dId] || 0) + Math.round((effEnd - effStart) / 1000);
        }
      }

      const weeklyOnlineMap = {};
      for (const s of weeklySessions) {
        if (!s.driverId) continue;
        const dId = s.driverId.toString();
        const sStart = new Date(s.startTime);
        const sEnd = s.endTime ? new Date(s.endTime) : (now < endOfWeek ? now : endOfWeek);
        const effStart = Math.max(sStart.getTime(), startOfWeek.getTime());
        const effEnd = Math.min(sEnd.getTime(), endOfWeek.getTime());
        if (effEnd > effStart) {
          weeklyOnlineMap[dId] = (weeklyOnlineMap[dId] || 0) + Math.round((effEnd - effStart) / 1000);
        }
      }

      // 3. Thống kê Đơn Đi Trễ (Giao hàng > 35 phút từ lúc Đã lấy hàng, hoặc Lấy hàng >= 15 phút từ lúc Nhận đơn)
      const weekOrderDocs = await Order.find({
        assignedTo: { $ne: null },
        $or: [
          {
            status: 'COMPLETED',
            $or: [
              { deliveredAt: { $gte: startOfWeek, $lte: endOfWeek } },
              { deliveredAt: null, updatedAt: { $gte: startOfWeek, $lte: endOfWeek } }
            ]
          },
          {
            status: { $in: ['ACCEPTED', 'PICKED_UP', 'DELIVERING'] },
            createdAt: { $gte: startOfWeek, $lte: endOfWeek }
          }
        ]
      })
        .select('orderCode status assignedTo customerName customerPhone pickupAddress deliveryAddress deliveryFee acceptedAt pickedUpAt deliveredAt updatedAt createdAt isLatePickup isLateDelivery pickupDurationMinutes deliveryDurationMinutes lateReason')
        .sort({ deliveredAt: -1, updatedAt: -1 })
        .lean();

      const dailyLateDeliveryCountMap = {};
      const weeklyLateDeliveryCountMap = {};
      const dailyLatePickupCountMap = {};
      const weeklyLatePickupCountMap = {};
      const todayLateOrdersList = [];
      const weekLateOrdersList = [];

      for (const ord of weekOrderDocs) {
        if (!ord.assignedTo) continue;
        const dId = ord.assignedTo.toString();
        const dInfo = driverMap[dId];

        const refDate = new Date(ord.deliveredAt || ord.pickedUpAt || ord.acceptedAt || ord.updatedAt || ord.createdAt);
        const isOrderInToday = refDate >= today && refDate <= endOfDay;

        // Tính số phút lấy hàng (acceptedAt -> pickedUpAt hoặc now nếu đang ACCEPTED)
        let pickupMins = typeof ord.pickupDurationMinutes === 'number' && ord.pickupDurationMinutes > 0
          ? ord.pickupDurationMinutes
          : 0;
        if (!pickupMins && ord.acceptedAt) {
          const endPickup = ord.pickedUpAt ? new Date(ord.pickedUpAt) : (ord.status === 'ACCEPTED' ? now : null);
          if (endPickup) {
            pickupMins = Math.max(0, Math.round((endPickup - new Date(ord.acceptedAt)) / 60000));
          }
        }

        // Tính số phút giao hàng (pickedUpAt -> deliveredAt hoặc now nếu đang PICKED_UP/DELIVERING)
        let deliveryMins = typeof ord.deliveryDurationMinutes === 'number' && ord.deliveryDurationMinutes > 0
          ? ord.deliveryDurationMinutes
          : 0;
        if (!deliveryMins && ord.pickedUpAt) {
          const endDelivery = ord.deliveredAt
            ? new Date(ord.deliveredAt)
            : (['PICKED_UP', 'DELIVERING'].includes(ord.status) ? now : null);
          if (endDelivery) {
            deliveryMins = Math.max(0, Math.round((endDelivery - new Date(ord.pickedUpAt)) / 60000));
          }
        }

        const isLatePickup = Boolean(ord.isLatePickup || pickupMins >= 15);
        const isLateDelivery = Boolean(ord.isLateDelivery || deliveryMins > 35);

        if (isLatePickup) {
          weeklyLatePickupCountMap[dId] = (weeklyLatePickupCountMap[dId] || 0) + 1;
          if (isOrderInToday) {
            dailyLatePickupCountMap[dId] = (dailyLatePickupCountMap[dId] || 0) + 1;
          }
        }

        if (isLateDelivery) {
          weeklyLateDeliveryCountMap[dId] = (weeklyLateDeliveryCountMap[dId] || 0) + 1;
          if (isOrderInToday) {
            dailyLateDeliveryCountMap[dId] = (dailyLateDeliveryCountMap[dId] || 0) + 1;
          }

          const lateItem = {
            _id: ord._id,
            orderCode: ord.orderCode || ord._id.toString().slice(-8).toUpperCase(),
            status: ord.status,
            driverId: dId,
            driverName: dInfo ? dInfo.name : 'Tài xế đã xóa',
            driverPhone: dInfo ? dInfo.phone : '',
            driverCode: dInfo?.driverCode || `TX${dId.slice(-6).toUpperCase()}`,
            customerName: ord.customerName || 'Khách hàng',
            customerPhone: ord.customerPhone || '',
            pickupAddress: ord.pickupAddress || '',
            deliveryAddress: ord.deliveryAddress || '',
            deliveryFee: ord.deliveryFee || 0,
            acceptedAt: ord.acceptedAt,
            pickedUpAt: ord.pickedUpAt,
            deliveredAt: ord.deliveredAt,
            pickupDurationMinutes: pickupMins,
            deliveryDurationMinutes: deliveryMins,
            overtimeMinutes: Math.max(0, deliveryMins - 35),
            isLatePickup,
            isLateDelivery: true,
            lateReason: ord.lateReason || '',
            isToday: isOrderInToday
          };

          weekLateOrdersList.push(lateItem);
          if (isOrderInToday) {
            todayLateOrdersList.push(lateItem);
          }
        }
      }

      const driversResult = statsAgg.filter(s => s._id != null).map(stat => {
        const dId = stat._id.toString();
        const info = driverMap[dId];

        // Cộng dồn tổng doanh thu toàn hệ thống
        totalRevenue += stat.totalFee;
        dailyRevenue += stat.todayFee;
        weeklyRevenue += stat.weekFee;
        monthlyRevenue += stat.monthFee;

        const todayOnlineSec = dailyOnlineMap[dId] || 0;
        const todayOnlineMinutes = Math.floor(todayOnlineSec / 60);
        const todayOnlineHours = Number((todayOnlineSec / 3600).toFixed(2));
        const todayOnlineTimeStr = formatOnlineDuration(todayOnlineSec);
        const todayOrderPoints = stat.todayOrders;
        const todayTimePoints = Math.floor(todayOnlineMinutes / 30);
        const todayTotalPoints = todayOrderPoints + todayTimePoints;

        let todayOrdersPerHour = 0;
        let todayEfficiencyPercent = 0;
        if (todayOnlineHours > 0) {
          todayOrdersPerHour = Number((stat.todayOrders / todayOnlineHours).toFixed(2));
          todayEfficiencyPercent = Math.min(100, Math.round((stat.todayOrders / (todayOnlineHours * 1.5)) * 100));
        }

        const weekOnlineSec = weeklyOnlineMap[dId] || 0;
        const weekOnlineMinutes = Math.floor(weekOnlineSec / 60);
        const weekOnlineHours = Number((weekOnlineSec / 3600).toFixed(2));
        const weekOnlineTimeStr = formatOnlineDuration(weekOnlineSec);
        const weekOrderPoints = stat.weekOrders;
        const weekTimePoints = Math.floor(weekOnlineMinutes / 30);
        const weekTotalPoints = weekOrderPoints + weekTimePoints;

        let weekOrdersPerHour = 0;
        let weekEfficiencyPercent = 0;
        if (weekOnlineHours > 0) {
          weekOrdersPerHour = Number((stat.weekOrders / weekOnlineHours).toFixed(2));
          weekEfficiencyPercent = Math.min(100, Math.round((stat.weekOrders / (weekOnlineHours * 1.5)) * 100));
        }

        return {
          driverId: dId,
          name: info ? info.name : 'Tài xế đã xóa',
          phone: info ? info.phone : '',
          driverCode: info?.driverCode || `TX${dId.slice(-6).toUpperCase()}`,
          isOnline: !!info?.isOnline,
          totalOrders: stat.totalOrders,
          totalFee: stat.totalFee,
          totalBonus: stat.totalBonus,
          todayOrders: stat.todayOrders,
          todayFee: stat.todayFee,
          todayBonus: stat.todayBonus,
          todayOnlineSeconds: todayOnlineSec,
          todayOnlineMinutes,
          todayOnlineHours,
          todayOnlineTimeStr,
          todayOrderPoints,
          todayTimePoints,
          todayTotalPoints,
          todayOrdersPerHour,
          todayEfficiencyPercent,
          todayLateOrders: dailyLateDeliveryCountMap[dId] || 0,
          todayLatePickupOrders: dailyLatePickupCountMap[dId] || 0,
          weekOrders: stat.weekOrders,
          weekFee: stat.weekFee,
          weekBonus: stat.weekBonus,
          weekOnlineSeconds: weekOnlineSec,
          weekOnlineMinutes,
          weekOnlineHours,
          weekOnlineTimeStr,
          weekOrderPoints,
          weekTimePoints,
          weekTotalPoints,
          weekOrdersPerHour,
          weekEfficiencyPercent,
          weekLateOrders: weeklyLateDeliveryCountMap[dId] || 0,
          weekLatePickupOrders: weeklyLatePickupCountMap[dId] || 0,
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
          lateOrders: {
            todayCount: todayLateOrdersList.length,
            weekCount: weekLateOrdersList.length,
            todayList: todayLateOrdersList,
            weekList: weekLateOrdersList
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
