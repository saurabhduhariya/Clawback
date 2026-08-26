import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageSquare, X, Send, Bot, User, Activity } from 'lucide-react';
import { fetchApi } from '../utils/api'; // Make sure this is exported from api.js

export default function RecoverBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: "Hi! I'm RecoverBot. I can analyze revenue data, trigger recoveries, or generate payment links for you. How can I help?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetchApi('/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: userMessage,
          chat_history: newMessages.slice(0, -1) // send previous history
        })
      });
      setMessages([...newMessages, { role: 'ai', content: response.reply }]);
    } catch (err) {
      setMessages([...newMessages, { role: 'ai', content: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: isOpen ? 0 : 1 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-black shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-emerald-400/50 flex items-center justify-center z-50 hover:scale-105 hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] transition-all"
      >
        <MessageSquare className="w-6 h-6" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 w-[400px] h-[650px] max-h-[85vh] bg-zinc-950/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl shadow-emerald-900/20 z-50 flex flex-col overflow-hidden ring-1 ring-white/5"
          >
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Activity className="w-4 h-4 text-black" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">RecoverBot</h3>
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
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-zinc-800' : 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-black shadow-md shadow-emerald-500/20'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl max-w-[75%] text-sm ${
                    msg.role === 'user' 
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-50 rounded-tr-none' 
                      : 'bg-zinc-900/80 border border-white/5 text-zinc-300 rounded-tl-none prose prose-invert prose-p:leading-snug prose-a:text-emerald-400 prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-sm prose-table:w-full prose-table:border-collapse prose-table:border prose-table:border-white/10 prose-th:bg-white/5 prose-th:px-3 prose-th:py-2 prose-th:border prose-th:border-white/10 prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-white/10 prose-th:text-left'
                  }`}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-black flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-zinc-900/80 border border-white/5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={endOfMessagesRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-zinc-900/50 border-t border-white/10">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask RecoverBot..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-1.5 bg-gradient-to-tr from-emerald-500 to-teal-400 text-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 shadow-md shadow-emerald-500/20 transition-all"
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
