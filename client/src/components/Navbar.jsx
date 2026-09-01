import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, ArrowLeftRight, Zap, Activity } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: '/recover', label: 'Recovery', icon: Zap },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="h-16 flex items-center justify-between px-6 bg-black/60 backdrop-blur-xl border-b border-white/5">
        {/* Brand */}
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">Clawback</span>
        </NavLink>

        {/* Center Nav Pill */}
        <nav className="hidden sm:flex items-center bg-zinc-900/80 border border-white/5 rounded-full px-1.5 py-1 gap-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="relative px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase transition-colors"
              >
                {isActive && (
                  <motion.div
                    layoutId="navPill"
                    className="absolute inset-0 bg-white/10 border border-white/10 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-1.5 ${isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        
      </div>

      {/* Mobile bottom bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-14 bg-zinc-950/90 backdrop-blur-xl border-t border-white/5 z-50 flex items-center justify-around px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <NavLink key={item.path} to={item.path} className="relative flex flex-col items-center gap-1 py-2 px-4">
              {isActive && (
                <motion.div
                  layoutId="mobileNav"
                  className="absolute -top-0.5 left-2 right-2 h-0.5 bg-white rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-zinc-600'}`} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-zinc-600'}`}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </header>
  );
}
