const Institution = require('../models/Institution');
const { Groq } = require('groq-sdk');

// @desc    Create new institution
// @route   POST /api/institutions
// @access  Private/Admin
const createInstitution = async (req, res) => {
    try {
        const institution = new Institution(req.body);
        const createdInstitution = await institution.save();
        res.status(201).json(createdInstitution);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    AI Assisted Institution Parsing
// @route   POST /api/institutions/parse
// @access  Private/Admin
const parseInstitutionText = async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'No text provided' });

    // Choose API key: User's personal key or System's .env key
    const apiKey = req.user?.groqApiKey || process.env.GROQ_API_KEY;
    const groq = new Groq({ apiKey });

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are a data extraction assistant. Extract institution details from the provided text and return a JSON object matching EXACTLY this schema (use null for missing values, never omit keys):
{
  "name": string,
  "university": string,
  "type": "Government" | "Government Autonomous" | "Autonomous" | "Private-Autonomous" | "Private" | "Deemed",
  "feesPerYear": number,
  "website": string,
  "mapUrl": string,
  "description": string,
  "established": number,
  "totalStudents": number,
  "campusArea": string,
  "accreditation": string,
  "location": { "region": string, "address": string, "city": string },
  "rating": { "value": number, "platform": string },
  "facilities": ["WiFi","Canteen","Library","Labs","Sports","Hostel","Parking","Garden","Medical","ATM","Gym","Auditorium"],
  "hostel": {
    "available": boolean,
    "boys": { "available": boolean, "fees": number, "capacity": number },
    "girls": { "available": boolean, "fees": number, "capacity": number },
    "notes": string
  },
  "branches": [{ "name": string, "code": string }]
}
Only include facilities from the provided list. Extract as much as possible from the text.`
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
        res.status(500).json({ message: 'Error parsing institution text' });
    }
};

// @desc    Get all institutions
// @route   GET /api/institutions
// @access  Public
const getInstitutions = async (req, res) => {
    const institutions = await Institution.find({});
    res.json(institutions);
};

// @desc    Get institution by ID
// @route   GET /api/institutions/:id
// @access  Public
const getInstitutionById = async (req, res) => {
    const institution = await Institution.findById(req.params.id);

    if (institution) {
        res.json(institution);
    } else {
        res.status(404).json({ message: 'Institution not found' });
    }
};

// @desc    Update institution
// @route   PUT /api/institutions/:id
// @access  Private/Admin
const updateInstitution = async (req, res) => {
    try {
        const institution = await Institution.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!institution) return res.status(404).json({ message: 'Institution not found' });
        res.json(institution);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete institution
// @route   DELETE /api/institutions/:id
// @access  Private/Admin
const deleteInstitution = async (req, res) => {
    try {
        const institution = await Institution.findByIdAndDelete(req.params.id);
        if (!institution) return res.status(404).json({ message: 'Institution not found' });
        res.json({ message: 'Institution removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createInstitution, parseInstitutionText, getInstitutions, getInstitutionById, updateInstitution, deleteInstitution };
