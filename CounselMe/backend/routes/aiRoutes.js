const express = require('express');
const router = express.Router();
const {
    getAICounsel,
    saveChat,
    getMyChats,
    trainAI,
    getFrequentQuestions,
    setFrequentQuestion,
    generateReview,
    getDailyMetrics,
    deleteFrequentQuestion
} = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// User routes
router.post('/counsel', protect, getAICounsel);
router.get('/chats', protect, getMyChats);
router.post('/chats', protect, saveChat);
router.get('/frequent-questions', getFrequentQuestions);
router.post('/generate-review', protect, generateReview);

// Admin routes
router.post('/train', protect, trainAI);
router.post('/frequent-questions', protect, setFrequentQuestion);
router.delete('/frequent-questions/:id', protect, deleteFrequentQuestion);
router.get('/metrics', protect, getDailyMetrics);

module.exports = router;
