const DriverSchedule = require('../models/DriverSchedule');
const Driver = require('../models/Driver');
const {
  getDayOfWeekVN,
  getDayNumInISOWeek,
  getWeekKey,
  getNextWeekKey,
  getWeekDates,
  getDayKeyFromDayOfWeek,
  getNowVN
} = require('../utils/scheduleUtils');

const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAYS_INDEX_MAP = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7
};

/**
 * Lấy thông tin lịch làm việc của tài xế (Tuần hiện tại & Tuần tới)
 * GET /api/schedules/my
 */
exports.getMyWeeklySchedule = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const currentWeekKey = getWeekKey();
    const nextWeekKey = getNextWeekKey();
    const dayOfWeek = getDayOfWeekVN(); // 0: CN, 1: T2, ..., 6: T7
    const currentIsoDay = getDayNumInISOWeek(); // 1: T2 -> 7: CN
    const currentDayKey = getDayKeyFromDayOfWeek(dayOfWeek);

    // 1. Tìm hoặc khởi tạo lịch tuần hiện tại
    let currentSchedule = await DriverSchedule.findOne({ driverId, weekKey: currentWeekKey });

    let noticeMessage = null;

    if (!currentSchedule) {
      // Tự động tạo bản ghi mặc định PARTTIME cho các ngày
      currentSchedule = await DriverSchedule.create({
        driverId,
        weekKey: currentWeekKey,
        schedule: {
          monday: { shift: 'PARTTIME' },
          tuesday: { shift: 'PARTTIME' },
          wednesday: { shift: 'PARTTIME' },
          thursday: { shift: 'PARTTIME' },
          friday: { shift: 'PARTTIME' },
          saturday: { shift: 'PARTTIME' },
          sunday: { shift: 'PARTTIME' }
        },
        isSubmitted: false
      });

      if (currentIsoDay < 7) {
        noticeMessage = 'Hôm nay bạn đang chạy Part-time. Bạn có thể đăng ký ca cho các ngày còn lại trong tuần!';
      }
    }

    // 2. Tìm hoặc khởi tạo lịch tuần tiếp theo (Luôn cho phép tài xế xem và đăng ký trước tuần tới)
    let nextSchedule = await DriverSchedule.findOne({ driverId, weekKey: nextWeekKey });
    if (!nextSchedule) {
      nextSchedule = new DriverSchedule({
        driverId,
        weekKey: nextWeekKey,
        schedule: {
          monday: { shift: 'PARTTIME' },
          tuesday: { shift: 'PARTTIME' },
          wednesday: { shift: 'PARTTIME' },
          thursday: { shift: 'PARTTIME' },
          friday: { shift: 'PARTTIME' },
          saturday: { shift: 'PARTTIME' },
          sunday: { shift: 'PARTTIME' }
        },
        isSubmitted: false
      });
    }

    // 3. Tính toán các ngày được phép sửa:
    // - Tuần hiện tại: Chỉ được sửa các ngày từ ngày mai trở đi (targetDayNum > currentIsoDay)
    // - Tuần tiếp theo: Được sửa TẤT CẢ 7 ngày!
    const editableDaysCurrentWeek = {};
    const editableDaysNextWeek = {};

    ALL_DAYS.forEach((day) => {
      const targetDayNum = DAYS_INDEX_MAP[day];
      editableDaysCurrentWeek[day] = targetDayNum > currentIsoDay;
      editableDaysNextWeek[day] = true; // Tuần sau luôn mở
    });

    const isSunday = (dayOfWeek === 0);
    const weekDates = getWeekDates();

    return res.json({
      success: true,
      data: {
        currentWeekKey,
        nextWeekKey,
        dayOfWeek,
        currentIsoDay,
        currentDayKey,
        isSunday,
        noticeMessage,
        currentSchedule,
        nextSchedule,
        editableDays: editableDaysCurrentWeek,
        editableDaysNextWeek,
        weekDates
      }
    });
  } catch (error) {
    console.error('[ScheduleController] getMyWeeklySchedule error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi tải lịch làm việc',
      error: error.message
    });
  }
};

/**
 * Đăng ký ca làm việc tuần
 * POST /api/schedules/register
 * Body: { weekKey, schedule: { monday, tuesday, ... } }
 */
exports.registerWeeklySchedule = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { weekKey, schedule } = req.body;

    if (!weekKey || !schedule) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu đăng ký không hợp lệ'
      });
    }

    const currentWeekKey = getWeekKey();
    const nextWeekKey = getNextWeekKey();
    const currentIsoDay = getDayNumInISOWeek();

    const isRegisteringNextWeek = (weekKey === nextWeekKey);
    const isRegisteringCurrentWeek = (weekKey === currentWeekKey);

    if (!isRegisteringNextWeek && !isRegisteringCurrentWeek) {
      return res.status(400).json({
        success: false,
        message: 'Mã tuần đăng ký không hợp lệ'
      });
    }

    let existing = await DriverSchedule.findOne({ driverId, weekKey });
    if (!existing) {
      existing = new DriverSchedule({
        driverId,
        weekKey,
        schedule: {}
      });
    }

    const validShifts = ['FULLTIME', 'PARTTIME', 'OFF'];

    ALL_DAYS.forEach((day) => {
      const targetDayNum = DAYS_INDEX_MAP[day];
      const inputShift = schedule[day]?.shift || schedule[day] || 'PARTTIME';
      const cleanShift = validShifts.includes(inputShift) ? inputShift : 'PARTTIME';

      if (isRegisteringNextWeek) {
        // Tuần tới: Được set toàn bộ 7 ngày
        if (!existing.schedule[day]) existing.schedule[day] = {};
        existing.schedule[day].shift = cleanShift;
      } else {
        // Tuần hiện tại: Chỉ được cập nhật các ngày từ ngày mai trở đi
        if (targetDayNum > currentIsoDay) {
          if (!existing.schedule[day]) existing.schedule[day] = {};
          existing.schedule[day].shift = cleanShift;
        } else {
          // Ngày hôm nay hoặc quá khứ giữ nguyên
          if (!existing.schedule[day]) existing.schedule[day] = { shift: 'PARTTIME' };
        }
      }
    });

    existing.isSubmitted = true;
    existing.submittedAt = new Date();
    await existing.save();

    return res.json({
      success: true,
      message: isRegisteringNextWeek 
        ? 'Đăng ký ca làm việc tuần mới thành công!' 
        : 'Đăng ký bổ sung ca các ngày còn lại thành công!',
      data: existing
    });
  } catch (error) {
    console.error('[ScheduleController] registerWeeklySchedule error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi đăng ký ca làm việc',
      error: error.message
    });
  }
};

/**
 * Đổi lịch ca làm việc của một ngày cụ thể (BẮT BUỘC TRƯỚC 1 NGÀY)
 * POST /api/schedules/change-shift
 * Body: { weekKey, dayKey, newShift, reason }
 */
exports.changeShiftBeforehand = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { weekKey, dayKey, newShift, reason } = req.body;

    const validShifts = ['FULLTIME', 'PARTTIME', 'OFF'];

    if (!weekKey || !ALL_DAYS.includes(dayKey) || !validShifts.includes(newShift)) {
      return res.status(400).json({
        success: false,
        message: 'Thông tin đổi ca không hợp lệ'
      });
    }

    const currentWeekKey = getWeekKey();
    const nextWeekKey = getNextWeekKey();
    const currentIsoDay = getDayNumInISOWeek();

    // Kiểm tra điều kiện thời gian:
    if (weekKey === currentWeekKey) {
      const targetDayNum = DAYS_INDEX_MAP[dayKey];

      // BẮT BUỘC TRƯỚC 1 NGÀY: targetDayNum phải lớn hơn currentIsoDay
      if (targetDayNum <= currentIsoDay) {
        return res.status(400).json({
          success: false,
          message: 'Chỉ được phép đổi lịch trước ít nhất 1 ngày (trước 23:59 đêm hôm trước). Không thể đổi lịch cho ngày hôm nay hoặc ngày đã qua!'
        });
      }
    } else if (weekKey !== nextWeekKey) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ được phép đổi lịch của tuần này hoặc tuần kế tiếp'
      });
    }

    let scheduleDoc = await DriverSchedule.findOne({ driverId, weekKey });
    if (!scheduleDoc) {
      scheduleDoc = new DriverSchedule({
        driverId,
        weekKey,
        schedule: {}
      });
    }

    const oldShift = scheduleDoc.schedule[dayKey]?.shift || 'PARTTIME';

    if (oldShift === newShift) {
      return res.json({
        success: true,
        message: 'Ca làm việc không thay đổi',
        data: scheduleDoc
      });
    }

    // Cập nhật ca mới
    if (!scheduleDoc.schedule[dayKey]) {
      scheduleDoc.schedule[dayKey] = {};
    }
    scheduleDoc.schedule[dayKey].shift = newShift;
    scheduleDoc.schedule[dayKey].isDowngraded = false; // Reset cờ phạt nếu đổi ca hợp lệ

    // Lưu vết lịch sử đổi ca
    scheduleDoc.changeHistory.push({
      dayKey,
      oldShift,
      newShift,
      changedAt: new Date(),
      reason: reason ? reason.trim() : 'Tài xế tự đổi ca trước 1 ngày'
    });

    await scheduleDoc.save();

    console.log(`[DriverSchedule] Tài xế ${driverId} đã đổi ca ${dayKey} (${weekKey}) từ ${oldShift} -> ${newShift}`);

    return res.json({
      success: true,
      message: `Đã đổi lịch ${dayKey.toUpperCase()} sang ${newShift} thành công!`,
      data: scheduleDoc
    });
  } catch (error) {
    console.error('[ScheduleController] changeShiftBeforehand error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi đổi ca làm việc',
      error: error.message
    });
  }
};

/**
 * Lấy danh sách lịch tuần của tất cả tài xế (Admin)
 * GET /api/schedules/admin?weekKey=...
 */
exports.getAllSchedulesAdmin = async (req, res) => {
  try {
    const weekKey = req.query.weekKey || getWeekKey();

    const [schedules, allDrivers] = await Promise.all([
      DriverSchedule.find({ weekKey })
        .populate('driverId', 'name phone driverCode status isOnline vehicleType')
        .lean(),
      Driver.find({ status: { $ne: 'banned' } })
        .select('name phone driverCode status isOnline vehicleType')
        .lean()
    ]);

    const scheduleMap = new Map();
    schedules.forEach(s => {
      if (s.driverId?._id) {
        scheduleMap.set(s.driverId._id.toString(), s);
      }
    });

    const fullList = allDrivers.map(driver => {
      const existing = scheduleMap.get(driver._id.toString());
      return {
        driver,
        schedule: existing ? existing.schedule : {
          monday: { shift: 'PARTTIME' },
          tuesday: { shift: 'PARTTIME' },
          wednesday: { shift: 'PARTTIME' },
          thursday: { shift: 'PARTTIME' },
          friday: { shift: 'PARTTIME' },
          saturday: { shift: 'PARTTIME' },
          sunday: { shift: 'PARTTIME' }
        },
        isSubmitted: existing ? existing.isSubmitted : false,
        submittedAt: existing ? existing.submittedAt : null,
        changeHistory: existing ? existing.changeHistory : []
      };
    });

    // Thống kê cho cả 7 ngày
    const stats = {};
    ALL_DAYS.forEach(day => {
      stats[day] = { fulltime: 0, parttime: 0, off: 0 };
    });

    fullList.forEach(item => {
      ALL_DAYS.forEach(d => {
        const shift = item.schedule[d]?.shift || 'PARTTIME';
        if (shift === 'FULLTIME') stats[d].fulltime++;
        else if (shift === 'OFF') stats[d].off++;
        else stats[d].parttime++;
      });
    });

    return res.json({
      success: true,
      weekKey,
      stats,
      data: fullList
    });
  } catch (error) {
    console.error('[ScheduleController] getAllSchedulesAdmin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi tải danh sách lịch ca của tài xế',
      error: error.message
    });
  }
};


/**
 * Admin chỉnh sửa ca làm việc của tài xế
 * PUT /api/schedules/admin/update-shift
 * Body: { driverId, weekKey, dayKey, shift, isDowngraded }
 */
exports.adminUpdateDriverShift = async (req, res) => {
  try {
    const { driverId, weekKey, dayKey, shift, isDowngraded } = req.body;

    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const validShifts = ['FULLTIME', 'PARTTIME', 'OFF'];

    if (!driverId || !weekKey || !validDays.includes(dayKey) || !validShifts.includes(shift)) {
      return res.status(400).json({
        success: false,
        message: 'Thông tin cập nhật không hợp lệ'
      });
    }

    let scheduleDoc = await DriverSchedule.findOne({ driverId, weekKey });
    if (!scheduleDoc) {
      scheduleDoc = new DriverSchedule({
        driverId,
        weekKey,
        schedule: {
          monday: { shift: 'PARTTIME' },
          tuesday: { shift: 'PARTTIME' },
          wednesday: { shift: 'PARTTIME' },
          thursday: { shift: 'PARTTIME' },
          friday: { shift: 'PARTTIME' },
          saturday: { shift: 'PARTTIME' },
          sunday: { shift: 'PARTTIME' }
        }
      });
    }

    const oldShift = scheduleDoc.schedule[dayKey]?.shift || 'PARTTIME';

    if (!scheduleDoc.schedule[dayKey]) {
      scheduleDoc.schedule[dayKey] = {};
    }

    scheduleDoc.schedule[dayKey].shift = shift;

    if (isDowngraded !== undefined) {
      scheduleDoc.schedule[dayKey].isDowngraded = Boolean(isDowngraded);
      if (!isDowngraded) {
        scheduleDoc.schedule[dayKey].offlineCount = 0;
      }
    } else if (shift === 'FULLTIME') {
      scheduleDoc.schedule[dayKey].isDowngraded = false;
      scheduleDoc.schedule[dayKey].offlineCount = 0;
    }

    scheduleDoc.changeHistory.push({
      dayKey,
      oldShift,
      newShift: shift,
      changedAt: new Date(),
      reason: `Admin (${req.admin?.name || 'Admin'}) điều chỉnh ca trực tiếp`
    });

    await scheduleDoc.save();

    return res.json({
      success: true,
      message: `Đã cập nhật ca ${dayKey.toUpperCase()} của tài xế thành ${shift}`,
      data: scheduleDoc
    });
  } catch (error) {
    console.error('[ScheduleController] adminUpdateDriverShift error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi Admin cập nhật ca làm việc',
      error: error.message
    });
  }
};
