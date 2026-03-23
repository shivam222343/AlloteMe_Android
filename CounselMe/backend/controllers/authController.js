const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { displayName, email, password, role, examType, percentile, rank, location, expectedRegion, preferences } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
        displayName,
        email,
        password,
        role: role || 'student',
        examType,
        percentile,
        rank,
        location,
        expectedRegion,
        preferences
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            displayName: user.displayName,
            email: user.email,
            role: user.role,
            examType: user.examType,
            percentile: user.percentile,
            rank: user.rank,
            location: user.location,
            expectedRegion: user.expectedRegion,
            preferences: user.preferences,
            savedColleges: user.savedColleges || [],
            token: generateToken(user._id),
            groqApiKey: user.groqApiKey
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            displayName: user.displayName,
            email: user.email,
            role: user.role,
            examType: user.examType,
            percentile: user.percentile,
            rank: user.rank,
            location: user.location,
            expectedRegion: user.expectedRegion,
            preferences: user.preferences,
            savedColleges: user.savedColleges || [],
            token: generateToken(user._id),
            groqApiKey: user.groqApiKey
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        res.json({
            _id: user._id,
            displayName: user.displayName,
            email: user.email,
            role: user.role,
            examType: user.examType,
            percentile: user.percentile,
            rank: user.rank,
            location: user.location,
            expectedRegion: user.expectedRegion,
            preferences: user.preferences,
            savedColleges: user.savedColleges || [],
            groqApiKey: user.groqApiKey
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.displayName = req.body.displayName || user.displayName;
        user.email = req.body.email || user.email;
        if (req.body.password) {
            user.password = req.body.password;
        }

        // Update new academic & key fields
        user.examType = req.body.examType || user.examType;
        user.percentile = req.body.percentile || user.percentile;
        user.rank = req.body.rank || user.rank;
        user.location = req.body.location || user.location;
        user.expectedRegion = req.body.expectedRegion || user.expectedRegion;
        user.preferences = req.body.preferences || user.preferences;
        
        // Handle Groq API Key (can be null if removed)
        if (req.body.groqApiKey !== undefined) {
            user.groqApiKey = req.body.groqApiKey;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            displayName: updatedUser.displayName,
            email: updatedUser.email,
            role: updatedUser.role,
            examType: updatedUser.examType,
            percentile: updatedUser.percentile,
            rank: updatedUser.rank,
            location: updatedUser.location,
            expectedRegion: updatedUser.expectedRegion,
            preferences: updatedUser.preferences,
            groqApiKey: updatedUser.groqApiKey,
            token: generateToken(updatedUser._id)
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

module.exports = { registerUser, loginUser, getUserProfile, updateUserProfile };
