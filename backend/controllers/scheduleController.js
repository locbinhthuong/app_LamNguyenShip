const DriverSchedule = require('../models/DriverSchedule');
const Driver = require('../models/Driver');
const {
  getDayOfWeekVN,
  getWeekKey,
  getNextWeekKey,
  getWeekDates,
  getDayKeyFromDayOfWeek,
  getNowVN
} = require('../utils/scheduleUtils');

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
    const currentDayKey = getDayKeyFromDayOfWeek(dayOfWeek);

    // 1. Tìm hoặc khởi tạo lịch tuần hiện tại
    let currentSchedule = await DriverSchedule.findOne({ driverId, weekKey: currentWeekKey });

    // Xử lý trường hợp quên đăng ký vào Chủ Nhật:
    // Nếu hôm nay là Thứ 2 trở đi mà chưa có lịch tuần này -> Tự khởi tạo lịch với các ngày đã qua/hôm nay là PARTTIME
    let noticeMessage = null;
    let canRegisterRemaining = false;

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
          friday: { shift: 'PARTTIME' }
        },
        isSubmitted: false
      });

      if (dayOfWeek === 1) { // Thứ 2
        noticeMessage = 'Bạn chưa đăng ký ca tuần này vào Chủ Nhật. Hôm nay (Thứ Hai) bạn sẽ chạy Part-time, và bạn có thể đăng ký ca cho Thứ 3 đến Thứ 6!';
        canRegisterRemaining = true;
      }
    } else if (!currentSchedule.isSubmitted && dayOfWeek >= 1 && dayOfWeek <= 4) {
      canRegisterRemaining = true;
    }

    // 2. Tìm lịch tuần tiếp theo (nếu hôm nay là Chủ Nhật thì mở đăng ký tuần tới)
    let nextSchedule = await DriverSchedule.findOne({ driverId, weekKey: nextWeekKey });
    const isSunday = (dayOfWeek === 0);

    // 3. Tính toán ngày khóa không được đổi (từ ngày mai trở đi mới được đổi)
    const weekDates = getWeekDates();
    const editableDays = {};
    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    daysOrder.forEach((day, index) => {
      const dayNum = index + 1; // 1: T2, 2: T3, ...
      // Chỉ cho phép đổi nếu ngày đó lớn hơn ngày hôm nay (tức là từ ngày mai trở đi)
      editableDays[day] = dayNum > dayOfWeek;
    });

    return res.json({
      success: true,
      data: {
        currentWeekKey,
        nextWeekKey,
        dayOfWeek,
        currentDayKey,
        isSunday, // Có đang là Chủ Nhật mở cổng tuần mới không
        canRegisterRemaining, // Có được đăng ký bổ sung các ngày còn lại không
        noticeMessage,
        currentSchedule,
        nextSchedule,
        editableDays,
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
 * Body: { weekKey, schedule: { monday, tuesday, wednesday, thursday, friday } }
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
    const dayOfWeek = getDayOfWeekVN();

    // Kiểm tra tính hợp lệ về thời gian đăng ký:
    // 1. Nếu đăng ký cho tuần tiếp theo: Cho phép vào ngày Chủ Nhật
    // 2. Nếu đăng ký cho tuần hiện tại: Cho phép đăng ký bổ sung các ngày từ ngày mai trở đi
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

    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const validShifts = ['FULLTIME', 'PARTTIME', 'OFF'];

    daysOrder.forEach((day, index) => {
      const targetDayNum = index + 1;
      const inputShift = schedule[day]?.shift || schedule[day] || 'PARTTIME';
      const cleanShift = validShifts.includes(inputShift) ? inputShift : 'PARTTIME';

      if (isRegisteringNextWeek) {
        // Tuần tới: Được set toàn bộ 5 ngày
        if (!existing.schedule[day]) existing.schedule[day] = {};
        existing.schedule[day].shift = cleanShift;
      } else {
        // Tuần hiện tại (đăng ký bổ sung khi quên CN):
        // Chỉ cho phép cập nhật các ngày từ ngày mai trở đi (targetDayNum > dayOfWeek)
        if (targetDayNum > dayOfWeek) {
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

    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const validShifts = ['FULLTIME', 'PARTTIME', 'OFF'];

    if (!weekKey || !validDays.includes(dayKey) || !validShifts.includes(newShift)) {
      return res.status(400).json({
        success: false,
        message: 'Thông tin đổi ca không hợp lệ'
      });
    }

    const currentWeekKey = getWeekKey();
    const nextWeekKey = getNextWeekKey();
    const dayOfWeek = getDayOfWeekVN(); // 0: CN, 1: T2, ..., 5: T6

    // Kiểm tra điều kiện thời gian:
    if (weekKey === currentWeekKey) {
      const daysIndexMap = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
      const targetDayNum = daysIndexMap[dayKey];

      // BẮT BUỘC TRƯỚC 1 NGÀY: targetDayNum phải lớn hơn dayOfWeek
      // Ví dụ: Hôm nay là Thứ 5 (dayOfWeek = 4), muốn đổi Thứ 6 (targetDayNum = 5) -> 5 > 4 (HỢP LỆ)
      // Nếu hôm nay là Thứ 6 (dayOfWeek = 5), muốn đổi Thứ 6 -> 5 > 5 là FALSE (BỊ CHẶN)
      if (targetDayNum <= dayOfWeek) {
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

    // Tạo map danh sách đầy đủ tất cả tài xế (kể cả người chưa đăng ký)
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
          friday: { shift: 'PARTTIME' }
        },
        isSubmitted: existing ? existing.isSubmitted : false,
        submittedAt: existing ? existing.submittedAt : null,
        changeHistory: existing ? existing.changeHistory : []
      };
    });

    // Thống kê số lượng Fulltime theo từng ngày
    const stats = {
      monday: { fulltime: 0, parttime: 0, off: 0 },
      tuesday: { fulltime: 0, parttime: 0, off: 0 },
      wednesday: { fulltime: 0, parttime: 0, off: 0 },
      thursday: { fulltime: 0, parttime: 0, off: 0 },
      friday: { fulltime: 0, parttime: 0, off: 0 }
    };

    fullList.forEach(item => {
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(d => {
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
