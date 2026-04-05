const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: {
        type: String,
        enum: ['short_text', 'long_text', 'number', 'email', 'phone', 'dropdown', 'radio', 'checkbox', 'image', 'file', 'info_media', 'college_list', 'college_review'],
        required: true
    },
    label: { type: String, required: true },
    placeholder: String,
    required: { type: Boolean, default: false },
    options: [{
        id: String,
        label: String,
        isCorrect: { type: Boolean, default: false }
    }],
    validation: {
        minLength: Number,
        maxLength: Number
    },
    admissionPath: String,             // for college_list type
    colleges: [{                       // populated when college_list is baked
        _id: mongoose.Schema.Types.ObjectId,
        name: String,
        dteCode: String
    }],
    mediaUrl: String,                  // for info_media
    mediaType: { type: String, enum: ['image', 'file'] },
    multiple: { type: Boolean, default: false } // for multi-upload
}, { _id: false });

const sectionSchema = new mongoose.Schema({
    id: { type: String, required: true },
    title: { type: String, default: 'Untitled Section' },
    questions: [questionSchema]
}, { _id: false });

const formSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    bannerImage: String,
    status: {
        type: String,
        enum: ['draft', 'published', 'closed'],
        default: 'draft'
    },
    sections: [sectionSchema],
    settings: {
        isQuiz: { type: Boolean, default: false },
        showMarks: { type: Boolean, default: false }
    },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true }, // Legacy field, keeping for compat if needed
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    responseCount: { type: Number, default: 0 }
}, { timestamps: true });

const responseSchema = new mongoose.Schema({
    formId: { type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: true },
    answers: mongoose.Schema.Types.Mixed,
    score: { type: Number, default: 0 },
    totalPossibleScore: { type: Number, default: 0 },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // If logged in
    email: String,
    name: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = {
    Form: mongoose.model('Form', formSchema),
    FormResponse: mongoose.model('FormResponse', responseSchema)
};
