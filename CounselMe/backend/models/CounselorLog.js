const mongoose = require('mongoose');

const counselorLogSchema = new mongoose.Schema({
    counselorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Counselor',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        enum: ['chat', 'call'],
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('CounselorLog', counselorLogSchema);
