'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center px-6 py-12">
          <div className="max-w-lg rounded-3xl border border-border/70 bg-card/90 p-8 text-center shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">Runtime error</p>
            <h2 className="mt-3 text-2xl font-black text-foreground">Something went wrong</h2>
            <p className="mt-3 text-sm text-muted-foreground">The current view could not be rendered. Please retry or return to the dashboard.</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
