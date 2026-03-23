const express = require('express');
const router = express.Router();
const { getNotifications, markAllRead, deleteAll } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getNotifications);
router.put('/read-all', markAllRead);
router.delete('/all', deleteAll);

module.exports = router;
