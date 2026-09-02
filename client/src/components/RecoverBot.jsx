import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageSquare, X, Send, Bot, User, Activity, Zap } from 'lucide-react';
import { fetchApi } from '../utils/api'; 

export default function RecoverBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: "Hi! I'm RecoverBot. I can analyze revenue data, trigger recoveries, or generate payment links for you. How can I help?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    const handleOpenBot = (e) => {
      setIsOpen(true);
      if (e.detail && e.detail.prompt) {
        setTimeout(() => {
          handleSend(e.detail.prompt);
        }, 100);
      }
    };
    window.addEventListener('open-bot', handleOpenBot);
    return () => window.removeEventListener('open-bot', handleOpenBot);
  }, []);

  const quickActions = [
    "What is our recovery rate?",
    "Show recent failed payments",
    "Explain AI strategies"
  ];

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading, activeTool]);

  const handleSend = async (textOverride) => {
    const userMessage = typeof textOverride === 'string' ? textOverride.trim() : input.trim();
    if (!userMessage || isLoading) return;

    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);
    setActiveTool(null);

    // Add a placeholder for the AI's response
    setMessages(prev => [...prev, { role: 'ai', content: '' }]);

    try {
      // We can't use our simple fetchApi wrapper for SSE, we need native fetch to process the stream
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: userMessage,
          chat_history: newMessages.slice(0, -1),
          context: { path: window.location.pathname }
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
        buffer = parts.pop(); // Keep the last incomplete chunk in buffer
        
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
                } else if (data.type === 'tool_end') {
                  setActiveTool(null);
                } else if (data.type === 'error') {
                  throw new Error(data.error);
                }
              } catch (e) {
                console.error('Error parsing SSE:', e);
              }
            }
          }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content = `Error: ${err.message}`;
        return updated;
      });
    } finally {
      setIsLoading(false);
      setActiveTool(null);
    }
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: isOpen ? 0 : 1 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-2xl bg-[#111113b8] backdrop-blur-[18px] border border-white/10 text-[#a1a1aa] shadow-[0_12px_30px_rgba(0,0,0,0.5)] flex items-center justify-center z-[9999] hover:scale-105 hover:shadow-[0_0_30px_rgba(52,211,153,0.3)] hover:text-[#34d399] hover:border-[#34d39940] transition-all"
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
            className="fixed bottom-6 right-6 w-[360px] h-[580px] max-h-[85vh] bg-[#09090be6] backdrop-blur-[32px] border border-[#ffffff15] rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8),0_0_40px_-10px_rgba(52,211,153,0.1)] z-[9999] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-[#ffffff10] bg-[#00000040]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-black border border-white/10 flex items-center justify-center text-[#34d399]">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-white tracking-wide">RecoverBot</h3>
                  <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.role === 'user' && (<div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-zinc-800"><User className="w-4 h-4 text-white" /></div>)}
                  <div className={`px-3.5 py-2.5 rounded-2xl max-w-[85%] break-words overflow-hidden text-[12.5px] leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-50 rounded-tr-none' 
                      : 'bg-[#ffffff05] border border-white/5 text-[#a1a1aa] rounded-tl-none w-full min-w-0 prose prose-invert prose-p:text-[12.5px] prose-li:text-[12.5px] prose-strong:text-white prose-p:leading-snug prose-a:text-emerald-400 prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-pre:max-w-full prose-pre:overflow-x-auto prose-sm prose-table:w-full prose-table:border-collapse prose-table:border prose-table:border-white/10 prose-th:bg-white/5 prose-th:px-3 prose-th:py-2 prose-th:border prose-th:border-white/10 prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-white/10 prose-th:text-left [&_table]:block [&_table]:overflow-x-auto [&_table]:max-w-full'
                  }`}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || '...'}</ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
              
              {activeTool && (
                <div className="flex gap-3">
                  
                  <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-none bg-[#ffffff02] border border-white/5 flex items-center gap-2 text-xs text-zinc-400">
                    <Zap className="w-3 h-3 text-amber-400" />
                    Running tool: <span className="font-mono text-white/70">{activeTool}</span>...
                  </div>
                </div>
              )}
              <div ref={endOfMessagesRef} />
            </div>

            {/* Quick Actions */}
            {messages.length === 1 && (
              <div className="px-4 pb-3 flex flex-wrap gap-2">
                {quickActions.map(action => (
                  <button
                    key={action}
                    onClick={() => handleSend(action)}
                    className="text-[11px] px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="p-3 bg-[#00000040] border-t border-[#ffffff10]">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask RecoverBot..."
                  className="w-full bg-[#ffffff05] border border-white/10 rounded-xl pl-4 pr-12 py-2.5 text-[13px] text-[#d4d4d8] placeholder:text-[#52525b] focus:outline-none focus:border-[#34d39955] transition-all"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-1.5 bg-[#34d399] text-[#09090b] rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 shadow-[0_0_15px_rgba(52,211,153,0.2)] transition-all"
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
