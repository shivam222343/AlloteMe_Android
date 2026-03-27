const express = require('express');
const router = express.Router();
const Counselor = require('../models/Counselor');

// Get all counselors - For students
router.get('/', async (req, res) => {
    try {
        const counselors = await Counselor.find().sort({ rating: -1 });
        res.json(counselors);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Get counselor by ID
router.get('/:id', async (req, res) => {
    try {
        const counselor = await Counselor.findById(req.params.id);
        if (!counselor) return res.status(404).json({ message: "Counselor not found" });
        res.json(counselor);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Add a counselor - For Admin
router.post('/', async (req, res) => {
    try {
        const { name, profileImage, experience, field, location, contactNumber, email, description } = req.body;
        const counselor = await Counselor.create({
            name, profileImage, experience, field, location, contactNumber, email, description
        });
        res.status(201).json(counselor);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a counselor
router.delete('/:id', async (req, res) => {
    try {
        await Counselor.findByIdAndDelete(req.params.id);
        res.json({ message: "Counselor removed" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
