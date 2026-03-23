const mongoose = require('mongoose');

const knowledgeSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['qa', 'info', 'frequent_question'], // Frequent questions are also stored here
        required: true
    },
    question: {
        type: String,
        required: function() { return this.type === 'qa' || this.type === 'frequent_question'; }
    },
    answer: String,
    content: String, // Full text for 'info'
    category: {
        type: String,
        default: 'General'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Knowledge', knowledgeSchema);
