const { Groq } = require('groq-sdk');
const Chat = require('../models/Chat');
const Knowledge = require('../models/Knowledge');
const Institution = require('../models/Institution');
const Cutoff = require('../models/Cutoff');
const Review = require('../models/Review');

const BRANCH_EXPANSION_MAP = {
    'cse': ['Computer Science', 'Computer Engineering', 'CSE', 'Software'],
    'it': ['Information Technology', 'IT', 'Computing'],
    'mechanical': ['Mechanical', 'Automobile', 'Production', 'Mechatronics', 'MECH'],
    'civil': ['Civil', 'Architecture', 'Construction'],
    'entc': ['Electronics', 'Telecommunication', 'ENTC', 'Electrical'],
    'ai': ['AI', 'Artificial Intelligence', 'Machine Learning', 'Data Science', 'ML'],
    'instrumentation': ['Instrumentation', 'Instrumental', 'Control', 'IC'],
    'chemical': ['Chemical', 'Polymer', 'CH'],
    'metallurgy': ['Metallurgy', 'Material', 'MT'],
    'production': ['Production', 'Manufacturing', 'PR'],
    'pharmacy': ['Pharmacy', 'Pharm', 'PH'],
    'textile': ['Textile', 'TX'],
};

const BRANCH_STOP_WORDS = ['and', 'of', 'in', 'the', 'for', 'with', 'technology', 'engineering', 'science', 'department', 'branch', 'course', 'degree', 'diploma', 'studies', 'management', 'applied', 'general', 'basic', 'advanced', 'program', 'programme', 'group', 'specialization', 'specialisation', 'stream', 'predicted', 'prediction', 'predictor', 'suggest', 'suggestion', 'colleges', 'college', 'list', 'show', 'tell', 'about', 'engg'];

const CATEGORIES = ['OPEN', 'OBC', 'SC', 'ST', 'TFWS', 'VJ', 'NT', 'SBC', 'EWS', 'EBC', 'VJNT', 'DEF', 'PWD', 'ORPHAN', 'PH'];

// @desc    Get AI consultation with context and history
// @route   POST /api/ai/counsel
// @access  Private
const crypto = require('crypto');
const DailyMetrics = require('../models/DailyMetrics');
const { client: redis } = require('../config/redis');

// Estimate tokens (1 token ≈ 4 characters)
const estimateTokens = (text) => {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
};

// Normalize query for semantic cache key consistency
const normalizeQuery = (query) => {
    let q = query.toLowerCase().trim();
    q = q.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, " ");
    
    const synonyms = {
        'top': 'best',
        'suggest': 'recommend',
        'recommendation': 'recommend',
        'percentile': 'pct',
        'percentage': 'pct',
        'cut-off': 'cutoff',
        'cut off': 'cutoff',
        'college': 'inst',
        'colleges': 'inst',
        'institution': 'inst',
        'institutions': 'inst',
        'branch': 'dept',
        'branches': 'dept',
        'open category': 'open',
        'obc category': 'obc'
    };
    
    let words = q.split(/\s+/).filter(Boolean);
    const stopWords = new Set(['a', 'an', 'the', 'at', 'for', 'in', 'of', 'to', 'is', 'on', 'with', 'please', 'can', 'i', 'get', 'show', 'tell', 'list', 'some', 'any', 'my', 'me']);
    
    words = words.map(w => synonyms[w] || w).filter(w => !stopWords.has(w));
    words.sort();
    
    const normalized = words.join(' ');
    const hash = crypto.createHash('md5').update(normalized).digest('hex');
    return { normalized, hash };
};

// Classify query intent using regex rules
const classifyQueryIntent = (query) => {
    const q = query.toLowerCase().trim();
    
    const generalChatRegex = /^(hello|hi|hey|greetings|good morning|good afternoon|good evening|thanks|thank you|bye|goodbye|welcome|who are you|what is your name)\b/i;
    const comparisonRegex = /\b(compare|comparison|vs|versus|diff|difference|better|cse vs|it vs)\b/i;
    const factualLookupRegex = /\b(cutoff|cut-off|cut off|fee|fees|seat|seats|intake|choice code|code|dte code|address|contact|website)\b/i;
    const collegeRecRegex = /\b(suggest|recommend|best|list|find|show|colleges for|colleges in|colleges near|percentile|rank|score)\b/i;
    const counselingRegex = /\b(choose|choice|chance|chances|option|options|admission|counsel|counseling|help|predict|prediction|guidance|career|scope)\b/i;

    if (generalChatRegex.test(q) && q.split(/\s+/).length <= 4) {
        return { intent: 'GENERAL_CHAT', confidence: 0.95 };
    }
    if (comparisonRegex.test(q)) {
        return { intent: 'COMPARISON', confidence: 0.9 };
    }
    if (factualLookupRegex.test(q)) {
        return { intent: 'FACTUAL_LOOKUP', confidence: 0.85 };
    }
    if (collegeRecRegex.test(q)) {
        return { intent: 'COLLEGE_RECOMMENDATION', confidence: 0.85 };
    }
    if (counselingRegex.test(q)) {
        return { intent: 'COUNSELING', confidence: 0.85 };
    }
    
    return { intent: 'COUNSELING', confidence: 0.5 };
};

// Compress context arrays to compact format
const compressContextForLLM = (contextData) => {
    const compressedCutoffs = (contextData.suggested_cutoffs || []).map(c => 
        `${c.institute} | ${c.branch} | ${c.category} | ${c.cutoff_percentile}% | ${c.cutoff_rank || 'N/A'} | ${c.year} | ${c.round} | ${c.location || 'N/A'}`
    );

    const compressedColleges = (contextData.found_colleges || []).map(c => 
        `${c.name} | ${c.location || 'N/A'} | ${c.type || 'N/A'} | ${c.dte_code || 'N/A'}`
    );

    const compressedReviews = (contextData.student_reviews || []).map(r => 
        `${r.college} | ${r.student} | Rating: ${r.rating}/5 | ${r.comment}`
    );

    const compressedKnowledge = (contextData.relevant_knowledge || []).map(k => 
        k.answer || k.content || String(k)
    );

    return {
        cutoffs: compressedCutoffs.join('\n'),
        colleges: compressedColleges.join('\n'),
        reviews: compressedReviews.join('\n'),
        knowledge: compressedKnowledge.join('\n')
    };
};

// Context budget manager with priority-based eviction
const budgetContext = (userQuery, studentProfile, { cutoffs, institutions, reviews, knowledge }, history, limits) => {
    const branchMatchCutoffs = [];
    const otherP1Cutoffs = [];
    const p2Cutoffs = [];

    const lowerQuery = userQuery.toLowerCase();
    const branchKeywords = [];
    Object.keys(BRANCH_EXPANSION_MAP).forEach(key => {
        const keyRegex = new RegExp(`\\b${key}\\b`, 'i');
        if (keyRegex.test(lowerQuery)) {
            branchKeywords.push(key.toLowerCase());
            branchKeywords.push(...BRANCH_EXPANSION_MAP[key].map(k => k.toLowerCase()));
        }
    });

    const studentCategory = (studentProfile.category || 'OPEN').toUpperCase();
    const studentPercentile = parseFloat(studentProfile.percentile);

    (cutoffs || []).forEach(c => {
        const cBranch = (c.branch || '').toLowerCase();
        const hasBranchMatch = branchKeywords.some(bk => cBranch.includes(bk));
        const hasCategoryMatch = c.category?.toUpperCase() === studentCategory;
        const hasPercentileMatch = parseFloat(c.percentile) === studentPercentile;

        if (hasBranchMatch) {
            branchMatchCutoffs.push(c); // Non-removable
        } else if (hasCategoryMatch || hasPercentileMatch) {
            otherP1Cutoffs.push(c); // Priority 1 (Removable)
        } else {
            p2Cutoffs.push(c); // Priority 2 (Removable)
        }
    });

    let activeP1Cutoffs = [...otherP1Cutoffs];
    let activeP2Cutoffs = [...p2Cutoffs];
    let activeInstitutions = [...(institutions || [])];
    let activeReviews = [...(reviews || [])];
    let activeKnowledge = [...(knowledge || [])];
    let activeHistory = [...(history || [])];

    const getEstimatedTokens = () => {
        const compData = compressContextForLLM({
            suggested_cutoffs: [
                ...branchMatchCutoffs,
                ...activeP1Cutoffs,
                ...activeP2Cutoffs
            ].map(c => ({
                institute: c.collegeId?.name || 'Unknown',
                branch: c.branch,
                category: c.category,
                cutoff_percentile: c.percentile,
                cutoff_rank: c.rank,
                year: c.year,
                round: c.round,
                location: c.collegeId?.location?.city || c.collegeId?.city
            })),
            found_colleges: activeInstitutions.map(c => ({
                name: c.name,
                location: `${c.location?.city || c.location}`,
                type: c.type,
                dte_code: c.dteCode
            })),
            student_reviews: activeReviews.map(r => ({
                college: r.institutionId?.name || 'College',
                student: r.userName || 'Student',
                rating: r.rating,
                comment: r.comment
            })),
            relevant_knowledge: activeKnowledge
        });

        const formattedHistory = activeHistory.map(h => `${h.role}: ${h.content}`).join('\n');
        const profileStr = JSON.stringify(studentProfile);
        const queryStr = userQuery;

        const totalText = [
            profileStr,
            queryStr,
            compData.cutoffs,
            compData.colleges,
            compData.reviews,
            compData.knowledge,
            formattedHistory
        ].join('\n');

        return estimateTokens(totalText);
    };

    let totalTokens = getEstimatedTokens();
    const originalCount = (cutoffs?.length || 0) + (institutions?.length || 0) + (reviews?.length || 0) + (knowledge?.length || 0) + (history?.length || 0);

    const { softLimit, hardLimit } = limits;

    // Eviction loops
    while (totalTokens > softLimit && activeHistory.length > 0) {
        activeHistory.shift(); // Remove oldest message first
        totalTokens = getEstimatedTokens();
    }
    while (totalTokens > softLimit && activeKnowledge.length > 0) {
        activeKnowledge.pop();
        totalTokens = getEstimatedTokens();
    }
    while (totalTokens > softLimit && activeReviews.length > 0) {
        activeReviews.pop();
        totalTokens = getEstimatedTokens();
    }
    while (totalTokens > softLimit && activeInstitutions.length > 0) {
        activeInstitutions.pop();
        totalTokens = getEstimatedTokens();
    }
    while (totalTokens > softLimit && activeP2Cutoffs.length > 0) {
        activeP2Cutoffs.pop();
        totalTokens = getEstimatedTokens();
    }
    while (totalTokens > softLimit && activeP1Cutoffs.length > 0) {
        activeP1Cutoffs.pop();
        totalTokens = getEstimatedTokens();
    }

    const finalCount = [
        ...branchMatchCutoffs,
        ...activeP1Cutoffs,
        ...activeP2Cutoffs
    ].length + activeInstitutions.length + activeReviews.length + activeKnowledge.length + activeHistory.length;

    const removedCount = originalCount - finalCount;
    console.log(`[Budget Manager] Tokens: ${totalTokens}. Records: Included=${finalCount}, Removed=${removedCount}`);

    return {
        cutoffs: [...branchMatchCutoffs, ...activeP1Cutoffs, ...activeP2Cutoffs],
        institutions: activeInstitutions,
        reviews: activeReviews,
        knowledge: activeKnowledge,
        history: activeHistory,
        estimatedTokens: totalTokens,
        includedCount: finalCount,
        removedCount: removedCount
    };
};

// Log Daily Metrics to database
const logDailyMetrics = async ({
    contextTokens,
    responseTokens,
    cacheHit,
    mongoQueryTimeMs,
    groqLatencyMs,
    estimatedTokenSpend
}) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        await DailyMetrics.findOneAndUpdate(
            { date: today },
            {
                $inc: {
                    requestCount: 1,
                    totalContextTokens: contextTokens || 0,
                    totalResponseTokens: responseTokens || 0,
                    cacheHits: cacheHit ? 1 : 0,
                    cacheMisses: cacheHit ? 0 : 1,
                    totalMongoQueryTimeMs: mongoQueryTimeMs || 0,
                    totalGroqLatencyMs: groqLatencyMs || 0,
                    totalEstimatedTokenSpend: estimatedTokenSpend || 0
                }
            },
            { upsert: true, new: true }
        );
    } catch (err) {
        console.error('[AI][Metrics] Error logging daily metrics:', err);
    }
};

// Extract strict filters (round, year) from the natural query message
const extractStrictFilters = (message) => {
    const q = message.toLowerCase();
    const filters = {};

    // 1. Round Extraction (round 1, round-2, r3, etc.)
    const roundMatch = q.match(/\b(round|rd|rnd|r)\s*([1-3])\b/i);
    if (roundMatch) {
        filters.round = parseInt(roundMatch[2]);
    }

    // 2. Year Extraction (2020-2026)
    const yearMatch = q.match(/\b(202[0-6])\b/);
    if (yearMatch) {
        filters.year = parseInt(yearMatch[1]);
    }

    return filters;
};

// Calculate ranking score for cutoff record and institution
const calculateScoring = (cutoff, college) => {
    let collegeTierWeight = 5; // Default private tier
    let placementWeight = 5; // Default placement
    let cutoffWeight = cutoff.percentile ? parseFloat(cutoff.percentile) / 10 : 5;
    let accreditationWeight = 2; // Default

    if (college) {
        // College Tier based on Type
        if (college.type === 'Government' || college.type === 'Government Autonomous') {
            collegeTierWeight = 10;
        } else if (college.type === 'Autonomous' || college.type === 'Private-Autonomous') {
            collegeTierWeight = 8;
        } else {
            collegeTierWeight = 5;
        }

        // Placements Score
        if (college.placements && college.placements.length > 0) {
            const latestPlacement = college.placements[0];
            if (latestPlacement.placementPercentage) {
                placementWeight = (latestPlacement.placementPercentage / 10);
            }
            if (latestPlacement.averagePackage) {
                const avgPkgNum = parseFloat(latestPlacement.averagePackage);
                if (!isNaN(avgPkgNum)) {
                    placementWeight += avgPkgNum; // Add average package in LPA
                }
            }
        }

        // Accreditation Score
        if (college.accreditation) {
            const acc = college.accreditation.toUpperCase();
            if (acc.includes('A++')) accreditationWeight = 10;
            else if (acc.includes('A+')) accreditationWeight = 9;
            else if (acc.includes('A')) accreditationWeight = 8;
            else if (acc.includes('B++')) accreditationWeight = 7;
            else if (acc.includes('B+')) accreditationWeight = 6;
            else if (acc.includes('B')) accreditationWeight = 5;
        }
    }

    return collegeTierWeight + placementWeight + cutoffWeight + accreditationWeight;
};

const getAICounsel = async (req, res) => {
    const { message, chatId, history, userProfile: bodyProfile } = req.body;

    const userProfile = {
        displayName: req.user?.displayName || bodyProfile?.displayName || 'Student',
        email: req.user?.email || bodyProfile?.email,
        examType: req.user?.examType || bodyProfile?.examType || 'MHTCET',
        percentile: req.user?.percentile || bodyProfile?.percentile || 0,
        rank: req.user?.rank || bodyProfile?.rank || 0,
        location: req.user?.location || bodyProfile?.location || '',
        city: req.user?.city || req.user?.location || '',
        expectedRegion: req.user?.expectedRegion || bodyProfile?.expectedRegion || 'Any',
        category: (req.user?.preferences?.category || bodyProfile?.category || 'OPEN').toUpperCase(),
        gender: req.user?.gender || bodyProfile?.gender || '',
        board: req.user?.board || bodyProfile?.board || '',
        stream: req.user?.stream || bodyProfile?.stream || '',
        preferences: req.user?.preferences || {},
        savedColleges: (req.user?.savedColleges || []).length,
    };

    const apiKey = req.user?.groqApiKey || process.env.GROQ_API_KEY;
    if (!apiKey) {
        console.error('GROQ_API_KEY is not defined in environment or user profile');
        return res.status(400).json({ message: 'No Groq API Key found. Please add your personal key in profile to continue.' });
    }
    const groqClient = new Groq({ apiKey });

    // 8. Cost Protection: Request count check
    const today = new Date().toISOString().split('T')[0];
    const dailyLimit = parseInt(process.env.DAILY_AI_LIMIT) || 100;
    const rateLimitKey = `user:${req.user?._id || 'anonymous'}:requests:${today}`;

    if (redis && redis.isOpen) {
        try {
            const currentRequests = await redis.incr(rateLimitKey);
            if (currentRequests === 1) {
                await redis.expire(rateLimitKey, 86400); // 24 hours TTL
            }
            if (currentRequests > dailyLimit) {
                return res.status(429).json({ 
                    message: `You have reached your daily limit of ${dailyLimit} AI counseling requests. Please try again tomorrow.` 
                });
            }
        } catch (redisErr) {
            console.error('[AI][Redis] Rate limit evaluation failed:', redisErr);
        }
    }

    try {
        const lowerMsg = message.toLowerCase();
        
        // 2. Query Intent Classification
        const { intent, confidence } = classifyQueryIntent(message);
        console.log(`[AI] Intent: ${intent} (Confidence: ${confidence})`);

        // 4. Redis Semantic Cache Lookups
        const { normalized, hash } = normalizeQuery(message);
        const semanticCacheKey = `eta:v2:${intent}:${hash}`;

        if (intent !== 'GENERAL_CHAT' && redis && redis.isOpen) {
            try {
                const cachedResponse = await redis.get(semanticCacheKey);
                if (cachedResponse) {
                    const parsed = JSON.parse(cachedResponse);
                    console.log(`[AI][Cache Hit] Key: ${semanticCacheKey}`);

                    await logDailyMetrics({
                        contextTokens: 0,
                        responseTokens: estimateTokens(parsed.reply),
                        cacheHit: true,
                        mongoQueryTimeMs: 0,
                        groqLatencyMs: 0,
                        estimatedTokenSpend: estimateTokens(parsed.reply)
                    });

                    return res.json({ 
                        reply: parsed.reply, 
                        contextUsed: parsed.contextUsed,
                        metadata: { intent, confidence, source: 'cache' }
                    });
                }
            } catch (redisErr) {
                console.error('[AI][Redis] Semantic cache read failed:', redisErr);
            }
        }

        console.log('[AI][Cache Miss] Fetching data and calling Groq.');

        // Hybrid query setup based on intent
        let softLimit = 4000;
        let hardLimit = 6000;

        if (intent === 'FACTUAL_LOOKUP') {
            softLimit = 1200;
            hardLimit = 1500;
        } else if (intent === 'COLLEGE_RECOMMENDATION') {
            softLimit = 3000;
            hardLimit = 3500;
        } else if (intent === 'COMPARISON') {
            softLimit = 2500;
            hardLimit = 3000;
        } else if (intent === 'COUNSELING') {
            softLimit = 3500;
            hardLimit = 4000;
        }

        const isPredictionQuery = /predict|chance|cutoff|can i get|get into|admission|percentile|rank|college|suggest/i.test(lowerMsg);

        // Extract and expand keywords
        let rawKeywords = message.split(/[\s,/?!.]+/).filter(word => 
            word.length >= 3 && 
            !BRANCH_STOP_WORDS.includes(word.toLowerCase())
        );
        const branchKeywordsFound = [];

        const categoryMap = {
            'general': 'OPEN',
            'backward': 'OBC',
            'handicapped': 'PH',
            'tribal': 'ST',
            'caste': '',
            'category': ''
        };

        let processedMsg = lowerMsg;
        Object.keys(categoryMap).forEach(key => {
            if (categoryMap[key]) {
                processedMsg = processedMsg.replace(new RegExp(`\\b${key}\\b`, 'g'), categoryMap[key]);
            }
        });

        let activeCategories = CATEGORIES.filter(cat => {
            const regex = new RegExp(`\\b${cat}\\b`, 'i');
            return regex.test(processedMsg);
        });

        if (activeCategories.length === 0) {
            activeCategories = [userProfile.category];
        }

        rawKeywords.forEach(word => {
            const lowWord = word.toLowerCase();
            Object.keys(BRANCH_EXPANSION_MAP).forEach(key => {
                const keyRegex = new RegExp(`\\b${key}\\b`, 'i');
                if (keyRegex.test(lowWord)) {
                    branchKeywordsFound.push(...BRANCH_EXPANSION_MAP[key]);
                }
            });
        });

        const finalKeywords = [...new Set([...rawKeywords, ...branchKeywordsFound])].filter(k => 
            !BRANCH_STOP_WORDS.includes(k.toLowerCase())
        );
        
        const escapedKeywords = finalKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const searchRegex = escapedKeywords.length > 0 
            ? new RegExp(escapedKeywords.map(k => `\\b${k}\\b`).join('|'), 'i') 
            : null;

        const EXAM_TYPE_MAP = {
            'MHTCET': ['MHTCET PCM', 'MHTCET PCB'],
            'MHTCET PCM': ['MHTCET PCM'],
            'MHTCET PCB': ['MHTCET PCB'],
            'JEE': ['JEE'],
            'NEET': ['NEET'],
            'PHARMACY': ['PHARMACY'],
            'BBA': ['BBA']
        };
        const examTypesForQuery = EXAM_TYPE_MAP[userProfile.examType] || ['MHTCET PCM', 'MHTCET PCB'];

        let relevantKnowledge = [];
        let relevantColleges = [];
        let relevantCutoffs = [];
        let relevantStudentReviews = [];

        const dbStartTime = Date.now();

        // 3. Hybrid Routing: Fetch only relevant documents
        if (intent !== 'GENERAL_CHAT' && (isPredictionQuery || searchRegex)) {
            const isBranchSpecific = branchKeywordsFound.length > 0;
            const p = parseFloat(userProfile.percentile);

            // A. Specialized cache check for recommendations (Task 5)
            const strictFilters = extractStrictFilters(message);
            const sortedBranches = [...new Set(branchKeywordsFound)].sort().join('_') || 'ALL';
            const roundedP = Math.round(p) || 0;
            const roundFilterPart = strictFilters.round !== undefined ? `:r${strictFilters.round}` : '';
            const yearFilterPart = strictFilters.year !== undefined ? `:y${strictFilters.year}` : '';
            const recCacheKey = `recommendation:${roundedP}:${activeCategories.sort().join('_')}:${sortedBranches}${roundFilterPart}${yearFilterPart}`;
            let cachedCutoffs = null;

            if (redis && redis.isOpen && (intent === 'COLLEGE_RECOMMENDATION' || intent === 'COUNSELING')) {
                try {
                    const cached = await redis.get(recCacheKey);
                    if (cached) {
                        cachedCutoffs = JSON.parse(cached);
                        console.log(`[AI][Rec Cache Hit] Key: ${recCacheKey}`);
                    }
                } catch (redisErr) {
                    console.error('[AI][Redis] Recommendation cache get error:', redisErr);
                }
            }

            // Assemble and execute Parallel DB fetches
            const dbQueries = [];
            
            // 1. Institution Metadata Query
            const collegeFilterConditions = [];
            if (searchRegex) {
                collegeFilterConditions.push({ name: searchRegex });
                collegeFilterConditions.push({ branches: searchRegex });
                collegeFilterConditions.push({ dteCode: searchRegex });
                collegeFilterConditions.push({ 'location.city': searchRegex });
                collegeFilterConditions.push({ 'location.region': searchRegex });
            }
            if (userProfile.location) {
                collegeFilterConditions.push({ 'location.city': new RegExp(userProfile.location, 'i') });
            }

            dbQueries.push(
                collegeFilterConditions.length > 0
                    ? Institution.find({ $or: collegeFilterConditions }).limit(15).select('name location type dteCode branches').lean()
                    : Institution.find({}).limit(5).select('name location type dteCode branches').lean()
            );

            // 2. Knowledge Query (COUNSELING only)
            if (intent === 'COUNSELING') {
                dbQueries.push(
                    Knowledge.find(searchRegex ? {
                        type: { $ne: 'frequent_question' },
                        $or: [{ question: searchRegex }, { content: searchRegex }]
                    } : { type: 'general' }).limit(3).lean()
                );
            } else {
                dbQueries.push(Promise.resolve([]));
            }

            // 3. Reviews Query (COUNSELING only)
            if (intent === 'COUNSELING') {
                dbQueries.push(
                    Review.find({ isPublished: true }).sort('-createdAt').limit(20).populate('institutionId', 'name').lean()
                );
            } else {
                dbQueries.push(Promise.resolve([]));
            }

            const [colleges, knowledge, reviews] = await Promise.all(dbQueries);
            relevantColleges = colleges;
            relevantKnowledge = knowledge;
            relevantStudentReviews = reviews;

            const collegeIds = colleges.map(c => c._id);

            // Fetch cutoffs (if not cached)
            if (cachedCutoffs) {
                relevantCutoffs = cachedCutoffs;
            } else {
                const independentCutoffQueries = [];
                const cutoffQueryBase = {};
                if (strictFilters.round !== undefined) cutoffQueryBase.round = strictFilters.round;
                if (strictFilters.year !== undefined) cutoffQueryBase.year = strictFilters.year;
                
                if (isBranchSpecific) {
                    independentCutoffQueries.push(
                        Cutoff.find({
                            branch: searchRegex,
                            category: { $in: activeCategories },
                            ...cutoffQueryBase
                        }).populate('collegeId', 'name location type placements accreditation dteCode').sort({ percentile: -1 }).limit(100).lean()
                    );
                }
                
                if (intent === 'COUNSELING' || intent === 'COLLEGE_RECOMMENDATION') {
                    if (!isNaN(p)) {
                        independentCutoffQueries.push(
                            Cutoff.find({
                                category: { $in: activeCategories },
                                percentile: { $lte: p + 10, $gte: p - 30 },
                                ...cutoffQueryBase
                            }).populate('collegeId', 'name location type placements accreditation dteCode').sort({ percentile: -1 }).limit(150).lean()
                        );
                    }
                    independentCutoffQueries.push(
                        Cutoff.find({
                            category: { $in: activeCategories },
                            ...cutoffQueryBase
                        }).populate('collegeId', 'name location type placements accreditation dteCode').sort({ percentile: -1 }).limit(40).lean()
                    );
                }

                const cutoffResults = await Promise.all(independentCutoffQueries);
                let accumulatedCutoffs = [].concat(...cutoffResults);

                if (collegeIds.length > 0 && (intent === 'COUNSELING' || intent === 'COLLEGE_RECOMMENDATION' || intent === 'FACTUAL_LOOKUP')) {
                    const specificCutoffs = await Cutoff.find({
                        collegeId: { $in: collegeIds },
                        category: { $in: activeCategories },
                        ...cutoffQueryBase
                    }).populate('collegeId', 'name location type placements accreditation dteCode').sort({ percentile: -1 }).limit(100).lean();
                    accumulatedCutoffs.push(...specificCutoffs);
                }

                // Strict recommendation-level deduplication & Discarding "Unknown" colleges
                const seen = new Set();
                const filteredCutoffs = accumulatedCutoffs
                    .filter(c => c.collegeId)
                    .map(c => {
                        const collegeIdStr = (c.collegeId?._id || c.collegeId).toString();
                        const collegeName = c.collegeId?.name || 'Unknown';
                        return { ...c, collegeIdStr, collegeName };
                    })
                    .filter(c => {
                        if (!c.collegeName || c.collegeName === 'Unknown' || c.collegeName.toLowerCase() === 'unknown') {
                            return false;
                        }
                        const key = `${c.collegeIdStr}-${c.branch}-${c.category}-${c.round}-${c.year}`;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });

                // Calculate ranking score & sort
                const scoredCutoffs = filteredCutoffs.map(c => {
                    const score = calculateScoring(c, c.collegeId);
                    return { ...c, rankingScore: score };
                });

                // Sort by rankingScore descending
                scoredCutoffs.sort((a, b) => b.rankingScore - a.rankingScore);

                // Slice to Top 30 Results to reduce noise
                relevantCutoffs = scoredCutoffs.slice(0, 30);

                // Write recommendation cache
                if (redis && redis.isOpen && (intent === 'COLLEGE_RECOMMENDATION' || intent === 'COUNSELING') && relevantCutoffs.length > 0) {
                    try {
                        await redis.set(recCacheKey, JSON.stringify(relevantCutoffs), {
                            EX: 43200
                        });
                        console.log(`[AI][Rec Cache Set] Key: ${recCacheKey}`);
                    } catch (redisErr) {
                        console.error('[AI][Redis] Recommendation cache set failed:', redisErr);
                    }
                }
            }
        }

        const mongoQueryTimeMs = Date.now() - dbStartTime;

        const relevantKnowledgeFallback = [];
        if (intent === 'COUNSELING' && relevantKnowledge.length === 0) {
            const faqs = await Knowledge.find({ type: 'frequent_question', isActive: true }).limit(2).lean();
            relevantKnowledgeFallback.push(...faqs.map(f => f.answer));
        }

        // 6. Budget context sizes
        const budget = budgetContext(
            message,
            userProfile,
            {
                cutoffs: relevantCutoffs,
                institutions: relevantColleges,
                reviews: relevantStudentReviews,
                knowledge: relevantKnowledgeFallback.length > 0 ? [...relevantKnowledge, ...relevantKnowledgeFallback] : relevantKnowledge
            },
            history || [],
            { softLimit, hardLimit }
        );

        // 8. Cost protection logic - Oversized prompt rejection
        if (budget.estimatedTokens > 6000) {
            return res.status(400).json({
                message: "Context exceeds allowed limits. Please try using a shorter message or clear chat history."
            });
        }

        // Compress context records for token reduction
        const compressed = compressContextForLLM({
            suggested_cutoffs: budget.cutoffs.map(c => ({
                institute: c.collegeId?.name || 'Unknown',
                branch: c.branch,
                category: c.category,
                cutoff_percentile: c.percentile,
                cutoff_rank: c.rank,
                year: c.year,
                round: c.round,
                location: c.collegeId?.location?.city || c.collegeId?.city
            })),
            found_colleges: budget.institutions.map(c => ({
                name: c.name,
                location: `${c.location?.city || c.location}`,
                type: c.type,
                dte_code: c.dteCode
            })),
            student_reviews: budget.reviews.map(r => ({
                college: r.institutionId?.name || 'College',
                student: r.userName || 'Student',
                rating: r.rating,
                comment: r.comment
            })),
            relevant_knowledge: budget.knowledge
        });

        const systemPrompt = `You are "Eta" — the official AI Admission Counselor for AlloteMe.

You are speaking with this specific student. Use their complete profile for EVERY response:

=== STUDENT PROFILE ===
- Name: ${userProfile.displayName}
- Percentile: ${userProfile.percentile}%
- Rank: ${userProfile.rank || 'Not set'}
- Category: ${userProfile.category}
- Exam: ${userProfile.examType}
- Location / City: ${userProfile.city || userProfile.location || 'Not set'}
- Preferred Region: ${userProfile.expectedRegion}
- Gender: ${userProfile.gender || 'Not specified'}
- Board: ${userProfile.board || 'Not specified'}
- Stream: ${userProfile.stream || 'Not specified'}
======================

STRICT RULES:
1. ALWAYS use the student's percentile and category to evaluate each cutoff from the database.
2. ONLY show colleges/cutoffs that exist in the "Database Cutoffs" section below. NO made-up data.
3. If database cutoffs exist: present them in a table: | Institute | Branch | Category | Cutoff % | Exam Type | Year | Round | Your Chance |
4. Label chance based on their percentile (${userProfile.percentile}%):
   - Cutoff < percentile-2 → ✅ HIGH CHANCE
   - Cutoff within ±2 → 🎯 MODERATE
   - Cutoff > percentile+2 → 🔥 REACH/AMBITIOUS
5. If NO data in the database: honestly say "I don't have cutoff data for that query right now" — do NOT invent examples.
6. Always address the student by name (${userProfile.displayName}) and make responses personal.
7. Consider their location (${userProfile.city || userProfile.location}) when recommending colleges.

=== DATABASE CUTOFFS (Format: Institute | Branch | Category | Cutoff % | Rank | Year | Round | Location) ===
${compressed.cutoffs || 'No cutoffs found'}

=== MATCHING COLLEGES IN DATABASE (Format: Name | Location | Type | DTE Code) ===
${compressed.colleges || 'No matching colleges found'}

=== REAL STUDENT REVIEWS (Format: College | Student | Rating | Comment) ===
${compressed.reviews || 'No reviews found'}

=== KNOWLEDGE BASE ===
${compressed.knowledge || 'No knowledge base records'}`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...budget.history,
            { role: 'user', content: message }
        ];

        const groqStartTime = Date.now();
        const chatCompletion = await groqClient.chat.completions.create({
            messages,
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3
        });
        const groqLatencyMs = Date.now() - groqStartTime;

        const reply = chatCompletion.choices[0].message.content;
        const responseTokens = estimateTokens(reply);

        // Store result in Semantic Cache
        if (intent !== 'GENERAL_CHAT' && redis && redis.isOpen) {
            const cachePayload = {
                reply,
                contextUsed: !!(budget.institutions.length || budget.cutoffs.length),
                sourceCounts: {
                    cutoffs: budget.cutoffs.length,
                    colleges: budget.institutions.length,
                    reviews: budget.reviews.length
                }
            };
            try {
                let cacheTTL = 43200; // 12 hours default
                if (intent === 'FACTUAL_LOOKUP') cacheTTL = 86400; // 24h
                else if (intent === 'COLLEGE_RECOMMENDATION') cacheTTL = 21600; // 6h

                await redis.set(semanticCacheKey, JSON.stringify(cachePayload), {
                    EX: cacheTTL
                });
                console.log(`[AI][Cache Set] Key: ${semanticCacheKey} (TTL: ${cacheTTL}s)`);
            } catch (redisErr) {
                console.error('[AI][Redis] Semantic cache write error:', redisErr);
            }
        }

        // Daily metric logging
        await logDailyMetrics({
            contextTokens: budget.estimatedTokens,
            responseTokens,
            cacheHit: false,
            mongoQueryTimeMs,
            groqLatencyMs,
            estimatedTokenSpend: budget.estimatedTokens + responseTokens
        });

        res.json({ 
            reply, 
            contextUsed: !!(budget.institutions.length || budget.cutoffs.length),
            metadata: { intent, confidence, source: 'groq' }
        });
    } catch (error) {
        console.error('AI Counsel Error:', error.message);
        const isApiKeyError = error.message?.toLowerCase().includes('api key') || error.status === 401;
        res.status(isApiKeyError ? 401 : 500).json({
            message: isApiKeyError ? 'Invalid or missing API Key. Please update it in your profile.' : 'Error from Eta Counselor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


// @desc    Save or update a chat session
// @route   POST /api/ai/chats
// @access  Private
const saveChat = async (req, res) => {
    const { chatId, messages, title } = req.body;
    try {
        let chat;
        if (chatId) {
            chat = await Chat.findById(chatId);
            if (chat) {
                chat.messages = messages;
                chat.isSaved = true;
                await chat.save();
            }
        } else {
            chat = await Chat.create({
                userId: req.user._id,
                messages,
                title: title || messages[0]?.content?.substring(0, 30) || 'New Chat',
                isSaved: true
            });
        }
        res.status(201).json(chat);
    } catch (error) {
        res.status(400).json({ message: 'Failed to save chat' });
    }
};

// @desc    Get user's chat history
// @route   GET /api/ai/chats
// @access  Private
const getMyChats = async (req, res) => {
    const chats = await Chat.find({ userId: req.user._id, isSaved: true }).sort('-updatedAt');
    res.json(chats);
};

// @desc    Admin: Train AI by adding knowledge text
// @route   POST /api/ai/train
// @access  Private/Admin
const trainAI = async (req, res) => {
    const { text, type, category } = req.body;
    if (!text) return res.status(400).json({ message: 'No text provided' });

    try {
        // Split by paragraph or specific delimiter for knowledge chunks
        const chunks = text.split('\n\n').filter(t => t.trim().length > 10);

        const knowledgeItems = chunks.map(chunk => ({
            type: type || 'info',
            content: chunk.trim(),
            category: category || 'General'
        }));

        await Knowledge.insertMany(knowledgeItems);
        res.json({ message: `Successfully added ${knowledgeItems.length} knowledge segments.` });
    } catch (error) {
        res.status(500).json({ message: 'Training failed' });
    }
};

// @desc    Get Frequent Questions
// @route   GET /api/ai/frequent-questions
// @access  Public
const getFrequentQuestions = async (req, res) => {
    const questions = await Knowledge.find({ type: 'frequent_question', isActive: true }).limit(10);
    res.json(questions);
};

// @desc    Admin: Set Frequent Question
// @route   POST /api/ai/frequent-questions
// @access  Private/Admin
const setFrequentQuestion = async (req, res) => {
    const { question, answer } = req.body;
    const newQ = await Knowledge.create({
        type: 'frequent_question',
        question,
        answer,
        category: 'Frequent'
    });
    res.status(201).json(newQ);
};

// @desc    Generate a cool review based on stars
// @route   POST /api/ai/generate-review
// @access  Private
const generateReview = async (req, res) => {
    const { rating } = req.body;
    const apiKey = req.user?.groqApiKey || process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(400).json({ message: 'No AI key found' });
    }

    try {
        const groqClient = new Groq({ apiKey });
        const systemPrompt = `You are an AI that generates short, cool, and catchy student reviews for an admission counseling app called "AlloteMe".
        The user has selected a ${rating} star rating.
        Generate a one-sentence review that is appropriate for this rating.
        Use cool lingo (e.g., "spot on", "game changer", "lit", "smooth") and include 1-2 relevant emojis.
        Keep it under 15 words. DO NOT use quotes or prefixes like "Review:". Just the text.`;

        const chatCompletion = await groqClient.chat.completions.create({
            messages: [{ role: 'system', content: systemPrompt }],
            model: 'llama-3.1-8b-instant',
            temperature: 0.9,
            max_tokens: 50
        });

        const reply = chatCompletion.choices[0].message.content.trim();
        res.json({ reply });
    } catch (error) {
        console.error('Review Gen Error:', error);
        res.status(500).json({ message: 'AI generation failed' });
    }
};

// @desc    Get Daily Metrics for admin dashboard
// @route   GET /api/ai/metrics
// @access  Private/Admin
const getDailyMetrics = async (req, res) => {
    try {
        const isAdmin = req.user?.role === 'admin';
        if (!isAdmin) {
            return res.status(403).json({ message: 'Not authorized as admin' });
        }

        const metrics = await DailyMetrics.find({}).sort('-date').limit(30);
        res.json(metrics);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch metrics', error: error.message });
    }
};

module.exports = {
    getAICounsel,
    saveChat,
    getMyChats,
    trainAI,
    getFrequentQuestions,
    setFrequentQuestion,
    generateReview,
    getDailyMetrics
};
