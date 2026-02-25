document.addEventListener('DOMContentLoaded', () => {
  const extractBtn = document.getElementById('extract-svg-btn');
  const resultsDiv = document.getElementById('svg-results');

  // ─── CONSTANTS ──────────────────────────────────────────────────────────
  const MAX_SVG_COUNT = 50;
  const MAX_SVG_BYTES = 100_000; // 100 KB per SVG

  function setStatus(message, isError) {
    const div = document.createElement('div');
    div.className = `status-message ${isError ? 'error' : 'info'}`;
    div.textContent = message;
    resultsDiv.replaceChildren(div);
  }

  // Covers Chrome, Firefox, Edge, and all restricted browser-internal pages
  const BLOCKED_URL_PREFIXES = [
    'chrome://',
    'chrome-extension://',
    'moz-extension://',
    'edge://',
    'about:',
    'data:',
    'file://',
    'view-source:',
    'devtools://',
    'resource://',
    'https://chrome.google.com',
    'https://addons.mozilla.org',
    'https://microsoftedge.microsoft.com',
  ];

  extractBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.id || !tab.url || BLOCKED_URL_PREFIXES.some(p => tab.url.startsWith(p))) {
        setStatus('Cannot extract from this page. Try a normal website!', true);
        return;
      }

      setStatus('Scanning page…', false);

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (maxCount, maxBytes) => {
          const elements = Array.from(document.querySelectorAll('svg')).slice(0, maxCount);
          return elements.map((svg, index) => {
            const code = svg.outerHTML;
            if (code.length > maxBytes) return null; // skip oversized SVGs
            const w = svg.getAttribute('width') || 'auto';
            const h = svg.getAttribute('height') || 'auto';
            // We save the exact DOM index here as 'id' to use for highlighting later
            return { id: index, code, info: `${w}×${h}` };
          }).filter(Boolean);
        },
        args: [MAX_SVG_COUNT, MAX_SVG_BYTES],
      });

      const svgs = results?.[0]?.result;

      resultsDiv.replaceChildren();

      if (!svgs || svgs.length === 0) {
        setStatus('No SVGs found on this page.', false);
        return;
      }

      svgs.forEach(svg => {
        // 1. The Container
        const item = document.createElement('div');
        item.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:#0f172a;padding:8px 12px;border-radius:6px;border:1px solid #334155;margin-bottom:8px;cursor:pointer;transition:border-color 0.2s ease;';
        
        // Add a hover effect to the popup item itself
        item.onmouseover = () => item.style.borderColor = '#8b5cf6';
        item.onmouseout = () => item.style.borderColor = '#334155';

        // ─── NEW: INJECT SVG HIGHLIGHT ON HOVER ──────────────────────────
        item.addEventListener('mouseenter', async () => {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (svgIndex) => {
              // Inject the CSS if it doesn't exist
              if (!document.getElementById('syntaxsnap-highlight-style')) {
                const style = document.createElement('style');
                style.id = 'syntaxsnap-highlight-style';
                style.textContent = `
                  .syntaxsnap-svg-highlight {
                    outline: 3px dashed #8b5cf6 !important;
                    outline-offset: 4px !important;
                    background-color: rgba(139, 92, 246, 0.15) !important;
                    box-shadow: 0 0 20px rgba(139, 92, 246, 0.5) !important;
                    transition: all 0.2s ease !important;
                    border-radius: 4px !important;
                    z-index: 999999 !important;
                  }
                `;
                document.head.appendChild(style);
              }

              // Remove any lingering highlights
              document.querySelectorAll('.syntaxsnap-svg-highlight').forEach(el => el.classList.remove('syntaxsnap-svg-highlight'));

              // Add highlight to the specific SVG and scroll to it
              const targetSvg = document.querySelectorAll('svg')[svgIndex];
              if (targetSvg) {
                targetSvg.classList.add('syntaxsnap-svg-highlight');
                targetSvg.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            },
            args: [svg.id] // Pass the exact DOM index to the page
          });
        });

        item.addEventListener('mouseleave', async () => {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (svgIndex) => {
              const targetSvg = document.querySelectorAll('svg')[svgIndex];
              if (targetSvg) {
                targetSvg.classList.remove('syntaxsnap-svg-highlight');
              }
            },
            args: [svg.id]
          });
        });
        // ─────────────────────────────────────────────────────────────────

        // 2. The Left Side (Preview + Text)
        const leftWrapper = document.createElement('div');
        leftWrapper.style.cssText = 'display:flex;align-items:center;gap:10px;overflow:hidden;';

        // 3. The Visual Preview (The Magic)
        const previewImg = document.createElement('img');
        previewImg.style.cssText = 'width:24px;height:24px;object-fit:contain;background:#1e293b;border-radius:4px;padding:4px;';
        
        // Force 'currentColor' to be visible on dark background
        let visibleSvgCode = svg.code.replace(/currentColor/gi, '#e2e8f0');
        
        // Inject SVG namespace if the page omitted it (required outside the DOM)
        if (!visibleSvgCode.includes('xmlns=')) {
          visibleSvgCode = visibleSvgCode.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }

        // Use percent-encoding — works with all Unicode content and special chars
        previewImg.src = `data:image/svg+xml,${encodeURIComponent(visibleSvgCode)}`;
        previewImg.alt = '';
        previewImg.onerror = () => { previewImg.style.display = 'none'; };

        // 4. The Label Text
        const label = document.createElement('span');
        label.style.cssText = 'font-size:11px;color:#94a3b8;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px;';
        label.textContent = `SVG (${svg.info})`;

        // Assemble left side
        leftWrapper.appendChild(previewImg);
        leftWrapper.appendChild(label);

        // 5. The Button
        const sendBtn = document.createElement('button');
        sendBtn.textContent = 'Send to JSX';
        sendBtn.style.cssText = 'background:#6366f1;color:white;border:none;padding:4px 8px;border-radius:4px;font-size:10px;cursor:pointer;font-weight:bold;';

        sendBtn.addEventListener('click', () => {
          const encoded = encodeURIComponent(svg.code); // We send the ORIGINAL code, not the altered preview one
          chrome.tabs.create({ url: `https://syntaxsnap.com/tools/svg-to-jsx?input=${encoded}` });
        });

        // Assemble final row
        item.appendChild(leftWrapper);
        item.appendChild(sendBtn);
        resultsDiv.appendChild(item);
      });

    } catch (error) {
      setStatus('Error: Please refresh the page and try again.', true);
      console.error('[SyntaxSnap]', error);
    }
  });
});