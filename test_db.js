const mongoose = require("mongoose");
const Order = require("./backend/models/Order");
require("dotenv").config({path: "./backend/.env"});
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/lamnguyenship").then(async () => {
  const order = await Order.findOne({orderCode: "4757E2DD"});
  console.log("deliveryFee:", order.deliveryFee);
  console.log("extraSurcharge:", order.extraSurcharge);
  process.exit(0);
});
