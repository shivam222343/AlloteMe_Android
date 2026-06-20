const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config({ path: 'c:/Users/Shiva/OneDrive/Desktop/AlloteMe/AlloteMe/AlloteMe-Mobile/CounselMe/backend/.env' });

try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {}

const inspect = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Institution = mongoose.model('institutions', new mongoose.Schema({}, { strict: false }));
        const sample = await Institution.findOne({ name: /COEP/ });
        console.log('COEP Details:', JSON.stringify(sample, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

inspect();
