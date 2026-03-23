const socketIO = require('socket.io');

let io;

const initSocket = (server) => {
    io = socketIO(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket] User connected: ${socket.id}`);

        socket.on('join', (room) => {
            socket.join(room);
            console.log(`[Socket] User ${socket.id} joined room: ${room}`);
        });

        socket.on('disconnect', () => {
            console.log(`[Socket] User disconnected: ${socket.id}`);
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
