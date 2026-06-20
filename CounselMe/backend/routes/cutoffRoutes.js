const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    addCutoffData,
    bulkAddCutoffData,
    parseCutoffData,
    parseBulkCutoffData,
    getCutoffsByInstitution,
    predictColleges,
    deleteCutoffs,
    estimateRank,
    getCutoffSummary,
    parsePdfCutoffs,
    importParsedCollege,
    clearAllCutoffsAndBranches
} = require('../controllers/cutoffController');
const { protect, authorize } = require('../middleware/authMiddleware');

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit for PDFs
});

router.get('/summary/all', protect, authorize('admin'), getCutoffSummary);

router.get('/estimate-rank', estimateRank);
router.route('/')
    .post(protect, authorize('admin'), addCutoffData);

router.post('/bulk', protect, authorize('admin'), bulkAddCutoffData);
router.post('/parse', protect, authorize('admin'), parseCutoffData);
router.post('/parse-bulk', protect, authorize('admin'), parseBulkCutoffData);

// New PDF parsing and import routes
router.post('/parse-pdf', protect, authorize('admin'), upload.single('file'), parsePdfCutoffs);
router.post('/import-college', protect, authorize('admin'), importParsedCollege);

// Clear dataset route
router.delete('/clear-all-data', protect, authorize('admin'), clearAllCutoffsAndBranches);

router.delete('/:institutionId/branch', protect, authorize('admin'), deleteCutoffs);

router.post('/predict', protect, predictColleges);
router.get('/:institutionId', getCutoffsByInstitution);

module.exports = router;
