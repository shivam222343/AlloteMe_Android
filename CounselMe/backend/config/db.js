const mongoose = require('mongoose');
const dns = require('dns');

// Set DNS servers for SRV record resolution
dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
    try {
        const options = {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
            family: 4 // Use IPv4
        };
        const conn = await mongoose.connect(process.env.MONGODB_URI, options);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        // Don't exit immediately, let the app retry or handle it
    }
};

module.exports = connectDB;
