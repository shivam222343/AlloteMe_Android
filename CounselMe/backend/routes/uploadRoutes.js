const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadImage } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post('/image', protect, upload.single('image'), uploadImage);

module.exports = router;
