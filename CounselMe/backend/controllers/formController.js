const { Form, FormResponse } = require('../models/Form');
const Review = require('../models/Review');
const Institution = require('../models/Institution');
const mongoose = require('mongoose');

// @desc  Create a new form
// @route POST /api/forms
exports.createForm = async (req, res) => {
    try {
        const { title, description, sections, status, settings, bannerImage, sharedWith } = req.body;

        // Bake college data for college_list fields across all sections
        const updatedSections = await Promise.all(sections.map(async (section) => {
            const updatedQuestions = await Promise.all(section.questions.map(async (q) => {
                if ((q.type === 'college_list' || q.type === 'college_review') && q.admissionPath) {
                    const searchTerms = [q.admissionPath];
                    if (q.admissionPath.includes('PCM')) searchTerms.push('Engineering', 'Technology');
                    if (q.admissionPath.includes('PCB')) searchTerms.push('Pharmacy', 'B-Pharm');
                    if (q.admissionPath.includes('NEET')) searchTerms.push('Medical', 'NEET');
                    
                    const query = {
                        $or: [
                            { admissionPath: { $in: searchTerms } },
                            { admissionPaths: { $in: searchTerms } },
                            { description: { $regex: searchTerms.join('|'), $options: 'i' } }
                        ]
                    };
                    const colleges = await Institution.find(query)
                        .select('name dteCode _id')
                        .sort('name')
                        .limit(500);
                    return { ...q, colleges: colleges.map(c => ({ _id: c._id, name: c.name, dteCode: c.dteCode })) };
                }
                return q;
            }));
            return { ...section, questions: updatedQuestions };
        }));

        const form = await Form.create({
            title,
            description,
            bannerImage,
            status: status || 'draft',
            sections: updatedSections,
            settings: settings || { isQuiz: false, showMarks: false },
            sharedWith: sharedWith || [],
            createdBy: req.user._id
        });

        res.status(201).json({ success: true, data: form });
    } catch (error) {
        console.error('[FormController] createForm:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc  Get all forms for admin
// @route GET /api/forms
exports.getForms = async (req, res) => {
    try {
        // Find forms created by user or shared with user
        const forms = await Form.find({
            $or: [
                { createdBy: req.user._id },
                { sharedWith: req.user._id }
            ]
        }).sort('-createdAt');

        res.json({ success: true, data: forms });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc  Get single form
// @route GET /api/forms/:id
exports.getFormById = async (req, res) => {
    try {
        console.log(`[FormController] Fetching Form ID: ${req.params.id}`);
        const form = await Form.findById(req.params.id).populate('sharedWith', 'displayName email profilePicture');
        if (!form) {
            console.warn(`[FormController] Form Not Found in DB: ${req.params.id}`);
            return res.status(404).json({ success: false, message: 'Form not found in local database' });
        }
        console.log(`[FormController] Successfully fetched: ${form.title}`);
        res.json({ success: true, data: form });
    } catch (error) {
        console.error(`[FormController] Fetch Error for ID ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: 'Server error processing form request' });
    }
};

// @desc  Update form
// @route PUT /api/forms/:id
exports.updateForm = async (req, res) => {
    try {
        const { sections, ...rest } = req.body;

        let updatedSections = sections;
        if (sections) {
            updatedSections = await Promise.all(sections.map(async (section) => {
                const updatedQuestions = await Promise.all(section.questions.map(async (q) => {
                    if ((q.type === 'college_list' || q.type === 'college_review') && q.admissionPath) {
                        const searchTerms = [q.admissionPath];
                        if (q.admissionPath.includes('PCM')) searchTerms.push('Engineering', 'Technology');
                        if (q.admissionPath.includes('PCB')) searchTerms.push('Pharmacy', 'B-Pharm');
                        if (q.admissionPath.includes('NEET')) searchTerms.push('Medical', 'NEET');

                        const query = {
                            $or: [
                                { admissionPath: { $in: searchTerms } },
                                { admissionPaths: { $in: searchTerms } },
                                { description: { $regex: searchTerms.join('|'), $options: 'i' } }
                            ]
                        };
                        const colleges = await Institution.find(query).select('name dteCode _id').sort('name').limit(500);
                        return { ...q, colleges: colleges.map(c => ({ _id: c._id, name: c.name, dteCode: c.dteCode })) };
                    }
                    return q;
                }));
                return { ...section, questions: updatedQuestions };
            }));
        }

        const form = await Form.findByIdAndUpdate(
            req.params.id,
            { ...rest, ...(updatedSections && { sections: updatedSections }) },
            { new: true }
        );

        if (!form) return res.status(404).json({ success: false, message: 'Form not found' });
        res.json({ success: true, data: form });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc  Delete form
// @route DELETE /api/forms/:id
exports.deleteForm = async (req, res) => {
    try {
        await Form.findByIdAndDelete(req.params.id);
        await FormResponse.deleteMany({ formId: req.params.id });
        res.json({ success: true, message: 'Form deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc  Get responses for a form
// @route GET /api/forms/:id/responses
exports.getResponses = async (req, res) => {
    try {
        const responses = await FormResponse.find({ formId: req.params.id }).sort('-createdAt').populate('submittedBy', 'displayName email');
        res.json({ success: true, data: responses });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc  Delete a response
// @route DELETE /api/forms/response/:id
exports.deleteResponse = async (req, res) => {
    try {
        const response = await FormResponse.findByIdAndDelete(req.params.id);
        if (response) {
            await Form.findByIdAndUpdate(response.formId, { $inc: { responseCount: -1 } });
        }
        res.json({ success: true, message: 'Response deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc  Submit form response
// @route POST /api/forms/:id/submit
exports.submitForm = async (req, res) => {
    try {
        const form = await Form.findById(req.params.id);
        if (!form || form.status === 'closed') {
            return res.status(404).json({ success: false, message: 'Form is closed or not found' });
        }

        const { answers, name, email } = req.body;

        let score = 0;
        let totalPossibleScore = 0;

        // Flatten all questions for easier processing
        const allQuestions = [];
        form.sections.forEach(s => allQuestions.push(...s.questions));

        // Calculate score and handle special fields
        for (const q of allQuestions) {
            const ans = answers[q.id];

            // Quiz Scoring
            if (form.settings.isQuiz && q.options && q.options.length > 0) {
                const correctOpts = q.options.filter(o => o.isCorrect);
                if (correctOpts.length > 0) {
                    totalPossibleScore += 1;
                    if (q.type === 'checkbox') {
                        const correctIds = correctOpts.map(o => o.label);
                        const ansArr = Array.isArray(ans) ? ans : [ans];
                        if (ansArr.length === correctIds.length && ansArr.every(v => correctIds.includes(v))) {
                            score += 1;
                        }
                    } else if (ans === correctOpts[0].label) {
                        score += 1;
                    }
                }
            }

            // College Review auto-submission
            if (q.type === 'college_review' && ans && q.autoPostReview) {
                const { collegeId, rating, comment, reviewerName } = ans;
                if (collegeId && rating) {
                    // Try to find a name: check field specific first, then global name, then default
                    const submissionName = reviewerName || name || answers.name || answers.displayName || 'Anonymous';
                    
                    await Review.create({
                        userName: submissionName,
                        userAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(submissionName)}&background=random`,
                        institutionId: collegeId,
                        rating: Number(rating),
                        comment: comment || '',
                        isPublished: true
                    });
                }
            }
        }

        const response = await FormResponse.create({
            formId: form._id,
            answers,
            score,
            totalPossibleScore,
            name,
            email,
            submittedBy: req.user?._id
        });

        await Form.findByIdAndUpdate(form._id, { $inc: { responseCount: 1 } });

        res.json({ success: true, data: { score, totalPossibleScore, showMarks: form.settings.showMarks } });
    } catch (error) {
        console.error('[FormController] submitForm:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc  Public HTML Form Page
exports.serveFormPage = async (req, res) => {
    try {
        const form = await Form.findById(req.params.id);
        if (!form) return res.status(404).send('Form not found');
        if (form.status === 'closed') return res.status(403).send('<h2>This form is no longer accepting responses.</h2>');

        const sectionsJson = JSON.stringify(form.sections);
        const settingsJson = JSON.stringify(form.settings);
        const submitEndpoint = `/api/forms/${form._id}/submit`;

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${form.title} | AlloteMe</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        :root { --primary: #673ab7; --bg: #f0ebf8; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Roboto', sans-serif; background: var(--bg); color: #202124; padding-bottom: 60px; }
        .container { max-width: 640px; margin: 0 auto; padding: 12px; }
        .card { background: #fff; border-radius: 8px; margin-bottom: 12px; border: 1px solid #dadce0; overflow: hidden; }
        .banner { width: 100%; height: 160px; object-fit: cover; }
        .header-card { border-top: 10px solid var(--primary); padding: 24px; }
        .header-card h1 { font-size: 32px; font-weight: 400; margin-bottom: 12px; }
        .header-card p { font-size: 14px; color: #5f6368; line-height: 20px; }
        .q-card { padding: 24px; transition: border .2s; }
        .q-card:focus-within { border-left: 6px solid #4285f4; }
        .q-label { font-size: 16px; font-weight: 500; margin-bottom: 16px; display: block; }
        .q-label .req { color: #d93025; margin-left: 4px; }
        
        input[type=text], input[type=email], input[type=number], select, textarea {
            width: 100%; border: none; border-bottom: 1px solid #dadce0; padding: 8px 0; font-size: 14px; outline: none; transition: border-bottom .3s;
        }
        input:focus, textarea:focus { border-bottom: 2px solid var(--primary); }
        textarea { min-height: 24px; resize: none; overflow-y: hidden; }
        
        .opt-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; cursor: pointer; }
        input[type=radio], input[type=checkbox] { width: 20px; height: 20px; accent-color: var(--primary); cursor: pointer; }
        
        .footer { display: flex; align-items: center; justify-content: space-between; margin-top: 24px; }
        .btn { padding: 8px 24px; border-radius: 4px; font-weight: 500; cursor: pointer; border: none; transition: background .2s; }
        .btn-primary { background: var(--primary); color: #fff; }
        .btn-primary:hover { background: #512da8; }
        .btn-text { background: transparent; color: var(--primary); }
        
        .progress-bar { height: 10px; background: #e0e0e0; border-radius: 5px; margin-bottom: 12px; position: relative; overflow: hidden; }
        .progress-fill { height: 100%; background: var(--primary); width: 0%; transition: width 0.3s; }
        
        .section { display: none; }
        .section.active { display: block; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
        
        .stars-row { display: flex; gap: 8px; margin-bottom: 12px; }
        .star-btn { font-size: 32px; cursor: pointer; color: #ddd; }
        .star-btn.active { color: #f59e0b; }
        .review-box { background: #f8fafc; padding: 16px; border-radius: 8px; margin-top: 8px; }
        
        #result-view { text-align: center; padding: 60px 20px; display: none; }
        #result-view h2 { font-size: 28px; margin-bottom: 12px; }
        .score-display { font-size: 48px; font-weight: 700; color: #15803d; margin: 24px 0; }
        
        .brand { text-align: center; color: #70757a; font-size: 12px; margin-top: 24px; }
    </style>
</head>
<body>
    <div class="container">
        ${form.bannerImage ? `<div class="card"><img src="${form.bannerImage}" class="banner"></div>` : ''}
        
        <div id="form-content">
            <div class="progress-bar"><div class="progress-fill" id="p-fill"></div></div>
            
            <form id="google-form">
                <div class="card header-card">
                    <h1>${form.title}</h1>
                    <p>${form.description || ''}</p>
                </div>

                <div id="sections-container"></div>

                <div class="footer">
                    <button type="button" class="btn btn-text" id="prev-btn" style="visibility:hidden">Back</button>
                    <button type="button" class="btn btn-primary" id="next-btn">Next</button>
                </div>
            </form>
        </div>

        <div id="result-view" class="card">
            <h2 id="res-title">Thank you!</h2>
            <p id="res-msg">Your response has been recorded.</p>
            <div id="score-box" style="display:none">
                <p>Your Score:</p>
                <div class="score-display" id="score-val">0 / 0</div>
            </div>
            <button class="btn btn-text" onclick="location.reload()" style="margin-top:20px">Submit another response</button>
        </div>

        <div class="brand">Forms by <b>AlloteMe</b></div>
    </div>

    <script>
        const SECTIONS = ${sectionsJson};
        const SETTINGS = ${settingsJson};
        const SUBMIT_URL = '${submitEndpoint}';
        
        let currentIdx = 0;
        const answers = {};

        function renderSections() {
            const container = document.getElementById('sections-container');
            SECTIONS.forEach((sec, sIdx) => {
                const secDiv = document.createElement('div');
                secDiv.className = 'section ' + (sIdx === 0 ? 'active' : '');
                secDiv.id = 'sec-' + sIdx;
                
                if (sIdx > 0) {
                    secDiv.innerHTML = '<div class="card"><div class="q-card"><h3>' + sec.title + '</h3></div></div>';
                }

                sec.questions.forEach(q => {
                    const qCard = document.createElement('div');
                    qCard.className = 'card q-card';
                    qCard.innerHTML = '<label class="q-label">' + q.label + (q.required ? '<span class="req">*</span>' : '') + '</label>';
                    
                    let input = '';
                    if (q.type === 'short_text') input = '<input type="text" data-qid="' + q.id + '" placeholder="Your answer" ' + (q.required ? 'required' : '') + '>';
                    else if (q.type === 'long_text') input = '<textarea data-qid="' + q.id + '" placeholder="Your answer" rows="1" oninput="this.style.height=\\'auto\\';this.style.height=this.scrollHeight+\\'px\\'" ' + (q.required ? 'required' : '') + '></textarea>';
                    else if (q.type === 'number') input = '<input type="number" data-qid="' + q.id + '" placeholder="0" ' + (q.required ? 'required' : '') + '>';
                    else if (q.type === 'email') input = '<input type="email" data-qid="' + q.id + '" placeholder="email@example.com" ' + (q.required ? 'required' : '') + '>';
                    else if (q.type === 'radio' || q.type === 'dropdown') {
                        q.options.forEach(opt => {
                            input += '<label class="opt-row"><input type="radio" name="' + q.id + '" value="' + opt.label + '" data-qid="' + q.id + '"> ' + opt.label + '</label>';
                        });
                    } else if (q.type === 'checkbox') {
                        q.options.forEach(opt => {
                            input += '<label class="opt-row"><input type="checkbox" name="' + q.id + '" value="' + opt.label + '" data-qid="' + q.id + '"> ' + opt.label + '</label>';
                        });
                    } else if (q.type === 'college_list') {
                        input = '<select data-qid="' + q.id + '"><option value="">Choose</option>';
                        q.colleges.forEach(c => input += '<option value="' + c.name + '" data-cid="' + c._id + '">' + c.name + '</option>');
                        input += '</select>';
                    } else if (q.type === 'college_review') {
                        input = '<div class="review-box"><select id="rev-col-' + q.id + '" style="margin-bottom:12px"><option value="">Select College</option>';
                        q.colleges.forEach(c => input += '<option value="' + c.name + '" data-cid="' + c._id + '">' + c.name + '</option>');
                        input += '</select><div class="stars-row" id="stars-' + q.id + '">' + 
                                [1,2,3,4,5].map(i => '<span class="star-btn" onclick="setRating(\\''+q.id+'\\', '+i+')">★</span>').join('') + 
                                '</div><textarea id="msg-'+q.id+'" placeholder="Your review message..." style="margin-top:10px"></textarea></div>' +
                                '<input type="hidden" id="val-'+q.id+'" value="5" data-type="review" data-qid="'+q.id+'">';
                    } else if (q.type === 'info_media') {
                        input = q.mediaType === 'image' ? '<img src="'+q.mediaUrl+'" style="width:100%;border-radius:4px">' : '<a href="'+q.mediaUrl+'" target="_blank">View Document</a>';
                    }
                    
                    qCard.innerHTML += input;
                    secDiv.appendChild(qCard);
                });
                container.appendChild(secDiv);
            });
            updateProgress();
        }

        window.setRating = (qid, r) => {
            document.getElementById('val-'+qid).value = r;
            const stars = document.getElementById('stars-'+qid).children;
            for(let i=0; i<5; i++) stars[i].classList.toggle('active', i < r);
        };

        function updateProgress() {
            const p = ((currentIdx + 1) / SECTIONS.length) * 100;
            document.getElementById('p-fill').style.width = p + '%';
            document.getElementById('prev-btn').style.visibility = currentIdx === 0 ? 'hidden' : 'visible';
            document.getElementById('next-btn').textContent = currentIdx === SECTIONS.length - 1 ? 'Submit' : 'Next';
        }

        document.getElementById('next-btn').onclick = async () => {
            // Validation logic simplified for brevity
            if (currentIdx < SECTIONS.length - 1) {
                document.getElementById('sec-' + currentIdx).classList.remove('active');
                currentIdx++;
                document.getElementById('sec-' + currentIdx).classList.add('active');
                updateProgress();
                window.scrollTo(0,0);
            } else {
                await submitForm();
            }
        };

        document.getElementById('prev-btn').onclick = () => {
            document.getElementById('sec-' + currentIdx).classList.remove('active');
            currentIdx--;
            document.getElementById('sec-' + currentIdx).classList.add('active');
            updateProgress();
        };

        async function submitForm() {
            const btn = document.getElementById('next-btn');
            btn.disabled = true;
            btn.textContent = 'Submitting...';

            const payload = { answers: {}, name: '', email: '' };
            
            // Gather values
            document.querySelectorAll('[data-qid]').forEach(el => {
                const qid = el.dataset.qid;
                if (el.tagName === 'INPUT' && (el.type === 'radio' || el.type === 'checkbox')) {
                    if (el.checked) {
                        if (el.type === 'checkbox') {
                            if (!payload.answers[qid]) payload.answers[qid] = [];
                            payload.answers[qid].push(el.value);
                        } else payload.answers[qid] = el.value;
                    }
                } else if (el.tagName === 'SELECT') {
                    payload.answers[qid] = el.value;
                } else if (el.dataset.type === 'review') {
                    const col = document.getElementById('rev-col-' + qid);
                    payload.answers[qid] = {
                        collegeId: col.options[col.selectedIndex].dataset.cid,
                        rating: el.value,
                        comment: document.getElementById('msg-' + qid).value
                    };
                } else {
                    payload.answers[qid] = el.value.trim();
                }
            });

            try {
                const res = await fetch(SUBMIT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('form-content').style.display = 'none';
                    document.getElementById('result-view').style.display = 'block';
                    if (data.data.showMarks) {
                        document.getElementById('score-box').style.display = 'block';
                        document.getElementById('score-val').textContent = data.data.score + ' / ' + data.data.totalPossibleScore;
                    }
                }
            } catch (err) {
                alert('Submission failed');
                btn.disabled = false;
                btn.textContent = 'Submit';
            }
        }

        renderSections();
    </script>
</body>
</html>`;
        res.header('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        res.status(500).send('Error loading form');
    }
};
