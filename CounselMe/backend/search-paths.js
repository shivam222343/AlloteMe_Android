const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/Shiva/OneDrive/Desktop/AlloteMe/AlloteMe/AlloteMe-Mobile/CounselMe/backend/.env' });

const searchPaths = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Institution = mongoose.model('institutions', new mongoose.Schema({}, { strict: false }));
        const sample = await Institution.findOne({ admissionPath: { $exists: true } });
        console.log('Sample with Path:', sample ? sample.name : 'None');
        
        const allPaths = await Institution.distinct('admissionPath');
        console.log('Distinct Paths:', allPaths);
        
        const allPathsArr = await Institution.distinct('admissionPaths');
        console.log('Distinct PathsArr:', allPathsArr);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

searchPaths();
