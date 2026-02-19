'use client';
import React from 'react';
import { Copy, Check } from 'lucide-react';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';

interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  variant?: 'primary' | 'ghost';
  className?: string;
}

export default function CopyButton({ 
  text, 
  label = 'Copy', 
  copiedLabel = 'Copied',
  variant = 'primary',
  className = ''
}: CopyButtonProps) {
  const { copied, copy } = useCopyToClipboard();

  const baseStyles = "flex items-center gap-1.5 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: copied 
      ? "px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/50" 
      : "px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 shadow-lg",
    ghost: copied
      ? "text-emerald-400"
      : "text-slate-400 hover:text-white"
  };

  return (
    <button
      onClick={() => copy(text)}
      disabled={!text}
      aria-label="Copy to clipboard"
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {copied ? (
        <> <Check className="w-3.5 h-3.5" /> {copiedLabel} </>
      ) : (
        <> <Copy className="w-3.5 h-3.5" /> {label} </>
      )}
    </button>
  );
}