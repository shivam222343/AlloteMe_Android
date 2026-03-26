const Cutoff = require('../models/Cutoff');
const Institution = require('../models/Institution');
const Groq = require('groq-sdk');
const { emitUpdate } = require('../utils/socket');

// @desc    Add single cutoff entry (or multiple for one branch)
// @route   POST /api/cutoffs
// @access  Private/Admin
const addCutoffData = async (req, res) => {
    try {
        const { institutionId, branchName, examType, year, round, cutoffData } = req.body;

        // If it's a list for one branch (common frontend pattern)
        if (cutoffData && Array.isArray(cutoffData)) {
            const formatted = cutoffData.map(item => ({
                collegeId: institutionId,
                branch: branchName,
                examType,
                year,
                round,
                category: item.category,
                seatType: item.seatType || null,
                percentile: item.percentile,
                rank: item.rank || null
            }));
            await Cutoff.insertMany(formatted);
            emitUpdate('cutoff:updated', { institutionId });
            return res.status(201).json({ message: 'Cutoffs added' });
        }

        // Traditional single entry
        const cutoff = new Cutoff(req.body);
        const createdCutoff = await cutoff.save();
        emitUpdate('cutoff:updated', { institutionId: createdCutoff.collegeId });
        res.status(201).json(createdCutoff);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Add multiple cutoff entries across branches
// @route   POST /api/cutoffs/bulk
// @access  Private/Admin
const bulkAddCutoffData = async (req, res) => {
    try {
        const { institutionId, data, items, examType, year, round } = req.body;
        const rawData = data || items; // Support both naming conventions

        if (!rawData || !Array.isArray(rawData)) {
            return res.status(400).json({ message: 'Invalid data format' });
        }

        let totalFormatted = [];

        // Handle nested branch structure (from frontend)
        if (rawData[0]?.branchName && rawData[0]?.cutoffData) {
            rawData.forEach(branchGroup => {
                const branchFormatted = branchGroup.cutoffData.map(item => ({
                    collegeId: institutionId,
                    branch: branchGroup.branchName,
                    examType: examType || branchGroup.examType,
                    year: year || branchGroup.year,
                    round: round || branchGroup.round,
                    category: item.category,
                    seatType: item.seatType || null,
                    percentile: item.percentile,
                    rank: item.rank || null
                }));
                totalFormatted = [...totalFormatted, ...branchFormatted];
            });
        } else {
            // Traditional flat array
            totalFormatted = rawData.map(item => ({
                ...item,
                collegeId: institutionId || item.collegeId,
                examType: examType || item.examType,
                year: year || item.year,
                round: round || item.round
            }));
        }

        await Cutoff.insertMany(totalFormatted);
        emitUpdate('cutoff:updated', { institutionId });
        res.status(201).json({ message: 'Bulk cutoffs added', count: totalFormatted.length });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    AI Assisted Cutoff Parsing (Single Institution)
// @route   POST /api/cutoffs/parse
// @access  Private/Admin
const parseCutoffData = async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'No text provided' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ message: 'Groq API Key not configured' });

    const groq = new Groq({ apiKey });

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are an expert at parsing Maharashtra Engineering CAP Round Cutoff lists. Extract details from the provided text into a JSON array of objects.
Each object must have:
- category: string (e.g. "OPEN", "OBC", "SC", "ST", "TFWS")
- seatType: string (e.g. "GOPENH", "LOPENO", "GOPENO")
- percentile: number (e.g. 98.45)
- rank: number (e.g. 12453)

Return ONLY a JSON object with a "cutoffData" key containing the array.`
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' }
        });

        const extracted = JSON.parse(chatCompletion.choices[0].message.content);
        res.json({ cutoffData: extracted.cutoffData || [] });
    } catch (error) {
        console.error('Groq Error:', error);
        res.status(500).json({ message: 'Error parsing cutoff text' });
    }
};

// @desc    AI Assisted Bulk Cutoff Parsing (Multiple Branches, Single Institution)
// @route   POST /api/cutoffs/parse-bulk
// @access  Private/Admin
const parseBulkCutoffData = async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'No text provided' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ message: 'Groq API Key not configured' });

    const groq = new Groq({ apiKey });

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `Extract cutoff data for MULTIPLE branches (departments) within the same institution from the text.
Return a JSON array of objects, where each object has:
- branchName: string (e.g. "Computer Engineering")
- cutoffData: [{ category, seatType, percentile, rank }]

Return ONLY a JSON object with a "branches" key containing the array.`
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' }
        });

        const extracted = JSON.parse(chatCompletion.choices[0].message.content);
        res.json({ branches: extracted.branches || [] });
    } catch (error) {
        console.error('Groq Error:', error);
        res.status(500).json({ message: 'Error parsing bulk cutoff text' });
    }
};

// @desc    Get cutoffs for an institution
// @route   GET /api/cutoffs/:institutionId
// @access  Public
const getCutoffsByInstitution = async (req, res) => {
    try {
        const cutoffs = await Cutoff.find({ collegeId: req.params.institutionId });
        res.json(cutoffs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const REGION_CITY_MAP = {
    'Pune Region': ['Pune', 'Pimpri-Chinchwad', 'Talegaon', 'Baramati', 'Kolhapur', 'Sangli', 'Miraj', 'Ichalkaranji', 'Satara', 'Karad', 'Solapur', 'Pandharpur'],
    'Mumbai Region': ['Mumbai', 'Navi Mumbai', 'Thane', 'Kalyan', 'Dombivli', 'Ulhasnagar', 'Panvel', 'Palghar', 'Vasai', 'Virar'],
    'Raigad Region': ['Alibaug', 'Panvel', 'Pen', 'Roha', 'Karjat', 'Khalapur', 'Mangaon'],
    'Nashik Region': ['Nashik', 'Malegaon', 'Dhule', 'Shirpur', 'Jalgaon', 'Bhusawal', 'Nandurbar'],
    'Aurangabad Region': ['Chhatrapati Sambhajinagar', 'Aurangabad', 'Jalna', 'Beed', 'Osmanabad', 'Dharashiv', 'Latur', 'Parbhani', 'Hingoli', 'Nanded'],
    'Nagpur Region': ['Nagpur', 'Wardha', 'Bhandara', 'Gondia', 'Chandrapur', 'Gadchiroli'],
    'Amravati Region': ['Amravati', 'Akola', 'Washim', 'Buldhana', 'Yavatmal'],
    'Solapur Region': ['Solapur', 'Pandharpur', 'Barshi', 'Akkalkot'],
    'Kolhapur Region': ['Kolhapur', 'Ichalkaranji', 'Jaysingpur', 'Gadhinglaj'],
    'Western Maharashtra': ['Pune', 'Kolhapur', 'Sangli', 'Satara', 'Solapur'],
    'Vidarbha Region': ['Nagpur', 'Amravati', 'Akola', 'Yavatmal', 'Chandrapur', 'Wardha', 'Buldhana', 'Gondia', 'Gadchiroli', 'Washim'],
    'Marathwada Region': ['Aurangabad', 'Nanded', 'Latur', 'Beed', 'Osmanabad', 'Jalna', 'Parbhani', 'Hingoli'],
    'Konkan Region': ['Mumbai', 'Thane', 'Palghar', 'Raigad', 'Ratnagiri', 'Sindhudurg'],
    'North Maharashtra Region': ['Nashik', 'Dhule', 'Jalgaon', 'Nandurbar']
};

const BRANCH_EXPANSION_MAP = {
    'Computer Science': ['Computer Science', 'Computer Engineering', 'Information Technology', 'AI', 'Machine Learning', 'Data Science', 'Software', 'Computing'],
    'Mechanical': ['Mechanical', 'Automobile', 'Production', 'Mechatronics'],
    'Civil': ['Civil', 'Architecture', 'Construction'],
    'Electrical': ['Electrical', 'Electronics', 'Telecommunication', 'ENTC', 'Instrumentation'],
};

// @desc    Predict colleges based on percentile/rank with tolerance
// @route   GET /api/cutoffs/predict
// @access  Public
const predictColleges = async (req, res) => {
    let {
        percentile, rank, pTolerance = 10, rTolerance = 1000,
        examType, category, round, year, branches, regions, institutionTypes, seatTypes
    } = req.query;

    // Save preferences to user profile if authenticated
    if (req.user) {
        try {
            const User = require('../models/User');
            await User.findByIdAndUpdate(req.user._id, {
                $set: { lastPredictorPreferences: req.query }
            });
        } catch (e) { console.error('Failed to save preferences', e); }
    }

    branches = branches || req.query['branches[]'];
    regions = regions || req.query['regions[]'];
    institutionTypes = institutionTypes || req.query['institutionTypes[]'];
    seatTypes = seatTypes || req.query['seatTypes[]'];

    try {
        const query = { examType: examType || 'MHTCET', category: category || 'OPEN' };
        if (round) query.round = parseInt(round);
        if (year) query.year = parseInt(year);

        const filterClauses = [];

        if (branches) {
            const branchArray = Array.isArray(branches) ? branches : branches.split(',');
            const expandedBranches = [];

            branchArray.forEach(b => {
                const trimmed = b.trim();
                expandedBranches.push(trimmed);
                // Expand if exists in map
                Object.keys(BRANCH_EXPANSION_MAP).forEach(key => {
                    if (trimmed.toLowerCase().includes(key.toLowerCase())) {
                        expandedBranches.push(...BRANCH_EXPANSION_MAP[key]);
                    }
                });
            });

            const uniqueBranches = [...new Set(expandedBranches)];
            const branchConditions = uniqueBranches.filter(b => b).map(b => ({
                branch: { $regex: new RegExp(b, 'i') }
            }));
            if (branchConditions.length > 0) filterClauses.push({ $or: branchConditions });
        }

        const instQuery = {};
        if (regions) {
            const regionArray = Array.isArray(regions) ? regions : regions.split(',');
            const citiesToInclude = [];

            regionArray.forEach(reg => {
                if (REGION_CITY_MAP[reg]) {
                    citiesToInclude.push(...REGION_CITY_MAP[reg]);
                }
                citiesToInclude.push(reg); // Also include the region name itself as a city fallback
            });

            if (citiesToInclude.length > 0) {
                const uniqueCities = [...new Set(citiesToInclude)];
                instQuery.$or = [
                    { 'location.region': { $in: uniqueCities.map(c => new RegExp(c, 'i')) } },
                    { 'location.city': { $in: uniqueCities.map(c => new RegExp(c, 'i')) } }
                ];
            }
        }
        if (institutionTypes) {
            const typeArray = Array.isArray(institutionTypes) ? institutionTypes : institutionTypes.split(',');
            if (typeArray.length > 0) instQuery.type = { $in: typeArray.map(t => new RegExp(t, 'i')) };
        }

        if (Object.keys(instQuery).length > 0) {
            const matchingInsts = await Institution.find(instQuery).select('_id');
            query.collegeId = { $in: matchingInsts.map(i => i._id) };
        }

        const scoreClauses = [];
        if (percentile) {
            const p = parseFloat(percentile);
            const tol = parseFloat(pTolerance);
            scoreClauses.push({ percentile: { $gte: Math.max(0, p - tol), $lte: Math.min(100, p + tol) } });
        }
        if (rank) {
            const r = parseInt(rank);
            const tolR = parseInt(rTolerance);
            scoreClauses.push({ rank: { $gte: Math.max(1, r - (tolR * 5)), $lte: r + (tolR * 20) } });
        }
        if (scoreClauses.length > 0) filterClauses.push({ $or: scoreClauses });

        if (seatTypes) {
            const seatArray = Array.isArray(seatTypes) ? seatTypes : seatTypes.split(',');
            const seatConditions = seatArray.filter(s => s).map(st => {
                if (st === 'Home University') return { seatType: /H$/i };
                if (st === 'Other Than Home University') return { seatType: /O$/i };
                if (st === 'State Level') return { seatType: /S$/i };
                if (st === 'All India Level') return { seatType: /AI$/i };
                return { seatType: new RegExp(st, 'i') };
            });
            if (seatConditions.length > 0) filterClauses.push({ $or: seatConditions });
        }

        if (filterClauses.length > 0) query.$and = filterClauses;

        const matches = await Cutoff.find(query)
            .populate({ path: 'collegeId', select: 'name location type dteCode' })
            .sort({ percentile: -1, rank: 1 })
            .lean();

        const results = matches
            .filter(m => m.collegeId && typeof m.collegeId === 'object' && m.collegeId.name) // Ensure full object with name exists
            .map(m => {
                const diff = parseFloat(percentile) - m.percentile;
                let chanceLabel = 'Low Chance', chanceColor = '#EF4444';
                if (diff >= 2) { chanceLabel = 'Safe'; chanceColor = '#10B981'; }
                else if (diff >= 0) { chanceLabel = 'Fair'; chanceColor = '#6366F1'; }
                else if (diff >= -1) { chanceLabel = 'Reach'; chanceColor = '#F59E0B'; }
                else if (diff >= -3) { chanceLabel = 'High Reach'; chanceColor = '#F97316'; }

                return {
                    ...m,
                    key: m._id.toString(),
                    chanceLabel,
                    chanceColor,
                    difference: diff.toFixed(2),
                    userPercentile: percentile
                };
            });

        res.json(results);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete cutoffs for an institution/branch
// @route   DELETE /api/cutoffs/:institutionId/branch/:branchName
// @access  Private/Admin
const deleteCutoffs = async (req, res) => {
    try {
        const { institutionId, branchName } = req.params;
        await Cutoff.deleteMany({ collegeId: institutionId, branch: branchName });
        emitUpdate('cutoff:updated', { institutionId });
        res.json({ message: 'Cutoffs deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Estimate rank from percentile
const estimateRank = async (req, res) => {
    try {
        const { percentile } = req.query;
        const p = parseFloat(percentile);
        if (isNaN(p)) return res.status(400).json({ message: 'Invalid percentile' });

        // Search for actual rank data around this percentile (+/- 0.05)
        const recentMatches = await Cutoff.find({
            percentile: { $gte: p - 0.05, $lte: p + 0.05 },
            rank: { $gt: 0 }
        })
            .select('rank')
            .limit(10)
            .sort({ createdAt: -1 })
            .lean();

        let estimated = 0;
        if (recentMatches.length > 0) {
            const sum = recentMatches.reduce((acc, m) => acc + m.rank, 0);
            estimated = sum / recentMatches.length;
        } else {
            // Fallback to sophisticated math if no real data found
            if (p >= 99) estimated = Math.max(1, (100 - p) * 2000);
            else if (p >= 90) estimated = 2000 + (99 - p) * 2500;
            else if (p >= 80) estimated = 25000 + (90 - p) * 3000;
            else estimated = 55000 + (80 - p) * 4000;
        }

        const roundedRank = Math.round(estimated);
        res.json({
            percentile: p,
            estimatedRank: roundedRank,
            rank: roundedRank, // For frontend compatibility
            source: recentMatches.length > 0 ? 'historical_data' : 'algorithm'
        });
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
