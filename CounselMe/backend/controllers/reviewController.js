const Review = require('../models/Review');
const User = require('../models/User');

// @desc Submit a review
// @route POST /api/reviews
exports.submitReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const userId = req.user.id;

        const review = await Review.create({
            user: userId,
            userName: req.user.displayName,
            userAvatar: req.user.preferences?.avatarUrl,
            rating,
            comment,
            isPublished: false // By default, not published
        });

        res.status(201).json({ success: true, data: review });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc Get all reviews (Admin only)
// @route GET /api/reviews/admin
exports.getAllReviews = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        const reviews = await Review.find().sort('-createdAt');
        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc Toggle publish status (Admin only)
// @route PATCH /api/reviews/publish/:id
exports.togglePublish = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        review.isPublished = !review.isPublished;
        await review.save();

        res.json({ success: true, data: review });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc Delete review (Admin only)
// @route DELETE /api/reviews/:id
exports.deleteReview = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        await Review.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Review removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc Get published reviews (Public)
// @route GET /api/reviews
exports.getPublishedReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ isPublished: true }).sort('-createdAt');
        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
