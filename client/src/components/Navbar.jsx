import { NavLink } from 'react-router-dom';

export default function Navbar() {
  const base = 'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative';
  const inactive = `${base} text-txt-secondary hover:text-txt-primary hover:bg-glass-hover`;
  const active = `${base} text-accent-blue bg-accent-blue/10`;

  return (
    <nav className="flex items-center justify-between px-6 h-16 bg-base/80 backdrop-blur-xl border-b border-border-glass sticky top-0 z-50">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-sm shadow-[0_0_20px_rgba(79,125,245,0.3)]">
          ⚡
        </div>
        <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-[#aab4ff] bg-clip-text text-transparent">
          RecoverAI
        </span>
      </div>
      <div className="flex gap-1">
        <NavLink to="/" end className={({ isActive }) => isActive ? active : inactive}>
          Dashboard
        </NavLink>
        <NavLink to="/transactions" className={({ isActive }) => isActive ? active : inactive}>
          Transactions
        </NavLink>
        <NavLink to="/recover" className={({ isActive }) => isActive ? active : inactive}>
          Recovery
        </NavLink>
      </div>
    </nav>
  );
}
