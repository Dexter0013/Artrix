# Privacy Policy for Artrix

**Last updated:** September 19, 2026

Artrix ("we", "our", or "the extension") is an open-source browser extension and AI companion application designed with a strict privacy-first architecture. 

### 1. Zero Data Collection
- We do **not** collect, store, sell, or transmit any personally identifiable information (PII).
- We do **not** use any analytics, trackers, telemetry, or third-party advertising SDKs.
- All conversation data inside the extension side panel is **100% ephemeral**: it resides solely in your browser's local memory and is automatically deleted whenever the extension window or browser is closed.

### 2. API Keys & AI Processing
- Artrix uses a Bring-Your-Own-Key (BYOK) model. If you provide a Google Gemini API key, it is stored strictly on your local device (in `chrome.storage.local` / `localStorage`) and is never sent to any server other than Google's official Gemini API endpoints over HTTPS.
- Text selections or image areas you explicitly choose to snip are transmitted directly and securely to the Google Gemini API to generate the requested analysis or reasoning.

### 3. Permissions Used
- **`sidePanel`**: Used solely to render the companion and chat interface within Microsoft Edge's native side panel.
- **`activeTab` & `scripting`**: Used only when you trigger the OCR Snip tool or select text, allowing the extension to capture the chosen area for AI analysis.
- **`storage`**: Used to save your optional local API key and ephemeral session preferences.
- **`contextMenus`**: Allows quick access to "Ask Artrix" when right-clicking highlighted text.
- **`<all_urls>`**: Required to allow the text selection pill and snip tool to operate on webpages or PDF documents you choose to analyze.

### 4. Third-Party Services
- **Google Gemini API**: Processes AI prompts and multimodal snip queries according to [Google's Privacy Policy](https://policies.google.com/privacy).
- **DuckDuckGo & Wikipedia**: When web search is enabled, anonymous search queries are sent to public REST endpoints to ground responses with factual data. No user identifiers or cookies are transmitted.

### 5. Contact
If you have any questions regarding this Privacy Policy, you can open an issue on GitHub:
https://github.com/Dexter0013/Artrix
