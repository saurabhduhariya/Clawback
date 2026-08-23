import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import RecoveryRun from './pages/RecoveryRun';
import AuditTrail from './pages/AuditTrail';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/recover" element={<RecoveryRun />} />
            <Route path="/audit/:transactionId" element={<AuditTrail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
