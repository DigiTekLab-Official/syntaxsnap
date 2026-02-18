// Create the Main Menu and Sub-menus
chrome.runtime.onInstalled.addListener(() => {
  
  // 1. Parent Item
  chrome.contextMenus.create({
    id: "syntaxsnap-root",
    title: "SyntaxSnap Tools",
    contexts: ["selection"]
  });

  // 2. Child: Regex Tester
  chrome.contextMenus.create({
    id: "tool-regex",
    parentId: "syntaxsnap-root",
    title: "🔍 Test Regex Pattern",
    contexts: ["selection"]
  });

  // 3. Child: JSON to Zod
  chrome.contextMenus.create({
    id: "tool-json",
    parentId: "syntaxsnap-root",
    title: "📄 Convert JSON to Zod",
    contexts: ["selection"]
  });

  // 4. Child: Diff Viewer
  chrome.contextMenus.create({
    id: "tool-diff",
    parentId: "syntaxsnap-root",
    title: "⚖️ Compare Text (Diff)",
    contexts: ["selection"]
  });
});

// Handle the clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const text = encodeURIComponent(info.selectionText);

  // Route to the correct tool based on which menu item was clicked
  if (info.menuItemId === "tool-regex") {
    chrome.tabs.create({ url: `https://syntaxsnap.com/tools/regex-tester?input=${text}` });
  } 
  else if (info.menuItemId === "tool-json") {
    chrome.tabs.create({ url: `https://syntaxsnap.com/tools/json-to-zod?input=${text}` });
  }
  else if (info.menuItemId === "tool-diff") {
    // For Diff Viewer, we put the text in the "Original" side (left)
    chrome.tabs.create({ url: `https://syntaxsnap.com/tools/diff-viewer?input=${text}` });
  }
});