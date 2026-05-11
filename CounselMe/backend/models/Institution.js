const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    university: String,
    dteCode: String,
    type: {
        type: String,
        enum: ['Government', 'Government Autonomous', 'Autonomous', 'Private-Autonomous', 'Private', 'Deemed'],
        required: true
    },
    category: {
        type: String,
        enum: ['Engineering', 'Pharmacy', 'BBA', 'NEET', 'JEE', 'MHTCET', 'MHTCET PCM', 'MHTCET PCB'],
        default: 'Engineering'
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
        available: { type: Boolean, default: false },
        boys: {
            available: { type: Boolean, default: false },
            fees: String,
            capacity: String,
            messFees: String,
            securityDeposit: String
        },
        girls: {
            available: { type: Boolean, default: false },
            fees: String,
            capacity: String,
            messFees: String,
            securityDeposit: String
        },
        contactNumber: String,
        rooms: String,
        facilities: {
            wifi: { type: Boolean, default: false },
            laundry: { type: Boolean, default: false },
            cctv: { type: Boolean, default: false },
            gym: { type: Boolean, default: false },
            mess: { type: Boolean, default: true }
        },
        description: String,
        images: [String]
    },
    // Placement Statistics
    placements: [{
        year: Number,
        highestPackage: String,
        averagePackage: String,
        placementPercentage: Number,
        records: [{
            studentName: String,
            companyName: String,
            package: Number, // in lakhs
            batch: String
        }],
        images: [String]
    }],
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
    isFeatured: { type: Boolean, default: false },
    bannerUrl: String,
}, { timestamps: true });

const Institution = mongoose.model('Institution', institutionSchema);
module.exports = Institution;
