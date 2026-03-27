const Notification = require('../models/Notification');

// @desc    Get all notifications for a user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get unread count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllRead = async (req, res) => {
    try {
        await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete all notifications
// @route   DELETE /api/notifications/all
// @access  Private
const deleteAll = async (req, res) => {
    try {
        await Notification.deleteMany({ user: req.user._id });
        res.json({ message: 'All notifications deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const { sendNotification: serviceSendNotification } = require('../services/notificationService');

// @desc    Admin send notification
// @route   POST /api/notifications/admin/send
// @access  Admin/Private
const adminSendNotification = async (req, res) => {
    try {
        const { targetUserId, title, message, type } = req.body;

        if (!title || !message) {
            return res.status(400).json({ message: 'Title and message are required' });
        }

        const result = await serviceSendNotification(targetUserId || 'all', title, message, type || 'info');

        if (result.success) {
            res.json({ message: 'Notification sent successfully', result });
        } else {
            res.status(500).json({ message: 'Failed to send notification', error: result.error });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAllRead,
    deleteAll,
    adminSendNotification
};
