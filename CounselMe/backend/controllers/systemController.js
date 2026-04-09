const SystemSetting = require('../models/SystemSetting');
const Coupon = require('../models/Coupon');

// GET settings/prices
exports.getSettings = async (req, res) => {
    try {
        const settings = await SystemSetting.find();
        const settingsMap = {};
        settings.forEach(s => {
            settingsMap[s.key] = s.value;
        });
        res.json(settingsMap);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST update settings
exports.updateSetting = async (req, res) => {
    try {
        const { key, value } = req.body;
        const setting = await SystemSetting.findOneAndUpdate(
            { key },
            { value },
            { returnDocument: 'after', upsert: true }
        );
        res.json(setting);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET all coupons
exports.getCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.json(coupons);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST create coupon
exports.createCoupon = async (req, res) => {
    try {
        const { code, discountPercentage, maxUses } = req.body;
        const coupon = new Coupon({ code, discountPercentage, maxUses });
        await coupon.save();
        res.status(201).json(coupon);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// PUT toggle coupon
exports.toggleCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
        coupon.isActive = !coupon.isActive;
        await coupon.save();
        res.json(coupon);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE coupon
exports.deleteCoupon = async (req, res) => {
    try {
        await Coupon.findByIdAndDelete(req.params.id);
        res.json({ message: 'Coupon deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST validate coupon
exports.validateCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        const coupon = await Coupon.findOne({ code: code.toUpperCase() });
        
        if (!coupon) return res.status(404).json({ message: 'Invalid coupon code' });
        if (!coupon.isActive) return res.status(400).json({ message: 'This coupon is no longer active' });
        if (coupon.maxUses > 0 && coupon.timesUsed >= coupon.maxUses) return res.status(400).json({ message: 'Coupon usage limit reached' });

        res.json(coupon);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST apply coupon usage
exports.applyCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        const coupon = await Coupon.findOne({ code: code.toUpperCase() });
        if (coupon) {
            coupon.timesUsed += 1;
            await coupon.save();
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
