const { Groq } = require('groq-sdk');
const Chat = require('../models/Chat');
const Knowledge = require('../models/Knowledge');
const Institution = require('../models/Institution');
const Cutoff = require('../models/Cutoff');

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

const CATEGORIES = ['OPEN', 'OBC', 'SC', 'ST', 'TFWS', 'VJ', 'NT', 'SBC', 'EWS', 'EBC', 'VJNT'];

// @desc    Get AI consultation with context and history
// @route   POST /api/ai/counsel
// @access  Private
const getAICounsel = async (req, res) => {
    const { message, chatId, history, userProfile: bodyProfile } = req.body;

    // Use fresh profile from req.user if available (usually populated by auth middleware)
    const userProfile = {
        displayName: req.user?.displayName,
        examType: req.user?.examType || bodyProfile?.examType || 'MHTCET',
        percentile: req.user?.percentile || bodyProfile?.percentile || 0,
        rank: req.user?.rank || bodyProfile?.rank || 0,
        location: req.user?.location || bodyProfile?.location,
        expectedRegion: req.user?.expectedRegion || bodyProfile?.expectedRegion,
        category: (req.user?.preferences?.category || 'OPEN').toUpperCase()
    };

    const apiKey = req.user?.groqApiKey || process.env.GROQ_API_KEY;
    const groqClient = new Groq({ apiKey });

    try {
        // 1. Intelligent Retrieval
        const lowerMsg = message.toLowerCase();
        const isPredictionQuery = /predict|chance|cutoff|can i get|get into|admission|percentile|rank|college|suggest/i.test(lowerMsg);

        // Extract and expand keywords
        let expandedKeywords = message.split(/[\s,/?!.]+/).filter(word => word.length >= 3);
        const branchKeywordsFound = [];

        // Dynamic Category Detection - prioritize all categories mentioned in chat
        let activeCategories = CATEGORIES.filter(cat => {
            const regex = new RegExp(`\\b${cat}\\b`, 'i');
            return regex.test(message);
        });
        if (activeCategories.length === 0) {
            activeCategories = [userProfile.category];
        }

        expandedKeywords.forEach(word => {
            const lowWord = word.toLowerCase();
            if (BRANCH_EXPANSION_MAP[lowWord]) {
                branchKeywordsFound.push(...BRANCH_EXPANSION_MAP[lowWord]);
            }
            // Check for partial matches in the map keys
            Object.keys(BRANCH_EXPANSION_MAP).forEach(key => {
                if (key.includes(lowWord) || lowWord.includes(key)) {
                    branchKeywordsFound.push(...BRANCH_EXPANSION_MAP[key]);
                }
            });
        });

        const finalKeywords = [...new Set([...expandedKeywords, ...branchKeywordsFound])];
        // Looser regex to catch partial branch names like "Instrumental" for "Instrumentation"
        const searchRegex = finalKeywords.length > 0 ? new RegExp(finalKeywords.join('|'), 'i') : null;

        let relevantKnowledge = [];
        let relevantColleges = [];
        let relevantCutoffs = [];

        if (searchRegex) {
            const isBranchSpecific = branchKeywordsFound.length > 0;
            const resultLimit = isBranchSpecific ? 35 : 15; // More thorough for branch specific questions

            // Step A: Broad Search for Knowledge & Colleges
            const [knowledge, colleges] = await Promise.all([
                Knowledge.find({
                    type: { $ne: 'frequent_question' },
                    $or: [{ question: searchRegex }, { content: searchRegex }]
                }).limit(2).lean(),
                Institution.find({
                    $or: [
                        { name: searchRegex },
                        { 'location.city': searchRegex },
                        { 'location.region': searchRegex }
                    ]
                }).limit(5).select('name location type dteCode branches').lean()
            ]);

            relevantKnowledge = knowledge;
            relevantColleges = colleges;

            // Step B: Targeted Search for Cutoffs
            const collegeIds = colleges.map(c => c._id);
            const cutoffTasks = [];

            // 1. If colleges were found, get their cutoffs
            if (collegeIds.length > 0) {
                cutoffTasks.push(Cutoff.find({
                    collegeId: { $in: collegeIds },
                    examType: userProfile.examType,
                    category: { $in: activeCategories }
                }).populate('collegeId', 'name location').sort({ percentile: -1 }).limit(30).lean());
            }

            // 2. Prediction results within user's range
            if (isPredictionQuery || isBranchSpecific) {
                const p = parseFloat(userProfile.percentile);
                cutoffTasks.push(Cutoff.find({
                    branch: searchRegex,
                    category: { $in: activeCategories },
                    examType: userProfile.examType,
                    percentile: { $lte: p + 3, $gte: p - 10 }
                }).populate('collegeId', 'name location').sort({ percentile: -1 }).limit(resultLimit).lean());
            } else {
                // Generic search
                cutoffTasks.push(Cutoff.find({
                    branch: searchRegex,
                    category: { $in: activeCategories },
                    examType: userProfile.examType
                }).populate('collegeId', 'name location').sort({ percentile: -1 }).limit(10).lean());
            }

            const cutoffResults = await Promise.all(cutoffTasks);

            // Flatten and deduplicate
            const allCutoffs = [].concat(...cutoffResults);
            const seen = new Set();
            relevantCutoffs = allCutoffs.filter(c => {
                const key = `${c.collegeId?._id}-${c.branch}-${c.percentile}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }

        // 3. Format context for AI
        const contextData = {
            user_profile: userProfile,
            found_colleges: relevantColleges.map(c => ({
                name: c.name,
                location: `${c.location?.city}, ${c.location?.region}`,
                type: c.type,
                dte_code: c.dteCode
            })),
            suggested_cutoffs: relevantCutoffs.map(c => ({
                institute: c.collegeId?.name || 'Unknown',
                branch: c.branch,
                category: c.category,
                cutoff_percentile: c.percentile,
                cutoff_rank: c.rank,
                location: c.collegeId?.location?.city
            }))
        };

        const systemPrompt = `You are the "Eta powered by AlloteMe - AI Education Counselor".
        Expert context: You assist students in Maharashtra for MHTCET, JEE, and NEET admissions.
        
        CRITICAL RULES:
        1. USE REAL DATA: Only provide college names, cutoffs, and ranks that exist in the "Context from our Database" provided below.
        2. NO HALLUCINATION: If the context is empty or doesn't match the user's question, do NOT invent numbers. Say "I don't have the exact cutoff data for that college in my database yet, but I can guide you based on general trends."
        3. TAILOR TO STUDENT: The student matches these profile details:
           - Percentile: ${userProfile.percentile}%ile
           - Rank: ${userProfile.rank}
           - Category: ${userProfile.category}
           - Preferred Region: ${userProfile.expectedRegion || userProfile.location || 'Any'}
        4. ANALYSIS: When suggesting colleges, compare their cutoff to the student's percentile.
           - Safe: Cutoff is 2%+ lower than student.
           - Fair: Cutoff is 0-2% lower.
           - Reach: Cutoff is slightly higher.
        
        FORMATTING:
        - Use **Bold** for emphasis.
        - Use ## Headings.
        - USE TABLES for any list of colleges/cutoffs: | Institute | Branch | Category | Cutoff | Chance |.
        
        Context from our Database: ${JSON.stringify(contextData)}
        Knowledge Base Info: ${JSON.stringify(relevantKnowledge.map(k => k.answer || k.content))}`;

        const previousMessages = history || [];
        const messages = [
            { role: 'system', content: systemPrompt },
            ...previousMessages,
            { role: 'user', content: message }
        ];

        const chatCompletion = await groqClient.chat.completions.create({
            messages,
            model: 'llama-3.3-70b-versatile',
            temperature: 0.6 // Slightly lower for more factual accuracy
        });

        const reply = chatCompletion.choices[0].message.content;
        res.json({ reply, contextUsed: !!(relevantColleges.length || relevantCutoffs.length) });
    } catch (error) {
        console.error('AI Counsel Error:', error);
        res.status(500).json({ message: 'Error from Eta Counselor' });
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

module.exports = {
    getAICounsel,
    saveChat,
    getMyChats,
    trainAI,
    getFrequentQuestions,
    setFrequentQuestion
};
