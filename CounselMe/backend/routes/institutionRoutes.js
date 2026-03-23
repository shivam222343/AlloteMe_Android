const express = require('express');
const router = express.Router();
const { createInstitution, parseInstitutionText, getInstitutions, getInstitutionById, updateInstitution, deleteInstitution } = require('../controllers/institutionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(getInstitutions)
    .post(protect, authorize('admin'), createInstitution);

router.post('/parse', protect, authorize('admin'), parseInstitutionText);

router.route('/:id')
    .get(getInstitutionById)
    .put(protect, authorize('admin'), updateInstitution)
    .delete(protect, authorize('admin'), deleteInstitution);

module.exports = router;
