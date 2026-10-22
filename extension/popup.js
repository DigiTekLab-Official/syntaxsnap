document.addEventListener('DOMContentLoaded', () => {
  // ─── TOOL LIST + SEARCH ─────────────────────────────────────────────────
  const { TOOLS } = self.SYNTAXSNAP;
  const searchInput = document.getElementById('search-input');
  const list = document.getElementById('tool-list');
  const heading = document.getElementById('list-heading');
  const empty = document.getElementById('empty');

  function render(query) {
    const q = query.trim().toLowerCase();
    const items = q
      ? TOOLS.filter((t) => `${t.name} ${t.desc} ${t.id}`.toLowerCase().includes(q))
      : TOOLS.filter((t) => t.popular);
    heading.textContent = q ? `${items.length} result${items.length === 1 ? '' : 's'}` : 'Popular';
    empty.hidden = items.length > 0;
    list.replaceChildren(...items.map((t) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = self.SYNTAXSNAP.toolUrl(t.id, '', 'popup');
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = t.name;
      const desc = document.createElement('span');
      desc.className = 'desc';
      desc.textContent = t.desc;
      a.append(name, desc);
      li.append(a);
      return li;
    }));
  }

  render('');
  searchInput.addEventListener('input', (e) => render(e.target.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') list.querySelector('a')?.click();
  });
  setTimeout(() => searchInput.focus(), 10);

  // ─── SVG EXTRACTOR LOGIC ────────────────────────────────────────────────
  const extractBtn = document.getElementById('extract-svg-btn');
  const resultsDiv = document.getElementById('svg-results');

  // CONSTANTS
  const MAX_SVG_COUNT = 50;
  const MAX_SVG_BYTES = 100_000; // 100 KB per SVG

  function setStatus(message, isError) {
    const div = document.createElement('div');
    div.className = `status ${isError ? 'error' : ''}`;
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
        item.className = 'svg-row';

        // ─── INJECT SVG HIGHLIGHT ON HOVER ──────────────────────────
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
                    outline: 3px dashed #27b4f2 !important;
                    outline-offset: 4px !important;
                    background-color: rgba(39, 180, 242, 0.12) !important;
                    box-shadow: 0 0 20px rgba(39, 180, 242, 0.45) !important;
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
        leftWrapper.className = 'meta';

        // 3. The Visual Preview (The Magic)
        const previewImg = document.createElement('img');
        
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
        label.textContent = `SVG (${svg.info})`;

        // Assemble left side
        leftWrapper.appendChild(previewImg);
        leftWrapper.appendChild(label);

        // 5. The Button
        const sendBtn = document.createElement('button');
        sendBtn.type = 'button';
        sendBtn.textContent = 'To JSX';

        sendBtn.addEventListener('click', () => {
          // The original SVG goes in the URL fragment, which is never sent to the server
          chrome.tabs.create({ url: self.SYNTAXSNAP.toolUrl('svg-to-jsx', svg.code, 'popup_svg') });
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