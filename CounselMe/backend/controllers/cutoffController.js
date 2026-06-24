const Cutoff = require('../models/Cutoff');
const Institution = require('../models/Institution');
const Groq = require('groq-sdk');
const axios = require('axios');
const FormDataNode = require('form-data');

// Normalizes category strings for consistent indexing and duplicate detection
const normalizeCategory = (cat) => {
    if (!cat) return '';
    let normalized = cat.trim()
        .replace(/\s+/g, ' ')
        .toUpperCase();
    
    // Normalize female suffixes
    normalized = normalized.replace(/\(FEMALE\)/g, 'FEMALE');
    normalized = normalized.replace(/\bFEMALE\b/g, 'FEMALE');
    normalized = normalized.replace(/\s*\(FEMALE\)\s*/g, ' FEMALE');
    normalized = normalized.replace(/\s*FEMALE\s*/g, ' FEMALE');
    
    // Normalize DEFENCE prefix
    // Replace word 'DEF' with 'DEFENCE'
    normalized = normalized.replace(/\bDEF\b/g, 'DEFENCE');
    
    return normalized.trim().replace(/\s+/g, ' ');
};

// Normalizes seatType
const normalizeSeatType = (st) => st ? st.trim().toUpperCase() : null;

// Gets the number of decimal places of a float/string number for precision comparison
const getDecimalPlaces = (val) => {
    if (val === undefined || val === null) return 0;
    const str = val.toString();
    const parts = str.split('.');
    return parts.length > 1 ? parts[1].length : 0;
};

// Compares new vs existing doc to decide which one is better to keep
const shouldReplaceDoc = (newDoc, existingDoc) => {
    if (newDoc.rank && !existingDoc.rank) return true;
    if (!newDoc.rank && existingDoc.rank) return false;

    const newPrecision = getDecimalPlaces(newDoc.percentile);
    const existingPrecision = getDecimalPlaces(existingDoc.percentile);
    if (newPrecision > existingPrecision) return true;
    if (newPrecision < existingPrecision) return false;

    return newDoc.percentile > existingDoc.percentile;
};

// Deduplicates and writes/updates documents in MongoDB using bulkWrite (Replace mode)
const saveCutoffDocuments = async (documents) => {
    if (!documents || documents.length === 0) return 0;

    // 1. Normalize categories and seatTypes in all documents
    for (const doc of documents) {
        doc.category = normalizeCategory(doc.category);
        doc.seatType = normalizeSeatType(doc.seatType);
    }

    // 2. Deduplicate within the payload itself
    const uniqueDocsMap = new Map();
    for (const doc of documents) {
        const key = `${doc.collegeId}_${doc.examType}_${doc.year}_${doc.round}_${doc.branch?.toLowerCase()}_${doc.category}_${doc.seatType || ''}`;
        
        const existing = uniqueDocsMap.get(key);
        if (!existing || shouldReplaceDoc(doc, existing)) {
            uniqueDocsMap.set(key, doc);
        }
    }

    const dedupedDocs = Array.from(uniqueDocsMap.values());

    // 3. Write to database using bulkWrite upserts to overwrite any duplicate keys in the DB
    const operations = dedupedDocs.map(doc => ({
        updateOne: {
            filter: {
                collegeId: doc.collegeId,
                examType: doc.examType,
                year: doc.year,
                round: doc.round,
                branch: doc.branch,
                category: doc.category,
                seatType: doc.seatType
            },
            update: {
                $set: doc
            },
            upsert: true
        }
    }));

    if (operations.length > 0) {
        const result = await Cutoff.bulkWrite(operations);
        return (result.upsertedCount || 0) + (result.modifiedCount || 0) + (result.insertedCount || 0);
    }
    return 0;
};

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
const BRANCH_STOP_WORDS = ['and', 'of', 'in', 'the', 'for', 'with', 'technology', 'engineering', 'science', 'department', 'branch', 'course', 'degree', 'diploma', 'studies', 'management', 'applied', 'general', 'basic', 'advanced', 'program', 'programme', 'group', 'specialization', 'specialisation', 'stream', 'engg'];

const BRANCH_EXPANSION_MAP = {
    'Computer': ['Computer', 'CSE', 'Comp', 'CS', 'AI', 'ML', 'Data'],
    'Science': ['Computer', 'CSE', 'Comp', 'CS'],
    'IT': ['Information', 'IT', 'Comp'],
    'ENTC': ['Electronics', 'Telecommunication', 'EXTC', 'ETC'],
    'Electronic': ['Electronics', 'Telecommunication', 'EXTC', 'ETC'],
    'Mechanical': ['Mechanical', 'Mech', 'Production', 'Auto'],
    'Civil': ['Civil', 'Construction', 'Environmental'],
    'Electrical': ['Electrical', 'Power'],
    'Pharmacy': ['Pharmacy', 'Pharma', 'B.Pharm', 'B. Farm', 'Pharmacology', 'Pharm D', 'Pharm.D'],
    'Pharm': ['Pharmacy', 'Pharma', 'B.Pharm', 'B. Farm', 'Pharmacology', 'Pharm D', 'Pharm.D'],
    'Doctor': ['Pharm D', 'Pharm.D', 'Doctorate of pharmacy']
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
        percentile, rank, pTolerance = 5, rTolerance = 500, admissionPath = 'Engineering',
        examType, category = 'OPEN', round, year, branches, regions, institutionTypes, seatTypes, isFemale, useTFWS
    } = data;

    try {
        let query = {};
        const isPharmacy = (admissionPath === 'PHARMACY' || admissionPath === 'MHTCET PCB') || (examType === 'PHARMACY' || examType === 'MHTCET PCB');
        const isEngineering = !isPharmacy && (examType === 'MHTCET' || examType === 'Engineering' || examType === 'MHTCET PCM' ||
            admissionPath === 'MHTCET' || admissionPath === 'Engineering' || admissionPath === 'MHTCET PCM');

        if (isPharmacy) {
            query.examType = { $in: ['PHARMACY', 'MHTCET PCB'] };
        } else if (isEngineering) {
            query.examType = { $in: ['MHTCET', 'Engineering', 'MHTCET PCM'] };
        } else {
            query.examType = examType || admissionPath || 'MHTCET';
        }

        // 1. CATEGORY FILTER (Strict logic to exclude specialized quotas unless selected)
        const filterClauses = [];

        // Specialized Flags
        const activeTFWS = (useTFWS === true || useTFWS === 'true');
        const activeDEF = (data.isDEF === true || data.isDEF === 'true' || category === 'DEF');
        const activePWD = (data.isPWD === true || data.isPWD === 'true' || category === 'PWD');
        const activeOrphan = (data.isOrphan === true || data.isOrphan === 'true' || category === 'ORPHAN');

        const isSpecializedQuota = activeTFWS || activeDEF || activePWD || activeOrphan;

        if (category) {
            const aliases = CATEGORY_ALIASES[category.toUpperCase()] || [category];
            const matchingCategories = aliases.map(a => new RegExp(`^${a}$`, 'i'));

            if (activeTFWS) matchingCategories.push(/TFWS/i);
            if (activeDEF) matchingCategories.push(/DEF|DF|D1|D2|D3/i);
            if (activePWD) matchingCategories.push(/PWD|PH|P1|P2|P3/i);
            if (activeOrphan) matchingCategories.push(/ORPHAN/i);

            query.category = { $in: matchingCategories };
        }

        // AUTO-EXCLUSION: Exclude specialized segments if they are not active
        const exclusionSegments = [];
        if (!activeTFWS) exclusionSegments.push('TFWS');
        if (!activeDEF) exclusionSegments.push('DEF', 'DF', 'D1', 'D2', 'D3');
        if (!activePWD) exclusionSegments.push('PWD', 'PH', 'P1', 'P2', 'P3');
        if (!activeOrphan) exclusionSegments.push('ORPHAN');

        if (exclusionSegments.length > 0) {
            filterClauses.push({ category: { $not: new RegExp(exclusionSegments.join('|'), 'i') } });
        }

        if (round && round !== 'All') query.round = parseInt(round);
        if (year && year !== 'All') query.year = parseInt(year);

        // 3. BRANCHES FILTER
        if (branches && branches.length > 0) {
            const branchArray = Array.isArray(branches) ? branches : branches.split(',');
            const expandedKeywords = [];
            branchArray.forEach(b => {
                const trimmed = b.trim();
                const lowered = trimmed.toLowerCase();
                
                if (trimmed) {
                    // Only add the full trimmed name if it's not just a stop word
                    if (!BRANCH_STOP_WORDS.includes(lowered)) {
                        expandedKeywords.push(trimmed);
                    }

                    // Add keywords split by spaces and parentheses for multi-term matches
                    // We filter out common stop words and generic terms to avoid over-matching
                    const subKeywords = trimmed.split(/[\s\(\)\-]+/)
                        .filter(k => k.length >= 2 && !BRANCH_STOP_WORDS.includes(k.toLowerCase()));
                    expandedKeywords.push(...subKeywords);

                    // Check for expansion map keys using word boundaries to avoid partial matches (like 'it' in 'Information')
                    Object.keys(BRANCH_EXPANSION_MAP).forEach(key => {
                        const keyRegex = new RegExp(`\\b${key}\\b`, 'i');
                        if (keyRegex.test(trimmed)) {
                            expandedKeywords.push(...BRANCH_EXPANSION_MAP[key]);
                        }
                    });
                }
            });

            // Final cleanup: ensure no stop words slipped in, keep unique and long enough keywords
            const uniqueKeywords = [...new Set(expandedKeywords)].filter(k => 
                k.length >= 2 && 
                !BRANCH_STOP_WORDS.includes(k.toLowerCase())
            );

            if (uniqueKeywords.length > 0) {
                const branchConditions = uniqueKeywords.map(k => {
                    // Escape special characters for regex safety
                    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    return {
                        branch: { $regex: new RegExp(`\\b${escaped}\\b`, 'i') }
                    };
                });
                filterClauses.push({ $or: branchConditions });
            }
        }

        // 4. INSTITUTIONS / REGIONS FILTER
        const instFilterClauses = [];

        // Path Filter
        const pathUpper = admissionPath ? admissionPath.toUpperCase() : '';
        if (pathUpper === 'ENGINEERING' || pathUpper === 'MHTCET' || pathUpper === 'MHTCET PCM') {
            instFilterClauses.push({
                $or: [
                    { category: /^Engineering$/i },
                    { category: /^MHTCET$/i },
                    { category: /^MHTCET PCM$/i },
                    {
                        $and: [
                            { $or: [{ category: { $exists: false } }, { category: null }, { category: '' }] },
                            { name: { $not: /Pharmacy|Pharma|Medical|Ayurvedic|B\.Pharm/i } }
                        ]
                    }
                ]
            });
        } else if (pathUpper === 'PHARMACY' || pathUpper === 'MHTCET PCB') {
            instFilterClauses.push({
                $or: [
                    { category: /Pharmacy/i },
                    { category: /MHTCET PCB/i },
                    {
                        $and: [
                            { $or: [{ category: { $exists: false } }, { category: null }, { category: '' }] },
                            { name: /Pharmacy|Pharma|B\.Pharm|B-Pharm|D\.Pharm|M\.Pharm/i }
                        ]
                    }
                ]
            });
        } else {
            instFilterClauses.push({ category: new RegExp(`^${admissionPath}$`, 'i') });
        }

        // Regions Filter
        if (regions && regions.length > 0) {
            const regionArray = Array.isArray(regions) ? regions : regions.split(',');
            const citiesToInclude = [];
            regionArray.forEach(reg => {
                const trimmed = reg.trim();
                if (REGION_CITY_MAP[trimmed]) {
                    citiesToInclude.push(...REGION_CITY_MAP[trimmed]);
                }
                citiesToInclude.push(trimmed);
                if (trimmed.toLowerCase().endsWith(' region')) {
                    citiesToInclude.push(trimmed.replace(/ region$/i, '').trim());
                }
            });
            const uniqueCities = [...new Set(citiesToInclude)].filter(c => c.length > 1);

            instFilterClauses.push({
                $or: [
                    { 'location.region': { $in: uniqueCities.map(c => new RegExp(`^${c}$|${c}`, 'i')) } },
                    { 'location.city': { $in: uniqueCities.map(c => new RegExp(`^${c}$|${c}`, 'i')) } },
                    { name: { $in: uniqueCities.map(c => new RegExp(c, 'i')) } }
                ]
            });
        }

        // Institution Type Filter
        if (institutionTypes && institutionTypes.length > 0) {
            const typeArray = Array.isArray(institutionTypes) ? institutionTypes : institutionTypes.split(',');
            instFilterClauses.push({ type: { $in: typeArray.map(t => new RegExp(t, 'i')) } });
        }

        if (instFilterClauses.length > 0) {
            const matchingInsts = await Institution.find({ $and: instFilterClauses }).select('_id');
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

        // Save preferences to user for admin tracking
        if (req.user) {
            const User = require('../models/User');
            const { client: redis } = require('../config/redis');

            await User.findByIdAndUpdate(req.user._id, {
                lastPredictorPreferences: {
                    percentile,
                    rank,
                    category,
                    examType,
                    round,
                    year,
                    branches,
                    regions,
                    pTolerance,
                    rTolerance,
                    institutionTypes,
                    seatTypes,
                    isFemale,
                    timestamp: new Date(),
                    topResults: cleaned.slice(0, 10).map(r => ({
                        collegeName: r.collegeId.name,
                        branch: r.branch,
                        percentile: r.percentile,
                        rank: r.rank,
                        category: r.category,
                        round: r.round,
                        year: r.year
                    }))
                }
            });

            // Invalidate user profile cache so admins see fresh data
            await redis.del(`user_profile_${req.user._id}`);
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
        const { percentile, admissionPath, examType } = req.query;
        if (!percentile) return res.status(400).json({ message: "Percentile required" });
        const p = parseFloat(percentile);

        const query = {
            percentile: { $lte: p + 0.1, $gte: p - 0.1 },
            rank: { $ne: null }
        };

        const target = examType || admissionPath;
        if (target === 'PHARMACY' || target === 'MHTCET PCB') {
            query.examType = 'MHTCET PCB';
        } else if (target === 'ENGINEERING' || target === 'MHTCET PCM' || target === 'MHTCET') {
            query.examType = 'MHTCET PCM';
        }

        const actualData = await Cutoff.findOne(query).sort({ percentile: -1 });

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
        const { collegeId, institutionId, branch, branchName, examType, year, round, category, seatType, cutoffData } = req.body;
        
        const finalCollegeId = collegeId || institutionId;
        const finalBranch = branch || branchName;

        if (cutoffData && Array.isArray(cutoffData)) {
            // Bulk-like array insertion for a single branch
            // Delete all existing cutoffs for this college, examType, year, and round (Replace mode)
            await Cutoff.deleteMany({
                collegeId: finalCollegeId,
                examType,
                year: parseInt(year),
                round: parseInt(round)
            });

            const documents = [];
            for (const entry of cutoffData) {
                if (!entry.category || entry.percentile == null) continue;
                documents.push({
                    collegeId: finalCollegeId,
                    branch: finalBranch,
                    examType,
                    year: parseInt(year),
                    round: parseInt(round),
                    category: entry.category,
                    percentile: parseFloat(entry.percentile),
                    rank: entry.rank ? parseInt(entry.rank) : null,
                    seatType: entry.seatType || null
                });
            }

            const inserted = await saveCutoffDocuments(documents);

            return res.status(201).json({
                message: `Inserted/Updated ${inserted} cutoff entries.`,
                inserted
            });
        } else {
            // Single cutoff insertion
            // Delete all existing cutoffs for this college, examType, year, and round (Replace mode)
            await Cutoff.deleteMany({
                collegeId: finalCollegeId,
                examType,
                year: parseInt(year),
                round: parseInt(round)
            });

            const documents = [{
                collegeId: finalCollegeId,
                branch: finalBranch,
                examType,
                year: parseInt(year),
                round: parseInt(round),
                category: category,
                percentile: parseFloat(req.body.percentile),
                rank: req.body.rank ? parseInt(req.body.rank) : null,
                seatType: seatType || null
            }];

            const inserted = await saveCutoffDocuments(documents);
            return res.status(201).json({
                message: `Inserted/Updated cutoff entry.`,
                inserted
            });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const bulkAddCutoffData = async (req, res) => {
    try {
        const { institutionId, collegeId, items } = req.body;
        const finalCollegeId = collegeId || institutionId;

        if (!finalCollegeId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'collegeId/institutionId and items array are required' });
        }

        // 1. Identify all unique rounds (examType, year, round) being updated and delete them first
        const roundsToClear = [];
        for (const item of items) {
            const { examType, year, round } = item;
            if (!examType || !year || !round) continue;

            const y = parseInt(year);
            const r = parseInt(round);
            const exists = roundsToClear.some(
                c => c.examType === examType && c.year === y && c.round === r
            );
            if (!exists) {
                roundsToClear.push({ examType, year: y, round: r });
            }
        }

        for (const r of roundsToClear) {
            await Cutoff.deleteMany({
                collegeId: finalCollegeId,
                examType: r.examType,
                year: r.year,
                round: r.round
            });
        }

        // 2. Flatten branches -> individual Cutoff documents and insert them
        const documents = [];
        for (const item of items) {
            const { branchName, examType, year, round, cutoffData } = item;
            if (!branchName || !examType || !year || !round || !Array.isArray(cutoffData)) continue;

            for (const entry of cutoffData) {
                if (!entry.category || entry.percentile == null) continue;
                documents.push({
                    collegeId: finalCollegeId,
                    branch: branchName,
                    examType,
                    year: parseInt(year),
                    round: parseInt(round),
                    category: entry.category,
                    percentile: parseFloat(entry.percentile),
                    rank: entry.rank || null,
                    seatType: entry.seatType || null
                });
            }
        }

        if (documents.length === 0) {
            return res.status(400).json({ message: 'No valid cutoff documents to insert. Check your data format.' });
        }

        const inserted = await saveCutoffDocuments(documents);

        res.status(201).json({
            message: `Inserted/Updated ${inserted} cutoff entries.`,
            inserted,
            skipped: 0
        });
    } catch (error) {
        console.error('Bulk Insert Error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

const parseCutoffData = async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'No text provided' });

    const userKey = req.user?.groqApiKey;
    const apiKey = (userKey && userKey.trim() !== '') ? userKey : process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ message: 'Groq API Key not configured. Please add it to your profile.' });
    }

    const groq = new Groq({ apiKey });

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are a data extraction assistant. Extract EVERY single cutoff point from the provided text.
Return a JSON object: { "cutoffData": [ { "category": string, "percentile": number } ] }
Guidelines:
1. Extract ALL categories found (OPEN, OBC, SC, ST, NT, EWS, TFWS, etc).
2. Use ONLY the percentile value (e.g. 98.45). Skip ranks.
3. If thousands of entries exist, return them ALL. Do not summarize.`
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' }
        });

        const extractedData = JSON.parse(chatCompletion.choices[0].message.content);
        res.json(extractedData);
    } catch (error) {
        console.error('Groq Error:', error);
        res.status(500).json({ message: 'Error parsing cutoff text' });
    }
};

const parseBulkCutoffData = async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'No text provided' });

    const userKey = req.user?.groqApiKey;
    const apiKey = (userKey && userKey.trim() !== '') ? userKey : process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ message: 'Groq API Key not configured. Please add it to your profile.' });
    }

    const groq = new Groq({ apiKey });

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are a data extraction assistant. Extract multiple branch cutoffs from the provided text.
Return a JSON object: { "branches": [ { "branchName": string, "cutoffData": [ { "category": string, "percentile": number } ] } ] }
Detailed Rules:
1. Detect ALL branch names accurately.
2. For each branch, extract ALL categories and percentiles.
3. Handle large amounts of text by being thorough. Do not truncate the list.
4. Ensure the output is valid JSON.`
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' }
        });

        const extractedData = JSON.parse(chatCompletion.choices[0].message.content);
        res.json(extractedData);
    } catch (error) {
        console.error('Groq Error:', error);
        res.status(500).json({ message: 'Error parsing bulk cutoff text' });
    }
};

const deleteCutoffs = async (req, res) => {
    try {
        const { branch, examType, year, round } = req.query;

        if (!branch) {
            return res.status(400).json({ message: 'branch query parameter is required' });
        }

        const query = {
            collegeId: req.params.institutionId,
            branch: decodeURIComponent(branch)
        };

        if (examType) query.examType = examType;
        if (year) query.year = parseInt(year);
        if (round) query.round = parseInt(round);

        const result = await Cutoff.deleteMany(query);
        res.json({ message: `Deleted ${result.deletedCount} cutoff(s)` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getCutoffSummary = async (req, res) => {
    try {
        const summary = await Cutoff.aggregate([
            {
                $group: {
                    _id: { collegeId: "$collegeId", year: "$year", round: "$round" }
                }
            },
            {
                $group: {
                    _id: { collegeId: "$_id.collegeId", year: "$_id.year" },
                    rounds: { $addToSet: "$_id.round" }
                }
            },
            {
                $group: {
                    _id: "$_id.collegeId",
                    years: {
                        $push: {
                            year: "$_id.year",
                            rounds: "$rounds"
                        }
                    }
                }
            }
        ]);

        const summaryDict = {};
        summary.forEach(item => {
            if(item._id) {
                summaryDict[item._id] = item.years;
            }
        });

        res.json(summaryDict);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const parsePdfCutoffs = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No PDF file uploaded' });
        }

        // Use Node.js form-data package (not browser FormData/Blob) for server-side multipart uploads
        const formData = new FormDataNode();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
            knownLength: req.file.buffer.length
        });

        const mlApiUrl = process.env.ML_API_URL || 'http://localhost:5005';
        console.log(`[ML Uploader] Forwarding PDF to ML service: ${mlApiUrl}/api/extract-pdf`);

        const response = await axios.post(`${mlApiUrl}/api/extract-pdf`, formData, {
            headers: {
                ...formData.getHeaders()  // Sets correct Content-Type with multipart boundary
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 120000  // 120s — ML parsing can be slow on cold starts
        });

        if (response.data && response.data.success) {
            return res.json({
                success: true,
                data: response.data.data
            });
        } else {
            return res.status(500).json({
                success: false,
                message: response.data?.error || 'ML service parsing failed'
            });
        }
    } catch (error) {
        console.error('[ML Uploader] Error forwarding to ML service:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error communicating with ML service: ' + error.message
        });
    }
};

const importParsedCollege = async (req, res) => {
    try {
        const { collegeName, dteCode, examType, year, round, branches } = req.body;

        if (!dteCode || !examType || !year || !round || !branches || !Array.isArray(branches)) {
            return res.status(400).json({ message: "Missing required fields in payload" });
        }

        // 1. Find the Institution by DTE code (checking both exact and integer-parsed/padded variants)
        const cleanDte = dteCode.toString().trim();
        const dteQueryOptions = [cleanDte];
        const numDte = parseInt(cleanDte, 10);
        if (!isNaN(numDte)) {
            const strippedDte = numDte.toString();
            if (!dteQueryOptions.includes(strippedDte)) {
                dteQueryOptions.push(strippedDte);
            }
            const paddedDte = strippedDte.padStart(cleanDte.length > 4 ? cleanDte.length : 5, '0');
            if (!dteQueryOptions.includes(paddedDte)) {
                dteQueryOptions.push(paddedDte);
            }
            const paddedDte4 = strippedDte.padStart(4, '0');
            if (!dteQueryOptions.includes(paddedDte4)) {
                dteQueryOptions.push(paddedDte4);
            }
        }

        let institution = await Institution.findOne({ dteCode: { $in: dteQueryOptions } });

        // Fallback: search by name (case-insensitive regex match)
        if (!institution && collegeName) {
            const cleanName = collegeName.trim();
            institution = await Institution.findOne({ name: { $regex: new RegExp(cleanName, 'i') } });
        }

        if (!institution) {
            return res.status(404).json({
                success: false,
                message: `Institution with DTE code "${dteCode}" or name "${collegeName}" not found.`
            });
        }

        let branchesAdded = 0;
        let cutoffsInserted = 0;

        if (!institution.branches) {
            institution.branches = [];
        }

        // Delete all existing cutoffs for this college, examType, year, and round (Replace mode)
        await Cutoff.deleteMany({
            collegeId: institution._id,
            examType,
            year: parseInt(year),
            round: parseInt(round)
        });

        // 2. Loop through each branch and process
        const seenBranchNamesInPayload = new Map(); // branchName (lowercase) -> occurrences count

        for (const branch of branches) {
            const { branchName, cutoffData } = branch;
            if (!branchName || !Array.isArray(cutoffData) || cutoffData.length === 0) continue;

            let trimmedBranchName = branchName.trim();
            const lowerName = trimmedBranchName.toLowerCase();

            // Get how many times we've already seen this branch name in the current payload
            const occurrences = seenBranchNamesInPayload.get(lowerName) || 0;
            seenBranchNamesInPayload.set(lowerName, occurrences + 1);

            // Suffix duplicates with a zero-width space (\u200B) repeated occurrences times
            if (occurrences > 0) {
                trimmedBranchName = trimmedBranchName + '\u200B'.repeat(occurrences);
            }

            // Check if branch exists
            let branchExists = institution.branches.some(
                b => b.name && b.name.toLowerCase() === trimmedBranchName.toLowerCase()
            );

            if (!branchExists) {
                // Generate a short code from the branch name (strip zero-width spaces first)
                const generatedCode = trimmedBranchName
                    .replace(/\u200B/g, '')
                    .split(/[\s\(\)\-]+/)
                    .filter(w => w.length > 0 && !['and', 'of', 'in', 'the', 'for', 'with', 'technology', 'engineering', 'science'].includes(w.toLowerCase()))
                    .map(w => w[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 5) || 'BR';

                institution.branches.push({
                    name: trimmedBranchName,
                    code: generatedCode
                });
                branchesAdded++;
            }

            // Insert new cutoffs
            const documents = [];
            for (const entry of cutoffData) {
                if (!entry.category || entry.percentile == null) continue;

                documents.push({
                    collegeId: institution._id,
                    branch: trimmedBranchName,
                    examType,
                    year: parseInt(year),
                    round: parseInt(round),
                    category: entry.category,
                    percentile: parseFloat(entry.percentile),
                    rank: entry.rank ? parseInt(entry.rank) : null,
                    seatType: entry.seatType || null
                });
            }

            if (documents.length > 0) {
                const inserted = await saveCutoffDocuments(documents);
                cutoffsInserted += inserted;
            }
        }

        // Save updated institution branches if any were added
        if (branchesAdded > 0) {
            await institution.save();
        }

        res.status(200).json({
            success: true,
            institutionId: institution._id,
            institutionName: institution.name,
            branchesAdded,
            cutoffsInserted
        });

    } catch (error) {
        console.error('[ML Uploader] Import parsed college error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const clearAllCutoffsAndBranches = async (req, res) => {
    try {
        const cutoffsResult = await Cutoff.deleteMany({});
        const institutionsResult = await Institution.updateMany({}, { $set: { branches: [] } });

        res.json({
            success: true,
            message: "Successfully deleted all cutoff entries and branches from all colleges.",
            deletedCutoffsCount: cutoffsResult.deletedCount || 0,
            updatedCollegesCount: institutionsResult.modifiedCount || 0
        });
    } catch (error) {
        console.error("[Admin Clear] Failed to clear all dataset:", error);
        res.status(500).json({ success: false, message: error.message });
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
    estimateRank,
    getCutoffSummary,
    parsePdfCutoffs,
    importParsedCollege,
    clearAllCutoffsAndBranches
};
