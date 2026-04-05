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

// Pre-startup initialization (Sockets, etc.)

// Initialize Socket.io
const io = initSocket(server);

// Attach io to global req for use in controllers if target logic requires it
// (though I also have a separate util for direct emitUpdate calls)
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Middleware
app.use(cors({
    origin: [
        'https://alloteme.netlify.app',
        'https://alloteme.com',
        'https://alloteme.in',
        'https://alloteme.online',
        'https://forms.alloteme.online',
        'https://web.alloteme.online',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'http://localhost:5100',
        'http://localhost:8081',
        'http://localhost:8080',
        'http://10.0.2.2:5100', // Android Emulator
        'http://10.0.2.2:8081',
        'http://localhost:19006', // Expo web
        'http://localhost:8082',
        'http://127.0.0.1:5100',
        'http://127.0.0.1:8081',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:19006'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
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
app.use('/api/counselors', require('./routes/counselorRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/forms', require('./routes/formRoutes'));
// Public HTML form viewer (shorthand /forms/view/:id)
app.use('/forms', require('./routes/formRoutes'));
app.get('/', (req, res) => {
    res.send('CounselMe API is running...');
});

const PORT = process.env.PORT || 5100;

// Initialize Connections & Start Server
const startServer = async () => {
    try {
        await connectDB();
        await connectRedis();

        server.listen(PORT, () => {
            console.log(`Server (with Sockets) running on port ${PORT}`);

            // Periodic Greetings logic: Check every 12 hours
            setInterval(() => {
                const { sendRandomGreeting } = require('./services/notificationService');
                sendRandomGreeting();
            }, 12 * 60 * 60 * 1000);
        });
    } catch (error) {
        console.error('Fatal: Server failed to start:', error.message);
        process.exit(1);
    }
};

startServer();
