const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    university: String,
    type: {
        type: String,
        enum: ['Government', 'Government Autonomous', 'Autonomous', 'Private-Autonomous', 'Private', 'Deemed'],
        required: true
    },
    location: {
        region: String,
        address: String,
        city: String,
        coordinates: { lat: Number, lng: Number }
    },
    feesPerYear: Number,
    rating: { value: Number, platform: String },
    website: String,
    mapUrl: String,
    description: String,
    galleryImages: [String],
    branches: [{ name: String, code: String }],
    // Hostel info
    hostel: {
        available: Boolean,
        boys: { available: Boolean, fees: Number, capacity: Number },
        girls: { available: Boolean, fees: Number, capacity: Number },
        notes: String
    },
    // Facilities list
    facilities: [String],
    // Established year
    established: Number,
    // Approvals / Accreditation
    accreditation: String,
    // Total students enrolled
    totalStudents: Number,
    // Campus area in acres
    campusArea: String,
}, { timestamps: true });

const Institution = mongoose.model('Institution', institutionSchema);
module.exports = Institution;
