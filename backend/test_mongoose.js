const mongoose = require('mongoose');
try {
  const shopId = "69c7e4ebe1ee66448f3af226";
  const id = new require('mongoose').Types.ObjectId(shopId);
  console.log("Success:", id);
} catch (e) {
  console.error("Error:", e.message);
}
