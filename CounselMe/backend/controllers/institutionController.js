const Institution = require('../models/Institution');
const Cutoff = require('../models/Cutoff');
const Groq = require('groq-sdk');
const { emitUpdate } = require('../utils/socket');
const { client: redis } = require('../config/redis');

// @desc    Create new institution
// @route   POST /api/institutions
// @access  Private/Admin
const createInstitution = async (req, res) => {
    try {
        const institution = new Institution(req.body);
        const createdInstitution = await institution.save();

        // Invalidate lists cache
        await redis.del('institutions_all');
        await redis.del('institutions_featured');

        emitUpdate('institution:created', createdInstitution);
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

    const userKey = req.user?.groqApiKey;
    const apiKey = (userKey && userKey.trim() !== '') ? userKey : process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ message: 'Groq API Key not configured. Please add it to your profile.' });
    }

    console.log(`[Institution Parse] Using Groq Key from: ${userKey ? 'User Profile' : '.env'}`);

    const groq = new Groq({ apiKey });

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are a data extraction assistant. Extract institution details from the provided text and return a JSON object matching EXACTLY this schema (use null for missing values, never omit keys):
{
  "name": string,
  "dteCode": string (usually a 4-digit number),
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
Only include facilities from the provided list. Extract as much as possible from the text. IMPORTANT: Be sure to extract the DTE Code if present.`
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
    try {
        const cachedData = await redis.get('institutions_all');
        if (cachedData) {
            console.log('[Redis] Hit: institutions_all');
            return res.json(JSON.parse(cachedData));
        }

        const institutions = await Institution.find({});
        await redis.set('institutions_all', JSON.stringify(institutions), { EX: 86400 }); // Cache for 24 hours
        res.json(institutions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get institution by ID
// @route   GET /api/institutions/:id
// @access  Public
const getInstitutionById = async (req, res) => {
    try {
        const cacheKey = `institution_${req.params.id}`;
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log(`[Redis] Hit: ${cacheKey}`);
            return res.json(JSON.parse(cachedData));
        }

        const institution = await Institution.findById(req.params.id);

        if (institution) {
            await redis.set(cacheKey, JSON.stringify(institution), { EX: 86400 }); // 24 hours
            res.json(institution);
        } else {
            res.status(404).json({ message: 'Institution not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update institution
// @route   PUT /api/institutions/:id
// @access  Private/Admin
const updateInstitution = async (req, res) => {
    try {
        const oldInstitution = await Institution.findById(req.params.id);
        if (!oldInstitution) return res.status(404).json({ message: 'Institution not found' });

        // If branches are being updated, check for deleted ones
        if (req.body.branches) {
            const oldBranchNames = oldInstitution.branches.map(b => b.name);
            const newBranchNames = req.body.branches.map(b => b.name);
            const deletedBranchNames = oldBranchNames.filter(name => !newBranchNames.includes(name));

            if (deletedBranchNames.length > 0) {
                await Cutoff.deleteMany({
                    collegeId: req.params.id,
                    branch: { $in: deletedBranchNames }
                });
            }
        }

        const institution = await Institution.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        // Invalidate specific and list caches
        await redis.del(`institution_${req.params.id}`);
        await redis.del('institutions_all');
        await redis.del('institutions_featured');

        emitUpdate('institution:updated', institution);
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

        // Also delete all cutoffs associated with this institution
        await Cutoff.deleteMany({ collegeId: req.params.id });

        // Invalidate caches
        await redis.del(`institution_${req.params.id}`);
        await redis.del('institutions_all');
        await redis.del('institutions_featured');

        emitUpdate('institution:deleted', institution._id);
        res.json({ message: 'Institution and associated cutoffs removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete branch and its cutoffs
// @route   DELETE /api/institutions/:id/branches/:branchName
// @access  Private/Admin
const deleteBranch = async (req, res) => {
    try {
        const { branch } = req.query;
        if (!branch) return res.status(400).json({ message: 'Branch name is required' });

        const decodedBranch = decodeURIComponent(branch);
        const institution = await Institution.findById(req.params.id);
        if (!institution) return res.status(404).json({ message: 'Institution not found' });

        // Remove from branches array
        institution.branches = institution.branches.filter(b => b.name !== decodedBranch);
        await institution.save();

        // Delete associated cutoffs
        const Cutoff = require('../models/Cutoff');
        await Cutoff.deleteMany({ collegeId: req.params.id, branch: decodedBranch });

        res.json({ message: 'Branch and associated cutoffs removed', branches: institution.branches });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Toggle featured status of an institution
// @route   PUT /api/institutions/:id/feature
// @access  Private/Admin
const toggleFeatureInstitution = async (req, res) => {
    try {
        const institution = await Institution.findById(req.params.id);
        if (!institution) return res.status(404).json({ message: 'Institution not found' });

        institution.isFeatured = !institution.isFeatured;
        await institution.save();

        // Invalidate specific and list caches
        await redis.del(`institution_${req.params.id}`);
        await redis.del('institutions_all');
        await redis.del('institutions_featured');

        emitUpdate('institution:updated', institution);
        res.json(institution);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get featured institutions
// @route   GET /api/institutions/featured
// @access  Public
const getFeaturedInstitutions = async (req, res) => {
    try {
        // Temporarily bypassing cache for debugging featured list
        /*
        const cachedData = await redis.get('institutions_featured');
        if (cachedData) {
            console.log('[Redis] Hit: institutions_featured');
            return res.json(JSON.parse(cachedData));
        }
        */

        const institutions = await Institution.find({ isFeatured: true })
            .sort({ 'rating.value': -1 });

        // await redis.set('institutions_featured', JSON.stringify(institutions), { EX: 86400 });
        res.json(institutions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createInstitution,
    parseInstitutionText,
    getInstitutions,
    getInstitutionById,
    updateInstitution,
    deleteInstitution,
    deleteBranch,
    toggleFeatureInstitution,
    getFeaturedInstitutions
};
