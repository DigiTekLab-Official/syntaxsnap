import React, { useState } from 'react';

export default function MetaTagGenerator() {
  const [title, setTitle] = useState('SyntaxSnap – Privacy-First Developer Tools');
  const [description, setDescription] = useState('A local-first workbench for modern web development. No servers. No tracking. Just instant utilities.');
  const [url, setUrl] = useState('https://syntaxsnap.com');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop');
  const [copied, setCopied] = useState<'html' | 'next' | null>(null);

  const htmlOutput = `<title>${title}</title>
<meta name="title" content="${title}" />
<meta name="description" content="${description}" />

<meta property="og:type" content="website" />
<meta property="og:url" content="${url}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${imageUrl}" />

<meta property="twitter:card" content="summary_large_image" />
<meta property="twitter:url" content="${url}" />
<meta property="twitter:title" content="${title}" />
<meta property="twitter:description" content="${description}" />
<meta property="twitter:image" content="${imageUrl}" />`;

  const nextjsOutput = `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${title}',
  description: '${description}',
  openGraph: {
    title: '${title}',
    description: '${description}',
    url: '${url}',
    siteName: '${title.split('–')[0].trim()}',
    images: [
      {
        url: '${imageUrl}',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '${title}',
    description: '${description}',
    images: ['${imageUrl}'],
  },
};`;

  const copyToClipboard = (text: string, type: 'html' | 'next') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl mx-auto text-slate-200">
      
      {/* LEFT: Inputs */}
      <div className="w-full lg:w-1/3 flex flex-col gap-5 bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <h2 className="text-xl font-semibold text-white">Meta Details</h2>
        
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-emerald-400">Page Title</label>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            className="w-full bg-[#020617] border border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors" 
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>Recommended: 50-60</span>
            <span className={title.length > 60 ? 'text-red-400' : ''}>{title.length} chars</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-emerald-400">Description</label>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            className="w-full bg-[#020617] border border-slate-700 rounded-lg p-3 text-sm h-28 focus:outline-none focus:border-emerald-500 transition-colors resize-none" 
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>Recommended: 150-160</span>
            <span className={description.length > 160 ? 'text-red-400' : ''}>{description.length} chars</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-emerald-400">Canonical URL</label>
          <input 
            type="url" 
            value={url} 
            onChange={(e) => setUrl(e.target.value)} 
            className="w-full bg-[#020617] border border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors" 
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-emerald-400">OG Image URL</label>
          <input 
            type="url" 
            value={imageUrl} 
            onChange={(e) => setImageUrl(e.target.value)} 
            placeholder="https://..."
            className="w-full bg-[#020617] border border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors" 
          />
        </div>
      </div>

      {/* RIGHT: Previews & Code */}
      <div className="w-full lg:w-2/3 flex flex-col gap-8">
        
        {/* Visual Preview (Twitter/X style Card) */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-white">Social Preview (Twitter/LinkedIn)</h2>
          <div className="max-w-130 w-full border border-slate-700 rounded-xl overflow-hidden bg-[#020617] font-sans hover:border-slate-500 transition-colors cursor-pointer group">
            <div 
              className="w-full h-67.5 bg-slate-800 bg-cover bg-center border-b border-slate-700 group-hover:opacity-95 transition-opacity"
              style={{ backgroundImage: `url(${imageUrl})` }}
            ></div>
            <div className="p-4 flex flex-col gap-1">
              <span className="text-slate-400 text-sm truncate">{url.replace(/^https?:\/\//, '')}</span>
              <h3 className="font-bold text-slate-200 text-[15px] truncate leading-tight mt-1">{title || 'Page Title'}</h3>
              <p className="text-slate-400 text-sm line-clamp-2 leading-snug mt-0.5">{description || 'Page Description'}</p>
            </div>
          </div>
        </div>

        {/* Code Outputs */}
        <div className="grid grid-cols-1 gap-6">
          
          {/* Next.js Output */}
          <div className="flex flex-col gap-2 relative">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-emerald-400">Next.js App Router (metadata)</span>
              <button 
                onClick={() => copyToClipboard(nextjsOutput, 'next')} 
                className={`text-xs px-4 py-1.5 rounded transition-all font-medium border ${
                  copied === 'next' 
                    ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
                }`}
              >
                {copied === 'next' ? '✓ Copied!' : 'Copy Next.js'}
              </button>
            </div>
            <pre className="w-full bg-[#020617] border border-slate-800 rounded-xl p-4 text-sm font-mono text-emerald-100/80 overflow-x-auto whitespace-pre-wrap">{nextjsOutput}</pre>
          </div>

          {/* Raw HTML Output */}
          <div className="flex flex-col gap-2 relative">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-blue-400">Raw HTML Tags</span>
              <button 
                onClick={() => copyToClipboard(htmlOutput, 'html')} 
                className={`text-xs px-4 py-1.5 rounded transition-all font-medium border ${
                  copied === 'html' 
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
                }`}
              >
                {copied === 'html' ? '✓ Copied!' : 'Copy HTML'}
              </button>
            </div>
            <pre className="w-full bg-[#020617] border border-slate-800 rounded-xl p-4 text-sm font-mono text-blue-100/80 overflow-x-auto whitespace-pre-wrap">{htmlOutput}</pre>
          </div>

        </div>
      </div>
    </div>
  );
}