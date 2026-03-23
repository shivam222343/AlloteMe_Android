require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const morgan = require('morgan');

const http = require('http');
const { initSocket } = require('./utils/socket');

const app = express();
const server = http.createServer(app);

// Connect to Databases
connectDB();
connectRedis();

// Initialize Socket.io
const io = initSocket(server);

// Attach io to global req for use in controllers if target logic requires it
// (though I also have a separate util for direct emitUpdate calls)
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Custom logging middleware to ensure we see every hit
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/institutions', require('./routes/institutionRoutes'));
app.use('/api/cutoffs', require('./routes/cutoffRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.get('/', (req, res) => {
    res.send('CounselMe API is running...');
});

const PORT = process.env.PORT || 5100;

server.listen(PORT, () => {
    console.log(`Server (with Sockets) running on port ${PORT}`);
});
