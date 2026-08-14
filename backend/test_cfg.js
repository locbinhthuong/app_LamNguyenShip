const mongoose = require("mongoose");
const Config = require("./models/Config");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/lamnguyenship").then(async () => {
  const cfg = await Config.findOne({ key: 'LATE_NIGHT_SURCHARGE_CONFIG' });
  console.log("Config:", JSON.stringify(cfg?.value));
  process.exit(0);
}).catch(console.error);
