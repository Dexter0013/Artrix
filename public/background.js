// ─── Artrix Background Service Worker (Manifest V3) ─────────────────────────
// Supports Microsoft Edge & Google Chrome

const isRestrictedUrl = (url) => {
  if (!url) return true;
  return (
    url.startsWith('edge://') ||
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge-extension://') ||
    url.startsWith('devtools://') ||
    url.startsWith('about:') ||
    url.startsWith('view-source:') ||
    url.includes('microsoftedge.microsoft.com/addons') ||
    url.includes('chromewebstore.google.com')
  );
};

// Dynamically inject content scripts into open tabs upon reload
async function injectContentScriptIntoExistingTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab?.id && tab?.url && !isRestrictedUrl(tab.url)) {
        chrome.scripting
          .insertCSS({ target: { tabId: tab.id }, files: ['content.css'] })
          .catch(() => {});
        chrome.scripting
          .executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
          .catch(() => {});
      }
    }
  } catch (e) {
    // Ignore permissions errors on system tabs
  }
}

// 1. Setup Side Panel Behavior & Context Menus on Install
chrome.runtime.onInstalled.addListener(() => {
  // Automatically open the side panel when the toolbar action icon is clicked
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err) => console.warn('[Artrix BG] setPanelBehavior error:', err));
  }

  // Clear existing context menus and re-create
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'artrix_ask',
      title: 'Ask Artrix about "%s"',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'artrix_explain',
      title: 'Explain & Reason: "%s"',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'artrix_factcheck',
      title: 'Fact-Check with Web Search: "%s"',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'artrix_separator',
      type: 'separator',
      contexts: ['all'],
    });

    chrome.contextMenus.create({
      id: 'artrix_snip',
      title: '✂️ Snip Area / Formula for Artrix (OCR & Vision)',
      contexts: ['all'],
    });

    chrome.contextMenus.create({
      id: 'artrix_open',
      title: '🦌 Open Artrix Companion Side Panel',
      contexts: ['all'],
    });
  });

  // Inject content scripts into all already-open tabs so snip works immediately
  injectContentScriptIntoExistingTabs();
});

// Helper to trigger snip on a given tab with fallback injection
async function triggerSnipOnTab(tab) {
  if (!tab?.id) {
    chrome.runtime.sendMessage({
      action: 'SNIP_ERROR',
      message: 'No active webpage found to snip. Please open a webpage or PDF first.',
    }).catch(() => {});
    return;
  }

  if (isRestrictedUrl(tab.url)) {
    chrome.runtime.sendMessage({
      action: 'SNIP_ERROR',
      message: 'Cannot snip browser system pages (edge://, chrome://). Please switch to a regular webpage or PDF document.',
    }).catch(() => {});
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'START_SNIP' });
  } catch (err) {
    console.log('[Artrix BG] Content script not active on tab, injecting dynamically...');
    try {
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content.css'],
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });

      // Allow DOM to initialize then send START_SNIP
      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'START_SNIP' });
        } catch (retryErr) {
          console.error('[Artrix BG] Snip activation failed after injection:', retryErr);
        }
      }, 100);
    } catch (injectErr) {
      console.error('[Artrix BG] Cannot inject snip script:', injectErr);
      chrome.runtime.sendMessage({
        action: 'SNIP_ERROR',
        message: 'Could not activate snip on this tab: ' + (injectErr?.message || 'Access restricted'),
      }).catch(() => {});
    }
  }
}

// 2. Handle Context Menu Clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === 'artrix_open') {
    if (chrome.sidePanel?.open && tab.windowId) {
      chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.warn);
    }
    return;
  }

  if (info.menuItemId === 'artrix_snip') {
    triggerSnipOnTab(tab);
    return;
  }

  if (info.selectionText) {
    // Open side panel
    if (chrome.sidePanel?.open && tab.windowId) {
      chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.warn);
    }

    const payload = {
      type: 'SELECTION',
      text: info.selectionText.trim(),
      promptType: info.menuItemId,
      pageTitle: tab.title || '',
      pageUrl: tab.url || '',
      timestamp: Date.now(),
    };

    try {
      const storage = chrome.storage.session || chrome.storage.local;
      await storage.set({ artrix_pending_context: payload });
    } catch {
      // Fallback
    }

    chrome.runtime.sendMessage({ action: 'ACTIVE_CONTEXT_CHANGED', payload }).catch(() => {});
  }
});

// 3. Handle Messages from Content Scripts and Side Panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'CAPTURE_ACTIVE_TAB') {
    const winId = sender?.tab?.windowId || null;
    chrome.tabs.captureVisibleTab(winId, { format: 'png' }, (dataUrl) => {
      const err = chrome.runtime.lastError;
      if (err || !dataUrl) {
        console.error('[Artrix BG] captureVisibleTab failed:', err?.message);
        sendResponse({ success: false, error: err?.message || 'Screen capture failed' });
      } else {
        sendResponse({ success: true, dataUrl });
      }
    });
    return true; // Keep channel open for async sendResponse
  }

  if (message.action === 'SEND_SELECTION_TO_ARTRIX') {
    const windowId = sender?.tab?.windowId;
    if (chrome.sidePanel?.open && windowId) {
      chrome.sidePanel.open({ windowId }).catch(console.warn);
    }

    const payload = {
      type: 'SELECTION',
      text: message.text,
      promptType: 'artrix_ask',
      pageTitle: message.pageTitle || sender?.tab?.title || '',
      pageUrl: message.pageUrl || sender?.tab?.url || '',
      timestamp: Date.now(),
    };

    const storage = chrome.storage.session || chrome.storage.local;
    storage.set({ artrix_pending_context: payload }).catch(() => {});
    chrome.runtime.sendMessage({ action: 'ACTIVE_CONTEXT_CHANGED', payload }).catch(() => {});
    sendResponse({ success: true });
    return false;
  }

  if (message.action === 'SEND_SNIP_TO_ARTRIX') {
    const windowId = sender?.tab?.windowId;
    if (chrome.sidePanel?.open && windowId) {
      chrome.sidePanel.open({ windowId }).catch(console.warn);
    }

    const payload = {
      type: 'SNIP',
      image: message.image,
      pageTitle: message.pageTitle || sender?.tab?.title || '',
      pageUrl: message.pageUrl || sender?.tab?.url || '',
      timestamp: Date.now(),
    };

    const storage = chrome.storage.session || chrome.storage.local;
    storage.set({ artrix_pending_context: payload }).catch(() => {});
    chrome.runtime.sendMessage({ action: 'ACTIVE_CONTEXT_CHANGED', payload }).catch(() => {});
    sendResponse({ success: true });
    return false;
  }

  if (message.action === 'TRIGGER_SNIP_FROM_PANEL') {
    (async () => {
      try {
        // Look in last focused browser window first
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        let targetTab = tabs && tabs[0];

        if (!targetTab || isRestrictedUrl(targetTab.url)) {
          // Look for any active web tab across all windows
          const allActive = await chrome.tabs.query({ active: true });
          targetTab = allActive.find((t) => t.url && !isRestrictedUrl(t.url));
        }

        if (targetTab) {
          triggerSnipOnTab(targetTab);
          sendResponse({ success: true });
        } else {
          chrome.runtime.sendMessage({
            action: 'SNIP_ERROR',
            message: 'No suitable webpage found. Please open a webpage or PDF to snip.',
          }).catch(() => {});
          sendResponse({ success: false, error: 'No active web tab' });
        }
      } catch (err) {
        console.error('[Artrix BG] TRIGGER_SNIP_FROM_PANEL failed:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep channel open for async execution
  }
});

// Clean up extension session cache when side panel is closed
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'artrix_sidepanel_session') {
    port.onDisconnect.addListener(() => {
      if (chrome.storage?.session) {
        chrome.storage.session.clear().catch(() => {});
      }
      if (chrome.storage?.local) {
        chrome.storage.local.remove(['artrix_pending_context', 'artrix_auth_user']).catch(() => {});
      }
    });
  }
});
