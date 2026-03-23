const mongoose = require('mongoose');

const cutoffSchema = new mongoose.Schema({
    collegeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: true
    },
    branch: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    seatType: {
        type: String,
        default: null
    },
    examType: {
        type: String,
        enum: ['MHTCET', 'JEE', 'NEET'],
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    round: {
        type: Number, // 1, 2, 3
        required: true
    },
    percentile: {
        type: Number,
        required: true
    },
    rank: {
        type: Number,
        default: null
    }
}, {
    timestamps: true
});

// Compound unique index as specified by DB
cutoffSchema.index({ 
    collegeId: 1, 
    examType: 1, 
    year: 1, 
    round: 1, 
    branch: 1, 
    category: 1, 
    seatType: 1 
}, { unique: true });

const Cutoff = mongoose.model('Cutoff', cutoffSchema);
module.exports = Cutoff;
