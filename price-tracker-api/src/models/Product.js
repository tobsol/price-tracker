const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    url: { type: String, required: true }, // same URL can be tracked with different sizes
    title: String,
    currency: String,

    // size-specific tracking
    size: String, // e.g. "EU 45"

    // Prices
    lastPrice: Number, // latest price
    initialPrice: Number, // first seen price
    lowestPrice: Number, // lowest ever seen
    lowestPriceDate: Date, // when the lowestPrice happened

    // Derived analytics
    dropFromInitialPercent: Number, // % down from initial price (never negative)
    changeFromInitialPercent: Number, // signed % change vs initial (can be + or -)

    // Threshold rules
    targetPrice: Number, // notify when price <= this
    targetDiscountPercent: Number, // notify when % drop >= this

    // To avoid spamming notifications for the same exact price
    lastNotifiedPrice: Number,

    // History of checks
    priceHistory: [
      {
        price: Number,
        checkedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", ProductSchema);

module.exports = Product;
