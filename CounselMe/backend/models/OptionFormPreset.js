const mongoose = require('mongoose');

const optionFormPresetSchema = new mongoose.Schema({
    percentile: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    round: {
        type: Number,
        default: 1
    },
    colleges: [{
        collegeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Institution',
            required: true
        },
        branch: String,
        round: Number,
        year: Number,
        percentile: Number,
        rank: Number,
        chanceLabel: String,
        chanceColor: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('OptionFormPreset', optionFormPresetSchema);
