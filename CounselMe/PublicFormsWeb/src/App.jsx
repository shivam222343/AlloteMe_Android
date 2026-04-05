import React, { useState, useEffect } from 'react';
import { useParams, BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Star,
  Send,
  AlertCircle,
  Loader2,
  Calendar,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import './App.css';

// Using address 127.0.0.1 to be more specific with backend running locally
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = IS_LOCAL
  ? 'http://127.0.0.1:5100/api/forms'
  : 'https://alloteme-android-cqdu.onrender.com/api/forms';

const CollegeSelector = ({ colleges, value, onChange, placeholder = "Select a college..." }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = (colleges || []).filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.dteCode?.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 100);

  return (
    <div className="searchable-selector">
      <div className="selector-trigger" onClick={() => setIsOpen(!isOpen)}>
        <input
          type="text"
          className="aesthetic-input"
          placeholder={searchTerm || value || placeholder}
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
        />
        <ChevronDown className={`select-icon ${isOpen ? 'rotate' : ''}`} size={18} />
      </div>

      {isOpen && (
        <div className="selector-dropdown">
          {filtered.length > 0 ? (
            filtered.map(c => (
              <div
                key={c._id}
                className={`selector-item ${value === c.name || value === c._id ? 'active' : ''}`}
                onClick={() => {
                  onChange(c);
                  setSearchTerm('');
                  setIsOpen(false);
                }}
              >
                <div className="item-name">{c.name}</div>
                {c.dteCode && <div className="item-code">DTE: {c.dteCode}</div>}
              </div>
            ))
          ) : (
            <div className="no-results">No colleges found matching "{searchTerm}"</div>
          )}
        </div>
      )}
    </div>
  );
};

const FormViewer = () => {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null); // Track HTTP status
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scoreData, setScoreData] = useState(null);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`Connecting to ${API_BASE}/${id}...`);
        const res = await axios.get(`${API_BASE}/${id}`);
        if (res.data.success) {
          const fetchedForm = res.data.data;

          // Enforce Status Policy
          if (fetchedForm.status === 'closed') {
            setError('Form Closed: This form is no longer accepting responses.');
            return;
          }
          if (fetchedForm.status === 'draft') {
            setError('Draft Mode: This form is currently being edited and is not open for public submission yet.');
            return;
          }

          setForm(fetchedForm);

          // Initial answers
          const initAnswers = {};
          fetchedForm.sections.forEach(s => {
            s.questions.forEach(q => {
              if (q.type === 'checkbox') initAnswers[q.id] = [];
              else if (q.type === 'college_review') initAnswers[q.id] = { rating: 5, comment: '', collegeId: '' };
              else initAnswers[q.id] = '';
            });
          });
          setAnswers(initAnswers);
        }
      } catch (err) {
        console.error('Fetch error details:', err);
        setStatus(err.response?.status);
        setError(err.response?.data?.message || 'Connection to server failed. Please ensure the backend is running locally.');
      } finally {
        setLoading(false);
      }
    };
    fetchForm();
  }, [id]);

  const handleInputChange = (qid, value) => {
    setAnswers(prev => ({ ...prev, [qid]: value }));
  };

  const validateCurrentSection = () => {
    const section = form.sections[currentSection];
    const missing = section.questions.filter(q => {
      if (!q.required) return false;
      const ans = answers[q.id];
      if (q.type === 'checkbox') return !ans || ans.length === 0;
      if (q.type === 'college_review') return !ans?.collegeId || !ans?.comment;
      return !ans || ans.trim() === '';
    });

    if (missing.length > 0) {
      alert(`The following questions are required: \n• ${missing.map(m => m.label).join('\n• ')}`);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentSection()) return;

    if (currentSection < form.sections.length - 1) {
      setCurrentSection(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      submitForm();
    }
  };

  const submitForm = async () => {
    try {
      setSubmitting(true);
      const res = await axios.post(`${API_BASE}/${id}/submit`, {
        answers,
        metadata: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });
      if (res.data.success) {
        setSubmitted(true);
        setScoreData(res.data.data);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#673ab7', '#9c27b0', '#ffffff', '#ffd700']
        });
      }
    } catch (err) {
      alert('Submission failed. Check your internet connection.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="status-container">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
        <Loader2 size={40} color="#673ab7" />
      </motion.div>
      <p style={{ marginTop: 20, color: '#64748B' }}>Preparing your form...</p>
    </div>
  );

  if (error) return (
    <div className="status-container">
      <div className="error-icon-box">
        <AlertCircle size={48} color="#EF4444" />
      </div>
      <h2 style={{ marginTop: 24, fontSize: 24, color: '#1E293B' }}>{error}</h2>
      <p style={{ marginTop: 12, color: '#64748B', maxWidth: 400, textAlign: 'center' }}>
        The link may be invalid, or the administrator has temporarily closed the responses for this form.
      </p>
      <button className="btn btn-primary" style={{ marginTop: 30 }} onClick={() => window.location.reload()}>Retry Connection</button>
    </div>
  );

  if (submitted) return (
    <div className="app-container">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="form-card success-card">
        <div className="success-header">
          <CheckCircle2 size={60} color="#10B981" />
          <h1 style={{ marginTop: 20 }}>Thank you!</h1>
          <p>Your response for <strong>{form.title}</strong> has been recorded.</p>
        </div>

        {scoreData?.showMarks && (
          <div className="score-summary">
            <div className="score-label">Total Points Earned</div>
            <div className="score-box">
              <span className="score-big">{scoreData.score}</span>
              <span className="score-divider">/</span>
              <span className="score-total">{scoreData.totalPossibleScore}</span>
            </div>
            <p className="description" style={{ textAlign: 'center', marginTop: 10 }}>Great job completing the assessment!</p>
          </div>
        )}

        <div className="footer-actions">
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>Submit Another Response</button>
        </div>
      </motion.div>
    </div>
  );

  const section = form.sections[currentSection];

  return (
    <div className="app-container">
      {form.bannerImage && (
        <div className="banner-area">
          <img src={form.bannerImage} className="banner-img" alt="Banner" />
        </div>
      )}

      <div className="form-header">
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${((currentSection + 1) / form.sections.length) * 100}%` }}></div>
        </div>
        <div className="step-info">Section {currentSection + 1} of {form.sections.length}</div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSection}
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -10 }}
          transition={{ duration: 0.4 }}
        >
          {currentSection === 0 && (
            <div className="intro-card form-card">
              <div className="top-accent"></div>
              <div className="content">
                <h1>{form.title}</h1>
                <p className="form-description">{form.description}</p>
                <div className="form-meta">
                  <div className="meta-item"><Calendar size={14} /> <span>Live Forms</span></div>
                  <div className="meta-item"><ShieldCheck size={14} /> <span>Secure Submission</span></div>
                </div>
              </div>
            </div>
          )}

          {section.questions.map((q, idx) => (
            <div key={q.id} className="question-card form-card">
              <div className="question-header">
                <h3 className="question-title">
                  {q.label} {q.required && <span className="mandatory-star" title="Required">*</span>}
                </h3>
              </div>

              <div className="question-body">
                {q.type === 'short_text' && (
                  <input
                    type="text"
                    className="aesthetic-input"
                    placeholder="Short answer text"
                    value={answers[q.id]}
                    onChange={(e) => handleInputChange(q.id, e.target.value)}
                  />
                )}

                {q.type === 'long_text' && (
                  <textarea
                    className="aesthetic-input textarea-input"
                    placeholder="Long answer text"
                    rows={2}
                    value={answers[q.id]}
                    onChange={(e) => handleInputChange(q.id, e.target.value)}
                    onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = (e.target.scrollHeight + 2) + 'px'; }}
                  />
                )}

                {q.type === 'number' && (
                  <input
                    type="number"
                    className="aesthetic-input"
                    placeholder="0"
                    value={answers[q.id]}
                    onChange={(e) => handleInputChange(q.id, e.target.value)}
                  />
                )}

                {q.type === 'email' && (
                  <input
                    type="email"
                    className="aesthetic-input"
                    placeholder="email@example.com"
                    value={answers[q.id]}
                    onChange={(e) => handleInputChange(q.id, e.target.value)}
                  />
                )}

                {(q.type === 'radio' || q.type === 'dropdown') && (
                  <div className="options-container">
                    {q.options.map((opt, i) => (
                      <label key={i} className={`option-item ${answers[q.id] === opt.label ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === opt.label}
                          onChange={() => handleInputChange(q.id, opt.label)}
                          className="hide-input"
                        />
                        <div className="custom-radio">
                          {answers[q.id] === opt.label && <div className="radio-inner"></div>}
                        </div>
                        <span className="option-text">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'checkbox' && (
                  <div className="options-container">
                    {q.options.map((opt, i) => {
                      const isChecked = answers[q.id].includes(opt.label);
                      return (
                        <label key={i} className={`option-item ${isChecked ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const newArr = isChecked ? answers[q.id].filter(v => v !== opt.label) : [...answers[q.id], opt.label];
                              handleInputChange(q.id, newArr);
                            }}
                            className="hide-input"
                          />
                          <div className={`custom-checkbox ${isChecked ? 'checked' : ''}`}>
                            {isChecked && <CheckCircle2 size={14} color="white" />}
                          </div>
                          <span className="option-text">{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {q.type === 'college_list' && (
                  <div className="select-wrapper">
                    <CollegeSelector
                      colleges={q.colleges}
                      value={answers[q.id]}
                      placeholder="Choose a college from the list"
                      onChange={(c) => handleInputChange(q.id, c.name)}
                    />
                  </div>
                )}

                {q.type === 'college_review' && (
                  <div className="review-block">
                    <div className="review-label">Select Institution</div>
                    <div className="select-wrapper" style={{ marginBottom: 20 }}>
                      <CollegeSelector
                        colleges={q.colleges}
                        value={answers[q.id]?.collegeName}
                        placeholder="Which college are you reviewing?"
                        onChange={(c) => handleInputChange(q.id, { ...answers[q.id], collegeId: c._id, collegeName: c.name })}
                      />
                    </div>

                    <div className="review-label">Your Experience</div>
                    <div className="reviewer-info" style={{ marginBottom: 15 }}>
                      <input
                        type="text"
                        className="aesthetic-input"
                        placeholder="Your Display Name (Example: Shivam D.)"
                        value={answers[q.id]?.reviewerName || ''}
                        onChange={(e) => handleInputChange(q.id, { ...answers[q.id], reviewerName: e.target.value })}
                      />
                    </div>

                    <div className="star-rating-box">
                      <div className="star-label">Rate your satisfaction:</div>
                      <div className="star-rating">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            size={32}
                            fill={star <= (answers[q.id]?.rating || 0) ? '#F59E0B' : 'transparent'}
                            strokeWidth={1.5}
                            color={star <= (answers[q.id]?.rating || 0) ? '#F59E0B' : '#CBD5E1'}
                            className="luxury-star"
                            onClick={() => handleInputChange(q.id, { ...answers[q.id], rating: star })}
                          />
                        ))}
                      </div>
                    </div>

                    <textarea
                      className="aesthetic-input textarea-input review-text"
                      placeholder="Write your review here. Be honest about placement, faculty and campus. (Minimum 10 words recommended)"
                      value={answers[q.id]?.comment || ''}
                      onChange={(e) => {
                        handleInputChange(q.id, { ...answers[q.id], comment: e.target.value });
                        e.target.style.height = 'auto';
                        e.target.style.height = (e.target.scrollHeight + 2) + 'px';
                      }}
                    />
                  </div>
                )}

                {q.type === 'info_media' && (
                  <div className="premium-media">
                    {q.mediaUrl && (q.mediaUrl.startsWith('http') && !q.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)/i)) ? (
                      <a href={q.mediaUrl} target="_blank" rel="noopener noreferrer" className="aesthetic-media-link">
                        <div className="link-content">
                          <ExternalLink size={24} color="#673ab7" />
                          <div className="link-text">
                            <div className="link-title">{q.label || 'Attached Resource'}</div>
                            <div className="link-url">{q.mediaUrl.substring(0, 40)}...</div>
                          </div>
                        </div>
                      </a>
                    ) : (
                      <>
                        {q.mediaUrl && <img src={q.mediaUrl} className="media-content" alt="Information" />}
                        {q.label && <div className="media-caption">{q.label}</div>}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      <div className="nav-controls">
        <div className="nav-left">
          {currentSection > 0 && (
            <button className="nav-btn-link" onClick={() => setCurrentSection(prev => prev - 1)}>
              <ChevronLeft size={18} /> <span>Previous</span>
            </button>
          )}
        </div>
        <div className="nav-right">
          <button
            className={`btn-main ${submitting ? 'submitting' : ''}`}
            onClick={handleNext}
            disabled={submitting}
          >
            {submitting ? 'Posting...' : currentSection === form.sections.length - 1 ? (
              <><Send size={18} /> <span>Submit Response</span></>
            ) : (
              <><ChevronRight size={18} /> <span>Continue</span></>
            )}
          </button>
        </div>
      </div>

      <footer className="form-footer">
        <div className="power-by">Powered by <span className="brand-name">AlloteMe</span></div>
        <p>Secure forms for college admissions</p>
      </footer>
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/view/:id" element={<FormViewer />} />
      <Route path="*" element={
        <div className="status-container">
          <HelpCircle size={48} color="#94A3B8" />
          <h2 style={{ marginTop: 24, color: '#1E293B' }}>Select a Form</h2>
          <p style={{ marginTop: 10, color: '#64748B' }}>Please use the link provided by the administrator.</p>
        </div>
      } />
    </Routes>
  </BrowserRouter>
);

export default App;
