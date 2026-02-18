// Create the Context Menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "syntaxsnap-open",
    title: "Open in SyntaxSnap",
    contexts: ["selection"]
  });
});

// Handle the click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "syntaxsnap-open" && info.selectionText) {
    // Encode the text so it can be passed in the URL
    const text = encodeURIComponent(info.selectionText);
    
    // Open the Regex Tester with the text pre-filled (We will add logic to handle this later)
    chrome.tabs.create({
      url: `https://syntaxsnap.com/tools/regex-tester?input=${text}`
    });
  }
});