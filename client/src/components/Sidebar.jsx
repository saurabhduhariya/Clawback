import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ArrowLeftRight, Zap, ChevronLeft, ChevronRight, Activity
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: '/recover', label: 'Recovery', icon: Zap },
];

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        className="hidden md:flex flex-col fixed left-0 top-0 h-screen bg-zinc-950/80 backdrop-blur-xl border-r border-white/5 z-40 select-none"
        animate={{ width: expanded ? 220 : 64 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-white/5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
            <Activity className="w-4 h-4 text-black" />
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="text-sm font-bold text-white whitespace-nowrap"
              >
                Clawback
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg group transition-all duration-200 overflow-hidden"
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-white/10 border border-white/10 rounded-lg"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}

                <div className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-md transition-colors flex-shrink-0 ${
                  isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                }`}>
                  <Icon className="w-[18px] h-[18px]" />
                </div>

                <AnimatePresence>
                  {expanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                      className={`relative z-10 text-[13px] font-medium whitespace-nowrap ${
                        isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                      }`}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom toggle */}
        <div className="p-3 border-t border-white/5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center py-2 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-white/5 transition-all"
          >
            {expanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/90 backdrop-blur-xl border-t border-white/5 z-40 flex items-center justify-around px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center gap-1 py-2 px-4"
            >
              {isActive && (
                <motion.div
                  layoutId="activeMobileNav"
                  className="absolute -top-0.5 left-2 right-2 h-0.5 bg-white rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-zinc-600'}`} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-zinc-600'}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
