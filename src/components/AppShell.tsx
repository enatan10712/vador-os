'use client';

import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useStore } from '../store/useStore';
import { translations } from '../data/translations';

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  badge?: string;
}

export default function AppShell({ children, title, description, badge }: AppShellProps) {
  const { sidebarOpen, activeWorkspace, locale } = useStore();
  const t = translations[locale];
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />

      <div
        className="app-shell-content flex-1 min-h-screen flex flex-col transition-all duration-300"
        style={{ '--sidebar-width-open': sidebarOpen ? '280px' : '76px' } as React.CSSProperties}
      >
        <Navbar />

        <main className="mx-auto flex w-full max-w-[var(--content-max-width)] flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
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
    </div>
  );
}
