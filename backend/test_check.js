const mongoose = require('mongoose');
const { checkDriverDebtBlock, getTodayVN } = require('./utils/debtUtils');
const Driver = require('./models/Driver');

mongoose.connect('mongodb://127.0.0.1:27017/lamnguyenship', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("Connected to DB");
    const today = getTodayVN();
    const drivers = await Driver.find({ status: 'active' });
    let found = 0;
    for(let d of drivers) {
      const res = await checkDriverDebtBlock(d._id);
      if(res.blocked) {
        // Let's check if totalActualDebt is just from today
        // We can do a quick check by looking at transactions directly
        const DebtTransaction = require('./models/DebtTransaction');
        const txs = await DebtTransaction.find({ driverId: d._id, status: 'SUCCESS' }).lean();
        
        let totalOld = 0;
        let totalPayments = 0;
        let todayDebt = 0;
        txs.forEach(tx => {
           const dateStr = tx.targetDate || new Date(tx.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
           if(tx.amount < 0) totalPayments += Math.abs(tx.amount);
           else {
              if(dateStr < today) totalOld += tx.amount;
              else todayDebt += tx.amount;
           }
        });
        
        let unpaidOld = Math.max(0, totalOld - totalPayments);
        
        if(unpaidOld <= 0 && res.blocked) {
           console.log(`Driver ${d.name} (${d._id}) is falsely blocked!`);
           console.log(`Old Debt: ${totalOld}, Payments: ${totalPayments}, Today: ${todayDebt}`);
           console.log(`Details from checkDriverDebtBlock:`, JSON.stringify(res.details, null, 2));
           found++;
        }
      }
    }
    console.log(`Found ${found} falsely blocked drivers.`);
    process.exit(0);
  });
