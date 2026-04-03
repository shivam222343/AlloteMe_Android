const Notification = require('../models/Notification');
const { getIO } = require('../utils/socket');

const sendNotification = async (userId, title, message, type = 'info') => {
    try {
        const io = getIO();

        // Save to Database if specific user
        let savedNotification = null;
        if (userId !== 'all') {
            savedNotification = await Notification.create({
                user: userId,
                title,
                message,
                type
            });
        }

        const notificationData = {
            _id: savedNotification?._id || Date.now().toString(),
            title,
            message,
            type,
            createdAt: new Date().toISOString(),
            read: false
        };

        if (userId === 'all') {
            io.emit('notification:received', { ...notificationData, isGlobal: true });
            return { success: true };
        } else {
            io.to(userId.toString()).emit('notification:received', notificationData);
            return { success: true, notification: notificationData };
        }
    } catch (error) {
        console.error('[NotificationService] Error:', error);
        return { success: false, error: error.message };
    }
};

const GREETINGS = {
    morning: [
        { title: "☀️ Morning Motivation", message: "Morning! Your dream college is just a preference away. Start your search now! 🚀", type: 'success' },
        { title: "☕ Early Bird Cutoffs", message: "Rise and shine! New prediction algorithms are live for today's searches. 🏫", type: 'info' },
        { title: "🌅 Fresh Start", message: "A new day to find your perfect fit. Have you checked COEP cutoffs today? 🎓", type: 'info' }
    ],
    afternoon: [
        { title: "🌤️ Afternoon Update", message: "Taking a break? Browse through our top-rated featured institutions. 🏫", type: 'info' },
        { title: "💡 Pro Tip", message: "Lower percentile? Don't worry! Try exploring regional branch options. 🎯", type: 'success' },
        { title: "📊 Result Analysis", message: "Check out the latest branch-wise cutoffs for the 2024-25 cycle. 📈", type: 'info' }
    ],
    evening: [
        { title: "🌙 Evening Insight", message: "Reflection time. Which colleges did you save today? View your favorites! ⭐", type: 'success' },
        { title: "💬 AI Counselor Online", message: "Eta is ready for a late-night chat. Need help with branch choices? 🤖", type: 'info' },
        { title: "🛌 Rest & Plan", message: "Great progress today! We'll keep updating cutoffs while you sleep. 💤", type: 'info' }
    ]
};

const sendRandomGreeting = async () => {
    const { timeSlot } = getTimeContext();
    if (!timeSlot) return;

    const messages = GREETINGS[timeSlot];
    const item = messages[Math.floor(Math.random() * messages.length)];
    await sendNotification('all', item.title, item.message, item.type);
};

const triggerDailyNotifications = async (user) => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];

        // Ensure stats exist
        if (!user.notificationStats) {
            user.notificationStats = { notificationsToday: 0, lastStatusUpdate: todayStr };
        }

        // Reset if new day
        if (user.notificationStats.lastStatusUpdate !== todayStr) {
            user.notificationStats.notificationsToday = 0;
            user.notificationStats.lastStatusUpdate = todayStr;
            user.notificationStats.lastNotificationAt = null;
        }

        // Must be < 2 notifications today
        if (user.notificationStats.notificationsToday >= 2) return;

        // Cool-down check: Wait at least 6 hours between notifications
        const lastSent = user.notificationStats.lastNotificationAt;
        if (lastSent && (new Date() - new Date(lastSent)) < (6 * 60 * 60 * 1000)) {
            return;
        }

        const { timeSlot } = getTimeContext();
        if (!timeSlot) return;

        const messages = GREETINGS[timeSlot];
        const item = messages[Math.floor(Math.random() * messages.length)];

        await sendNotification(user._id, item.title, item.message, item.type);

        // Update User
        user.notificationStats.notificationsToday += 1;
        user.notificationStats.lastNotificationAt = new Date();
        await user.save();

        console.log(`[Notification] Auto-trigger success for ${user.email} (${user.notificationStats.notificationsToday}/2)`);
    } catch (e) {
        console.error('Auto Notification Error:', e);
    }
};

const getTimeContext = () => {
    // Current IST time
    const now = new Date();
    const utcOffset = now.getTimezoneOffset(); // in minutes
    const istOffset = 330;
    const istTime = new Date(now.getTime() + (istOffset + utcOffset) * 60000);
    const hour = istTime.getHours();

    let timeSlot = '';
    if (hour >= 5 && hour < 12) timeSlot = 'morning';
    else if (hour >= 12 && hour < 17) timeSlot = 'afternoon';
    else if (hour >= 17 && hour < 22) timeSlot = 'evening';

    return { timeSlot, hour };
};

module.exports = { sendNotification, sendRandomGreeting, triggerDailyNotifications };
