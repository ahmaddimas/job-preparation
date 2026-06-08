"use client";

interface CardProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  id: string;
}

/**
 * Reusable animated card wrapper used throughout the results grid.
 * Applies a staggered slide-up entrance animation via CSS delay.
 */
export function Card({ children, delay = 0, className = "", id }: CardProps) {
  return (
    <article
      id={id}
      className={`animate-slide-up rounded-2xl border border-slate-800 bg-slate-900 p-5 ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </article>
  );
}
