const mongoose = require('mongoose');
const Review = require('../models/Review');
const User = require('../models/User');

// @desc Submit a review
// @route POST /api/reviews
exports.submitReview = async (req, res) => {
    try {
        const { rating, comment, institutionId } = req.body;
        const userId = req.user.id;

        const review = await Review.create({
            user: userId,
            userName: req.user.displayName || req.user.email?.split('@')[0] || 'User',
            userAvatar: req.user.preferences?.avatarUrl,
            rating: Number(rating),
            comment,
            institutionId,
            isPublished: !!institutionId // Auto-publish institution reviews for now
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

// @desc Get reviews for specific institution
// @route GET /api/reviews/institution/:id
exports.getInstitutionReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ institutionId: req.params.id }).sort('-createdAt');
        const stats = await Review.aggregate([
            { $match: { institutionId: new mongoose.Types.ObjectId(req.params.id) } },
            { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            data: reviews,
            stats: stats[0] || { avgRating: 0, count: 0 }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc Get published reviews (Public - global app reviews)
// @route GET /api/reviews
exports.getPublishedReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ isPublished: true, institutionId: null }).sort('-createdAt');
        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
