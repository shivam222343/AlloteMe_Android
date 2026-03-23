const { Groq } = require('groq-sdk');
const Chat = require('../models/Chat');
const Knowledge = require('../models/Knowledge');
const Institution = require('../models/Institution');
const Cutoff = require('../models/Cutoff');

// @desc    Get AI consultation with context and history
// @route   POST /api/ai/counsel
// @access  Private
const getAICounsel = async (req, res) => {
    const { message, chatId, history, userProfile } = req.body;

    // Choose API key: User's personal key or System's .env key
    const apiKey = req.user?.groqApiKey || process.env.GROQ_API_KEY;
    const groqClient = new Groq({ apiKey });

    try {
        // 1. Retrieval (RAG)
        // Fuzzy search in Knowledge Base
        const keywords = message.split(' ').filter(word => word.length > 3);
        const searchRegex = new RegExp(keywords.join('|'), 'i');

        const [relevantKnowledge, relevantColleges, relevantCutoffs] = await Promise.all([
            Knowledge.find({ type: { $ne: 'frequent_question' }, $or: [{ question: searchRegex }, { content: searchRegex }] }).limit(3),
            Institution.find({ $or: [{ name: searchRegex }, { 'location.city': searchRegex }] }).limit(3).select('name location type branches'),
            Cutoff.find({ $or: [{ branch: searchRegex }] }).limit(5).populate('collegeId', 'name')
        ]);

        const contextData = {
            profile: userProfile,
            knowledge: relevantKnowledge.map(k => k.answer || k.content),
            colleges: relevantColleges,
            cutoffs: relevantCutoffs.map(c => `${c.collegeId?.name} ${c.branch} ${c.category}: ${c.percentile}%ile`)
        };

        // 2. Chat history formation
        const previousMessages = history || [];

        const systemPrompt = `You are the "Eta powered by AlloteMe - AI Education Counselor", an expert in Indian engineering and medical admissions.
        Your goal is to help students (MHTCET, JEE, NEET) find their dream college.
        ALWAYS use the provided database context if relevant.
        Focus on accuracy regarding cutoffs, locations, and branch specialties.
        Tone: Professional, empathetic, helpful.
        
        FORMATTING RULE: Use Rich Markdown. 
        - Use **bold** for key terms and college names.
        - Use ### headings for sections.
        - MANDATORY RULE: If providing cutoffs, ranks, or comparisons, you MUST use a Markdown TABLE with columns: | Institute | Branch | Category | Cutoff (%ile/Rank) |.
        - Use bullet points for general advice.
        
        Current User Profile: ${JSON.stringify(userProfile || {})}
        Context from our Database: ${JSON.stringify(contextData)}`;

        // Compose full history
        const messages = [
            { role: 'system', content: systemPrompt },
            ...previousMessages,
            { role: 'user', content: message }
        ];

        const chatCompletion = await groqClient.chat.completions.create({
            messages,
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7
        });

        const reply = chatCompletion.choices[0].message.content;

        // If no chatId, this was a "New Chat" request, or user is just testing
        res.json({ reply, contextUsed: !!relevantKnowledge.length });
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
