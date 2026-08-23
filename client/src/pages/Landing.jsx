import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

/* ─── Interactive Particle Background (from template) ─── */
function InteractiveBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let mouseX = 0, mouseY = 0;
    const particles = [];

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 0.5;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
        const r = Math.floor(Math.random() * 100 + 155);
        const g = Math.floor(Math.random() * 100 + 155);
        this.color = `rgba(${r}, ${g}, 255, 0.5)`;
      }
      update() {
        this.x += this.speedX + (mouseX - canvas.width / 2) * 0.005;
        this.y += this.speedY + (mouseY - canvas.height / 2) * 0.005;
        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
      }
      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    const onMouse = (e) => { mouseX = e.clientX; mouseY = e.clientY; };

    resize();
    for (let i = 0; i < 80; i++) particles.push(new Particle());

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      animId = requestAnimationFrame(animate);
    };
    animate();

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouse);
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
      cancelAnimationFrame(animId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />;
}

/* ─── Animated Stat Counter ─── */
function StatCard({ icon, value, label, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + delay }}
      className="text-center"
    >
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="bg-zinc-900/50 rounded-xl p-6 backdrop-blur-lg border border-white/10 transition-colors hover:border-white/20"
      >
        <div className="mb-2 text-white/70 flex justify-center text-2xl">{icon}</div>
        <div className="text-2xl md:text-3xl font-bold mb-1">{value}</div>
        <div className="text-sm text-zinc-400">{label}</div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Feature Card ─── */
function FeatureCard({ icon, title, desc, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <motion.div
        whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.2)' }}
        className="bg-zinc-900/50 backdrop-blur-lg border border-white/10 rounded-xl p-6 h-full transition-colors"
      >
        <div className="text-3xl mb-4">{icon}</div>
        <h3 className="text-base font-semibold mb-2">{title}</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Landing Page ─── */
export default function Landing() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const [isHovered, setIsHovered] = useState(false);

  const features = [
    { icon: '🔍', title: 'Auto-Detection', desc: 'Continuously monitors your Razorpay transactions — catches failed payments, abandoned checkouts, and overdue invoices automatically.' },
    { icon: '🧠', title: 'AI Root-Cause Diagnosis', desc: 'Gemini AI analyzes each failure — determines if retryable, urgency level, and the optimal recovery action to take.' },
    { icon: '🛡️', title: 'Smart Guardrails', desc: 'Prevents over-contacting customers with max retry limits, cooldown timers, and non-retryable failure detection.' },
    { icon: '⚡', title: 'One-Click Recovery', desc: 'Creates real Razorpay payment links, invoices, and retry orders through live API calls in test mode.' },
    { icon: '📊', title: 'Recovery Analytics', desc: 'Real-time dashboard with charts showing recovery rates by type, action effectiveness, and run history.' },
    { icon: '📋', title: 'Full Audit Trail', desc: 'Every AI decision, API call, and customer outcome logged with complete explainability for each transaction.' },
  ];

  const steps = [
    { num: '01', title: 'Payment Fails', desc: 'A card is declined, checkout abandoned, subscription lapses, or invoice goes overdue.' },
    { num: '02', title: 'Agent Detects', desc: 'The LangGraph agent loads the failed transaction with full customer context from the database.' },
    { num: '03', title: 'AI Diagnoses', desc: 'Gemini analyzes root cause, determines retryability, urgency, and recommends a specific action.' },
    { num: '04', title: 'Guardrails Check', desc: 'Enforces max retries, cooldown periods, and blocks non-retryable failures before taking action.' },
    { num: '05', title: 'Execute Recovery', desc: 'Creates a Razorpay payment link, invoice, or order — real API call with the recommended strategy.' },
    { num: '06', title: 'Revenue Recovered', desc: 'Outcome logged in the audit trail with full Razorpay response. Dashboard updated in real-time.' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="min-h-screen text-white relative" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <InteractiveBackground />

      <div className="relative z-10">
        {/* ─── HEADER ─── */}
        <header className="w-full py-0 px-6 sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/5 h-16 flex items-center">
          <div className="w-full max-w-7xl mx-auto flex items-center justify-between relative">
            
            {/* Left: Logo */}
            <div className="flex items-center gap-2.5 z-10">
              <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center text-black text-sm font-bold">⚡</div>
              <span className="text-lg font-semibold text-white tracking-tight">RecoverAI</span>
            </div>
            
            {/* Center: Pill Navigation */}
            <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 px-1.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              {["Features", "How It Works"].map(n => (
                <a key={n} href={`#${n.toLowerCase().replace(/\s/g, "-")}`}
                  className="px-4 py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold tracking-[0.15em] transition-colors uppercase text-zinc-400 hover:text-white">
                  {n}
                </a>
              ))}
            </nav>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-6 z-10">
              <span className="hidden sm:flex text-[10px] sm:text-[11px] font-bold tracking-[0.15em] text-zinc-400 hover:text-white transition-colors cursor-pointer items-center gap-1.5">
                <span className="text-zinc-600 text-xs">▸</span> LOGIN <span className="text-zinc-600 text-xs">◂</span>
              </span>
              <Link to="/dashboard"
                className="bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10 px-5 py-2.5 rounded-lg text-[10px] sm:text-[11px] font-bold tracking-[0.15em] transition-all flex items-center gap-2 shadow-sm">
                <span className="text-zinc-500 text-xs">▸</span> OPEN DASHBOARD
              </Link>
            </div>

          </div>
        </header>

        {/* ─── HERO ─── */}
        <section ref={heroRef} className="min-h-screen relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 to-black" />

          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative pt-32 pb-16 px-4">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center mb-16"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-zinc-300 mb-8 backdrop-blur-lg"
                >
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Built for Razorpay Buildathon 2026
                </motion.div>

                <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold mb-6 tracking-tight relative">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
                    Recover Lost Revenue
                  </span>
                  <motion.span
                    className="absolute -inset-1 bg-white rounded-full blur-3xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.05, 0] }}
                    transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse' }}
                  />
                </h1>

                <p className="text-base md:text-lg mb-10 text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                  An autonomous AI agent powered by LangGraph & Gemini that detects failed payments,
                  diagnoses root causes, and recovers revenue via Razorpay APIs.
                </p>

                <div className="flex gap-4 justify-center flex-wrap">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link to="/dashboard"
                      className="bg-white text-black hover:bg-zinc-200 text-base px-8 py-3 rounded-full font-medium transition-colors inline-flex items-center gap-2 shadow-xl relative overflow-hidden group"
                      onMouseEnter={() => setIsHovered(true)}
                      onMouseLeave={() => setIsHovered(false)}
                    >
                      <span className="relative z-10">Launch Dashboard</span>
                      <motion.span
                        className="absolute inset-0 bg-gradient-to-r from-zinc-200 to-white"
                        initial={{ x: '100%' }}
                        animate={{ x: isHovered ? '0%' : '100%' }}
                        transition={{ duration: 0.3 }}
                      />
                      <motion.span
                        animate={{ x: isHovered ? 5 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="relative z-10"
                      >→</motion.span>
                    </Link>
                  </motion.div>
                  <a href="#how-it-works"
                    className="border border-white/10 bg-white/5 hover:bg-white/10 text-base px-8 py-3 rounded-full font-medium transition-colors backdrop-blur-lg">
                    See How It Works
                  </a>
                </div>
              </motion.div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                <StatCard icon="📊" value="120+" label="Transactions Monitored" delay={0} />
                <StatCard icon="✅" value="36" label="Payments Recovered" delay={0.1} />
                <StatCard icon="📈" value="26.6%" label="Recovery Rate" delay={0.2} />
                <StatCard icon="🔗" value="7" label="LangGraph Nodes" delay={0.3} />
              </div>
            </div>
          </motion.div>
        </section>

        {/* ─── FEATURES ─── */}
        <section id="features" className="py-24 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-900/30 to-black" />
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="max-w-7xl mx-auto px-4 relative z-10"
          >
            <motion.div variants={itemVariants} className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
                  Intelligent Recovery
                </span>
              </h2>
              <p className="text-base text-zinc-400 max-w-xl mx-auto">
                A 7-node AI state machine that turns failed payments into recovered revenue.
              </p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f, i) => <FeatureCard key={i} index={i} {...f} />)}
            </div>
          </motion.div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section id="how-it-works" className="py-24 bg-zinc-900/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="max-w-4xl mx-auto px-4 relative z-10"
          >
            <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl font-bold mb-14 text-center text-zinc-200">
              How It Works
            </motion.h2>

            <div className="space-y-6">
              {steps.map((s, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className="flex gap-6 items-start"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white text-black flex items-center justify-center font-bold text-sm">
                    {s.num}
                  </div>
                  <motion.div
                    whileHover={{ borderColor: 'rgba(255,255,255,0.2)' }}
                    className="flex-1 bg-black/50 backdrop-blur-lg rounded-xl p-6 border border-white/10 transition-colors"
                  >
                    <h3 className="text-base font-semibold mb-1">{s.title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{s.desc}</p>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ─── CTA ─── */}
        <section className="py-24 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 to-black" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto px-4 text-center relative z-10"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
                Ready to Recover?
              </span>
            </h2>
            <p className="text-base text-zinc-400 mb-10 max-w-md mx-auto">
              See the AI recovery agent in action. Analyze failures, execute strategies, track every decision.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/dashboard"
                className="bg-white text-black hover:bg-zinc-200 text-base px-8 py-3 rounded-full font-medium shadow-xl transition-colors inline-flex items-center gap-2">
                🚀 Open Dashboard
                <span>→</span>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="bg-black py-10 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-black text-[10px] font-bold">⚡</div>
                <span className="font-semibold text-sm">RecoverAI</span>
                <span className="text-zinc-500 text-sm">— Built for Razorpay Buildathon 2026</span>
              </div>
              <div className="flex gap-6 text-sm">
                <Link to="/dashboard" className="text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
                <Link to="/transactions" className="text-zinc-400 hover:text-white transition-colors">Transactions</Link>
                <Link to="/recover" className="text-zinc-400 hover:text-white transition-colors">Recovery</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
