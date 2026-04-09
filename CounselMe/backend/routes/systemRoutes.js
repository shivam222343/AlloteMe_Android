const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes for checkout
router.get('/settings', systemController.getSettings);
router.post('/coupons/validate', systemController.validateCoupon);
router.post('/coupons/apply', systemController.applyCoupon);

// Admin routes
router.post('/settings', protect, systemController.updateSetting);
router.get('/coupons', protect, systemController.getCoupons);
router.post('/coupons', protect, systemController.createCoupon);
router.put('/coupons/:id/toggle', protect, systemController.toggleCoupon);
router.delete('/coupons/:id', protect, systemController.deleteCoupon);

module.exports = router;
