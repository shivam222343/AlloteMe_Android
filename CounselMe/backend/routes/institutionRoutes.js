const express = require('express');
const router = express.Router();
const {
    createInstitution,
    parseInstitutionText,
    getInstitutions,
    getInstitutionById,
    updateInstitution,
    deleteInstitution,
    deleteBranch,
    toggleFeatureInstitution,
    getFeaturedInstitutions
} = require('../controllers/institutionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(getInstitutions)
    .post(protect, authorize('admin'), createInstitution);

router.get('/featured', getFeaturedInstitutions);
router.post('/parse', protect, authorize('admin'), parseInstitutionText);

router.delete('/:id/branches/:branchName', protect, authorize('admin'), deleteBranch);

router.put('/:id/feature', protect, authorize('admin'), toggleFeatureInstitution);

router.route('/:id')
    .get(getInstitutionById)
    .put(protect, authorize('admin'), updateInstitution)
    .delete(protect, authorize('admin'), deleteInstitution);

module.exports = router;
