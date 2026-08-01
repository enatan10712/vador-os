'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { translations } from '../data/translations';
import {
  LayoutDashboard,
  Coffee,
  UtensilsCrossed,
  Boxes,
  Users,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Layers,
  Settings,
  Menu
} from 'lucide-react';

export default function Sidebar() {
  const {
    sidebarOpen,
    toggleSidebar,
    activeWorkspace,
    setActiveWorkspace,
    addQuickActionLog,
    locale
  } = useStore();

  const t = translations[locale];

  const menuItems = [
    { icon: LayoutDashboard, label: t.overview, active: true },
    { icon: Coffee, label: t.digitalMenu },
    { icon: UtensilsCrossed, label: t.posTerminal },
    { icon: Layers, label: t.kitchenKds },
    { icon: Boxes, label: t.inventory },
    { icon: Users, label: t.staffTeam },
    { icon: BarChart3, label: t.analytics }
  ];

  const workspaces = [
    'Robusta Coffee (Flagship)',
    'Robusta Coffee (Downtown)',
    'Robusta Coffee (Catering)',
    'Vador Test Workspace'
  ];

  const [workspaceDropdown, setWorkspaceDropdown] = React.useState(false);

  const handleWorkspaceChange = (ws: string) => {
    setActiveWorkspace(ws);
    setWorkspaceDropdown(false);
    addQuickActionLog(`Switched workspace to ${ws}`);
  };

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 280 : 76 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="app-sidebar fixed top-0 left-0 hidden h-screen bg-[#0E0B0A]/95 border-r border-[#C5A880]/15 z-40 flex-col justify-between md:flex"
    >
      {/* Top Section */}
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4">
        {/* Logo & Toggle Header */}
        <div className="flex items-center justify-between h-12 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#C5A880] to-[#E5D5C0] flex items-center justify-center shadow-lg shadow-[#C5A880]/10 shrink-0">
              <span className="font-extrabold text-black text-lg tracking-wider">V</span>
            </div>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col"
              >
                <span className="font-bold tracking-tight text-[#F5F4F0] text-sm uppercase">Vador OS</span>
                <span className="text-[10px] text-[#C5A880] font-semibold tracking-widest uppercase">{t.saasQuality}</span>
              </motion.div>
            )}
          </div>

          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className="p-1.5 rounded-lg border border-[#C5A880]/20 hover:bg-[#181311] text-neutral-400 transition-all duration-200"
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Workspace Selector */}
        <div className="relative mb-6">
          <button
            type="button"
            onClick={() => sidebarOpen && setWorkspaceDropdown(!workspaceDropdown)}
            aria-haspopup="listbox"
            aria-expanded={workspaceDropdown}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#181311] hover:bg-[#201A17] border border-[#C5A880]/15 transition-all duration-200"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#C5A880]/20 text-[#C5A880] flex items-center justify-center font-bold text-xs shrink-0">
                R
              </div>
              {sidebarOpen && (
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-xs font-semibold text-white truncate">{activeWorkspace}</span>
                  <span className="text-[10px] text-neutral-400">Standard Multi-Tenant</span>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <Menu size={12} className="text-[#C5A880]/70 shrink-0 ml-1" />
            )}
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {workspaceDropdown && sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute left-0 w-full mt-2 p-1 rounded-xl bg-[#140F0D] border border-[#C5A880]/20 shadow-2xl z-50"
              >
                {workspaces.map((ws) => (
                  <button
                    key={ws}
                    type="button"
                    onClick={() => handleWorkspaceChange(ws)}
                    aria-current={activeWorkspace === ws ? 'page' : undefined}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors duration-150 ${
                      activeWorkspace === ws
                        ? 'bg-[#C5A880] text-[#0B0A09] font-semibold'
                        : 'hover:bg-[#C5A880]/10 text-[#C5A880] hover:text-white'
                    }`}
                  >
                    {ws}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Menu Items */}
        <div className="space-y-1.5">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                item.active
                  ? 'bg-[#C5A880]/10 text-[#C5A880] border-l-4 border-[#C5A880] font-semibold shadow-inner'
                  : 'text-neutral-400 hover:text-white hover:bg-[#181311]/70 border-l-4 border-transparent'
              }`}
            >
              <item.icon size={18} className="shrink-0 text-[#C5A880]" />
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs tracking-wide font-medium"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Footer Section */}
      <div className="p-4 border-t border-white/5 flex flex-col gap-3">
        <button type="button" aria-label="Open settings" className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-[#181311]/70 transition-all duration-200">
          <Settings size={18} className="shrink-0 text-[#C5A880]" />
          {sidebarOpen && <span className="text-xs tracking-wide">{t.settings}</span>}
        </button>

        <div className="flex items-center gap-3 px-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#C5A880] to-[#E5D5C0] flex items-center justify-center font-bold text-xs text-[#0B0A09] shrink-0">
            JS
          </div>
          {sidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">Jules Architect</span>
              <span className="text-[10px] text-emerald-500 font-medium">Owner • Robusta</span>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
