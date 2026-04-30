const express = require('express');
const router = express.Router();
const { addVideo, getVideos, deleteVideo } = require('../controllers/videoController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', getVideos);
router.post('/', protect, authorize('admin'), addVideo);
router.delete('/:id', protect, authorize('admin'), deleteVideo);

module.exports = router;
