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
    },
    // Legacy field — unique index exists in MongoDB from a previous schema version.
    // sparse: true allows multiple documents to have accessKey: null/undefined
    // without triggering a duplicate key error.
    accessKey: {
        type: String,
        unique: true,
        sparse: true,
        default: undefined
    }
}, {
    timestamps: true
});

const Counselor = mongoose.model('Counselor', counselorSchema);
module.exports = Counselor;
