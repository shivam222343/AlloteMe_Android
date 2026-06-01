const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/Shiva/OneDrive/Desktop/AlloteMe/AlloteMe/AlloteMe-Mobile/CounselMe/backend/.env' });

const inspect = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Preset = mongoose.model('OptionFormPreset', new mongoose.Schema({}, { strict: false }));
        const list = await Preset.find({}, 'percentile category');
        console.log('Presets in DB categories:', list);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

inspect();
