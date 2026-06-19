const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
    console.warn('DNS error:', err.message);
}

const inspect = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to DB:', mongoose.connection.name);

        const db = mongoose.connection.db;
        const collection = db.collection('counselors');

        console.log('--- ALL COUNSELORS IN DB ---');
        const counselors = await collection.find({}).toArray();
        console.log(JSON.stringify(counselors, null, 2));

        console.log('--- INDEXES ---');
        const indexes = await collection.indexes();
        console.log(JSON.stringify(indexes, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

inspect();
