/**
 * EvidenceCheck AI — Popup Controller (Manifest V3)
 *
 * Implements claim capture, length validation, and secure web handoff.
 */

const DEFAULT_SERVER_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", async () => {
  const claimInput = document.getElementById("claim-input");
  const charCount = document.getElementById("char-count");
  const btnAudit = document.getElementById("btn-audit");
  const btnBenchmark = document.getElementById("btn-benchmark");
  const selectionStatus = document.getElementById("selection-text-desc");
  const errorBanner = document.getElementById("error-banner");
  const settingsToggle = document.getElementById("settings-toggle");
  const settingsDrawer = document.getElementById("settings-drawer");
  const serverUrlInput = document.getElementById("server-url-input");
  const btnSaveSettings = document.getElementById("btn-save-settings");
  const settingsFeedback = document.getElementById("settings-feedback");

  // Load saved server URL safely
  let stored = {};
  try {
    if (typeof chrome !== "undefined" && chrome?.storage?.local) {
      stored = await chrome.storage.local.get(["serverUrl", "lastClaim", "timestamp"]);
    }
  } catch {}
  const serverUrl = stored.serverUrl || DEFAULT_SERVER_URL;
  if (serverUrlInput) serverUrlInput.value = serverUrl;

  function showError(msg) {
    if (!errorBanner) return;
    if (!msg) {
      errorBanner.className = "error-banner";
      errorBanner.innerText = "";
    } else {
      errorBanner.className = "error-banner visible";
      errorBanner.innerText = msg;
    }
  }

  function updateInputState() {
    if (!claimInput || !charCount || !btnAudit) return;
    const text = claimInput.value.trim();
    charCount.innerText = `${claimInput.value.length} / 500`;

    if (text.length >= 5) {
      btnAudit.disabled = false;
      showError(null);
    } else if (text.length > 0) {
      btnAudit.disabled = true;
      showError("Assertion must be at least 5 characters long.");
    } else {
      btnAudit.disabled = true;
      showError(null);
    }
  }

  // 1. Try to read active selection from current webpage
  try {
    if (typeof chrome !== "undefined" && chrome?.tabs?.query) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (activeTab && activeTab.url) {
        const isRestricted =
          activeTab.url.startsWith("chrome://") ||
          activeTab.url.startsWith("chrome-extension://") ||
          activeTab.url.startsWith("edge://") ||
          activeTab.url.startsWith("about:");

        if (!isRestricted && activeTab.id && chrome?.scripting?.executeScript) {
          // Safe selection extraction via activeTab permission
          const results = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: () => window.getSelection()?.toString() || "",
          });

          const selectedText = results?.[0]?.result?.trim();
          if (selectedText && selectedText.length >= 5) {
            claimInput.value = selectedText.slice(0, 500);
            if (selectionStatus) selectionStatus.innerText = "Captured from active webpage";
            updateInputState();
          } else if (stored.lastClaim && Date.now() - (stored.timestamp || 0) < 300000) {
            // Fall back to recently context-menu selected claim within 5 minutes
            claimInput.value = stored.lastClaim;
            if (selectionStatus) selectionStatus.innerText = "Loaded from recent selection";
            updateInputState();
          } else {
            if (selectionStatus) selectionStatus.innerText = "Type or paste claim above";
          }
        } else {
          if (selectionStatus) selectionStatus.innerText = "Restricted page; manual entry enabled";
        }
      }
    }
  } catch {
    // If activeTab scripting fails (e.g. web store or PDF), allow manual entry
    if (selectionStatus) selectionStatus.innerText = "Manual claim entry mode";
  }

  // Input listeners
  claimInput.addEventListener("input", updateInputState);

  // 2. Action: Audit Claim via Web Handoff
  btnAudit.addEventListener("click", async () => {
    const rawClaim = claimInput.value.trim();
    if (rawClaim.length < 5) return;

    let baseUrl = DEFAULT_SERVER_URL;
    try {
      if (typeof chrome !== "undefined" && chrome?.storage?.local) {
        const data = await chrome.storage.local.get(["serverUrl"]);
        if (data.serverUrl) baseUrl = data.serverUrl.trim();
      }
    } catch {}

    try {
      const parsed = new URL(baseUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        baseUrl = DEFAULT_SERVER_URL;
      }
    } catch {
      baseUrl = DEFAULT_SERVER_URL;
    }

    const targetUrl = `${baseUrl}/?claim=${encodeURIComponent(rawClaim.slice(0, 500))}`;
    if (typeof chrome !== "undefined" && chrome?.tabs?.create) {
      await chrome.tabs.create({ url: targetUrl });
    } else {
      window.open(targetUrl, "_blank");
    }
    window.close();
  });

  // 3. Action: Inspect Speed of Light Verified Benchmark
  btnBenchmark.addEventListener("click", async () => {
    let baseUrl = DEFAULT_SERVER_URL;
    try {
      if (typeof chrome !== "undefined" && chrome?.storage?.local) {
        const data = await chrome.storage.local.get(["serverUrl"]);
        if (data.serverUrl) baseUrl = data.serverUrl.trim();
      }
    } catch {}

    const benchmarkClaim = "The speed of light in a vacuum is approximately 299,792 kilometers per second.";
    const targetUrl = `${baseUrl}/?claim=${encodeURIComponent(benchmarkClaim)}`;
    if (typeof chrome !== "undefined" && chrome?.tabs?.create) {
      await chrome.tabs.create({ url: targetUrl });
    } else {
      window.open(targetUrl, "_blank");
    }
    window.close();
  });

  // 4. Settings Drawer Toggle
  settingsToggle.addEventListener("click", () => {
    const isOpen = settingsDrawer.classList.toggle("open");
    document.getElementById("toggle-arrow").innerText = isOpen ? "▴" : "▾";
  });

  // 5. Save Server URL
  btnSaveSettings.addEventListener("click", async () => {
    const inputVal = serverUrlInput.value.trim();
    try {
      const parsed = new URL(inputVal);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        await chrome.storage.local.set({ serverUrl: parsed.origin });
        settingsFeedback.innerText = "Saved!";
        setTimeout(() => {
          settingsFeedback.innerText = "";
        }, 2000);
      } else {
        showError("Invalid protocol. Must begin with http:// or https://");
      }
    } catch {
      showError("Invalid URL format (e.g. http://localhost:3000).");
    }
  });
});
