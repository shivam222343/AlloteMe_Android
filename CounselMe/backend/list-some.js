const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/Shiva/OneDrive/Desktop/AlloteMe/AlloteMe/AlloteMe-Mobile/CounselMe/backend/.env' });

const listSome = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Institution = mongoose.model('institutions', new mongoose.Schema({}, { strict: false }));
        const list = await Institution.find({}).limit(5).select('name type');
        console.log('Institutions:', JSON.stringify(list, null, 2));
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
};

listSome();
