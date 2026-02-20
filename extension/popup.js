document.addEventListener('DOMContentLoaded', () => {
  const extractBtn = document.getElementById('extract-svg-btn');
  const resultsDiv = document.getElementById('svg-results');

  function setStatus(message, isError) {
    const div = document.createElement('div');
    div.className = `status-message ${isError ? 'error' : 'info'}`;
    div.textContent = message;
    resultsDiv.replaceChildren(div);
  }

  const BLOCKED_URL_PREFIXES = ['chrome://', 'chrome-extension://', 'https://chrome.google.com', 'about:'];

  extractBtn.addEventListener('click', async () => {
    try {
      // 1. Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Chrome blocks extensions from running on its own internal pages
      if (!tab.url || BLOCKED_URL_PREFIXES.some(prefix => tab.url.startsWith(prefix))) {
        setStatus('Cannot extract from this page. Try a normal website!', true);
        return;
      }

      // Show a loading state
      setStatus('Scanning page...', false);

      // 2. Run this function DIRECTLY inside the current webpage
      const [{ result: svgs }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const elements = Array.from(document.querySelectorAll('svg'));
          return elements.map((svg, index) => {
            // Grab the raw HTML of the SVG
            let code = svg.outerHTML;
            // Try to find the dimensions to label it nicely
            let w = svg.getAttribute('width') || 'auto';
            let h = svg.getAttribute('height') || 'auto';
            
            return {
              id: index,
              code: code,
              info: `${w}x${h}`
            };
          });
        }
      });

      resultsDiv.replaceChildren(); // Clear loading text

      // 3. Handle if no SVGs were found
      if (!svgs || svgs.length === 0) {
        setStatus('No SVGs found on this page.', false);
        return;
      }

      // 4. Render the SVGs in our popup!
      svgs.forEach(svg => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #0f172a; padding: 8px 12px; border-radius: 6px; border: 1px solid #334155;';
        
        const label = document.createElement('span');
        label.style.cssText = 'font-size: 11px; color: #94a3b8; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;';
        label.textContent = `SVG (${svg.info})`;

        const sendBtn = document.createElement('button');
        sendBtn.textContent = 'Send to JSX';
        sendBtn.style.cssText = 'background: #6366f1; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; cursor: pointer; font-weight: bold;';
        
        // When clicked, open SyntaxSnap and pass the SVG code
        sendBtn.addEventListener('click', () => {
          const encodedSvg = encodeURIComponent(svg.code);
          chrome.tabs.create({ url: `https://syntaxsnap.com/tools/svg-to-jsx?input=${encodedSvg}` });
        });

        item.appendChild(label);
        item.appendChild(sendBtn);
        resultsDiv.appendChild(item);
      });

    } catch (error) {
      setStatus('Error: Please refresh the page and try again.', true);
      console.error(error);
    }
  });
});