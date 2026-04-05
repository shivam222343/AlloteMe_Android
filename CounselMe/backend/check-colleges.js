const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/Shiva/OneDrive/Desktop/AlloteMe/AlloteMe/AlloteMe-Mobile/CounselMe/backend/.env' });

const checkInstitutions = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB:', mongoose.connection.name);
        
        const InstitutionSchema = new mongoose.Schema({}, { strict: false });
        const Institution = mongoose.model('institutions', InstitutionSchema);
        
        const pcmCount = await Institution.countDocuments({ $or: [{ admissionPath: 'MHTCET PCM' }, { admissionPaths: 'MHTCET PCM' }] });
        const pcbCount = await Institution.countDocuments({ $or: [{ admissionPath: 'MHTCET PCB' }, { admissionPaths: 'MHTCET PCB' }] });
        
        console.log('MHTCET PCM Count:', pcmCount);
        console.log('MHTCET PCB Count:', pcbCount);
        
        const sample = await Institution.findOne({}).select('name admissionPath admissionPaths');
        console.log('Sample Institution:', JSON.stringify(sample, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkInstitutions();
