const mongoose = require('mongoose');
const User = require('./models/User');
mongoose.connect('mongodb+srv://tanlocdepzai123_db_user:CoDtoiPXpllytpuj@cluster0.4sm9yrn.mongodb.net/lamnguyenship?appName=Cluster0').then(async () => {
  const users = await User.find({}).select('name role fcmToken').lean();
  console.log(users.filter(u => u.fcmToken && u.fcmToken !== ''));
  process.exit();
});
