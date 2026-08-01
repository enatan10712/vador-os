import React from 'react';

export interface SkeletonProps {
  /** Width of the skeleton block (CSS value, e.g. "100%", "120px") */
  width?: string | number;
  /** Height of the skeleton block (CSS value, e.g. "1rem", 24) */
  height?: string | number;
  /** Additional class names */
  className?: string;
}

/**
 * Shimmer loading placeholder.
 * Uses the `.skeleton` CSS class defined in globals.css.
 */
export function Skeleton({ width, height, className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
