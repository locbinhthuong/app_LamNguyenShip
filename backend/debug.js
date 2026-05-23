require('dotenv').config();
const mongoose = require('mongoose');
const DebtTransaction = require('./models/DebtTransaction');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const txs = await DebtTransaction.find({ createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) } }).limit(50);
  console.log('Recent TXs:', txs.length);
  txs.forEach(t => console.log(t.createdAt, t.type, t.status, t.description, t.amount));
  process.exit(0);
}
check();
