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
        className="fixed bottom-6 right-6 w-12 h-12 rounded-2xl bg-[#111113b8] backdrop-blur-[18px] border border-white/10 text-[#a1a1aa] shadow-[0_12px_30px_rgba(0,0,0,0.5)] flex items-center justify-center z-50 hover:scale-105 hover:text-[#34d399] hover:border-[#34d39940] transition-all"
      >
        <Bot className="w-6 h-6" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 w-[340px] h-[540px] max-h-[85vh] bg-[#111113e6] backdrop-blur-[24px] border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 bg-[#09090bcc]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-black border border-white/10 flex items-center justify-center text-[#34d399]">
                  <Bot className="w-4 h-4" />
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
                    msg.role === 'user' ? 'bg-zinc-800' : 'bg-black border border-white/10 text-[#34d399]'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl max-w-[75%] text-sm ${
                    msg.role === 'user' 
                      ? 'bg-[#34d39915] border border-[#34d39930] text-[#f4f4f5] rounded-tr-none' 
                      : 'bg-[#ffffff08] border border-white/5 text-[#a1a1aa] rounded-tl-none prose prose-invert prose-p:leading-snug prose-a:text-emerald-400 prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-sm prose-table:w-full prose-table:border-collapse prose-table:border prose-table:border-white/10 prose-th:bg-white/5 prose-th:px-3 prose-th:py-2 prose-th:border prose-th:border-white/10 prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-white/10 prose-th:text-left'
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
                  <div className="w-8 h-8 rounded-full bg-black border border-white/10 text-[#34d399] flex items-center justify-center">
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
            <form onSubmit={handleSend} className="p-3 bg-[#09090bcc] border-t border-white/10">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask RecoverBot..."
                  className="w-full bg-[#ffffff05] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-[#d4d4d8] placeholder:text-[#52525b] focus:outline-none focus:border-[#34d39955] transition-all"
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
