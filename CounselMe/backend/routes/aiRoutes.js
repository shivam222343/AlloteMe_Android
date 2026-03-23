const express = require('express');
const router = express.Router();
const { getAICounsel } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.post('/counsel', protect, getAICounsel);

module.exports = router;
