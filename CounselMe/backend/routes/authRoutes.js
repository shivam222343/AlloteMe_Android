const express = require('express');
const router = express.Router();
const {
    registerUser, loginUser, getUserProfile, updateUserProfile,
    changePassword, toggleSaveCollege, getAllUsers, getUserById, updateUserRole,
    sendOTP, verifyOTP, getDashboardStats, deleteAccount, deleteUser, setVerifiedPhone,
    updateAvatarPreference
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile)
    .delete(protect, deleteAccount);

router.post('/change-password', protect, changePassword);
router.post('/toggle-save', protect, toggleSaveCollege);
router.post('/update-avatar', protect, updateAvatarPreference);

router.get('/users', protect, authorize('admin'), getAllUsers);
router.route('/users/:id')
    .get(protect, authorize('admin'), getUserById)
    .put(protect, authorize('admin'), updateUserRole)
    .delete(protect, authorize('admin'), deleteUser);

router.post('/send-otp', protect, sendOTP);
router.post('/verify-otp', protect, verifyOTP);
router.put('/verify-phone', protect, setVerifiedPhone);
router.get('/stats', protect, authorize('admin'), getDashboardStats);

module.exports = router;
