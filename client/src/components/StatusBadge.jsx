const STYLES = {
  failed:        { bg: 'bg-accent-red/12', text: 'text-red-400', dot: 'bg-accent-red' },
  abandoned:     { bg: 'bg-accent-orange/12', text: 'text-amber-300', dot: 'bg-accent-orange' },
  overdue:       { bg: 'bg-accent-pink/12', text: 'text-pink-300', dot: 'bg-accent-pink' },
  recovered:     { bg: 'bg-accent-green/12', text: 'text-emerald-300', dot: 'bg-accent-green shadow-[0_0_8px_rgba(16,185,129,0.5)]' },
  recovering:    { bg: 'bg-accent-blue/12', text: 'text-blue-300', dot: 'bg-accent-blue' },
  unrecoverable: { bg: 'bg-accent-purple/12', text: 'text-purple-300', dot: 'bg-accent-purple' },
};

export default function StatusBadge({ status }) {
  const s = STYLES[status] || STYLES.failed;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.7rem] font-semibold uppercase tracking-wide ${s.bg} ${s.text}`}>
      <span className={`badge-dot ${s.dot}`} />
      {status}
    </span>
  );
}
