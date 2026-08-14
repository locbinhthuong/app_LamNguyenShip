const mongoose = require("mongoose");
const Order = require("./models/Order");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/lamnguyenship").then(async () => {
  const orders = await Order.find();
  const order = orders.find(o => o._id.toString().toUpperCase().endsWith("4757E2DD"));
  console.log("orderCode:", order?.orderCode);
  console.log("deliveryFee:", order?.deliveryFee);
  console.log("extraSurcharge:", order?.extraSurcharge);
  process.exit(0);
}).catch(console.error);
