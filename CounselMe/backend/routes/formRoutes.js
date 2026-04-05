const express = require('express');
const router = express.Router();
const {
    createForm,
    getForms,
    getFormById,
    updateForm,
    deleteForm,
    submitForm,
    getResponses,
    deleteResponse,
    serveFormPage
} = require('../controllers/formController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public — serve HTML page for a form
router.get('/view/:id', serveFormPage);

// Public — get form JSON (for mobile rendering)
router.get('/:id', getFormById);

// Public — submit a form response
router.post('/:id/submit', submitForm);

// Admin only (Form List)
router.get('/', protect, authorize('admin'), getForms);
router.post('/', protect, authorize('admin'), createForm);
router.put('/:id', protect, authorize('admin'), updateForm);
router.delete('/:id', protect, authorize('admin'), deleteForm);

// Admin only (Responses)
router.get('/:id/responses', protect, authorize('admin'), getResponses);
router.delete('/response/:id', protect, authorize('admin'), deleteResponse);

module.exports = router;
