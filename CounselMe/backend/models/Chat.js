const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        default: 'New Chat'
    },
    messages: [
        {
            role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
            content: { type: String, required: true },
            timestamp: { type: Date, default: Date.now }
        }
    ],
    isSaved: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
