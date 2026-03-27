const Cutoff = require('../models/Cutoff');
const Institution = require('../models/Institution');

// Category Mapping for Maharashtra DTE Data
const CATEGORY_ALIASES = {
    'NT1': ['NT1', 'NT-B', 'NTB', 'NT-1'],
    'NT2': ['NT2', 'NT-C', 'NTC', 'NT-2'],
    'NT3': ['NT3', 'NT-D', 'NTD', 'NT-3'],
    'VJ': ['VJ', 'NT-A', 'NTA', 'VJNT', 'VJ/DT', 'VJA'],
    'OPEN': ['OPEN', 'GOPEN', 'LOPEN'],
    'OBC': ['OBC', 'GOBC', 'LOBC'],
    'SC': ['SC', 'GSC', 'LSC'],
    'ST': ['ST', 'GST', 'LST'],
    'EWS': ['EWS', 'GEWS', 'LEWS'],
    'TFWS': ['TFWS', 'GFWS', 'LFWS'],
    'DEF': ['DEF', 'DF', 'D1', 'D2', 'D3'],
    'PWD': ['PWD', 'PH', 'P1', 'P2', 'P3']
};

const BRANCH_EXPANSION_MAP = {
    'Computer Science': ['Computer', 'CSE', 'Comp', 'CS', 'AI', 'ML', 'Data'],
    'IT': ['Information', 'IT', 'Comp'],
    'ENTC': ['Electronics', 'Telecommunication', 'EXTC', 'ETC'],
    'Mechanical': ['Mechanical', 'Mech', 'Production', 'Auto'],
    'Civil': ['Civil', 'Construction', 'Environmental'],
    'Electrical': ['Electrical', 'Power']
};

const REGION_CITY_MAP = {
    'Kolhapur Region': [
        'Kolhapur',
        'Sangli',
        'Miraj',
        'Ichalkaranji',
        'Karad',
        'Ashta',          // Engg college (Dange College)
        'Islampur',
        'Vita',
        'Tasgaon'
    ],

    'Pune Region': [
        'Pune',
        'Pimpri-Chinchwad',
        'Baramati',       // Engg college
        'Loni (Pravaranagar)',  // Engg college
        'Ahmednagar',
        'Shirur',
        'Indapur',
        'Satara',
        'Phaltan',
        'Wai',
        'Solapur'
    ],

    'Mumbai Region': [
        'Mumbai',
        'Navi Mumbai',
        'Thane',
        'Mira Road',
        'Kalyan',
        'Dombivli',
        'Ambernath',      // Karav area college
        'Panvel',
        'Karjat',
        'Ulhasnagar'
    ],

    'Konkan Region': [
        'Raigad',
        'Ratnagiri',
        'Sindhudurg',
        'Chiplun',
        'Kudal',
        'Alibag'
    ],

    'Nashik Region': [
        'Nashik',
        'Adgaon',         // MET college
        'Sinnar',
        'Dhule',
        'Nandurbar',
        'Malegaon',
        'Jalgaon',
        'Chopda'          // Engg college
    ],

    'North Maharashtra Region': [
        'Jalgaon',
        'Dhule',
        'Nandurbar',
        'Chopda',
        'Bhusawal'
    ],

    'Marathwada Region': [
        'Aurangabad',
        'Chhatrapati Sambhajinagar',
        'Jalna',
        'Beed',
        'Latur',
        'Nanded',
        'Parbhani',
        'Hingoli',
        'Osmanabad'
    ],

    'Vidarbha Region': [
        'Nagpur',
        'Wardha',
        'Bhandara',
        'Gondia',
        'Chandrapur',
        'Gadchiroli',
        'Amravati',
        'Akola',
        'Yavatmal',
        'Buldhana',
        'Washim',
        'Shegaon'         // Engg college
    ],

    'Amravati Region': [
        'Amravati',
        'Yavatmal',
        'Akola',
        'Buldhana',
        'Washim',
        'Shegaon'
    ],

    'Nagpur Region': [
        'Nagpur',
        'Wardha',
        'Bhandara',
        'Gondia',
        'Chandrapur',
        'Gadchiroli'
    ],

    'Aurangabad Region': [
        'Aurangabad',
        'Jalna',
        'Beed',
        'Osmanabad',
        'Latur',
        'Nanded',
        'Parbhani',
        'Hingoli'
    ]
};

// @desc    Predict colleges based on percentile/rank with tolerance
// @route   POST /api/cutoffs/predict
// @access  Public
const predictColleges = async (req, res) => {
    const data = req.method === 'POST' ? req.body : req.query;

    let {
        percentile, rank, pTolerance = 5, rTolerance = 500,
        examType, category = 'OPEN', round, year, branches, regions, institutionTypes, seatTypes, isFemale
    } = data;

    try {
        const query = { examType: examType || 'MHTCET' };

        // 1. CATEGORY FILTER (Strict logic to exclude specialized quotas unless selected)
        const filterClauses = [];
        const isSpecializedQuota = category === 'DEF' || category === 'PWD' || category === 'ORPHAN' || category === 'TFWS';

        if (category) {
            const aliases = CATEGORY_ALIASES[category.toUpperCase()];
            if (aliases && aliases.length > 0) {
                query.category = { $in: aliases.map(a => new RegExp(a, 'i')) };
            } else {
                query.category = new RegExp(category, 'i');
            }
        }

        // AUTO-EXCLUSION FOR REGULAR CATEGORIES:
        // If not sitting for a special quota, exclude seats starting with special codes.
        if (!isSpecializedQuota) {
            filterClauses.push({ category: { $not: /DEF|PWD|ORPHAN|TFWS|PH|D1|D2|D3|P1|P2|P3/i } });
        }

        if (round && round !== 'All') query.round = parseInt(round);
        if (year && year !== 'All') query.year = parseInt(year);

        // 3. BRANCHES FILTER
        if (branches && branches.length > 0) {
            const branchArray = Array.isArray(branches) ? branches : branches.split(',');
            const expandedKeywords = [];
            branchArray.forEach(b => {
                const trimmed = b.trim();
                if (trimmed) {
                    expandedKeywords.push(trimmed);
                    Object.keys(BRANCH_EXPANSION_MAP).forEach(key => {
                        if (trimmed.toLowerCase().includes(key.toLowerCase())) {
                            expandedKeywords.push(...BRANCH_EXPANSION_MAP[key]);
                        }
                    });
                }
            });
            const uniqueKeywords = [...new Set(expandedKeywords)].filter(k => k.length > 2);
            if (uniqueKeywords.length > 0) {
                const branchConditions = uniqueKeywords.map(k => ({
                    branch: { $regex: new RegExp(k, 'i') }
                }));
                filterClauses.push({ $or: branchConditions });
            }
        }

        // 4. INSTITUTIONS / REGIONS FILTER
        const instQuery = {};
        let needsInstFilter = false;
        if (regions && regions.length > 0) {
            const regionArray = Array.isArray(regions) ? regions : regions.split(',');
            const citiesToInclude = [];
            regionArray.forEach(reg => {
                const trimmed = reg.trim();
                if (REGION_CITY_MAP[trimmed]) {
                    citiesToInclude.push(...REGION_CITY_MAP[trimmed]);
                }

                // Add the tag itself
                citiesToInclude.push(trimmed);

                // If tag is something like "Pune Region", also add "Pune" as a potential city match
                if (trimmed.toLowerCase().endsWith(' region')) {
                    citiesToInclude.push(trimmed.replace(/ region$/i, '').trim());
                }
            });
            const uniqueCities = [...new Set(citiesToInclude)].filter(c => c.length > 1);

            instQuery.$or = [
                { 'location.region': { $in: uniqueCities.map(c => new RegExp(`^${c}$|${c}`, 'i')) } },
                { 'location.city': { $in: uniqueCities.map(c => new RegExp(`^${c}$|${c}`, 'i')) } },
                { name: { $in: uniqueCities.map(c => new RegExp(c, 'i')) } }
            ];
            needsInstFilter = true;
        }

        if (institutionTypes && institutionTypes.length > 0) {
            const typeArray = Array.isArray(institutionTypes) ? institutionTypes : institutionTypes.split(',');
            instQuery.type = { $in: typeArray.map(t => new RegExp(t, 'i')) };
            needsInstFilter = true;
        }

        if (needsInstFilter) {
            const matchingInsts = await Institution.find(instQuery).select('_id');
            query.collegeId = { $in: matchingInsts.map(i => i._id) };
        }

        // 5. SCORE/PERCENTILE FILTER
        const scoreClauses = [];
        if (percentile && percentile !== '0') {
            const p = parseFloat(percentile);
            const tol = parseFloat(pTolerance) || 5;
            scoreClauses.push({
                percentile: {
                    $gte: Math.max(0, p - tol),
                    $lte: Math.min(100, p + tol)
                }
            });
        }
        if (rank && rank !== '0') {
            const r = parseInt(rank);
            const tolR = parseInt(rTolerance) || 500;
            scoreClauses.push({ rank: { $gte: Math.max(1, r - tolR), $lte: r + (tolR * 5) } });
        }

        if (scoreClauses.length > 0) filterClauses.push({ $or: scoreClauses });

        // 6. SEAT TYPE FILTER
        if (seatTypes && seatTypes.length > 0) {
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

        // 7. FEMALE CANDIDATE FILTER
        if (isFemale === false || isFemale === 'false') {
            filterClauses.push({ seatType: { $not: /^L/i } });
        }

        if (filterClauses.length > 0) query.$and = filterClauses;

        const results = await Cutoff.find(query)
            .populate({ path: 'collegeId', select: 'name location dteCode type bannerUrl' })
            .sort({ percentile: -1 })
            .limit(500)
            .lean();

        const cleaned = results
            .filter(r => r.collegeId && r.collegeId.name)
            .map(r => ({
                ...r,
                key: r._id.toString(),
                percentile: parseFloat(r.percentile) || 0,
                rank: parseInt(r.rank) || null
            }));

        res.json(cleaned);

        // Optional: Send background notification if user logged in
        if (req.headers.authorization) {
            try {
                const jwt = require('jsonwebtoken');
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const { sendNotification } = require('../services/notificationService');
                sendNotification(
                    decoded.id,
                    "Analysis Complete 📊",
                    `Found ${cleaned.length} colleges matching your profile. Compare them to find your best fit! ✨`,
                    "info"
                );
            } catch (e) { /* ignore invalid auth for public routes */ }
        }
    } catch (error) {
        console.error('Prediction Engine Failure:', error);
        res.status(500).json({ message: "Prediction failed", error: error.message });
    }
};

const getCutoffsByInstitution = async (req, res) => {
    try {
        const cutoffs = await Cutoff.find({ collegeId: req.params.institutionId }).sort({ percentile: -1 });
        res.json(cutoffs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const estimateRank = async (req, res) => {
    try {
        const { percentile } = req.query;
        if (!percentile) return res.status(400).json({ message: "Percentile required" });
        const p = parseFloat(percentile);

        const actualData = await Cutoff.findOne({
            percentile: { $lte: p + 0.05, $gte: p - 0.05 },
            rank: { $ne: null }
        }).sort({ percentile: -1 });

        if (actualData && actualData.rank) {
            return res.json({ rank: actualData.rank });
        }

        const closePoints = await Cutoff.find({
            percentile: { $lte: p + 2, $gte: p - 2 },
            rank: { $ne: null }
        }).limit(5).select('rank');

        if (closePoints.length > 0) {
            const avgRank = Math.round(closePoints.reduce((acc, curr) => acc + curr.rank, 0) / closePoints.length);
            return res.json({ rank: avgRank });
        }

        const totalStudents = 380000;
        const rank = Math.round(((100 - p) / 100) * totalStudents);
        res.json({ rank: Math.max(1, rank) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addCutoffData = async (req, res) => {
    try {
        const cutoff = await Cutoff.create(req.body);
        res.status(201).json(cutoff);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const bulkAddCutoffData = async (req, res) => {
    try {
        const results = await Cutoff.insertMany(req.body);
        res.status(201).json(results);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const parseCutoffData = async (req, res) => {
    res.json({ message: "Parser not implemented" });
};

const parseBulkCutoffData = async (req, res) => {
    res.json({ message: "Bulk parser not implemented" });
};

const deleteCutoffs = async (req, res) => {
    try {
        await Cutoff.deleteMany({
            collegeId: req.params.institutionId,
            branch: req.params.branchName
        });
        res.json({ message: "Cutoffs deleted" });
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
