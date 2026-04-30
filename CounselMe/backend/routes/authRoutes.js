const express = require('express');
const router = express.Router();
const {
    registerUser, loginUser, getUserProfile, updateUserProfile,
    changePassword, toggleSaveCollege, getAllUsers, getUserById, updateUserRole,
    sendOTP, verifyOTP, getDashboardStats, getAdmins, deleteAccount, deleteUser, setVerifiedPhone,
    updateAvatarPreference, toggleSavePrediction, googleLogin, sendSignupOTP, verifyOTPAndRegister, verifyOnlyOTP,
    updateFCMToken, removeFCMToken,
    sendForgotPasswordOTP, resetPassword
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleLogin);
router.post('/send-signup-otp', sendSignupOTP);
router.post('/verify-only-otp', verifyOnlyOTP);
router.post('/verify-signup-otp', verifyOTPAndRegister);
router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile)
    .delete(protect, deleteAccount);

router.post('/change-password', protect, changePassword);
router.post('/toggle-save', protect, toggleSaveCollege);
router.post('/toggle-save-prediction', protect, toggleSavePrediction);
router.post('/update-avatar', protect, updateAvatarPreference);

router.get('/stats', protect, authorize('admin'), getDashboardStats);
router.get('/admins', protect, authorize('admin', 'staff'), getAdmins);
router.get('/users', protect, authorize('admin'), getAllUsers);
router.route('/users/:id')
    .get(protect, authorize('admin'), getUserById)
    .put(protect, authorize('admin'), updateUserRole)
    .delete(protect, authorize('admin'), deleteUser);

router.post('/send-otp', protect, sendOTP);
router.post('/verify-otp', protect, verifyOTP);
router.put('/verify-phone', protect, setVerifiedPhone);

router.put('/fcm-token', protect, updateFCMToken);
router.delete('/fcm-token', protect, removeFCMToken);

router.post('/forgot-password', sendForgotPasswordOTP);
router.post('/reset-password', resetPassword);

module.exports = router;
