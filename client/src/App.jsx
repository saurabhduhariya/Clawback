import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import PageTransition from './components/PageTransition';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import RecoveryRun from './pages/RecoveryRun';
import AuditTrail from './pages/AuditTrail';
import RecoverBot from './components/RecoverBot';

function AnimatedRoutes() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="min-h-screen">
      {!isLanding && <RecoverBot />}
      {!isLanding && <Navbar />}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/transactions" element={<PageTransition><Transactions /></PageTransition>} />
          <Route path="/recover" element={<PageTransition><RecoveryRun /></PageTransition>} />
          <Route path="/transactions/:transactionId" element={<PageTransition><AuditTrail /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
