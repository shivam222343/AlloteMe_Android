const express = require('express');
const router = express.Router();
const Counselor = require('../models/Counselor');
const CounselorLog = require('../models/CounselorLog');

// Get all counselors - For students
router.get('/', async (req, res) => {
    try {
        const counselors = await Counselor.find().sort({ rating: -1 });
        res.json(counselors);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Log an action (Chat/Call) - For Students
router.post('/log', async (req, res) => {
    try {
        const { counselorId, userId, action } = req.body;
        const log = await CounselorLog.create({ counselorId, userId, action });

        const { sendNotification } = require('../services/notificationService');
        sendNotification(
            userId,
            `${action === 'chat' ? 'WhatsApp' : 'Call'} Logged`,
            "Inquiry successfully recorded. Our counselor will review your profile details.",
            "info"
        );

        res.status(201).json(log);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get logs for a specific counselor - For Admin
router.get('/:id/logs', async (req, res) => {
    try {
        const logs = await CounselorLog.find({ counselorId: req.params.id })
            .populate('userId', 'displayName email phoneNumber')
            .sort({ timestamp: -1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
        const { name, profileImage, experience, field, cityName, contactNumber, email, description } = req.body;
        const counselor = await Counselor.create({
            name, profileImage, experience, field, cityName, contactNumber, email, description
        });
        res.status(201).json(counselor);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update a counselor
router.put('/:id', async (req, res) => {
    try {
        const { name, profileImage, experience, field, cityName, contactNumber, email, description } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (profileImage !== undefined) updateData.profileImage = profileImage;
        if (experience !== undefined) updateData.experience = experience;
        if (field !== undefined) updateData.field = field;
        if (cityName !== undefined) updateData.cityName = cityName;
        if (contactNumber !== undefined) updateData.contactNumber = contactNumber;
        if (email !== undefined) updateData.email = email;
        if (description !== undefined) updateData.description = description;

        console.log(`[CounselorUpdate] Updating ${req.params.id} with:`, updateData);

        const counselor = await Counselor.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!counselor) return res.status(404).json({ message: "Counselor not found" });
        res.json(counselor);
    } catch (error) {
        console.error('Update Counselor Error:', error);
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
