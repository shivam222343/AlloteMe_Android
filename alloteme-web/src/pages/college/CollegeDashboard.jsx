import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Navigate } from 'react-router-dom';
import {
  Building2, GraduationCap, Image as ImageIcon, Briefcase,
  MapPin, Home as HomeIcon, Settings, LogOut, Menu, X,
  Upload, Plus, Trash2, Save, ChevronRight, Map as MapIcon,
  Search, Filter, Navigation, Target, Globe, BookOpen, Star,
  Users, Maximize2, Check, Smartphone, Wifi, Coffee, Shield, Activity,
  Wind // Using Wind as an icon for Laundry/Airflow
} from 'lucide-react';
import './CollegeDashboard.css';

const NAV_ITEMS = [
  { key: 'profile',    label: 'Profile',     Icon: Building2      },
  { key: 'branches',   label: 'Branches & Cutoffs', Icon: GraduationCap  },
  { key: 'gallery',    label: 'Media',       Icon: ImageIcon      },
  { key: 'placements', label: 'Placements',  Icon: Briefcase      },
  { key: 'map',        label: 'Location',    Icon: MapPin         },
  { key: 'hostel',     label: 'Residential', Icon: HomeIcon       },
  { key: 'facilities', label: 'Utilities',   Icon: Settings       },
];

const INSTITUTION_TYPES = ['Autonomous', 'Government', 'Private', 'Aided', 'Un-aided', 'Deemed University'];

export default function CollegeDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const [institution, setInstitution] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('profile');
  const [isSaving, setIsSaving]       = useState(false);
  const [message, setMessage]         = useState({ type: '', text: '' });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cutoffs, setCutoffs]         = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [formData, setFormData]       = useState({});
  const facilityRef                   = useRef(null);

  // Cutoff Filters
  const [cutoffFilters, setCutoffFilters] = useState({ year: 'All', round: 'All' });

  useEffect(() => {
    if (!authLoading && user) fetchInstitution();
  }, [authLoading, user]);

  const fetchInstitution = async () => {
    try {
      const { data } = await axios.get('/api/institutions/managed');
      setInstitution(data);
      setFormData(data);
      if (data._id) fetchCutoffs(data._id);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load workspace data.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCutoffs = async (id) => {
    try {
      const { data } = await axios.get(`/api/cutoffs/${id}`);
      setCutoffs(data);
    } catch (_) {}
  };

  const handleInput = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    
    const parts = name.split('.');
    if (parts.length === 1) {
      setFormData(p => ({ ...p, [name]: val }));
    } else if (parts.length === 2) {
      const [a, b] = parts;
      setFormData(p => ({ ...p, [a]: { ...p[a], [b]: val } }));
    } else if (parts.length === 3) {
      const [a, b, c] = parts;
      setFormData(p => ({ ...p, [a]: { ...p[a], [b]: { ...p[a]?.[b], [c]: val } } }));
    } else if (parts.length === 4) {
      const [a, b, c, d] = parts;
      setFormData(p => ({ ...p, [a]: { ...p[a], [b]: { ...p[a]?.[b], [c]: { ...p[a]?.[b]?.[c], [d]: val } } } }));
    }
  };

  const handleUpload = async (e, type, idx = null) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    try {
      const { data } = await axios.post('/api/upload/image', fd);
      const url = data.url;
      if (type === 'gallery') {
        setFormData(p => ({ ...p, galleryImages: [...(p.galleryImages || []), url] }));
      } else if (type === 'hostel') {
        setFormData(p => ({ ...p, hostel: { ...p.hostel, images: [...(p.hostel?.images || []), url] } }));
      }
    } catch (_) {
      setMessage({ type: 'error', text: 'Upload failed.' });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const { data } = await axios.put('/api/institutions/managed', formData);
      setInstitution(data);
      setMessage({ type: 'success', text: 'All changes have been synchronized.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Update failed.' });
    } finally {
      setIsSaving(false);
    }
  };

  const updatePlacement = (idx, field, val) => {
    setFormData(p => {
      const arr = [...(p.placements || [])];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...p, placements: arr };
    });
  };

  const addPlacementRecord = (pIdx) => {
    setFormData(p => {
      const arr = [...(p.placements || [])];
      const year = arr[pIdx].year;
      const records = [...(arr[pIdx].records || [])];
      arr[pIdx].records = [...records, { studentName: '', companyName: '', package: '', batch: year }];
      return { ...p, placements: arr };
    });
  };

  const updatePlacementRecord = (pIdx, rIdx, field, val) => {
    setFormData(p => {
      const arr = [...(p.placements || [])];
      const records = [...(arr[pIdx].records || [])];
      records[rIdx] = { ...records[rIdx], [field]: val };
      arr[pIdx].records = records;
      
      const validPackages = records.map(r => parseFloat(r.package)).filter(pkg => !isNaN(pkg));
      if (validPackages.length > 0) {
          const max = Math.max(...validPackages);
          arr[pIdx].highestPackage = max.toString() + " LPA";
          const avg = validPackages.reduce((a, b) => a + b, 0) / validPackages.length;
          arr[pIdx].averagePackage = avg.toFixed(2) + " LPA";
      }

      return { ...p, placements: arr };
    });
  };

  const fetchCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setFormData(p => ({
          ...p,
          location: {
            ...p.location,
            coordinates: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            }
          }
        }));
      });
    }
  };

  const addFacility = () => {
    const val = facilityRef.current?.value?.trim();
    if (!val) return;
    setFormData(p => ({ ...p, facilities: [...(p.facilities || []), val] }));
    facilityRef.current.value = '';
  };

  const navigateTab = (key) => { setActiveTab(key); setSidebarOpen(false); };

  if (authLoading || (loading && !institution)) {
    return (
      <div className="dashboard-loading-screen">
        <div className="loader" />
        <span>Synchronizing institutional workspace...</span>
      </div>
    );
  }
  if (!user) return <Navigate to="/college/login" replace />;

  return (
    <div className="dashboard-wrapper">
      <header className="mobile-dashboard-header">
        <button onClick={() => setSidebarOpen(o => !o)}><Menu size={22} /></button>
        <span className="p-name">{institution?.name}</span>
      </header>

      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="pill-avatar">{user?.displayName?.charAt(0) || 'A'}</div>
          <span className="p-name">{user?.displayName || 'Administrator'}</span>
          <span className="p-role">College Workspace</span>
        </div>

        <nav className="sidebar-menu">
          {NAV_ITEMS.map(({ key, label, Icon }) => (
            <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => navigateTab(key)}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="logout-action" onClick={logout}><LogOut size={14} /> Sign Out</button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <main className="dashboard-content">
        <header className="content-top-bar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={10} />
            <span className="current">{NAV_ITEMS.find(n => n.key === activeTab)?.label}</span>
          </div>
          <button className="global-save-btn" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Upload size={14} className="spin" /> : <Save size={14} />}
            {isSaving ? 'Saving...' : 'Save All Changes'}
          </button>
        </header>

        <div className="content-inner">
          {message.text && (
            <div className={`status-alert ${message.type}`}>
              <span>{message.text}</span>
              <button onClick={() => setMessage({ type: '', text: '' })}><X size={14} /></button>
            </div>
          )}

          <div className="tab-content">
            {activeTab === 'profile' && (
              <div className="minimal-card">
                <div className="section-header">
                  <h2>Institutional Identity</h2>
                  <p>Maintain consistent core data and public presence.</p>
                </div>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Official Name *</label>
                    <input name="name" value={formData.name || ''} onChange={handleInput} />
                  </div>
                  <div className="form-group">
                    <label>Admission Path</label>
                    <input name="category" value={formData.category || ''} onChange={handleInput} />
                  </div>
                  <div className="form-group">
                    <label>University</label>
                    <input name="university" value={formData.university || ''} onChange={handleInput} />
                  </div>
                  <div className="form-group">
                    <label>DTE Code</label>
                    <input name="dteCode" value={formData.dteCode || ''} onChange={handleInput} />
                  </div>
                  <div className="form-group">
                    <label>Fees / Year (₹)</label>
                    <input type="number" name="feesPerYear" value={formData.feesPerYear || ''} onChange={handleInput} />
                  </div>
                  <div className="form-group">
                    <label>NIRF / Rating</label>
                    <input name="rating.value" value={formData.rating?.value || ''} onChange={handleInput} />
                  </div>
                  <div className="form-group full-width">
                    <label>Institution Type</label>
                    <div className="tags-container">
                      {INSTITUTION_TYPES.map(t => (
                        <button key={t} className={`tag-chip ${formData.type === t ? 'active' : ''}`} onClick={() => setFormData(p => ({ ...p, type: t }))}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Official Website</label>
                    <input name="website" value={formData.website || ''} onChange={handleInput} />
                  </div>
                  <div className="form-group">
                    <label>Google Maps URL</label>
                    <input name="mapUrl" value={formData.mapUrl || ''} onChange={handleInput} />
                  </div>
                  <div className="form-group full-width">
                    <label>General Overview</label>
                    <textarea name="description" value={formData.description || ''} onChange={handleInput} rows={6} />
                  </div>
                </div>

                <div className="section-header mt-12 pt-8 border-t">
                  <h2>Infrastructure Metrics</h2>
                </div>
                <div className="form-grid">
                  <div className="form-group"><label>Established Year</label><input type="number" name="established" value={formData.established || ''} onChange={handleInput} /></div>
                  <div className="form-group"><label>Total Students</label><input type="number" name="totalStudents" value={formData.totalStudents || ''} onChange={handleInput} /></div>
                  <div className="form-group"><label>Campus Area</label><input name="campusArea" value={formData.campusArea || ''} onChange={handleInput} /></div>
                  <div className="form-group"><label>Accreditation</label><input name="accreditation" value={formData.accreditation || ''} onChange={handleInput} /></div>
                </div>
              </div>
            )}

            {activeTab === 'branches' && (
              <div className="minimal-card">
                <div className="section-header">
                  <h2>Branches & Cutoffs</h2>
                  <p>Select a branch to analyze historical performance.</p>
                </div>
                <div className="tags-container mb-8">
                  {(formData.branches || []).map((b) => (
                    <button key={b.code} className={`tag-chip ${selectedBranch?.code === b.code ? 'active' : ''}`} onClick={() => setSelectedBranch(b)}>{b.name}</button>
                  ))}
                </div>

                {selectedBranch && (
                  <div className="fade-in">
                    <div className="flex flex-wrap gap-8 mb-8 pt-6 border-t">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Year Filter</label>
                        <div className="tags-container">
                          {['All', ...new Set(cutoffs.map(c => c.year))].sort().map(y => (
                            <button key={y} className={`tag-chip ${cutoffFilters.year.toString() === y.toString() ? 'active' : ''}`} onClick={() => setCutoffFilters(f => ({ ...f, year: y }))}>{y}</button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Round Filter</label>
                        <div className="tags-container">
                          {['All', '1', '2', '3'].map(r => (
                            <button key={r} className={`tag-chip ${cutoffFilters.round.toString() === r.toString() ? 'active' : ''}`} onClick={() => setCutoffFilters(f => ({ ...f, round: r }))}>{r === 'All' ? 'All Rounds' : `R${r}`}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="border rounded-lg overflow-hidden bg-white">
                      <table className="modern-table">
                        <thead><tr><th>Year</th><th>Round</th><th>Category</th><th>%</th><th>Rank</th></tr></thead>
                        <tbody>
                          {cutoffs
                            .filter(c => c.branch === selectedBranch.name)
                            .filter(c => cutoffFilters.year === 'All' || c.year.toString() === cutoffFilters.year.toString())
                            .filter(c => cutoffFilters.round === 'All' || c.round.toString() === cutoffFilters.round.toString())
                            .map((c, i) => (
                              <tr key={i}><td>{c.year}</td><td>R{c.round}</td><td>{c.category}</td><td className="font-bold text-blue-600">{c.percentile}</td><td>{c.rank}</td></tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'gallery' && (
              <div className="minimal-card">
                <div className="section-header">
                  <h2>Media Asset Manager</h2>
                  <p>Upload photos of campus infrastructure and events.</p>
                </div>
                <div className="gallery-grid">
                  <div className="upload-box">
                    <label className="upload-label"><Upload size={28} /><span>Add Media</span><input type="file" hidden accept="image/*" onChange={(e) => handleUpload(e, 'gallery')} /></label>
                  </div>
                  {(formData.galleryImages || []).map((img, i) => (
                    <div key={i} className="gallery-item">
                      <img src={img} alt="" />
                      <button className="delete-img" onClick={() => setFormData(p => ({ ...p, galleryImages: p.galleryImages.filter((_, j) => j !== i) }))}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'placements' && (
              <div className="tab-content">
                <div className="section-header flex justify-between items-center">
                  <div>
                    <h2>Placement Records</h2>
                    <p>Track yearly success metrics and student achievements.</p>
                  </div>
                  <button className="global-save-btn" onClick={() => setFormData(p => ({
                      ...p,
                      placements: [...(p.placements || []), { year: new Date().getFullYear(), highestPackage: '0 LPA', averagePackage: '0 LPA', placementPercentage: 0, records: [], images: [] }]
                  }))}><Plus size={16} /> New Batch</button>
                </div>
                {(formData.placements || []).map((p, i) => (
                  <div key={i} className="placement-year-card">
                    <div className="placement-year-header">
                      <div className="flex items-center gap-12">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Batch Year</label>
                          <input type="number" className="w-20 font-bold border rounded px-2 py-1" value={p.year} onChange={(e) => updatePlacement(i, 'year', e.target.value)} />
                        </div>
                        <div className="p-stats-row">
                          <div className="p-stat-box"><span className="p-stat-label">Highest</span><span className="p-stat-value">{p.highestPackage}</span></div>
                          <div className="p-stat-box"><span className="p-stat-label">Average</span><span className="p-stat-value">{p.averagePackage}</span></div>
                        </div>
                      </div>
                      <button className="text-gray-300 hover:text-red-500 transition" onClick={() => setFormData(prev => ({ ...prev, placements: prev.placements.filter((_, idx) => idx !== i) }))}><Trash2 size={18} /></button>
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="text-sm font-bold text-gray-700">Student Achievement Log</h4>
                        <button className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1" onClick={() => addPlacementRecord(i)}><Plus size={12} /> Add Entry</button>
                      </div>
                      <table className="modern-table border rounded-lg">
                        <thead><tr><th>Student Name</th><th>Company</th><th>Package (LPA)</th><th>Batch</th><th className="w-10"></th></tr></thead>
                        <tbody>
                          {(p.records || []).map((r, rIdx) => (
                            <tr key={rIdx}>
                              <td><input className="w-full bg-transparent border-none p-1 text-sm focus:outline-none" value={r.studentName} onChange={(e) => updatePlacementRecord(i, rIdx, 'studentName', e.target.value)} /></td>
                              <td><input className="w-full bg-transparent border-none p-1 text-sm focus:outline-none" value={r.companyName} onChange={(e) => updatePlacementRecord(i, rIdx, 'companyName', e.target.value)} /></td>
                              <td><input className="w-full bg-transparent border-none p-1 text-sm font-bold text-blue-600 focus:outline-none" type="number" value={r.package} onChange={(e) => updatePlacementRecord(i, rIdx, 'package', e.target.value)} /></td>
                              <td><input className="w-full bg-transparent border-none p-1 text-sm focus:outline-none" value={r.batch} onChange={(e) => updatePlacementRecord(i, rIdx, 'batch', e.target.value)} /></td>
                              <td><button className="text-gray-300 hover:text-red-500" onClick={() => {
                                const n = [...formData.placements]; n[i].records = n[i].records.filter((_, idx) => idx !== rIdx); setFormData(prev => ({ ...prev, placements: n }));
                              }}><X size={14} /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'map' && (
              <div className="minimal-card">
                <div className="section-header">
                  <h2>Campus Coordinates</h2>
                  <p>Set precise geographical markers for the institution.</p>
                </div>
                <div className="form-grid mb-8">
                  <div className="form-group"><label>Latitude</label><input type="number" name="location.coordinates.latitude" value={formData.location?.coordinates?.latitude || ''} onChange={handleInput} step="any" /></div>
                  <div className="form-group"><label>Longitude</label><input type="number" name="location.coordinates.longitude" value={formData.location?.coordinates?.longitude || ''} onChange={handleInput} step="any" /></div>
                  <div className="form-group full-width">
                    <button className="flex items-center justify-center gap-2 bg-gray-50 text-gray-700 py-3 rounded-lg border border-dashed border-gray-300 font-bold hover:bg-gray-100 transition" onClick={fetchCurrentLocation}><Navigation size={18} /> Sync GPS Location</button>
                  </div>
                </div>
                <div className="map-preview h-96">
                  {formData.location?.coordinates?.latitude && formData.location?.coordinates?.longitude ? (
                    <iframe title="map" src={`https://www.openstreetmap.org/export/embed.html?bbox=${formData.location.coordinates.longitude - 0.005}%2C${formData.location.coordinates.latitude - 0.005}%2C${formData.location.coordinates.longitude + 0.005}%2C${formData.location.coordinates.latitude + 0.005}&layer=mapnik&marker=${formData.location.coordinates.latitude}%2C${formData.location.coordinates.longitude}`} width="100%" height="100%" />
                  ) : (
                    <div className="text-gray-300 flex flex-col items-center gap-2"><Target size={48} /><p className="font-bold">Coordinates required</p></div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'hostel' && (
              <div className="minimal-card">
                <div className="section-header">
                  <h2>Residential Ecosystem</h2>
                  <p>Detailed accommodation metrics and amenities.</p>
                </div>
                <div className="form-grid mb-8">
                  <div className="form-group"><label>Availability</label>
                    <div className="tags-container">{['Available', 'Not Available'].map(s => (
                      <button key={s} className={`tag-chip ${formData.hostel?.available === (s === 'Available') ? 'active' : ''}`} onClick={() => setFormData(p => ({ ...p, hostel: { ...p.hostel, available: s === 'Available' } }))}>{s}</button>
                    ))}</div>
                  </div>
                  <div className="form-group"><label>Contact Number</label><input name="hostel.contactNumber" value={formData.hostel?.contactNumber || ''} onChange={handleInput} /></div>
                  <div className="form-group"><label>Total Rooms</label><input name="hostel.rooms" value={formData.hostel?.rooms || ''} onChange={handleInput} /></div>
                </div>

                {formData.hostel?.available && (
                  <>
                    <div className="hostel-grid mb-12">
                      <div className="hostel-type-card">
                        <h4 className="text-blue-600"><Check size={16} /> Boys Accommodation</h4>
                        <div className="flex flex-col gap-4">
                          <div className="form-group"><label>Annual Fees</label><input type="number" name="hostel.boys.fees" value={formData.hostel?.boys?.fees || ''} onChange={handleInput} /></div>
                          <div className="form-group"><label>Mess Fees / Mo</label><input type="number" name="hostel.boys.messFees" value={formData.hostel?.boys?.messFees || ''} onChange={handleInput} /></div>
                        </div>
                      </div>
                      <div className="hostel-type-card">
                        <h4 className="text-pink-600"><Check size={16} /> Girls Accommodation</h4>
                        <div className="flex flex-col gap-4">
                          <div className="form-group"><label>Annual Fees</label><input type="number" name="hostel.girls.fees" value={formData.hostel?.girls?.fees || ''} onChange={handleInput} /></div>
                          <div className="form-group"><label>Mess Fees / Mo</label><input type="number" name="hostel.girls.messFees" value={formData.hostel?.girls?.messFees || ''} onChange={handleInput} /></div>
                        </div>
                      </div>
                    </div>
                    <div className="section-header mb-6"><h3>Ecosystem Amenities</h3></div>
                    <div className="tags-container mb-8">
                      {[
                        { key: 'wifi', label: 'Wi-Fi', Icon: Wifi },
                        { key: 'laundry', label: 'Laundry', Icon: Wind },
                        { key: 'cctv', label: 'Security', Icon: Shield },
                        { key: 'gym', label: 'Gym', Icon: Activity },
                        { key: 'mess', label: 'Mess', Icon: Coffee }
                      ].map(({ key, label, Icon }) => {
                        const active = formData.hostel?.facilities?.[key];
                        return (
                          <button key={key} className={`tag-chip flex items-center gap-2 ${active ? 'active' : ''}`} onClick={() => setFormData(p => ({ ...p, hostel: { ...p.hostel, facilities: { ...p.hostel?.facilities, [key]: !active } } }))}><Icon size={14} /> {label}</button>
                        );
                      })}
                    </div>
                    <div className="form-group full-width"><label>Notes & Guidelines</label><textarea name="hostel.description" value={formData.hostel?.description || ''} onChange={handleInput} rows={4} /></div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'facilities' && (
              <div className="minimal-card">
                <div className="section-header">
                  <h2>Campus Utilities</h2>
                  <p>Register amenities and research infrastructure.</p>
                </div>
                <div className="facilities-manager">
                  <div className="flex gap-4 mb-8">
                    <input ref={facilityRef} className="flex-1 border rounded-lg px-4 py-2" placeholder="e.g. Robotic Lab" onKeyDown={(e) => e.key === 'Enter' && addFacility()} />
                    <button className="global-save-btn" onClick={addFacility}>Add Facility</button>
                  </div>
                  <div className="tags-container">
                    {(formData.facilities || []).map((f, i) => (
                      <div key={i} className="tag-chip active flex items-center gap-2"><span>{f}</span><X size={12} className="cursor-pointer" onClick={() => setFormData(p => ({ ...p, facilities: (p.facilities || []).filter((_, j) => j !== i) }))} /></div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
