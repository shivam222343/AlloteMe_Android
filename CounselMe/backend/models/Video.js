const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    youtubeUrl: {
        type: String,
        required: true,
        trim: true
    },
    thumbnail: {
        type: String,
        required: true
    },
    videoId: {
        type: String,
        required: true
    },
    views: {
        type: String,
        default: '0'
    },
    uploadDate: {
        type: String,
        default: ''
    },
    tags: {
        type: [String],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Video', videoSchema);
