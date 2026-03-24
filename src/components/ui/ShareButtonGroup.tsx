'use client';
import React, { useState } from 'react';
import { Copy, Check, Github, MessageSquare, Loader2 } from 'lucide-react';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { clsx } from 'clsx';

export interface ShareButtonGroupProps {
  text: string;
  toolSlug: string;
  className?: string;
}

export default function ShareButtonGroup({ text, toolSlug, className }: ShareButtonGroupProps) {
  // Leverage your existing custom hook!
  const { copy, isPending } = useCopyToClipboard();
  const [activeType, setActiveType] = useState<'clean' | 'github' | 'so' | null>(null);

  const handleCopy = async (type: 'clean' | 'github' | 'so') => {
    setActiveType(type);
    const toolUrl = `https://syntaxsnap.com/tools/${toolSlug}`;
    let finalCode = text;

    if (type === 'github') {
      finalCode = `${text}\n\n// Generated instantly via ${toolUrl}`;
    } else if (type === 'so') {
      finalCode = `${text}\n\n/* Generated securely via ${toolUrl} */`;
    }

    await copy(finalCode);
    
    // Reset the active state after your hook's default timeout
    setTimeout(() => setActiveType(null), 2000);
  };

  // Using your exact design tokens from CopyButton.tsx
  const baseBtnStyles = "inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 text-xs px-3 py-1.5";

  return (
    <div className={clsx("flex items-center bg-slate-900 border border-slate-700 rounded-md shadow-sm overflow-hidden w-fit", className)}>
      
      {/* 1. Clean Copy */}
      <button
        type="button"
        onClick={() => handleCopy('clean')}
        disabled={isPending}
        className={clsx(
          baseBtnStyles,
          activeType === 'clean' 
            ? "bg-emerald-500/10 text-emerald-400" 
            : "text-slate-300 hover:text-white hover:bg-slate-800/50"
        )}
        aria-label="Copy clean code"
      >
        {isPending && activeType === 'clean' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : activeType === 'clean' ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
        <span>Copy</span>
      </button>

      <div className="w-px h-5 bg-slate-700"></div>

      {/* 2. GitHub (Viral Loop) */}
      <button
        type="button"
        onClick={() => handleCopy('github')}
        disabled={isPending}
        className={clsx(
          baseBtnStyles,
          activeType === 'github'
            ? "bg-emerald-500/10 text-emerald-400"
            : "text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10"
        )}
        aria-label="Copy for GitHub"
      >
        {isPending && activeType === 'github' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : activeType === 'github' ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <Github className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">For GitHub</span>
      </button>

      <div className="w-px h-5 bg-slate-700"></div>

      {/* 3. StackOverflow (Viral Loop) */}
      <button
        type="button"
        onClick={() => handleCopy('so')}
        disabled={isPending}
        className={clsx(
          baseBtnStyles,
          activeType === 'so'
            ? "bg-emerald-500/10 text-emerald-400"
            : "text-slate-400 hover:text-orange-400 hover:bg-orange-500/10"
        )}
        aria-label="Copy for StackOverflow"
      >
        {isPending && activeType === 'so' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : activeType === 'so' ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <MessageSquare className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">For StackOverflow</span>
      </button>

    </div>
  );
}