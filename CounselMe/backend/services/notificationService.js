const { getIO } = require('../utils/socket');

const sendNotification = async (userId, title, message, type = 'info') => {
    try {
        const io = getIO();
        const notificationData = {
            _id: Date.now().toString(), // Mock ID for local storage
            title,
            message,
            type,
            createdAt: new Date().toISOString(),
            read: false
        };

        if (userId === 'all') {
            // Global Notification - Emission Only
            io.emit('notification:received', { ...notificationData, isGlobal: true });
            console.log(`[Notification] Global broadcast emitted: ${title}`);
            return { success: true };
        } else {
            // Target User Notification - Emission Only
            io.to(userId).emit('notification:received', notificationData);
            console.log(`[Notification] Emitted to ${userId}: ${title}`);
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
    // Convert to IST (UTC + 5:30)
    const now = new Date();
    const utcOffset = now.getTimezoneOffset(); // in minutes
    const istOffset = 330;
    const istTime = new Date(now.getTime() + (istOffset + utcOffset) * 60000);
    const hour = istTime.getHours();

    let timeSlot = '';
    if (hour >= 5 && hour < 12) timeSlot = 'morning';
    else if (hour >= 12 && hour < 17) timeSlot = 'afternoon';
    else if (hour >= 17 && hour < 22) timeSlot = 'evening';

    if (!timeSlot) return;

    const messages = GREETINGS[timeSlot];
    const item = messages[Math.floor(Math.random() * messages.length)];

    // Broadcast to all active users
    await sendNotification('all', item.title, item.message, item.type);
};

module.exports = { sendNotification, sendRandomGreeting };
