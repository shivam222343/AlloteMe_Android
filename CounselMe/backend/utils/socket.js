const socketIO = require('socket.io');
const User = require('../models/User');

let io;
const socketUserMap = new Map(); // socket.id -> userId

const initSocket = (server) => {
    io = socketIO(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket] User connected: ${socket.id}`);

        socket.on('join', async (userId) => {
            if (!userId) return;

            socket.join(userId);
            socketUserMap.set(socket.id, userId);
            console.log(`[Socket] User ${userId} joined room from socket ${socket.id}`);

            // Update user status to Online
            try {
                await User.findByIdAndUpdate(userId, {
                    isOnline: true,
                    lastActive: new Date()
                });

                // Broadcast that user is online
                io.emit('user_status', { userId, isOnline: true });
            } catch (err) {
                console.error('Error updating user status:', err);
            }
        });

        socket.on('disconnect', async () => {
            const userId = socketUserMap.get(socket.id);
            if (userId) {
                console.log(`[Socket] User ${userId} offline (socket ${socket.id})`);

                // Check if user has other active sockets (in case of multiple tabs/devices)
                const sockets = await io.in(userId).fetchSockets();
                if (sockets.length === 0) {
                    try {
                        await User.findByIdAndUpdate(userId, {
                            isOnline: false,
                            lastActive: new Date()
                        });

                        // Broadcast that user is offline
                        io.emit('user_status', { userId, isOnline: false, lastActive: new Date() });
                    } catch (err) {
                        console.error('Error updating user status:', err);
                    }
                }
                socketUserMap.delete(socket.id);
            }
            console.log(`[Socket] Socket disconnected: ${socket.id}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

const emitUpdate = (event, data) => {
    if (io) {
        io.emit(event, data);
        console.log(`[Socket] Emitted ${event}`);
    }
};

module.exports = { initSocket, getIO, emitUpdate };
