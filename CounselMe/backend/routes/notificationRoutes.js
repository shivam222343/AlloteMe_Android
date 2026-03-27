const express = require('express');
const router = express.Router();
const { getNotifications, getUnreadCount, markAllRead, deleteAll, adminSendNotification } = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/read-all', markAllRead);
router.delete('/all', deleteAll);
router.post('/admin/send', authorize('admin'), adminSendNotification);

module.exports = router;
