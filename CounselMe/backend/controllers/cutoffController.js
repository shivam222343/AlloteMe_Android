const Cutoff = require('../models/Cutoff');
const { Groq } = require('groq-sdk');

// @desc    Add cutoff data (bulk or single)
// @route   POST /api/cutoffs
// @access  Private/Admin
// @desc    Add cutoff data (bulk or single)
// @route   POST /api/cutoffs
// @access  Private/Admin
const addCutoffData = async (req, res) => {
    const { institutionId, branchName, examType, year, round, cutoffData } = req.body;

    if (!cutoffData || !Array.isArray(cutoffData)) {
        return res.status(400).json({ message: 'Invalid data format' });
    }

    try {
        const dataToInsert = cutoffData.map(c => ({
            collegeId: institutionId,
            branch: branchName,
            category: c.category,
            seatType: c.seatType || null,
            examType,
            year,
            round,
            percentile: c.percentile,
            rank: c.rank || null
        }));

        const cutoffs = await Cutoff.insertMany(dataToInsert, { ordered: false });
        res.status(201).json(cutoffs);
    } catch (error) {
        // If ordered=false, some might have been inserted. We still report error if unique index failed.
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Some records already exist and were skipped.', error: error.writeErrors?.length });
        }
        res.status(400).json({ message: error.message });
    }
};

// @desc    Parse cutoff data using AI
// @route   POST /api/cutoffs/parse
// @access  Private/Admin
const parseCutoffData = async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'No text provided' });

    // Choose API key: User's personal key or System's .env key
    const apiKey = req.user?.groqApiKey || process.env.GROQ_API_KEY;
    const groqClient = new Groq({ apiKey });

    try {
        const chatCompletion = await groqClient.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are a data extraction assistant. Extract admission cutoff details from the provided text.
                    Return a JSON object with this EXACT structure:
                    {
                        "cutoffData": [
                            { "category": "OPEN", "seatType": "GOPENH", "percentile": 98.5, "rank": 1200 },
                            { "category": "SC", "seatType": "GSCH", "percentile": 92.1, "rank": 5400 }
                        ]
                    }
                    Categories: OPEN, SC, ST, OBC, EWS, TFWS, etc.
                    Seat types: GOPENH (Home University), GOPENO (Other than Home), GSCC, etc.
                    If rank or seatType is missing, use null. Percentile is mandatory.`
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' }
        });

        const parsed = JSON.parse(chatCompletion.choices[0].message.content);
        res.json(parsed);
    } catch (error) {
        console.error('AI Parse Error:', error);
        res.status(500).json({ message: 'Failed to parse cutoff data' });
    }
};

// @desc    Get cutoffs for an institution
// @route   GET /api/cutoffs/:institutionId
// @access  Public
const getCutoffsByInstitution = async (req, res) => {
    const cutoffs = await Cutoff.find({ collegeId: req.params.institutionId });
    res.json(cutoffs);
};

// @desc    Predict colleges based on percentile
// @route   GET /api/cutoffs/predict
// @access  Public
const predictColleges = async (req, res) => {
    const { percentile, examType, category, round } = req.query;

    try {
        const matches = await Cutoff.find({
            examType,
            round: round || 1,
            category: category || 'OPEN',
            percentile: { $lte: parseFloat(percentile) }
        }).populate('collegeId', 'name location type');

        // Sort by highest possible percentile below user's
        const sorted = matches.sort((a, b) => b.percentile - a.percentile);

        res.json(sorted);
    } catch (error) {
        res.status(500).json({ message: 'Prediction failed' });
    }
};

// @desc    Add bulk cutoff data
// @route   POST /api/cutoffs/bulk
// @access  Private/Admin
const bulkAddCutoffData = async (req, res) => {
    const { institutionId, items } = req.body; 

    if (!items || !Array.isArray(items)) {
        return res.status(400).json({ message: 'Invalid data format' });
    }

    try {
        const dataToInsert = [];
        items.forEach(branchItem => {
            if (branchItem.cutoffData && Array.isArray(branchItem.cutoffData)) {
                branchItem.cutoffData.forEach(c => {
                    dataToInsert.push({
                        collegeId: institutionId,
                        branch: branchItem.branchName || branchItem.branch,
                        category: c.category,
                        seatType: c.seatType || null,
                        examType: branchItem.examType,
                        year: branchItem.year,
                        round: branchItem.round,
                        percentile: c.percentile,
                        rank: c.rank || null
                    });
                });
            }
        });

        const cutoffs = await Cutoff.insertMany(dataToInsert, { ordered: false });
        res.status(201).json(cutoffs);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Some records already exist and were skipped.' });
        }
        res.status(400).json({ message: error.message });
    }
};

// @desc    Parse bulk cutoff data using AI (extracts multiple branches)
// @route   POST /api/cutoffs/parse-bulk
// @access  Private/Admin
const parseBulkCutoffData = async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'No text provided' });

    const apiKey = req.user?.groqApiKey || process.env.GROQ_API_KEY;
    const groqClient = new Groq({ apiKey });

    try {
        const chatCompletion = await groqClient.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are a data extraction assistant. Extract admission cutoff details for MULTIPLE branches from the provided text.
                    Return a JSON object with this EXACT structure:
                    {
                        "branches": [
                            {
                                "branchName": "Computer Engineering",
                                "cutoffData": [
                                    { "category": "OPEN", "seatType": "GOPENH", "percentile": 98.5, "rank": 1200 },
                                    { "category": "SC", "seatType": "GSCH", "percentile": 92.1, "rank": 5400 }
                                ]
                            },
                            {
                                "branchName": "Information Technology",
                                "cutoffData": [
                                    { "category": "OPEN", "seatType": "GOPENH", "percentile": 97.2, "rank": 2100 }
                                ]
                            }
                        ]
                    }
                    Categories: OPEN, SC, ST, OBC, EWS, TFWS, etc.
                    If rank or seatType is missing, use null. Percentile is mandatory.`
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' }
        });

        const parsed = JSON.parse(chatCompletion.choices[0].message.content);
        res.json(parsed);
    } catch (error) {
        console.error('AI Bulk Parse Error:', error);
        res.status(500).json({ message: 'Failed to parse bulk cutoff data' });
    }
};

module.exports = { 
    addCutoffData, 
    bulkAddCutoffData, 
    parseCutoffData, 
    parseBulkCutoffData, 
    getCutoffsByInstitution, 
    predictColleges 
};
