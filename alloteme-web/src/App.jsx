import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import MobileNavTags from './components/MobileNavTags';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Legal from './pages/Legal';
import { AuthProvider } from './context/AuthContext';
import CollegeLogin from './pages/college/CollegeLogin';
import CollegeDashboard from './pages/college/CollegeDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import RegisterCollegeAdmin from './pages/admin/RegisterCollegeAdmin';
import PremiumPlans from './pages/PremiumPlans';
import PortalModal from './components/PortalModal';
import './index.css';
import { useLocation } from 'react-router-dom';
import { useState } from 'react';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

function App() {
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);

  useEffect(() => {
    document.title = "AlloteMe";
  }, []);

  const openPortalModal = () => setIsPortalModalOpen(true);
  const closePortalModal = () => setIsPortalModalOpen(false);

  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <PortalModal isOpen={isPortalModalOpen} onClose={closePortalModal} />
        <div className="app-container">
          {window.location.pathname !== '/college/dashboard' && <Navbar onPortalClick={openPortalModal} />}
          {window.location.pathname !== '/college/dashboard' && <MobileNavTags onPortalClick={openPortalModal} />}
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/premium" element={<PremiumPlans />} />
              <Route path="/privacy" element={<Legal docType="privacy" />} />
              <Route path="/terms" element={<Legal docType="terms" />} />

              {/*  Portal Routes */}
              <Route path="/college/login" element={<CollegeLogin />} />
              <Route path="/college/dashboard" element={<CollegeDashboard />} />

              {/* System Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/register-college-admin" element={<RegisterCollegeAdmin />} />
            </Routes>
          </main>
          {window.location.pathname !== '/college/dashboard' && <Footer />}
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
