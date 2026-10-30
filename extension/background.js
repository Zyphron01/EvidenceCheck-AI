/**
 * EvidenceCheck AI — Background Service Worker (Manifest V3)
 *
 * Implements context menu registration and safe claim handoff.
 * Strict least-privilege: activeTab, contextMenus, storage only.
 * Zero external LLM / Search API keys or direct provider calls in client extension.
 */

const DEFAULT_SERVER_URL = "http://localhost:3000";
const CONTEXT_MENU_ID = "evidencecheck-investigate-selection";

// Initialize Context Menu on Install / Update
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: "Investigate with EvidenceCheck AI: \"%s\"",
      contexts: ["selection"],
    });
  });
});

/**
 * Validates and sanitizes the user-configured server URL.
 * Only allows http: or https: schemes to prevent protocol injection.
 */
function sanitizeServerUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    return DEFAULT_SERVER_URL;
  }
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.origin;
    }
    return DEFAULT_SERVER_URL;
  } catch {
    return DEFAULT_SERVER_URL;
  }
}

/**
 * Safely sanitizes factual claim text.
 * Truncates to max 500 characters and strips non-printable control codes.
 */
function sanitizeClaimText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .trim()
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, "")
    .slice(0, 500);
}

// Handle Context Menu Actions
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;

  const rawSelection = info.selectionText || "";
  const claimText = sanitizeClaimText(rawSelection);

  if (!claimText || claimText.length < 5) {
    // Open popup or alert user if selection is too short
    return;
  }

  // Save to local storage for popup inspection
  await chrome.storage.local.set({
    lastClaim: claimText,
    sourceUrl: tab?.url ? new URL(tab.url).origin : "unknown",
    timestamp: Date.now(),
  });

  // Retrieve user-configured server URL
  const storageData = await chrome.storage.local.get(["serverUrl"]);
  const baseUrl = sanitizeServerUrl(storageData.serverUrl);

  // Safe Web Handoff: Open web app with prefilled claim in ready-to-review state
  // CRITICAL SECURITY GUARANTEE: Never initiates automatic research without user confirmation
  const targetUrl = `${baseUrl}/?claim=${encodeURIComponent(claimText)}`;

  chrome.tabs.create({ url: targetUrl });
});

// Message Listener for Popup interactions
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_CONFIG") {
    chrome.storage.local.get(["serverUrl"], (data) => {
      sendResponse({
        serverUrl: sanitizeServerUrl(data.serverUrl),
      });
    });
    return true; // Keep message channel open for async response
  }

  if (message.type === "SET_SERVER_URL") {
    const sanitized = sanitizeServerUrl(message.serverUrl);
    chrome.storage.local.set({ serverUrl: sanitized }, () => {
      sendResponse({ success: true, serverUrl: sanitized });
    });
    return true;
  }
});
