const { Groq } = require('groq-sdk');
const Institution = require('../models/Institution');
const Cutoff = require('../models/Cutoff');

const getAICounsel = async (req, res) => {
    const { message, context } = req.body;
    
    // Choose API key: User's personal key or System's .env key
    const apiKey = req.user?.groqApiKey || process.env.GROQ_API_KEY;
    const groqClient = new Groq({ apiKey });

    try {
        const institutions = await Institution.find({}).limit(10).select('name type location branches');

        const chatCompletion = await groqClient.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are an expert education counselor for MHTCET, JEE, and NEET students in India. 
                    Use the provided institution data to help students with their doubts about college selection, cutoffs, and admissions.
                    Be professional, encouraging, and accurate.
                    
                    Available Institutions Context: ${JSON.stringify(institutions)}`
                },
                {
                    role: 'user',
                    content: `My Info: ${JSON.stringify(context || {})}. Question: ${message}`
                }
            ],
            model: 'llama-3.3-70b-versatile'
        });

        res.json({ answer: chatCompletion.choices[0].message.content });
    } catch (error) {
        console.error('AI Counsel Error:', error);
        res.status(500).json({ message: 'Error from AI Counselor' });
    }
};

module.exports = { getAICounsel };
