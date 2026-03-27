const mongoose = require('mongoose');

const counselorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    profileImage: {
        type: String,
        default: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=200'
    },
    experience: {
        type: String, // e.g. "5+ Years"
        required: true
    },
    field: {
        type: String, // e.g. "Engineering", "Medical", "Career"
        required: true
    },
    cityName: {
        type: String,
        required: true
    },
    contactNumber: {
        type: String,
        required: true
    },
    email: {
        type: String
    },
    description: {
        type: String,
        default: "Expert educational counselor dedicated to helping students find their best path."
    },
    rating: {
        type: Number,
        default: 4.8
    },
    reviewsCount: {
        type: Number,
        default: 120
    }
}, {
    timestamps: true
});

const Counselor = mongoose.model('Counselor', counselorSchema);
module.exports = Counselor;
