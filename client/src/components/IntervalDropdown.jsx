import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Clock3 } from 'lucide-react';

const INTERVALS = ['Every 2h', 'Every 6h', 'Every 12h', 'Every 24h'];

export default function IntervalDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="interval relative" ref={ref} style={{ cursor: 'pointer' }} onClick={() => setIsOpen(!isOpen)}>
      <Clock3 className="w-4 h-4 text-zinc-400" />
      <div className="flex items-center gap-2 bg-transparent text-white text-[13px] font-semibold outline-none cursor-pointer">
        {value}
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-[120%] right-0 mt-1 w-36 bg-[#000000e6] backdrop-blur-2xl border border-white/10 rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-[100] p-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {INTERVALS.map((int) => (
              <button
                key={int}
                className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  value === int ? 'bg-emerald-400/15 text-emerald-400' : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => {
                  onChange(int);
                  setIsOpen(false);
                }}
              >
                {int}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
