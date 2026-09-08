import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Send, Bot, User, Zap, Database, Search, BarChart3, Activity, CreditCard, Brain, Trash2, Sparkles } from 'lucide-react';

const TOOL_ICONS = {
  chart: BarChart3,
  search: Search,
  diagnosis: Brain,
  analysis: BarChart3,
  database: Database,
  recovery: Activity,
  payment: CreditCard,
  default: Zap,
};

export default function RecoverBot() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const [messages, setMessages] = useState([
    { role: 'ai', content: "Hey! I'm **RecoverBot** — your AI finance co-pilot. I can analyze revenue, diagnose failures, trigger recoveries, or create payment links. What do you need?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [toolLabel, setToolLabel] = useState('');
  const [toolIcon, setToolIcon] = useState('default');
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    const handleOpenBot = (e) => {
      setIsOpen(true);
      if (e.detail && e.detail.prompt) {
        setTimeout(() => handleSend(e.detail.prompt), 100);
      }
    };
    window.addEventListener('open-bot', handleOpenBot);
    return () => window.removeEventListener('open-bot', handleOpenBot);
  }, []);

  // Context-aware quick actions based on current page
  const quickActions = (() => {
    const path = location.pathname;
    if (path.includes('/transactions')) return [
      "Show top 5 failed payments",
      "Analyze why payments failed this week",
      "What's the most common failure reason?"
    ];
    if (path.includes('/recover')) return [
      "How many recoveries happened today?",
      "Show recovery success rate",
      "What's the best recovery strategy?"
    ];
    return [
      "📊 Show me recovery metrics",
      "🔍 Find recent failed payments",
      "📈 Analyze failure trends",
    ];
  })();

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading, activeTool]);

  const clearChat = () => {
    setMessages([
      { role: 'ai', content: "Chat cleared! How can I help you?" }
    ]);
  };

  const handleSend = async (textOverride) => {
    const userMessage = typeof textOverride === 'string' ? textOverride.trim() : input.trim();
    if (!userMessage || isLoading) return;

    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);
    setActiveTool(null);
    setToolLabel('');

    setMessages(prev => [...prev, { role: 'ai', content: '' }]);

    try {
      const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : '/api';
      const res = await fetch(API_BASE + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          chat_history: newMessages.filter(m => m.content).slice(-10),
          context: { 
            path: window.location.pathname,
            transactionId: window.location.pathname.match(/pay_[a-zA-Z0-9]+/)?.[0] || null,
          }
        })
      });

      if (!res.ok) throw new Error('Network response was not ok');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiResponseText = '';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();
        
        for (const part of parts) {
          const lines = part.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'content') {
                  aiResponseText += data.content;
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1].content = aiResponseText;
                    return updated;
                  });
                } else if (data.type === 'tool_start') {
                  setActiveTool(data.name);
                  setToolLabel(data.label || 'Processing...');
                  setToolIcon(data.icon || 'default');
                } else if (data.type === 'tool_end') {
                  setActiveTool(null);
                  setToolLabel('');
                } else if (data.type === 'error') {
                  throw new Error(data.error);
                }
              } catch (e) {
                if (e.message && !e.message.includes('JSON')) throw e;
              }
            }
          }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content = '⚠️ Error: ' + err.message;
        return updated;
      });
    } finally {
      setIsLoading(false);
      setActiveTool(null);
      setToolLabel('');
    }
  };

  const ToolIconComponent = TOOL_ICONS[toolIcon] || Zap;

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: isOpen ? 0 : 1 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-[#111113e0] backdrop-blur-[18px] border border-white/10 text-[#a1a1aa] shadow-[0_12px_30px_rgba(0,0,0,0.5)] flex items-center justify-center z-[9999] hover:scale-110 hover:shadow-[0_0_30px_rgba(52,211,153,0.4)] hover:text-[#34d399] hover:border-[#34d39940] transition-all duration-200"
      >
        <Bot className="w-6 h-6" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 w-[420px] h-[640px] max-h-[88vh] bg-[#09090bf0] backdrop-blur-[40px] border border-[#ffffff12] rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.9),0_0_60px_-15px_rgba(52,211,153,0.08)] z-[9999] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-[#ffffff08] bg-[#00000040]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-[#34d399]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-white tracking-wide">RecoverBot</h3>
                  <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> AI Co-pilot
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={clearChat} className="text-zinc-500 hover:text-zinc-300 transition-colors p-2 rounded-lg hover:bg-white/5" title="Clear chat">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {messages.map((msg, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={"flex gap-2.5 " + (msg.role === 'user' ? 'flex-row-reverse' : '')}
                >
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-zinc-800/80 border border-white/5">
                      <User className="w-3.5 h-3.5 text-zinc-300" />
                    </div>
                  )}
                  <div className={"rounded-2xl text-[12.5px] leading-relaxed " + (
                    msg.role === 'user' 
                      ? 'px-3.5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-50 rounded-tr-sm max-w-[80%]' 
                      : 'px-4 py-3 bg-[#ffffff04] border border-[#ffffff08] text-[#d4d4d8] rounded-tl-sm w-full min-w-0'
                  )}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="recoverbot-prose">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || '...'}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {activeTool && (
                <motion.div 
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2.5"
                >
                  <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-[#ffffff04] border border-amber-500/15 flex items-center gap-2.5 text-[11px]">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <ToolIconComponent className="w-3 h-3 text-amber-400 animate-pulse" />
                    </span>
                    <span className="text-amber-300/90 font-medium">{toolLabel}</span>
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-amber-400/60 animate-bounce" style={{animationDelay: '0ms'}}></span>
                      <span className="w-1 h-1 rounded-full bg-amber-400/60 animate-bounce" style={{animationDelay: '150ms'}}></span>
                      <span className="w-1 h-1 rounded-full bg-amber-400/60 animate-bounce" style={{animationDelay: '300ms'}}></span>
                    </span>
                  </div>
                </motion.div>
              )}
              <div ref={endOfMessagesRef} />
            </div>

            {/* Quick Actions */}
            {messages.length <= 2 && !isLoading && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {quickActions.map(action => (
                  <button
                    key={action}
                    onClick={() => handleSend(action)}
                    className="text-[10.5px] px-3 py-1.5 rounded-full border border-white/8 bg-white/[0.03] text-zinc-400 hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/20 transition-all duration-200"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="p-3 bg-[#00000030] border-t border-[#ffffff08]">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask RecoverBot anything..."
                  className="w-full bg-[#ffffff06] border border-white/8 rounded-xl pl-4 pr-12 py-2.5 text-[13px] text-[#e4e4e7] placeholder:text-[#52525b] focus:outline-none focus:border-[#34d39930] focus:bg-[#ffffff08] transition-all duration-200"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-1.5 bg-[#34d399] text-[#09090b] rounded-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 shadow-[0_0_12px_rgba(52,211,153,0.15)] transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
