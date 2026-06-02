const mongoose = require('mongoose');

const dailyMetricsSchema = new mongoose.Schema({
    date: {
        type: String, // format YYYY-MM-DD
        required: true,
        unique: true
    },
    requestCount: {
        type: Number,
        default: 0
    },
    totalContextTokens: {
        type: Number,
        default: 0
    },
    totalResponseTokens: {
        type: Number,
        default: 0
    },
    cacheHits: {
        type: Number,
        default: 0
    },
    cacheMisses: {
        type: Number,
        default: 0
    },
    totalMongoQueryTimeMs: {
        type: Number,
        default: 0
    },
    totalGroqLatencyMs: {
        type: Number,
        default: 0
    },
    totalEstimatedTokenSpend: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('DailyMetrics', dailyMetricsSchema);
