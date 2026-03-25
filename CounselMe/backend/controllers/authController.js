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
            bannerUrl: user.bannerUrl,
            preferences: user.preferences,
            savedColleges: (await user.populate('savedColleges', 'name location type feesPerYear rating dteCode galleryImages university')).savedColleges || [],
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
            bannerUrl: user.bannerUrl,
            preferences: user.preferences,
            savedColleges: (await user.populate('savedColleges', 'name location type feesPerYear rating dteCode galleryImages university')).savedColleges || [],
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
            bannerUrl: user.bannerUrl,
            preferences: user.preferences,
            savedColleges: (await user.populate('savedColleges', 'name location type feesPerYear rating dteCode galleryImages university')).savedColleges || [],
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
        if (req.body.displayName) user.displayName = req.body.displayName;
        if (req.body.email) user.email = req.body.email;
        if (req.body.password) {
            user.password = req.body.password;
        }

        // Update new academic & key fields
        if (req.body.examType) user.examType = req.body.examType;
        if (req.body.percentile !== undefined) user.percentile = req.body.percentile;
        if (req.body.rank !== undefined) user.rank = req.body.rank;
        if (req.body.location !== undefined) user.location = req.body.location;
        if (req.body.expectedRegion !== undefined) user.expectedRegion = req.body.expectedRegion;
        if (req.body.bannerUrl !== undefined) user.bannerUrl = req.body.bannerUrl;
        if (req.body.preferences) user.preferences = req.body.preferences;

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
            bannerUrl: updatedUser.bannerUrl,
            preferences: updatedUser.preferences,
            groqApiKey: updatedUser.groqApiKey,
            token: generateToken(updatedUser._id)
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (user && (await user.matchPassword(currentPassword))) {
        user.password = newPassword;
        await user.save();
        res.json({ success: true, message: 'Password updated' });
    } else {
        res.status(400).json({ message: 'Invalid current password' });
    }
};

const toggleSaveCollege = async (req, res) => {
    const { collegeId } = req.body;
    const user = await User.findById(req.user._id);

    if (user) {
        const isSaved = user.savedColleges.includes(collegeId);
        if (isSaved) {
            user.savedColleges = user.savedColleges.filter(id => id.toString() !== collegeId);
        } else {
            user.savedColleges.push(collegeId);
        }
        await user.save();
        res.json({ success: true, savedColleges: user.savedColleges });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

module.exports = { registerUser, loginUser, getUserProfile, updateUserProfile, changePassword, toggleSaveCollege };
