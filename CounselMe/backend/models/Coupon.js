const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true },
    discountPercentage: { type: Number, required: true, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    maxUses: { type: Number, default: 0 }, // 0 means unlimited
    timesUsed: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', CouponSchema);
