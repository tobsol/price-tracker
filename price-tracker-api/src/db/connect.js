const mongoose = require("mongoose");

async function connectDb() {
  const MONGO_URL =
    process.env.MONGO_URL || "mongodb://127.0.0.1:27017/price-tracker";

  try {
    await mongoose.connect(MONGO_URL);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    throw err;
  }
}

module.exports = { connectDb };
