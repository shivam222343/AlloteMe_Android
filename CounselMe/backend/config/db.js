const mongoose = require('mongoose');
const dns = require('dns');

// Set DNS servers to Google and Cloudflare DNS to avoid querySrv ECONNREFUSED issues with local DNS
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
    console.warn('Failed to set DNS servers, using default resolver:', err.message);
}

const connectDB = async () => {
    try {
        const options = {
            serverSelectionTimeoutMS: 20000,
            socketTimeoutMS: 45000,
        };
        const conn = await mongoose.connect(process.env.MONGODB_URI, options);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        // Don't exit immediately, let the app retry or handle it
    }
};

module.exports = connectDB;
