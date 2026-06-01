const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadImage, viewPdf } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post('/image', protect, upload.single('image'), uploadImage);
router.get('/view-pdf', viewPdf);

module.exports = router;
