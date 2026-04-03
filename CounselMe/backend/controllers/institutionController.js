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
        const categories = ['ENGINEERING', 'PHARMACY', 'BBA', 'NEET', 'JEE', 'MHTCET', 'MHTCET PCM', 'MHTCET PCB'];
        for (const cat of categories) {
            let normalized = cat.toUpperCase().replace(' ', '_');
            // Apply same normalization as fetch logic
            if (normalized === 'ENGINEERING' || normalized === 'MHTCET_PCM') {
                normalized = 'MHTCET';
            } else if (normalized === 'PHARMACY' || normalized === 'MHTCET_PCB') {
                normalized = 'MHTCET_PCB';
            }
            await redis.del(`institutions_all_${normalized}`);
            await redis.del(`institutions_featured_${normalized}`);
        }

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
        const { category } = req.query;
        let filter = {};

        if (category) {
            const upperCat = category.toUpperCase();
            if (upperCat === 'ENGINEERING' || upperCat === 'MHTCET' || upperCat === 'MHTCET PCM') {
                // Return Engineering OR institutions without a category (legacy/default), 
                // but EXCLUDE those whose names suggest they are Pharmacy/Medical.
                filter = {
                    $or: [
                        { category: /Engineering/i },
                        { category: /MHTCET/i },
                        { category: /PCM/i },
                        {
                            $and: [
                                { $or: [{ category: { $exists: false } }, { category: null }, { category: '' }] },
                                { name: { $not: /Pharmacy|Pharma|Medical|Ayurvedic|B\.Pharm/i } }
                            ]
                        }
                    ]
                };
            } else if (upperCat === 'PHARMACY' || upperCat === 'MHTCET PCB') {
                filter = {
                    $or: [
                        { category: /Pharmacy/i },
                        { category: /PCB/i }
                    ]
                };
            } else {
                filter = { category: new RegExp(`^${category}$`, 'i') };
            }
        }

        let normalizedCategory = category ? category.toUpperCase().trim() : null;
        if (normalizedCategory === 'ENGINEERING' || normalizedCategory === 'MHTCET' || normalizedCategory === 'MHTCET PCM') {
            normalizedCategory = 'MHTCET'; // Map all Engineering/PCM variants to the standard 'MHTCET' cache key
        } else if (normalizedCategory === 'PHARMACY' || normalizedCategory === 'MHTCET PCB') {
            normalizedCategory = 'MHTCET_PCB';
        }
        const cacheKey = normalizedCategory ? `institutions_all_${normalizedCategory}` : 'institutions_all';

        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log(`[Redis] Hit: ${cacheKey}`);
            return res.json(JSON.parse(cachedData));
        }

        const institutions = await Institution.find(filter);
        await redis.set(cacheKey, JSON.stringify(institutions), { EX: 86400 });
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
        // Clear category specific caches too
        const categories = ['ENGINEERING', 'PHARMACY', 'BBA', 'NEET', 'JEE', 'MHTCET', 'MHTCET PCM', 'MHTCET PCB'];
        for (const cat of categories) {
            let normalized = cat.toUpperCase().replace(' ', '_');
            // Apply same normalization as fetch logic
            if (normalized === 'ENGINEERING' || normalized === 'MHTCET_PCM') {
                normalized = 'MHTCET';
            } else if (normalized === 'PHARMACY' || normalized === 'MHTCET_PCB') {
                normalized = 'MHTCET_PCB';
            }
            await redis.del(`institutions_all_${normalized}`);
            await redis.del(`institutions_featured_${normalized}`);
        }

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
        const categories = ['ENGINEERING', 'PHARMACY', 'BBA', 'NEET', 'JEE', 'MHTCET', 'MHTCET PCM', 'MHTCET PCB'];
        for (const cat of categories) {
            let normalized = cat.toUpperCase().replace(' ', '_');
            // Apply same normalization as fetch logic
            if (normalized === 'ENGINEERING' || normalized === 'MHTCET_PCM') {
                normalized = 'MHTCET';
            } else if (normalized === 'PHARMACY' || normalized === 'MHTCET_PCB') {
                normalized = 'MHTCET_PCB';
            }
            await redis.del(`institutions_all_${normalized}`);
            await redis.del(`institutions_featured_${normalized}`);
        }

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
        const categories = ['ENGINEERING', 'PHARMACY', 'BBA', 'NEET', 'JEE', 'MHTCET', 'MHTCET PCM', 'MHTCET PCB'];
        for (const cat of categories) {
            let normalized = cat.toUpperCase().replace(' ', '_');
            // Apply same normalization as fetch logic
            if (normalized === 'ENGINEERING' || normalized === 'MHTCET_PCM') {
                normalized = 'MHTCET';
            } else if (normalized === 'PHARMACY' || normalized === 'MHTCET_PCB') {
                normalized = 'MHTCET_PCB';
            }
            await redis.del(`institutions_all_${normalized}`);
            await redis.del(`institutions_featured_${normalized}`);
        }

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
        const { category } = req.query;
        let filter = { isFeatured: true };

        if (category) {
            const upperCat = category.toUpperCase();
            if (upperCat === 'ENGINEERING' || upperCat === 'MHTCET' || upperCat === 'MHTCET PCM') {
                filter = {
                    isFeatured: true,
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
                };
            } else if (upperCat === 'PHARMACY' || upperCat === 'MHTCET PCB') {
                filter = {
                    isFeatured: true,
                    $or: [
                        { category: /Pharmacy/i },
                        { category: /MHTCET PCB/i }
                    ]
                };
            } else {
                filter.category = new RegExp(`^${category}$`, 'i');
            }
        }

        let normalizedCategory = category ? category.toUpperCase() : null;
        if (normalizedCategory === 'ENGINEERING' || normalizedCategory === 'MHTCET' || normalizedCategory === 'MHTCET PCM') {
            normalizedCategory = 'MHTCET';
        } else if (normalizedCategory === 'PHARMACY' || normalizedCategory === 'MHTCET PCB') {
            normalizedCategory = 'MHTCET_PCB';
        }
        const cacheKey = normalizedCategory ? `institutions_featured_${normalizedCategory}` : 'institutions_featured';

        // Bypass cache during transition to categories
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        const institutions = await Institution.find(filter)
            .sort({ 'rating.value': -1 });

        await redis.set(cacheKey, JSON.stringify(institutions), { EX: 86400 });
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
