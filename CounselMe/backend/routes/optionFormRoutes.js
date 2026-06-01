const express = require('express');
const router = express.Router();
const { addPreset, getPresets, deletePreset } = require('../controllers/optionFormController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', getPresets);
router.post('/', protect, authorize('admin'), addPreset);
router.delete('/:id', protect, authorize('admin'), deletePreset);

module.exports = router;
