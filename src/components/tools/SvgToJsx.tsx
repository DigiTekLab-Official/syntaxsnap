// This component converts SVG code to React JSX format, allowing users to easily transform their SVGs for use in React projects. It includes a textarea for inputting SVG code and a preformatted area for displaying the converted JSX output. Users can also copy the resulting JSX to their clipboard with a single click.
// src/components/tools/SvgToJsx.tsx
import React, { useState, useEffect } from 'react';
import { FileCode, ClipboardCheck, Clipboard } from 'lucide-react';

export default function SvgToJsx() {
  const [input, setInput] = useState(`<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
</svg>`);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const convertSvgToJsx = (svg: string) => {
    let jsx = svg
      // 1. Remove XML declaration
      .replace(/<\?xml.*\?>/g, '')
      // 2. Remove SVG comments properly using a valid regex
      .replace(/<!--[\s\S]*?-->/g, '')
      // 3. Convert kebab-case attributes to camelCase
      .replace(/([a-z0-9])(-[a-z])/g, (g) => g[0] + g[2].toUpperCase())
      // 4. Fix 'class' to 'className'
      .replace(/class=/g, 'className=')
      // 5. Fix 'for' to 'htmlFor'
      .replace(/for=/g, 'htmlFor=')
      // 6. Basic style attribute to object conversion
      .replace(/style="([^"]*)"/g, (styleAttr) => {
        const styles = styleAttr.match(/"([^"]*)"/)?.[1] || '';
        const reactStyles = styles.split(';').filter(s => s.trim()).map(s => {
          const [key, val] = s.split(':');
          const camelKey = key.trim().replace(/-./g, x => x[1].toUpperCase());
          return `${camelKey}: "${val.trim()}"`;
        });
        return `style={{ ${reactStyles.join(', ')} }}`;
      });

    return jsx.trim();
  };

  useEffect(() => {
    setOutput(convertSvgToJsx(input));
  }, [input]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-125">
      {/* Input Section */}
      <div className="flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center gap-2">
          <FileCode className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Source SVG</span>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent p-4 font-mono text-sm text-slate-300 focus:outline-none resize-none"
          spellCheck={false}
          placeholder="Paste SVG code here..."
        />
      </div>

      {/* Output Section */}
      <div className="flex flex-col bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
             <span className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">React JSX</span>
          </div>
          <button 
            onClick={handleCopy}
            className="flex items-center gap-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg transition-all active:scale-95"
          >
            {copied ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy JSX"}
          </button>
        </div>
        <pre className="flex-1 p-4 font-mono text-sm text-emerald-400 overflow-auto whitespace-pre-wrap selection:bg-indigo-500/30">
          {output || <span className="text-slate-600">// Output will appear here...</span>}
        </pre>
      </div>
    </div>
  );
}