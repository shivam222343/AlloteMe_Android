const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/Shiva/OneDrive/Desktop/AlloteMe/AlloteMe/AlloteMe-Mobile/CounselMe/backend/.env' });

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to DB:', mongoose.connection.name);
        
        const FormSchema = new mongoose.Schema({}, { strict: false });
        const Form = mongoose.models.Form || mongoose.model('Form', FormSchema, 'forms'); // collection 'forms'
        
        const forms = await Form.find({}).limit(10);
        console.log('Forms count:', forms.length);
        console.log('Sample IDs:', forms.map(f => f._id.toString()));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

connectDB();
