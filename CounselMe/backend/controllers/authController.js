const User = require('../models/User');
const Institution = require('../models/Institution');
const jwt = require('jsonwebtoken');
const generateToken = require('../utils/generateToken');
const { client: redis } = require('../config/redis');
const { triggerDailyNotifications } = require('../services/notificationService');

const getRandomAvatar = (name) => {
    const seeds = ['Felix', 'Max', 'Luna', 'Jack', 'Daisy', 'Zoe', 'Milo', 'Coco', 'Oliver', 'Toby'];
    const randomSeed = seeds[Math.floor(Math.random() * seeds.length)] + Math.floor(Math.random() * 1000);
    return {
        url: `https://api.dicebear.com/7.x/adventurer/png?seed=${randomSeed}`,
        seed: randomSeed
    };
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { displayName, email, password, role, examType, percentile, rank, location, expectedRegion } = req.body;
    let { preferences } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // Auto-assign random avatar
    const avatar = getRandomAvatar(displayName);
    if (!preferences) preferences = {};
    preferences.avatarUrl = avatar.url;
    preferences.avatarSeed = avatar.seed;
    preferences.hasConfirmedAvatar = false;

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
        // Send welcome notification (with slight delay so user joins room on frontend)
        setTimeout(() => {
            const { sendNotification } = require('../services/notificationService');
            sendNotification(
                user._id,
                `Welcome to AlloteMe, ${user.displayName}! 🎉`,
                "We're excited to have you here! Start exploring colleges and predicting your dream branches. 🚀",
                "success"
            );
        }, 2000);

        res.status(201).json({
            token: generateToken(user._id),
            _id: user._id,
            displayName: user.displayName,
            email: user.email,
            role: user.role,
            showAvatarPopup: true
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
        // If no avatar set, assign one now
        if (!user.preferences?.avatarUrl) {
            const avatar = getRandomAvatar(user.displayName);
            if (!user.preferences) user.preferences = {};
            user.preferences.avatarUrl = avatar.url;
            user.preferences.avatarSeed = avatar.seed;
            user.preferences.hasConfirmedAvatar = false;
            await user.save();
        }

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
            savedPredictions: (await user.populate('savedPredictions.collegeId', 'name location dteCode')).savedPredictions || [],
            subscription: user.subscription,
            token: generateToken(user._id),
            groqApiKey: user.groqApiKey,
            showAvatarPopup: !user.preferences?.hasConfirmedAvatar
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const updateAvatarPreference = async (req, res) => {
    try {
        const { action, customUrl } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.preferences) user.preferences = {};

        if (action === 'confirm') {
            user.preferences.hasConfirmedAvatar = true;
        } else if (action === 'shuffle') {
            const avatar = getRandomAvatar(user.displayName);
            user.preferences.avatarUrl = avatar.url;
            user.preferences.avatarSeed = avatar.seed;
            user.preferences.hasConfirmedAvatar = false;
        } else if (action === 'set' && customUrl) {
            user.preferences.avatarUrl = customUrl;
            user.preferences.hasConfirmedAvatar = true;
        }

        await user.save();
        await redis.del(`user_profile_${req.user._id}`);

        res.json({ success: true, preferences: user.preferences });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const cacheKey = `user_profile_${req.user._id}`;
        const cachedData = await redis.get(cacheKey);

        if (cachedData) {
            console.log(`[Redis] Hit: ${cacheKey}`);
            return res.json(JSON.parse(cachedData));
        }

        const user = await User.findById(req.user._id);

        if (user) {
            // Trigger Daily Notifications check (Max 2, 6h cooldown, only when online)
            if (user.role === 'student' && !cachedData) {
                triggerDailyNotifications(user).catch(e => console.error(e));
            }

            const profileData = {
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
                savedPredictions: (await user.populate('savedPredictions.collegeId', 'name location dteCode')).savedPredictions || [],
                subscription: user.subscription,
                groqApiKey: user.groqApiKey,
                isVerified: user.isVerified,
                phoneNumber: user.phoneNumber
            };

            await redis.set(cacheKey, JSON.stringify(profileData), { EX: 3600 }); // Cache for 1 hour
            res.json(profileData);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
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

        // Handle multiple scores
        if (req.body.scores) {
            if (!user.scores) user.scores = new Map();
            Object.keys(req.body.scores).forEach(key => {
                const scoreData = req.body.scores[key];
                // Handle deletion if scoreData is null
                if (scoreData === null) {
                    user.scores.delete(key);
                } else {
                    user.scores.set(key, scoreData);

                    // Synchronize primary fields if updating the currently selected examType
                    if (key === (req.body.examType || user.examType)) {
                        if (scoreData.percentile !== undefined) user.percentile = scoreData.percentile;
                        if (scoreData.rank !== undefined) user.rank = scoreData.rank;
                    }
                }
            });
        }

        // Update new academic & key fields
        if (req.body.examType) {
            user.examType = req.body.examType;
            // Sync primary fields from scores map if they exist for this new type
            if (user.scores && user.scores.has(user.examType)) {
                const s = user.scores.get(user.examType);
                user.percentile = s.percentile;
                user.rank = s.rank;
            }
        }
        if (req.body.percentile !== undefined) user.percentile = req.body.percentile;
        if (req.body.rank !== undefined) user.rank = req.body.rank;
        if (req.body.location !== undefined) user.location = req.body.location;
        if (req.body.expectedRegion !== undefined) user.expectedRegion = req.body.expectedRegion;
        if (req.body.bannerUrl !== undefined) user.bannerUrl = req.body.bannerUrl;
        if (req.body.preferences) user.preferences = req.body.preferences;
        if (req.body.savedPredictions) user.savedPredictions = req.body.savedPredictions;
        if (req.body.subscription) user.subscription = req.body.subscription;

        // Handle Groq API Key (can be null if removed)
        if (req.body.groqApiKey !== undefined) {
            user.groqApiKey = req.body.groqApiKey;
        }

        if (req.body.phoneNumber !== undefined) {
            user.phoneNumber = req.body.phoneNumber;
        }

        const updatedUser = await user.save();

        // Invalidate cache
        await redis.del(`user_profile_${req.user._id}`);

        // Return populated user including saved entities
        const finalUser = await User.findById(updatedUser._id)
            .populate('savedColleges', 'name location type feesPerYear rating dteCode galleryImages university')
            .populate('savedPredictions.collegeId', 'name location dteCode');

        res.json({
            _id: finalUser._id,
            displayName: finalUser.displayName,
            email: finalUser.email,
            role: finalUser.role,
            examType: finalUser.examType,
            scores: finalUser.scores,
            percentile: finalUser.percentile,
            rank: finalUser.rank,
            location: finalUser.location,
            expectedRegion: finalUser.expectedRegion,
            bannerUrl: finalUser.bannerUrl,
            preferences: finalUser.preferences,
            savedColleges: finalUser.savedColleges,
            savedPredictions: finalUser.savedPredictions,
            subscription: finalUser.subscription,
            groqApiKey: finalUser.groqApiKey,
            isVerified: finalUser.isVerified,
            phoneNumber: finalUser.phoneNumber,
            token: generateToken(finalUser._id)
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
        if (!user.savedColleges) user.savedColleges = [];

        const isSaved = user.savedColleges.some(id => id.toString() === collegeId);
        if (isSaved) {
            user.savedColleges = user.savedColleges.filter(id => id.toString() !== collegeId);
        } else {
            user.savedColleges.push(collegeId);
        }
        await user.save();

        // Invalidate cache
        await redis.del(`user_profile_${req.user._id}`);

        // Return populated saved colleges to sync frontend state
        const updatedUser = await User.findById(req.user._id).populate('savedColleges', 'name location type feesPerYear rating dteCode galleryImages university');
        
        // Push update via Socket for real-time smoothness
        if (req.io) {
            req.io.to(req.user._id.toString()).emit('user:updated', updatedUser);
        }

        res.json({ success: true, savedColleges: updatedUser.savedColleges });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

const toggleSavePrediction = async (req, res) => {
    const { prediction } = req.body; // { collegeId, branch, year, round, percentile, category, seatType, chanceLabel, chanceColor }
    const user = await User.findById(req.user._id);

    if (user) {
        if (!user.savedPredictions) user.savedPredictions = [];

        // Check if already saved (match by collegeId, branch, year, round)
        const existingIndex = user.savedPredictions.findIndex(p =>
            p.collegeId && prediction.collegeId &&
            p.collegeId.toString() === prediction.collegeId &&
            p.branch === prediction.branch &&
            p.year === prediction.year &&
            p.round === prediction.round &&
            (p.category || '') === (prediction.category || '') &&
            (p.seatType || '') === (prediction.seatType || '')
        );

        if (existingIndex > -1) {
            user.savedPredictions.splice(existingIndex, 1);
        } else {
            user.savedPredictions.push(prediction);
        }
        await user.save();

        // Invalidate cache
        await redis.del(`user_profile_${req.user._id}`);

        // Return populated saved predictions to sync frontend state
        const updatedUser = await User.findById(req.user._id).populate('savedPredictions.collegeId', 'name location dteCode');
        
        // Push update via Socket for real-time smoothness
        if (req.io) {
            req.io.to(req.user._id.toString()).emit('user:updated', updatedUser);
        }

        res.json({ success: true, savedPredictions: updatedUser.savedPredictions });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    const users = await User.find({}).select('-password').sort({ isOnline: -1, lastActive: -1 });
    res.json(users);
};

// @desc    Get user by ID (Admin only)
// @route   GET /api/auth/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user role (Admin only)
// @route   PUT /api/auth/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot change your own role' });
        }
        user.role = req.body.role || user.role;
        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            displayName: updatedUser.displayName,
            role: updatedUser.role
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Send OTP via WhatsApp (Placeholder)
// @route   POST /api/auth/send-otp
// @access  Private
const sendOTP = async (req, res) => {
    const { phoneNumber } = req.body;
    const user = await User.findById(req.user._id);

    if (user) {
        const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digit OTP
        user.phoneNumber = phoneNumber;
        user.otp = otp;
        await user.save();

        // In a real app, send WhatsApp message here
        console.log(`[WhatsApp] Sending code ${otp} to ${phoneNumber} from AlloteMe (+91 8010961216)`);

        res.json({ success: true, message: 'OTP sent successfully', otp }); // Returning OTP for testing convenience
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Private
const verifyOTP = async (req, res) => {
    const { otp } = req.body;
    const user = await User.findById(req.user._id);

    if (user) {
        if (user.otp === otp) {
            user.isVerified = true;
            user.otp = null;
            await user.save();
            res.json({ success: true, message: 'User verified' });
        } else {
            res.status(400).json({ message: 'Invalid OTP' });
        }
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Get dashboard stats (Admin only)
// @route   GET /api/auth/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
    try {
        const { category } = req.query;
        let instFilter = {};

        if (category) {
            const upperCat = category.toUpperCase();
            if (upperCat === 'ENGINEERING' || upperCat === 'MHTCET' || upperCat === 'MHTCET PCM') {
                instFilter = {
                    $or: [
                        { category: /^Engineering$/i },
                        { category: /^MHTCET$/i },
                        { category: /^MHTCET PCM$/i },
                        {
                            $and: [
                                { $or: [{ category: { $exists: false } }, { category: null }, { category: '' }] },
                                { name: { $not: /Pharmacy|Pharma|Medical|Ayurvedic|B\.Pharm/i } }
                            ]
                        }
                    ]
                };
            } else if (upperCat === 'PHARMACY' || upperCat === 'MHTCET PCB') {
                instFilter = {
                    $or: [
                        { category: /Pharmacy/i },
                        { category: /MHTCET PCB/i }
                    ]
                };
            } else {
                instFilter = { category: new RegExp(`^${category}$`, 'i') };
            }
        }

        const userCount = await User.countDocuments();
        const institutionCount = await Institution.countDocuments(instFilter);

        // Detailed Analytics for Graphs (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const registrationsArr = await User.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const analytics = {
            registrations: registrationsArr,
            activeSessions: Math.floor(userCount * 0.45), // Simulated based on user base
            predictionHits: [
                { day: 'Mon', count: 12 + Math.floor(Math.random() * 5) },
                { day: 'Tue', count: 19 + Math.floor(Math.random() * 5) },
                { day: 'Wed', count: 15 + Math.floor(Math.random() * 5) },
                { day: 'Thu', count: 22 + Math.floor(Math.random() * 5) },
                { day: 'Fri', count: 30 + Math.floor(Math.random() * 5) },
                { day: 'Sat', count: 25 + Math.floor(Math.random() * 5) },
                { day: 'Sun', count: 35 + Math.floor(Math.random() * 5) }
            ]
        };

        res.json({
            users: userCount,
            institutions: institutionCount,
            analytics
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch stats' });
    }
};

// @desc    Delete user account
// @route   DELETE /api/auth/profile
// @access  Private
const deleteAccount = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await User.findByIdAndDelete(req.user._id);
        res.json({ success: true, message: 'Account deleted permanently' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete account' });
    }
};

// @desc    Delete any user account (Admin only)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'User permanent removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete user' });
    }
};

const setVerifiedPhone = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || phone.length < 10) return res.status(400).json({ message: 'Invalid phone number' });
        const user = await User.findById(req.user._id);
        user.phoneNumber = phone;
        user.isVerified = true;
        await user.save();
        res.json({ success: true, user: { isVerified: true, phoneNumber: phone } });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update phone' });
    }
};

const getAdmins = async (req, res) => {
    try {
        const admins = await User.find({ role: { $in: ['admin', 'staff'] } })
            .select('displayName email profilePicture _id role')
            .sort('displayName');
        res.json({ success: true, data: admins });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch admins' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    changePassword,
    toggleSaveCollege,
    getAllUsers,
    getUserById,
    updateUserRole,
    sendOTP,
    verifyOTP,
    setVerifiedPhone,
    getDashboardStats,
    getAdmins,
    deleteAccount,
    deleteUser,
    updateAvatarPreference,
    toggleSavePrediction
};
