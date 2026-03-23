const Cutoff = require('../models/Cutoff');
const Groq = require('groq-sdk');
const { emitUpdate } = require('../utils/socket');

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
        emitUpdate('cutoff:updated', { institutionId });
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

    const userKey = req.user?.groqApiKey;
    const apiKey = (userKey && userKey.trim() !== '') ? userKey : process.env.GROQ_API_KEY;

    if (!apiKey) {
        console.error('[AI Parse] Error: No Groq API Key found in Profile or .env');
        return res.status(500).json({ message: 'Groq API Key not configured. Please add it to your profile.' });
    }

    console.log(`[AI Parse] Using Groq Key from: ${userKey ? 'User Profile' : '.env'} (Starts with: ${apiKey.substring(0, 6)}...)`);

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

        const content = chatCompletion.choices[0].message.content;
        const parsed = JSON.parse(content);
        res.json(parsed);
    } catch (error) {
        console.error('AI Parse Error Detail:', error);
        res.status(500).json({ message: error.message || 'Failed to parse cutoff data' });
    }
};

// @desc    Get cutoffs for an institution
// @route   GET /api/cutoffs/:institutionId
// @access  Public
const getCutoffsByInstitution = async (req, res) => {
    const cutoffs = await Cutoff.find({ collegeId: req.params.institutionId });
    res.json(cutoffs);
};

// @desc    Predict colleges based on percentile/rank with tolerance range
// @route   GET /api/cutoffs/predict
// @access  Public
const predictColleges = async (req, res) => {
    const {
        percentile,
        rank,
        pTolerance = 10,
        rTolerance = 500,
        examType,
        category,
        round,
        year,
        branches,
        regions,
        autonomy,
        institutionTypes,
        seatTypes
    } = req.query;

    try {
        const query = {
            examType,
            category: category || 'OPEN'
        };

        if (round) query.round = parseInt(round);
        if (year) query.year = parseInt(year);

        // Branch Filter (Strict 99% match/Strict preference)
        if (branches) {
            const branchArray = Array.isArray(branches) ? branches : [branches];
            if (branchArray.length > 0) {
                query.branch = { $in: branchArray };
            }
        }

        // Seat Type Filter (e.g., Home University, State Level)
        if (seatTypes) {
            const seatArray = Array.isArray(seatTypes) ? seatTypes : [seatTypes];
            if (seatArray.length > 0) {
                // We use regex for flexibility matching seat types likes "GOPENH" (Home University)
                const orConditions = seatArray.map(st => {
                    if (st === 'Home University') return { seatType: /H$/i }; // Ends with H
                    if (st === 'Other Than Home University') return { seatType: /O$/i }; // Ends with O
                    if (st === 'State Level') return { seatType: /S$/i }; // Ends with S
                    if (st === 'All India Level') return { seatType: /AI$/i }; // AI
                    return { seatType: new RegExp(st, 'i') };
                });
                query.$and = query.$and || [];
                query.$and.push({ $or: orConditions });
            }
        }

        // Institution-level Filtering (Region & Autonomy)
        const instQuery = {};
        if (regions) {
            const regionArray = Array.isArray(regions) ? regions : [regions];
            if (regionArray.length > 0) {
                instQuery['location.region'] = { $in: regionArray };
            }
        }

        // Handle Institution Types (e.g. Government, Private Autonomous)
        if (institutionTypes) {
            const typeArray = Array.isArray(institutionTypes) ? institutionTypes : [institutionTypes];
            if (typeArray.length > 0) {
                const typeRegexes = typeArray.map(t => new RegExp(t, 'i'));
                instQuery.type = { $in: typeRegexes };
            }
        }

        if (autonomy && autonomy !== 'All') {
            if (autonomy === 'Autonomous') {
                instQuery.type = { $regex: /Autonomous/i };
            } else if (autonomy === 'Non-Autonomous') {
                instQuery.type = { $not: /Autonomous/i };
            }
        }

        // If we have institution filters, find matching IDs first
        if (Object.keys(instQuery).length > 0) {
            const Institution = require('../models/Institution');
            const matchingInsts = await Institution.find(instQuery).select('_id');
            const instIds = matchingInsts.map(i => i._id);
            query.collegeId = { $in: instIds };
        }

        const conditions = [];
        if (percentile) {
            const p = parseFloat(percentile);
            const tol = parseFloat(pTolerance);
            conditions.push({
                percentile: {
                    $gte: Math.max(0, p - tol),
                    $lte: Math.min(100, p + tol)
                }
            });
        }

        if (rank) {
            const r = parseInt(rank);
            const tol = parseInt(rTolerance);
            conditions.push({
                rank: {
                    $gte: Math.max(1, r - tol),
                    $lte: r + tol
                }
            });
        }

        if (conditions.length > 0) {
            query.$or = conditions;
        }

        const matches = await Cutoff.find(query)
            .populate({
                path: 'collegeId',
                select: 'name location type website email dteCode'
            })
            .sort({ percentile: -1, rank: 1 })
            .lean();

        // Final sanity check for populated data
        const validMatches = matches.filter(m => m.collegeId);

        res.json(validMatches);
    } catch (error) {
        console.error('Prediction error:', error);
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
        emitUpdate('cutoff:updated', { institutionId });
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

    const userKey = req.user?.groqApiKey;
    const apiKey = (userKey && userKey.trim() !== '') ? userKey : process.env.GROQ_API_KEY;

    if (!apiKey) {
        console.error('[AI Bulk Parse] Error: No Groq API Key found in Profile or .env');
        return res.status(500).json({ message: 'Groq API Key not configured. Please add it to your profile.' });
    }

    console.log(`[AI Bulk Parse] Using Groq Key from: ${userKey ? 'User Profile' : '.env'} (Starts with: ${apiKey.substring(0, 6)}...)`);

    const groqClient = new Groq({ apiKey });

    try {
        console.log('[AI Bulk Parse] Sending data to Groq...');
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

        const content = chatCompletion.choices[0].message.content;
        console.log('[AI Bulk Parse] AI Response received');
        const parsed = JSON.parse(content);
        res.json(parsed);
    } catch (error) {
        console.error('AI Bulk Parse Error Detail:', error);
        res.status(500).json({ message: error.message || 'Failed to parse bulk cutoff data' });
    }
};

// @desc    Delete cutoffs for a specific branch/year/round
// @route   DELETE /api/cutoffs/:institutionId/branch/:branchName
// @access  Private/Admin
const deleteCutoffs = async (req, res) => {
    const { institutionId, branchName } = req.params;
    const { examType, year, round } = req.query;

    try {
        const query = {
            collegeId: institutionId,
            branch: branchName
        };

        if (examType) query.examType = examType;
        if (year) query.year = parseInt(year);
        if (round) query.round = parseInt(round);

        const result = await Cutoff.deleteMany(query);
        emitUpdate('cutoff:updated', { institutionId });
        res.json({ message: 'Cutoffs deleted successfully', count: result.deletedCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    addCutoffData,
    bulkAddCutoffData,
    parseCutoffData,
    parseBulkCutoffData,
    getCutoffsByInstitution,
    predictColleges,
    deleteCutoffs
};
