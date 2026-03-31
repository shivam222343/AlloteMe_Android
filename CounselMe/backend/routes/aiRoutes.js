const express = require('express');
const router = express.Router();
const {
    getAICounsel,
    saveChat,
    getMyChats,
    trainAI,
    getFrequentQuestions,
    setFrequentQuestion,
    generateReview
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

module.exports = router;
