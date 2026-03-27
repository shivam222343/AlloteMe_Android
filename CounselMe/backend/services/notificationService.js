const Notification = require('../models/Notification');
const User = require('../models/User');
const { getIO } = require('../utils/socket');

const sendNotification = async (userId, title, message, type = 'info') => {
    try {
        const io = getIO();

        if (userId === 'all') {
            // Global Notification
            const users = await User.find({}, '_id');
            const notifications = users.map(u => ({
                user: u._id,
                title,
                message,
                type
            }));

            await Notification.insertMany(notifications);
            io.emit('notification:received', { title, message, type, isGlobal: true });
            console.log(`[Notification] Global broadcast sent: ${title}`);
            return { success: true, count: users.length };
        } else {
            // Target User Notification
            const notification = await Notification.create({
                user: userId,
                title,
                message,
                type
            });

            // Emit to specific user room
            io.to(userId).emit('notification:received', notification);
            console.log(`[Notification] Sent to ${userId}: ${title}`);
            return { success: true, notification };
        }
    } catch (error) {
        console.error('[NotificationService] Error:', error);
        return { success: false, error: error.message };
    }
};

const GREETINGS = {
    morning: [
        "Good Morning! Start your college search with a positive vibe.",
        "Rise and shine! New prediction cutoffs are waiting for you.",
        "Morning! Have you checked the latest featured institutions?"
    ],
    afternoon: [
        "Good Afternoon! Taking a break? Browse some top-rated colleges.",
        "Hello! Stay focused on your goals. We're here to help.",
        "Afternoon! Need help with your prediction results?"
    ],
    evening: [
        "Good Evening! Reflect on your career choices today.",
        "Evening! Don't forget to save the colleges you liked.",
        "Relaxing? Why not chat with our AI counselor for advice?"
    ]
};

const sendRandomGreeting = async () => {
    const hour = new Date().getHours();
    let timeSlot = '';

    if (hour >= 5 && hour < 12) timeSlot = 'morning';
    else if (hour >= 12 && hour < 17) timeSlot = 'afternoon';
    else if (hour >= 17 && hour < 22) timeSlot = 'evening';

    if (!timeSlot) return; // Skip late night

    const messages = GREETINGS[timeSlot];
    const message = messages[Math.floor(Math.random() * messages.length)];
    const title = timeSlot.charAt(0).toUpperCase() + timeSlot.slice(1) + ' Greeting';

    // To preserve resources, we only send to active users (mocked here as simple broadcast)
    // In a real app, maybe only to those who haven't seen one in 6 hours
    await sendNotification('all', title, message, 'info');
};

module.exports = { sendNotification, sendRandomGreeting };
