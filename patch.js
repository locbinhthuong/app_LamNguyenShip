const fs = require('fs');
let code = fs.readFileSync('backend/controllers/orderController.js', 'utf8');
code = code.replace(
  /try\s*\{\s*const surchargeDoc = await Config\.findOne\(\{ key: 'LATE_NIGHT_SURCHARGE_CONFIG' \}\);[\s\S]*?res\.status\(200\)\.json\(\{\s*success: true,\s*data: \{\s*distanceKm,\s*deliveryFee,\s*routeLine\s*\}\s*\}\);\s*\} catch \(error\) \{/,
  `      let extraSurcharge = 0;
      let surchargeNote = '';
      try {
        const surchargeDoc = await Config.findOne({ key: 'LATE_NIGHT_SURCHARGE_CONFIG' });
        let cfg = { level1: { time: '22:30', amount: 3000 }, level2: { time: '23:30', amount: 5000 }, endTime: '06:00' };
        if (surchargeDoc && surchargeDoc.value) {
          cfg = surchargeDoc.value;
        }
        
        if (cfg) {
          const parseTime = (timeStr) => {
            if (!timeStr) return null;
            const parts = timeStr.split(':');
            return { h: parseInt(parts[0], 10) || 0, m: parseInt(parts[1], 10) || 0 };
          };
          
          const l1 = parseTime(cfg.level1?.time);
          const l2 = parseTime(cfg.level2?.time);
          const e = parseTime(cfg.endTime);
          
          if (l1 && l2 && e) {
            const vnTime = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Ho_Chi_Minh'}));
            const currentTotalMinutes = vnTime.getHours() * 60 + vnTime.getMinutes();
            
            const l1Total = l1.h * 60 + l1.m;
            const l2Total = l2.h * 60 + l2.m;
            const eTotal = e.h * 60 + e.m;
            
            const isBetween = (startMins, endMins, current) => {
              if (startMins <= endMins) {
                return current >= startMins && current <= endMins;
              } else {
                return current >= startMins || current <= endMins;
              }
            };
            
            if (isBetween(l2Total, eTotal, currentTotalMinutes)) {
              extraSurcharge = (cfg.level2?.amount || 0);
              surchargeNote = 'Phụ phí đêm khuya (sau ' + cfg.level2?.time + ')';
            } else if (isBetween(l1Total, eTotal, currentTotalMinutes)) {
              extraSurcharge = (cfg.level1?.amount || 0);
              surchargeNote = 'Phụ phí đêm khuya (sau ' + cfg.level1?.time + ')';
            }
          }
        }
      } catch (err) {
        console.error('Lỗi tính phụ phí giờ khuya:', err);
      }

      res.status(200).json({
        success: true,
        data: {
          distanceKm,
          deliveryFee,
          extraSurcharge,
          surchargeNote,
          routeLine
        }
      });
    } catch (error) {`
);
fs.writeFileSync('backend/controllers/orderController.js', code);
