'use client';

import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useStore } from '../store/useStore';
import { translations } from '../data/translations';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MessageSquare, X, Send, Bot, RefreshCw, AlertCircle } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  badge?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export default function AppShell({ children, title, description, badge }: AppShellProps) {
  const { sidebarOpen, activeWorkspace, locale } = useStore();
  const t = translations[locale];
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;

  // Floating AI Assistant States
  const [aiOpen, setAiOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      sender: 'ai',
      text: "Hello! I am your Vador OS Co-Pilot. I can query real-time data from your database. What would you like to know today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPills = [
    "Show today's revenue",
    "What ingredients will finish tomorrow?",
    "Which menu item has the highest profit?",
    "How much waste did we have?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (aiOpen) {
      scrollToBottom();
    }
  }, [messages, aiOpen]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoadingAi(true);

    try {
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToSend })
      });

      if (!response.ok) {
        throw new Error('Could not connect to AI services.');
      }

      const data = await response.json();
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.answer || "I parsed your query but couldn't retrieve any matching results. Please check your syntax or ask again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: `Error connecting to AI: ${err.message || 'Unknown network error. Is the backend offline?'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />

      <div
        className="app-shell-content flex-1 min-h-screen flex flex-col transition-all duration-300"
        style={{ '--sidebar-width-open': sidebarOpen ? '280px' : '76px' } as React.CSSProperties}
      >
        <Navbar />

        <main className="mx-auto flex w-full max-w-[var(--content-max-width)] flex-1 space-y-6 overflow-y-auto p-4 sm:p-6 pb-24">
          {offline && (
            <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              Offline mode is active. Cached operations remain available, and sync will resume automatically when connectivity returns.
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-500 font-extrabold uppercase tracking-widest">{t.systemOperational}</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-foreground mt-1 flex items-baseline gap-2">
                {title} <span className="luxury-gradient-text font-black">{activeWorkspace}</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-1">{description ?? t.welcomeBack}</p>
            </div>

            {badge && (
              <div className="flex items-center gap-3 self-start md:self-auto text-xs font-semibold text-muted-foreground">
                <span>{t.tenantStatus}</span>
                <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full font-bold">
                  {badge}
                </span>
              </div>
            )}
          </div>

          {children}
        </main>
      </div>

      {/* FLOATING AI ASSISTANT TRIGGERS & WIDGET */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

        {/* Chat Drawer panel */}
        <AnimatePresence>
          {aiOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 20, stiffness: 250 }}
              className="w-80 md:w-96 h-[480px] rounded-3xl bg-[#140F0D] border border-[#C5A880]/20 shadow-2xl flex flex-col justify-between overflow-hidden"
            >
              {/* Chat Header */}
              <div className="p-4 bg-[#1C1512] border-b border-[#C5A880]/15 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 text-black flex items-center justify-center font-bold">
                    <Bot size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Vador AI Co-Pilot</h4>
                    <p className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Connected to {activeWorkspace}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAiOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Chat Messages Log */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0F0B09]">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[#C5A880] text-[#0B0A09] rounded-tr-none font-bold'
                          : 'bg-[#181311] text-[#F5F4F0] rounded-tl-none border border-white/5'
                      }`}
                    >
                      {msg.text.split('\n').map((line, idx) => (
                        <p key={idx} className={idx > 0 ? 'mt-1' : ''}>
                          {line}
                        </p>
                      ))}
                    </div>
                    <span className="text-[8px] text-neutral-500 mt-1 font-semibold">
                      {msg.timestamp}
                    </span>
                  </div>
                ))}

                {/* Loading skeleton indicator */}
                {loadingAi && (
                  <div className="flex flex-col items-start">
                    <div className="bg-[#181311] p-3 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[#C5A880] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-[#C5A880] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-[#C5A880] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Recommendation Pills / Suggestions */}
              {messages.length === 1 && (
                <div className="px-4 py-2 border-t border-white/5 bg-[#140F0D] flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
                  {quickPills.map((pill) => (
                    <button
                      key={pill}
                      onClick={() => handleSendMessage(pill)}
                      className="text-[9px] font-bold px-2.5 py-1.5 rounded-lg bg-[#1C1512] text-[#C5A880] border border-[#C5A880]/15 hover:border-[#C5A880]/40 transition"
                    >
                      {pill}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="p-3 border-t border-white/5 bg-[#120E0D] flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage(inputText);
                  }}
                  disabled={loadingAi}
                  placeholder="Ask Vador OS anything..."
                  className="flex-1 bg-[#181311] text-xs py-2 px-3 rounded-xl border border-[#C5A880]/15 focus:outline-none focus:border-[#C5A880]/50 text-white placeholder-neutral-500"
                />
                <button
                  onClick={() => handleSendMessage(inputText)}
                  disabled={loadingAi || !inputText.trim()}
                  className="p-2.5 rounded-xl bg-[#C5A880] text-black hover:opacity-90 disabled:opacity-40 transition"
                >
                  <Send size={13} />
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Sparkles Toggle button */}
        <button
          onClick={() => setAiOpen(!aiOpen)}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 via-[#C5A880] to-amber-600 text-black px-4 py-3 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-250 font-black text-xs uppercase tracking-wider"
        >
          <Sparkles size={14} className="animate-pulse" />
          <span>Vador AI Co-Pilot</span>
        </button>

      </div>
    </div>
  );
}
