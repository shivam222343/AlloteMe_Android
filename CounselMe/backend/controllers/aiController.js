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
const getAICounsel = async (req, res) => {
    const { message, chatId, history, userProfile: bodyProfile } = req.body;

    // Build FULL user profile from DB user object — every field matters for counseling
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

    try {
        // 1. Intelligent Retrieval
        const lowerMsg = message.toLowerCase();
        const isPredictionQuery = /predict|chance|cutoff|can i get|get into|admission|percentile|rank|college|suggest/i.test(lowerMsg);

        // Extract and expand keywords
        let rawKeywords = message.split(/[\s,/?!.]+/).filter(word => 
            word.length >= 3 && 
            !BRANCH_STOP_WORDS.includes(word.toLowerCase())
        );
        const branchKeywordsFound = [];

        // Dynamic Category Detection - prioritize all categories mentioned in chat
        const categoryMap = {
            'general': 'OPEN',
            'backward': 'OBC',
            'handicapped': 'PH',
            'tribal': 'ST',
            'caste': '', // connector
            'category': ''
        };

        // Check for common aliases and clean the input
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
            // Check for expansion map keys using word boundaries
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
        
        // Match only whole words to prevent false positives (like CS matching Electronics)
        const escapedKeywords = finalKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const searchRegex = escapedKeywords.length > 0 
            ? new RegExp(escapedKeywords.map(k => `\\b${k}\\b`).join('|'), 'i') 
            : null;

        // ⚠️ CRITICAL FIX: Map user profile examType to DB stored examType values
        // Cutoff model stores: 'MHTCET PCM', 'MHTCET PCB', 'JEE', 'NEET', 'PHARMACY', 'BBA'
        // User profile may store: 'MHTCET', 'JEE', 'NEET', etc.
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

        console.log(`[AI] Query: "${message}"`);
        console.log(`[AI] User: percentile=${userProfile.percentile}, category=${activeCategories}, examType=${examTypesForQuery}`);
        console.log(`[AI] searchRegex keywords: ${finalKeywords.join(', ')}`);

        let relevantKnowledge = [];
        let relevantColleges = [];
        let relevantCutoffs = [];

        // Always run DB search for ANY counselor query
        if (isPredictionQuery || searchRegex) {
            const isBranchSpecific = branchKeywordsFound.length > 0;
            const p = parseFloat(userProfile.percentile);

            // Strategy 2 (Branch), 3 (Percentile), 4 (Fallback) are independent of college discovery
            const independentCutoffQueries = [];
            if (isBranchSpecific) {
                independentCutoffQueries.push(
                    Cutoff.find({
                        branch: searchRegex,
                        category: { $in: activeCategories }
                    }).populate('collegeId', 'name location').sort({ percentile: -1 }).limit(100).lean()
                );
            }
            if (!isNaN(p)) {
                independentCutoffQueries.push(
                    Cutoff.find({
                        category: { $in: activeCategories },
                        percentile: { $lte: p + 10, $gte: p - 30 }
                    }).populate('collegeId', 'name location').sort({ percentile: -1 }).limit(150).lean()
                );
            }
            independentCutoffQueries.push(
                Cutoff.find({
                    category: { $in: activeCategories }
                }).populate('collegeId', 'name location').sort({ percentile: -1 }).limit(40).lean()
            );

            // Step A: Find colleges and run independent cutoff searches in PARALLEL
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

            const [knowledge, colleges, independentResult, reviews] = await Promise.all([
                Knowledge.find(searchRegex ? {
                    type: { $ne: 'frequent_question' },
                    $or: [{ question: searchRegex }, { content: searchRegex }]
                } : { type: 'general' }).limit(3).lean(),
                collegeFilterConditions.length > 0
                    ? Institution.find({ $or: collegeFilterConditions }).limit(15).select('name location type dteCode branches').lean()
                    : Institution.find({}).limit(5).select('name location type dteCode branches').lean(),
                Promise.all(independentCutoffQueries),
                Review.find({ isPublished: true }).sort('-createdAt').limit(20).populate('institutionId', 'name').lean()
            ]);

            relevantKnowledge = knowledge;
            relevantColleges = colleges;
            relevantStudentReviews = reviews;

            const collegeIds = colleges.map(c => c._id);
            const allCutoffsAccumulated = [].concat(...independentResult);

            // Strategy 1: Specific to colleges found (MUST be sequential to getting collegeIds)
            if (collegeIds.length > 0) {
                const specificCutoffs = await Cutoff.find({
                    collegeId: { $in: collegeIds },
                    category: { $in: activeCategories }
                }).populate('collegeId', 'name location').sort({ percentile: -1 }).limit(100).lean();
                
                allCutoffsAccumulated.push(...specificCutoffs);
            }

            // Deduplicate cutoffs
            const seen = new Set();
            relevantCutoffs = allCutoffsAccumulated.filter(c => {
                const key = `${c.collegeId?._id || c.collegeId}-${c.branch}-${c.category}-${c.percentile}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }

        const relevantKnowledgeFallback = [];
        if (relevantKnowledge.length === 0) {
            // General FAQ check if no specific keywords hit
            const faqs = await Knowledge.find({ type: 'frequent_question', isActive: true }).limit(2).lean();
            relevantKnowledgeFallback.push(...faqs.map(f => f.answer));
        }

        // 3. Format context for AI
        const contextData = {
            user_profile: {
                ...userProfile,
                preferred_region: userProfile.expectedRegion || 'Any'
            },
            found_colleges: relevantColleges.map(c => ({
                name: c.name,
                location: `${c.location?.city || c.location}`,
                type: c.type,
                dte_code: c.dteCode
            })),
            suggested_cutoffs: relevantCutoffs.map(c => ({
                institute: c.collegeId?.name || 'Unknown',
                branch: c.branch,
                category: c.category,
                cutoff_percentile: c.percentile,
                cutoff_rank: c.rank,
                year: c.year,
                round: c.round,
                location: c.collegeId?.location?.city || c.collegeId?.city
            })),
            student_reviews: (relevantStudentReviews || []).map(r => ({
                college: r.institutionId?.name || 'College',
                student: r.userName || 'Student',
                rating: r.rating,
                comment: r.comment
            }))
        };

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

=== DATABASE CUTOFFS (${relevantCutoffs.length} records found) ===
${JSON.stringify(contextData.suggested_cutoffs)}

=== MATCHING COLLEGES IN DATABASE ===
${JSON.stringify(contextData.found_colleges)}

=== REAL STUDENT REVIEWS & FEEDBACK FROM FORMS ===
${JSON.stringify(contextData.student_reviews)}

=== KNOWLEDGE BASE ===
${JSON.stringify(relevantKnowledge.map(k => k.answer || k.content))}${relevantKnowledgeFallback.length > 0 ? '\n' + JSON.stringify(relevantKnowledgeFallback) : ''}`;
        const previousMessages = history || [];
        const messages = [
            { role: 'system', content: systemPrompt },
            ...previousMessages,
            { role: 'user', content: message }
        ];

        const chatCompletion = await groqClient.chat.completions.create({
            messages,
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3  // Low temperature = more factual and consistent
        });

        const reply = chatCompletion.choices[0].message.content;
        res.json({ reply, contextUsed: !!(relevantColleges.length || relevantCutoffs.length) });
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

module.exports = {
    getAICounsel,
    saveChat,
    getMyChats,
    trainAI,
    getFrequentQuestions,
    setFrequentQuestion,
    generateReview
};
