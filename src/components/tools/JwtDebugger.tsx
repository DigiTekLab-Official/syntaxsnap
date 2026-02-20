import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ShieldAlert, Clock, Key, Lock, 
  Copy, Check, AlertTriangle, Download, ClipboardList 
} from 'lucide-react';
import CopyButton from '../ui/CopyButton';

// ─── TYPES & HELPERS ─────────────────────────────────────────────────────────

interface JwtHeader { alg: string; typ?: string; [key: string]: unknown; }
interface JwtPayload { sub?: string; exp?: number; nbf?: number; [key: string]: unknown; }

function base64urlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

function getTokenStatus(payload: JwtPayload) {
  const now = Date.now();
  if (payload.nbf !== undefined && now < payload.nbf * 1000) {
    return { status: 'not-yet-valid', label: 'Not Yet Valid', detail: `Valid from: ${new Date(payload.nbf * 1000).toLocaleString()}` };
  }
  if (payload.exp === undefined) {
    return { status: 'no-expiry', label: 'No Expiry Set', detail: 'Security Risk: Token never expires.' };
  }
  if (now >= payload.exp * 1000) {
    return { status: 'expired', label: 'Expired', detail: `Expired at: ${new Date(payload.exp * 1000).toLocaleString()}` };
  }

  const msLeft = payload.exp * 1000 - now;
  const days = Math.round(msLeft / 86400000);
  const hours = Math.round(msLeft / 3600000);
  const mins = Math.round(msLeft / 60000);

  let detail = "";
  if (days > 365) detail = "Expires in more than a year";
  else if (days > 0) detail = `Expires in ~${days}d`;
  else if (hours > 0) detail = `Expires in ~${hours}h`;
  else detail = `Expires in ~${mins}m`;

  return { status: 'active', label: 'Valid', detail };
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

// FIX: Added ariaLabel prop to handle "empty button" errors
const ActionButton = ({ onClick, icon: Icon, label, success, primary, ariaLabel }: any) => (
  <button
    onClick={onClick}
    aria-label={ariaLabel || label}
    className={`flex items-center gap-1.5 text-[sm] font-medium transition-all px-2 py-1 rounded-md ${
      primary 
        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
        : success 
          ? 'text-emerald-400 bg-emerald-500/10' 
          : 'text-slate-500 hover:text-white hover:bg-slate-800'
    }`}
  >
    <Icon className="w-3 h-3" aria-hidden="true" /> {label}
  </button>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function JwtDebugger() {
  const [token, setToken] = useState('');
  const [decoded, setDecoded] = useState<any>({ header: null, payload: null, signature: null, isAlgNone: false, error: null });

  useEffect(() => {
    if (!token.trim()) { setDecoded({ header: null, payload: null, signature: null, isAlgNone: false, error: null }); return; }
    try {
      const parts = token.trim().split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT format.');
      const header = JSON.parse(base64urlDecode(parts[0]));
      const payload = JSON.parse(base64urlDecode(parts[1]));
      setDecoded({ header, payload, signature: parts[2], isAlgNone: (header.alg || '').toLowerCase() === 'none', error: null });
    } catch (e: any) { setDecoded({ header: null, payload: null, signature: null, isAlgNone: false, error: e.message }); }
  }, [token]);

  // copy actions handled by shared CopyButton component

  const handleDownload = (data: object, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const status = decoded.payload ? getTokenStatus(decoded.payload) : null;

  const makeReport = () => {
    if (!decoded.payload || !status) return '';
    return `**JWT Security Report | SyntaxSnap**\n----------------------------------\n**Status:** ${status.status === 'active' ? '✅ Valid' : '🔴 ' + status.label}\n**Detail:** ${status.detail}\n**Algorithm:** ${decoded.header?.alg || 'Unknown'}\n${decoded.isAlgNone ? '**CRITICAL:** alg:none detected (Unsigned Token)\\n' : ''}\n**Key Claims:**\n${Object.entries(decoded.payload).slice(0, 5).map(([k, v]) => `- ${k}: ${v}`).join('\\n')}\n\n*Generated locally at: ${new Date().toLocaleString()}*`;
  };

  return (
    <div className="space-y-6">
      {/* Input - FIX: Replaced div with label and added htmlFor/id connection */}
      <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
        <div className="flex justify-between items-center mb-4">
          <label htmlFor="jwt-input" className="flex items-center gap-2 text-indigo-400 cursor-pointer">
            <Lock className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Encoded Token</span>
          </label>
            <CopyButton text={token} label="Copy JWT" />
        </div>
        <textarea 
          id="jwt-input"
          value={token} 
          onChange={(e) => setToken(e.target.value)} 
          placeholder="header.payload.signature" 
          className="w-full h-32 bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-sm text-indigo-300 focus:outline-none resize-none break-all" 
        />
      </div>

      {/* Decoded Boxes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
        {['header', 'payload'].map((key) => (
          <div key={key} className="flex flex-col">
            <div className="flex justify-between items-center mb-2 px-1">
              {/* FIX: Replaced <label> with <h3> to avoid orphaned label error */}
              <h2 className={`text-[sm] font-bold uppercase tracking-widest ${key === 'header' ? 'text-pink-500' : 'text-indigo-400'}`}>
                {key}
              </h2>
              {decoded[key] && (
                <div className="flex gap-2">
                   <ActionButton onClick={() => handleDownload(decoded[key], `jwt-${key}.json`)} icon={Download} label="JSON" />
                     <CopyButton text={JSON.stringify(decoded[key], null, 2)} label="Copy" variant="ghost" />
                </div>
              )}
            </div>
            <pre className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-auto whitespace-pre-wrap leading-relaxed">
              {decoded[key] ? JSON.stringify(decoded[key], null, 2) : `// Waiting for ${key}...`}
            </pre>
          </div>
        ))}
      </div>

      {/* Security Analysis */}
      {decoded.payload && status && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Security Analysis</h2>
              <CopyButton text={makeReport()} label="Copy Report" variant="primary" />
          </div>

          {decoded.isAlgNone && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div><p className="text-xs font-bold text-red-400 mb-1">Critical: alg:none</p><p className="text-xs text-red-300/80">This token is unsigned and insecure.</p></div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${status.status === 'active' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
              <span className="text-[sm] font-bold opacity-70 flex items-center gap-1 mb-1"><Clock className="w-3 h-3" /> Status</span>
              <p className="text-sm font-bold">{status.label}</p><p className="text-[sm] opacity-60">{status.detail}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
               <span className="text-[sm] font-bold text-slate-400 flex items-center gap-1 mb-1"><Key className="w-3 h-3" /> Algorithm</span>
               <p className="text-sm font-mono text-white">{decoded.header?.alg || 'None'}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
               <div className="flex justify-between items-start mb-1">
                 <span className="text-[sm] font-bold text-slate-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Signature</span>
                 {/* FIX: Added ariaLabel="Copy Signature" to handle empty label text */}
                   <CopyButton text={decoded.signature} label="Copy Signature" variant="ghost" />
               </div>
               <p className="text-[sm] text-slate-500 font-mono break-all line-clamp-2">{decoded.signature}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}