const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://LamNguyen:NTL123456@cluster0.zoxsh.mongodb.net/NTL_BinhThuong?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
  const users = await mongoose.connection.collection('users').find({}).toArray();
  for (const u of users) {
    console.log(`User ${u.phone} / ${u.fullName}: FCM: ${u.fcmToken}`);
  }
  process.exit(0);
}
run();
