# EvidenceCheck AI — Chrome Extension (Manifest V3) 🛡️

> **Production-Oriented Manifest V3 Browser Extension**  
> *Seamlessly capture factual assertions across the web and audit them through the EvidenceCheck AI verification engine.*

---

## 🚀 Local Installation & Testing in Google Chrome

1. **Open Extensions Manager**:
   - In Google Chrome, navigate to `chrome://extensions` in the address bar.
2. **Enable Developer Mode**:
   - Toggle the **"Developer mode"** switch in the top-right corner.
3. **Load Unpacked Extension**:
   - Click the **"Load unpacked"** button in the top-left corner.
   - Select the `extension/` directory inside this repository (`C:\Users\kiran\EvidenceCheck AI\extension`).
4. **Pin Extension**:
   - Click the puzzle icon in Chrome's toolbar and pin **EvidenceCheck AI**.
5. **Start Web Server**:
   - Ensure the Next.js server is running (`npm run dev` or `npm start` on `http://localhost:3000`).

---

## 🎯 User Workflows

### Workflow A: Context Menu Capture & Web Handoff
1. Select any factual sentence or paragraph on any standard webpage (e.g. Wikipedia, news article).
2. Right-click the selected text.
3. Choose **"Investigate with EvidenceCheck AI: \"...\""**.
4. The web application immediately opens in a new tab with the claim **safely prefilled** in a ready-to-review state.
5. Review the text and click **"Investigate Claim"** or press `Ctrl+Enter` to begin analysis.

### Workflow B: Popup Manual or Auto-Captured Audit
1. Highlight text on a webpage and click the EvidenceCheck AI extension icon in the toolbar.
2. The popup automatically captures the selected text (via `activeTab` and `scripting`).
3. You can edit, lengthen, or adjust the assertion (5 – 500 characters).
4. Click **"Audit Claim in Web App ↗"** to launch the full investigation view.
5. Or click **"Inspect Verified Run"** to explore the authentic Speed of Light live benchmark.

---

## 🔒 Security & Least-Privilege Architecture

| Permission | Purpose | Security Review & Scope |
| :--- | :--- | :--- |
| `activeTab` | Read text selection from current tab | Granted **only** when user explicitly clicks the action or context menu. Never monitors background browsing. |
| `contextMenus`| Register right-click investigation action | Appears only when text is highlighted (`contexts: ["selection"]`). |
| `storage` | Persist user's configured web server URL | Uses `chrome.storage.local`. Never stores private credentials or sensitive text. |
| `scripting` | Execute temporary helper to fetch selection | Runs single `window.getSelection()` query on active tab upon popup click. |

### 🛡️ Critical Security Safeguards
1. **Zero Provider API Keys in Client**:
   - `NVIDIA_API_KEY`, `TAVILY_API_KEY`, and `DATABASE_URL` are strictly confined to the backend server environment. The extension code contains **zero secrets**.
2. **Protected Server Handoff (No Automated Credit Drain)**:
   - Prefilling a claim into the web application **never triggers automatic API execution**. The user must explicitly confirm the investigation in the UI.
3. **Protocol & URL Sanitization**:
   - Rejects `javascript:`, `data:`, and `file:` URL protocols. Configured server URLs must strictly start with `http://` or `https://`.
4. **Restricted Browser Page Protection**:
   - Automatically handles restricted URLs (`chrome://`, `chrome-extension://`, `edge://`, Chrome Web Store) without throwing unhandled exceptions.
5. **No Blanket Web Monitoring**:
   - No `<all_urls>` host permissions. The extension is inert until the user explicitly invokes it.

---

## 📦 Chrome Web Store Distribution Checklist & Blockers

Before submitting to the Chrome Web Store for public distribution:

- [x] **Manifest V3 Compliance**: Modern service worker, declarative permissions, no remote code execution.
- [x] **Content Security Policy**: No inline eval, no unsafe remote scripts.
- [x] **Icons Provided**: High-resolution icons at 16px, 48px, and 128px.
- [ ] **Production Web Domain**: Update default server URL from `http://localhost:3000` to your production HTTPS domain (e.g. `https://evidencecheck.ai`).
- [ ] **Web Store Developer Account**: Requires standard Google Chrome Web Store developer registration (\$5 one-time fee).
- [ ] **Privacy Policy URL**: Host a publicly accessible privacy policy documenting that selected text is transmitted only to the configured backend server upon explicit user confirmation.
