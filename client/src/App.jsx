import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import RecoveryRun from './pages/RecoveryRun';
import AuditTrail from './pages/AuditTrail';

function AppLayout() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="app">
      {!isLanding && <Navbar />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/recover" element={<RecoveryRun />} />
        <Route path="/audit/:transactionId" element={<AuditTrail />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
