const fs = require('fs');
const path = require('path');

// Transactions.jsx
const txPath = path.join(__dirname, 'client/src/pages/Transactions.jsx');
let txContent = fs.readFileSync(txPath, 'utf8');

const txButton = `
                          <td>
                            {!isRecovered ? (
                              <button 
                                className="run-single-btn" 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  navigate('/recover', { state: { autoRun: true, transactionId: t.id, customer: t.customer_name || t.customer } }); 
                                }}
                                style={{
                                  background: 'rgba(52,211,153,0.1)',
                                  border: '1px solid rgba(52,211,153,0.2)',
                                  color: '#34d399',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(52,211,153,0.2)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(52,211,153,0.1)';
                                }}
                              >
                                <Zap size={12} /> Recover
                              </button>
                            ) : (
                              <ChevronRight className="row-arrow" />
                            )}
                          </td>`;

txContent = txContent.replace(/<td><ChevronRight className="row-arrow" \/><\/td>/, txButton);

// Also need to make sure Zap is imported in Transactions.jsx
if (!txContent.includes('Zap')) {
  txContent = txContent.replace('Menu, Phone, Search, ShieldAlert, CheckCircle, FolderOpen } from \'lucide-react\'', 'Menu, Phone, Search, ShieldAlert, CheckCircle, FolderOpen, Zap } from \'lucide-react\'');
  // Just in case it's imported differently
  if (!txContent.includes('Zap } from')) {
    txContent = txContent.replace(/import {([^}]+)} from 'lucide-react';/, (match, p1) => {
      return `import { Zap, ${p1} } from 'lucide-react';`;
    });
  }
}

fs.writeFileSync(txPath, txContent);
console.log('Transactions.jsx patched');


// RecoveryRun.jsx
const rrPath = path.join(__dirname, 'client/src/pages/RecoveryRun.jsx');
let rrContent = fs.readFileSync(rrPath, 'utf8');

const effectPatch = `  useEffect(() => {
    reconnect();
    checkExistingJob();
  }, [reconnect, checkExistingJob]);

  useEffect(() => {
    if (location.state?.autoRun && !running) {
      startRecovery({
        count: 1,
        daysBack: 7,
        autoExecute: true,
        transactionId: location.state.transactionId
      });
      // Clear state so it doesn't loop
      navigate('/recover', { replace: true, state: {} });
    }
  }, [location.state, running, startRecovery, navigate]);`;

rrContent = rrContent.replace(
  /useEffect\(\(\) => \{\s+reconnect\(\);\s+checkExistingJob\(\);\s+\}, \[reconnect, checkExistingJob\]\);/,
  effectPatch
);

// If the user recovers a single transaction, it'd be cool to change the header text from "Pipeline" to "Pipeline for [customer]"
// But let's keep it simple.

fs.writeFileSync(rrPath, rrContent);
console.log('RecoveryRun.jsx patched');
