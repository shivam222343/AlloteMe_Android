const OptionFormPreset = require('../models/OptionFormPreset');
const Institution = require('../models/Institution');

exports.addPreset = async (req, res) => {
    try {
        const { percentile, category, colleges } = req.body;

        if (!percentile || !category || !colleges || !Array.isArray(colleges)) {
            return res.status(400).json({ success: false, message: 'Percentile, category and colleges list are required.' });
        }

        const preset = await OptionFormPreset.create({
            percentile: parseFloat(percentile),
            category,
            colleges: colleges.map(c => ({
                collegeId: c.collegeId?._id || c.collegeId,
                branch: c.branch,
                round: parseInt(c.round) || 1,
                year: parseInt(c.year) || 2025,
                percentile: parseFloat(c.percentile),
                rank: parseInt(c.rank) || 0,
                chanceLabel: c.chanceLabel || 'Medium',
                chanceColor: c.chanceColor || '#f59e0b'
            }))
        });

        // Populate collegeId for instant response
        const populatedPreset = await OptionFormPreset.findById(preset._id).populate('colleges.collegeId');

        res.status(201).json({ success: true, data: populatedPreset });
    } catch (error) {
        console.error('Add preset error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPresets = async (req, res) => {
    try {
        const presets = await OptionFormPreset.find()
            .slice('colleges', 1)
            .populate('colleges.collegeId', 'category')
            .sort({ percentile: -1, createdAt: -1 });
        res.json({ success: true, data: presets });
    } catch (error) {
        console.error('Get presets error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPresetById = async (req, res) => {
    try {
        const preset = await OptionFormPreset.findById(req.params.id).populate('colleges.collegeId');
        if (!preset) {
            return res.status(404).json({ success: false, message: 'Preset not found' });
        }
        res.json({ success: true, data: preset });
    } catch (error) {
        console.error('Get preset by ID error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deletePreset = async (req, res) => {
    try {
        await OptionFormPreset.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Preset deleted successfully' });
    } catch (error) {
        console.error('Delete preset error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
