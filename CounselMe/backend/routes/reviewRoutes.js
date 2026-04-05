const express = require('express');
const router = express.Router();
const {
    submitReview,
    getAllReviews,
    getPublishedReviews,
    getInstitutionReviews,
    togglePublish,
    deleteReview
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

// Public route to get reviews for an institution
router.get('/institution/:id', getInstitutionReviews);

// Public route to get verified global reviews
router.get('/', getPublishedReviews);

// Protected routes (submission)
router.post('/', protect, submitReview);

// Admin-only management routes
router.get('/admin', protect, getAllReviews);
router.patch('/publish/:id', protect, togglePublish);
router.delete('/:id', protect, deleteReview);

module.exports = router;
