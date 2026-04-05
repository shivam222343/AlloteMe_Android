const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/Shiva/OneDrive/Desktop/AlloteMe/AlloteMe/AlloteMe-Mobile/CounselMe/backend/.env' });

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
