const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    displayName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phoneNumber: {
        type: String,
        unique: true,
        sparse: true // Allows null/empty for users who haven't entered it yet
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String,
        default: null
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['student', 'admin', 'counselor'],
        default: 'student'
    },
    // Student specific info
    examType: {
        type: String,
        enum: ['MHTCET PCM', 'MHTCET PCB', 'BBA', 'NEET', 'JEE', 'MHTCET', 'Engineering', 'Pharmacy']
    },
    // Multi-exam score tracking
    scores: {
        type: Map,
        of: {
            percentile: Number,
            rank: Number
        },
        default: {}
    },
    percentile: Number, // Primary/default score (legacy support)
    rank: Number,       // Primary/default rank (legacy support)
    location: String,
    expectedRegion: String,
    bannerUrl: String,
    savedColleges: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution'
    }],
    preferences: {
        preferredBranches: [String],
        preferredRegions: [String],
        collegeStatusPreference: [String],
        isProfileComplete: {
            type: Boolean,
            default: false
        },
        avatarUrl: String,
        avatarSeed: String,
        hasConfirmedAvatar: {
            type: Boolean,
            default: false
        }
    },
    groqApiKey: {
        type: String,
        default: null
    },
    lastPredictorPreferences: {
        type: Object,
        default: {}
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    notificationStats: {
        lastNotificationAt: { type: Date, default: null },
        notificationsToday: { type: Number, default: 0 },
        lastStatusUpdate: { type: String, default: "" } // YYYY-MM-DD
    },
    savedPredictions: [{
        collegeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Institution'
        },
        branch: String,
        year: Number,
        round: Number,
        percentile: Number, // Cutoff percentile
        rank: Number,       // Cutoff rank
        category: String,
        seatType: String,
        chanceLabel: String,
        chanceColor: String,
        savedAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
