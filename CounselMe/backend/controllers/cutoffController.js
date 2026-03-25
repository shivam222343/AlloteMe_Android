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
    // Standardize params (Handle both standard and [] array keys)
    let {
        percentile,
        rank,
        pTolerance = 10,
        rTolerance = 1000,
        examType,
        category,
        round,
        year,
        branches,
        regions,
        institutionTypes,
        seatTypes
    } = req.query;

    // Fallback for axios array serialization styles
    branches = branches || req.query['branches[]'] || req.query['branches'];
    regions = regions || req.query['regions[]'] || req.query['regions'];
    institutionTypes = institutionTypes || req.query['institutionTypes[]'];
    seatTypes = seatTypes || req.query['seatTypes[]'];

    console.log('[Predictor] Normalized Params:', { percentile, rank, branches, regions });

    try {
        const query = {
            examType: examType || 'MHTCET',
            category: category || 'OPEN'
        };

        if (round) query.round = parseInt(round);
        if (year) query.year = parseInt(year);

        const filterClauses = [];

        // 1. Branch Filter ($or for multiple branches, grouped in $and for overall query)
        if (branches) {
            const branchArray = Array.isArray(branches) ? branches : (typeof branches === 'string' ? branches.split(',') : [branches]);
            const filteredBranches = branchArray.filter(b => b && b.trim() !== '');
            if (filteredBranches.length > 0) {
                const branchConditions = filteredBranches.map(b => ({
                    branch: { $regex: new RegExp(`^${b.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
                }));
                filterClauses.push({ $or: branchConditions });
            }
        }

        // 2. Strict Institution Filter (Region & Type)
        const instQuery = {};
        if (regions) {
            const regionArray = Array.isArray(regions) ? regions : (typeof regions === 'string' ? regions.split(',') : [regions]);
            const filteredRegions = regionArray.filter(r => r && r.trim() !== '');
            if (filteredRegions.length > 0) {
                const regionFilter = filteredRegions.map(r => new RegExp(`^${r.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
                instQuery.$or = [
                    { 'location.region': { $in: regionFilter } },
                    { 'location.city': { $in: regionFilter } }
                ];
            }
        }

        if (institutionTypes) {
            const typeArray = Array.isArray(institutionTypes) ? institutionTypes : (typeof institutionTypes === 'string' ? institutionTypes.split(',') : [institutionTypes]);
            if (typeArray.length > 0) {
                instQuery.type = { $in: typeArray.map(t => new RegExp(t, 'i')) };
            }
        }

        if (Object.keys(instQuery).length > 0) {
            const Institution = require('../models/Institution');
            const matchingInsts = await Institution.find(instQuery).select('_id');
            query.collegeId = { $in: matchingInsts.map(i => i._id) };
        }

        // 3. Score Filter 
        const scoreConditions = [];
        if (percentile) {
            const p = parseFloat(percentile);
            const tol = parseFloat(pTolerance);
            scoreConditions.push({ percentile: { $gte: Math.max(0, p - tol), $lte: Math.min(100, p + tol) } });
        }
        if (rank) {
            const r = parseInt(rank);
            const tolR = parseInt(rTolerance);
            scoreConditions.push({ rank: { $gte: Math.max(1, r - tolR), $lte: r + (tolR * 5) } });
        }
        if (scoreConditions.length > 0) {
            filterClauses.push({ $or: scoreConditions });
        }

        // 4. Seat Type Filter
        if (seatTypes) {
            const seatArray = Array.isArray(seatTypes) ? seatTypes : (typeof seatTypes === 'string' ? seatTypes.split(',') : [seatTypes]);
            if (seatArray.length > 0) {
                const orConditions = seatArray.map(st => {
                    if (st === 'Home University') return { seatType: /H$/i };
                    if (st === 'Other Than Home University') return { seatType: /O$/i };
                    if (st === 'State Level') return { seatType: /S$/i };
                    if (st === 'All India Level') return { seatType: /AI$/i };
                    return { seatType: new RegExp(st, 'i') };
                });
                filterClauses.push({ $or: orConditions });
            }
        }

        if (filterClauses.length > 0) {
            query.$and = filterClauses;
        }

        console.log('[Predictor] Final Query:', JSON.stringify(query, null, 2));

        const matches = await Cutoff.find(query)
            .populate({
                path: 'collegeId',
                select: 'name location type website email dteCode'
            })
            .sort({ percentile: -1, rank: 1 })
            .lean();

        // 5. Enrichment & Sorting (Apply Strict Classification Logic)
        const results = matches
            .filter(m => m.collegeId)
            .map(m => {
                const diff = parseFloat(percentile) - m.percentile;

                // Exclude "Not Possible" (diff < -5) as per requirement
                if (diff < -5) return null;

                let chanceLabel = 'Safe';
                let chanceColor = '#10B981'; // Colors.success
                let sortRank = 1;

                if (diff >= 2) {
                    chanceLabel = 'Safe';
                    chanceColor = '#10B981';
                    sortRank = 1;
                } else if (diff >= 0) {
                    chanceLabel = 'High Chance';
                    chanceColor = '#059669';
                    sortRank = 2;
                } else if (diff >= -2) {
                    chanceLabel = 'Borderline';
                    chanceColor = '#D97706'; // Orange/Amber
                    sortRank = 3;
                } else {
                    chanceLabel = 'Low Chance';
                    chanceColor = '#EF4444'; // Red
                    sortRank = 4;
                }

                // Output Format: College, Branch, Cutoff %, User %, Difference, Chance Label
                return {
                    ...m,
                    userPercentile: percentile,
                    difference: diff.toFixed(2),
                    chanceLabel,
                    chanceColor,
                    sortRank
                };
            })
            .filter(r => r !== null) // Final strict exclusion
            .sort((a, b) => {
                // Secondary sorting based on rank proximity if available
                if (rank && a.rank && b.rank) {
                    const r = parseInt(rank);
                    const diffA = Math.abs(a.rank - r);
                    const diffB = Math.abs(b.rank - r);
                    if (a.sortRank === b.sortRank) return diffA - diffB;
                }
                return a.sortRank - b.sortRank || b.percentile - a.percentile;
            });

        res.json(results);
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

// @desc    Estimate rank based on percentile from history
// @route   GET /api/cutoffs/estimate-rank
// @access  Public
const estimateRank = async (req, res) => {
    const { percentile } = req.query;
    if (!percentile) return res.status(400).json({ message: 'Percentile is required' });

    const p = parseFloat(percentile);
    try {
        // Find records within ±0.05 percentile range to get a reliable average
        const matches = await Cutoff.find({
            percentile: { $gte: p - 0.05, $lte: p + 0.05 },
            rank: { $ne: null }
        })
            .select('rank')
            .limit(20)
            .lean();

        if (matches.length === 0) {
            return res.json({ rank: null, message: 'No enough data to estimate' });
        }

        const avgRank = Math.round(matches.reduce((sum, item) => sum + item.rank, 0) / matches.length);
        res.json({ rank: avgRank });
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
    deleteCutoffs,
    estimateRank
};
