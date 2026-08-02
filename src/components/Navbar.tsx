'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { translations } from '../data/translations';
import {
  Search,
  Sun,
  Moon,
  User,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  Globe
} from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const supabase = React.useMemo(() => createBrowserSupabase(), []);
  const {
    theme,
    toggleTheme,
    searchQuery,
    setSearchQuery,
    notificationOpen,
    toggleNotification,
    notifications,
    markAllNotificationsRead,
    activeWorkspace,
    addQuickActionLog,
    locale,
    setLocale
  } = useStore();

  const [profileDropdown, setProfileDropdown] = React.useState(false);
  const [langDropdown, setLangDropdown] = React.useState(false);
  const [session, setSession] = React.useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = React.useState(true);

  const t = translations[locale];
  const unreadCount = notifications.filter(n => n.unread).length;
  const displayName = session?.user.user_metadata?.full_name ?? session?.user.email ?? 'Guest session';
  const displayInitials = (session?.user.user_metadata?.full_name ?? session?.user.email ?? 'Vendor')
    .split(' ')
    .map((part: string) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const sessionStatus = session ? 'Authenticated' : 'Not signed in';

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleTriggerAction = (act: string) => {
    addQuickActionLog(`Action: ${act}`);
  };

  const handleSignOut = async () => {
    setProfileDropdown(false);
    await supabase.auth.signOut();
    router.replace('/login');
  };

  React.useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionLoading(false);

      if (!nextSession) {
        router.replace('/login');
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [router, supabase]);

  return (
    <>
      <header className="sticky top-0 right-0 z-30 w-full h-16 glass-panel border-b border-border/80 flex items-center justify-between px-6 bg-[#0E0B0A]/70 backdrop-blur-xl">
        {/* Search Input bar */}
        <div className="flex items-center gap-3 w-96 relative">
          <Search size={14} className="absolute left-3 text-[#C5A880]/70" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
            className="w-full bg-[#181311] hover:bg-[#201A17] focus:bg-[#120E0D] text-xs pl-9 pr-4 py-2.5 rounded-xl border border-[#C5A880]/15 focus:border-[#C5A880]/50 focus:outline-none text-[#F5F4F0] placeholder-neutral-500 transition-all duration-200"
          />
        </div>

        {/* Right Nav Options */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 rounded-xl border border-[#C5A880]/15 bg-[#181311] px-3 py-1.5 text-[10px] font-semibold text-neutral-300">
            <span className={`h-2 w-2 rounded-full ${session ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span>{sessionLoading ? 'Checking session' : sessionStatus}</span>
            {session?.user.email ? <span className="text-[#C5A880]">• {session.user.email}</span> : null}
          </div>

          {/* Elegant Bilingual Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangDropdown(!langDropdown)}
              aria-label="Choose language"
              aria-haspopup="menu"
              aria-expanded={langDropdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181311] border border-[#C5A880]/15 text-xs text-[#C5A880] hover:bg-[#201A17] font-bold transition-all"
            >
              <Globe size={13} />
              <span>{locale === 'en' ? '🇬🇧 EN' : '🇪🇹 አማ'}</span>
            </button>
            <AnimatePresence>
              {langDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-32 p-1 rounded-xl bg-[#140F0D] border border-[#C5A880]/20 shadow-2xl z-50 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => { setLocale('en'); setLangDropdown(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-[#C5A880]/10 text-neutral-300 rounded-lg flex items-center gap-2 transition"
                  >
                    <span>🇬🇧 English</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLocale('am'); setLangDropdown(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-[#C5A880]/10 text-neutral-300 rounded-lg flex items-center gap-2 transition"
                  >
                    <span>🇪🇹 አማርኛ</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* AI Helper Quick Trigger */}
          <button
            type="button"
            onClick={() => handleTriggerAction('Vendor AI Quick Audit')}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-600/10 border border-[#C5A880]/30 text-[11px] text-[#C5A880] hover:bg-[#C5A880]/20 font-bold transition-all"
          >
            <Sparkles size={11} className="animate-pulse text-[#C5A880]" />
            <span>{t.aiQuickAudit}</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2.5 rounded-xl bg-[#181311] hover:bg-[#201A17] border border-[#C5A880]/15 text-[#C5A880] transition-all duration-200"
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          </button>

          {/* Notification Button */}
          <div className="relative">
            <button
              type="button"
              onClick={toggleNotification}
              aria-label={notificationOpen ? 'Close notifications panel' : 'Open notifications panel'}
              aria-expanded={notificationOpen}
              className="p-2.5 rounded-xl bg-[#181311] hover:bg-[#201A17] border border-[#C5A880]/15 text-[#C5A880] relative transition-all duration-200"
            >
              <BellIcon />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Profile Dropdown trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileDropdown(!profileDropdown)}
              aria-haspopup="menu"
              aria-expanded={profileDropdown}
              className="flex items-center gap-2 p-0.5 rounded-xl border border-transparent transition-all duration-200"
            >
              <div className="w-8 h-8 rounded-lg bg-[#C5A880]/20 text-[#C5A880] border border-[#C5A880]/30 flex items-center justify-center font-black text-xs">
                {displayInitials}
              </div>
            </button>

            {/* Profile Dropdown Card */}
            <AnimatePresence>
              {profileDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-56 p-1.5 rounded-xl bg-[#140F0D] border border-[#C5A880]/20 shadow-2xl z-50 text-xs"
                >
                  <div className="p-2 border-b border-white/5 mb-1 text-[#F5F4F0]">
                    <p className="font-bold">{displayName}</p>
                    <p className="text-[10px] text-[#C5A880]">{session?.user.email ?? 'No account connected'}</p>
                    <p className="text-[10px] text-emerald-500 mt-1 font-semibold">{sessionStatus}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdown(false);
                      router.push('/profile');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#C5A880]/10 rounded-lg text-neutral-300 flex items-center gap-2 transition-colors"
                  >
                    <User size={13} />
                    <span>My Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 hover:bg-red-950/20 text-red-400 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <LogOut size={13} />
                    <span>{sessionLoading ? 'Signing out...' : 'Sign Out'}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Slide-out Notification Drawer */}
      <AnimatePresence>
        {notificationOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
              onClick={toggleNotification}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-screen w-80 md:w-96 bg-[#120E0D] border-l border-[#C5A880]/20 z-50 flex flex-col justify-between shadow-2xl"
            >
              <div className="p-5 flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                  <div>
                    <h3 className="font-black text-sm text-white uppercase tracking-wider">{t.saasQuality} Notifications</h3>
                    <p className="text-[10px] text-[#C5A880] font-semibold mt-0.5">{t.activeWorkspace}: {activeWorkspace}</p>
                  </div>
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    className="text-[10px] text-[#C5A880] hover:underline font-bold"
                  >
                    Clear All
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        notif.unread
                          ? 'bg-[#C5A880]/5 border-[#C5A880]/30'
                          : 'bg-[#181311]/50 border-white/5'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {notif.type === 'alert' && <AlertTriangle size={13} className="text-red-500 mt-0.5" />}
                        {notif.type === 'insight' && <Sparkles size={13} className="text-[#C5A880] mt-0.5 animate-pulse" />}
                        {notif.type === 'order' && <CheckCircle2 size={13} className="text-emerald-500 mt-0.5" />}
                        {notif.type === 'system' && <Info size={13} className="text-blue-500 mt-0.5" />}
                        <div className="flex-1 text-left">
                          <p className={`text-xs font-bold ${notif.unread ? 'text-white' : 'text-neutral-400'}`}>
                            {notif.title}
                          </p>
                          <p className="text-[10.5px] text-neutral-400 mt-1 leading-relaxed">
                            {notif.description}
                          </p>
                          <p className="text-[9px] text-[#C5A880]/60 mt-1.5 font-bold">{notif.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-white/5 bg-[#181311]/40">
                <button
                  type="button"
                  onClick={toggleNotification}
                  className="w-full py-3 bg-gradient-to-r from-[#C5A880] to-[#E5D5C0] text-[#0B0A09] text-xs font-black uppercase tracking-wider rounded-xl hover:opacity-95 transition-all duration-200 shadow-md"
                >
                  Close Panel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function BellIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell text-[#C5A880]">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
