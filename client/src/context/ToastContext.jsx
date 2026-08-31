import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 4s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto"
            >
              <div className={"flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-xl " + (
                toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' :
                toast.type === 'error' ? 'bg-red-500/10 border-red-500/20' :
                'bg-zinc-800/80 border-white/10'
              )}>
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
                {toast.type === 'info' && <AlertCircle className="w-5 h-5 text-zinc-400 shrink-0" />}
                <p className={"text-sm font-medium " + (
                  toast.type === 'success' ? 'text-emerald-400' :
                  toast.type === 'error' ? 'text-red-400' :
                  'text-zinc-200'
                )}>
                  {toast.message}
                </p>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="ml-4 opacity-50 hover:opacity-100 transition-opacity"
                >
                  <XCircle className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
