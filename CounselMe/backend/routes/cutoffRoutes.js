const express = require('express');
const router = express.Router();
const {
    addCutoffData,
    bulkAddCutoffData,
    parseCutoffData,
    parseBulkCutoffData,
    getCutoffsByInstitution,
    predictColleges,
    deleteCutoffs,
    estimateRank
} = require('../controllers/cutoffController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/estimate-rank', estimateRank);
router.route('/')
    .post(protect, authorize('admin'), addCutoffData);

router.post('/bulk', protect, authorize('admin'), bulkAddCutoffData);
router.post('/parse', protect, authorize('admin'), parseCutoffData);
router.post('/parse-bulk', protect, authorize('admin'), parseBulkCutoffData);

router.delete('/:institutionId/branch/:branchName', protect, authorize('admin'), deleteCutoffs);

router.get('/predict', predictColleges);
router.get('/:institutionId', getCutoffsByInstitution);

module.exports = router;
