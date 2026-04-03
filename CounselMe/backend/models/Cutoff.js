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
        // Expanded to support all platform admission paths
        enum: ['MHTCET PCM', 'MHTCET PCB', 'JEE', 'NEET', 'PHARMACY', 'BBA'],
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

// Performance indexes for AI/Predictor
cutoffSchema.index({ percentile: -1 });
cutoffSchema.index({ branch: 'text' });
cutoffSchema.index({ category: 1 });

const Cutoff = mongoose.model('Cutoff', cutoffSchema);
module.exports = Cutoff;
