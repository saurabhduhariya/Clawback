import { NavLink } from 'react-router-dom';

export default function Navbar() {
  const base = 'px-4 py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold tracking-[0.15em] transition-colors uppercase';
  const inactive = `${base} text-zinc-400 hover:text-white`;
  const active = `${base} text-white bg-white/10`;

  return (
    <nav className="flex items-center justify-between px-6 h-16 bg-black/60 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
      
      {/* Left: Logo */}
      <NavLink to="/" className="flex items-center gap-2.5 z-10">
        <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center text-black text-sm font-bold">
          ⚡
        </div>
        <span className="text-lg font-bold tracking-tight text-white">
          RecoverAI
        </span>
      </NavLink>

      {/* Center: Pill Navigation */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 px-1.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? active : inactive}>
          Dashboard
        </NavLink>
        <NavLink to="/transactions" className={({ isActive }) => isActive ? active : inactive}>
          Transactions
        </NavLink>
        <NavLink to="/audit/dummy" className={({ isActive }) => isActive ? active : inactive}>
          Audit
        </NavLink>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-6 z-10">
        <span className="hidden sm:flex text-[10px] sm:text-[11px] font-bold tracking-[0.15em] text-zinc-400 hover:text-white transition-colors cursor-pointer items-center gap-1.5">
          <span className="text-zinc-600 text-xs">▸</span> LOGIN <span className="text-zinc-600 text-xs">◂</span>
        </span>
        <NavLink to="/recover" className="bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10 px-5 py-2.5 rounded-lg text-[10px] sm:text-[11px] font-bold tracking-[0.15em] transition-all flex items-center gap-2 shadow-sm">
          <span className="text-zinc-500 text-xs">▸</span> START RECOVERY
        </NavLink>
      </div>
    </nav>
  );
}
