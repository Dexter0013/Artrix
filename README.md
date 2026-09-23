# 🦌 Artrix — Your Personal AI Companion & Assistant

<p align="center">
  <img src="public/TitleArtrix.png" alt="Artrix — Your Personal AI Companion & Assistant" width="100%" style="border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.4);" />
</p>

An interactive AI Assistant web application and native browser extension featuring a real-time animated avatar powered by **[Rive](https://rive.app)**, conversational intelligence via **[Google Gemini](https://ai.google.dev/)** (Gemini 3.5 Flash), continuous voice recognition, natural neural voice synthesis, free client-side web search, **Tailwind CSS v4** + **Lucide Icons** UI, and **Firebase** authentication.

🔗 **Live Demo:** [https://dexter0013.github.io/Artrix/](https://dexter0013.github.io/Artrix/)<br>
🔗 **Live Extension:** https://microsoftedge.microsoft.com/addons/detail/artrix-ai-companion-s/liiidoplhepbiifgbedjkfofpoplagjl

---

## ✨ Key Features

- **Interactive 2D Avatar** — Rive animated Deer-Girl rig (`public/20673-38905-deer-girl.riv`) with 5 real-time facial expression states (`Idle`, `Smile`, `Surprise`, `Confused`, `Angry`).
- **Conversational Intelligence** — Powered by Google Gemini 3 Flash models with multi-turn memory context across past dialogue turns.
- **Two-Sided Chat Interface** — Distinct conversational layout with user messages aligned to the right (warm green tint) and Artrix responses aligned to the left (cyan slate card with replay speech audio controls).
- **Standalone Browser Extension Side Panel (Zero-Auth & Ephemeral)** — Built for Microsoft Edge & Google Chrome:
  - **No Sign-In Required**: Instant access without login walls, popup redirects, or Firebase domain issues.
  - **Auto-Cleanup on Close**: Side panel conversation data is strictly ephemeral and automatically expunged from `localStorage` and `sessionStorage` whenever the panel or browser is closed.
  - **✂️ Area Snip / OCR & Vision Reasoning**: Snip complex math equations, charts, diagrams, or scanned PDF sections for instant multimodal Gemini reasoning.
  - **On-Page Text Selection ("Ask Artrix 🦌")**: Highlight any text on a web page or PDF to ask Artrix directly.
- **Live Free Web Search (DuckDuckGo + Wikipedia)** — Real-time client-side search requiring **0 API keys** and zero external npm libraries:
  - **Auto-Keyword Detection**: Automatically queries search engines for facts, current events, weather, or news.
  - **Manual `<Globe />` Toggle**: Header button toggles Web Search **ALWAYS ON** for deep research mode.
- **Continuous Voice Input (STT, Main Web App)** — Native browser speech recognition (Web Speech API) with zero-latency streaming on the main web application:
  - **Screen-Dependent Defaults**: Microphone is ON by default on desktop, and OFF by default on mobile.
  - **Auto-Pause While Assistant Speaks**: Microphone temporarily pauses during assistant speech to prevent audio feedback.
  - **4-Second Pause Auto-Send (Desktop)**: Automatically submits query after a 4-second pause with a visual countdown timer.
- **Natural Neural Voice (TTS)**: Direct zero-latency streaming voice engine synchronized sentence-by-sentence with avatar expression transitions, backed by an optimized singleton AudioContext.
- **Bring-Your-Own-Key (BYOK) Security**: Gemini API keys are saved exclusively in the user's browser `localStorage` and never transmitted to any proxy server.
- **Web App Firebase Auth & Firestore Persistence**: Google Sign-In with private, per-user chat collection rules (`request.auth.uid == userId`) for the main web app.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite 8, Tailwind CSS v4, Lucide Icons
- **AI & Search**: Google Gemini Flash API, DuckDuckGo & Wikipedia REST APIs (Zero Key Web Search)
- **Voice Engine**: Web Speech API (STT), Microsoft Natural Voice Engine (TTS)
- **Animation Engine**: `@rive-app/react-canvas` (packaged with local WASM for Manifest V3 extension compliance)
- **Backend & Auth (Main Web App)**: Firebase Auth (Google Sign-In) & Cloud Firestore
- **Hosting**: GitHub Pages via GitHub Actions

---

## 📁 Project Structure

```
Artrix/
├── public/
│   ├── 20673-38905-deer-girl.riv  # Rive animation binary rig
│   ├── backgroundnature.gif        # Scenic backdrop
│   ├── rive.wasm                  # Local Rive WASM runtime for offline & extension use
│   ├── rive_fallback.wasm         # Fallback WASM runtime
│   ├── background.js              # Extension Manifest V3 background service worker
│   ├── content.js                 # In-page content script (text pill & area snip tool)
│   ├── content.css                # Styling for in-page pill & snip overlay
│   ├── manifest.json              # Extension Manifest V3 configuration
│   └── sounds/                    # Custom sound effects directory
├── src/
│   ├── ai/
│   │   ├── gemini.js              # Gemini API client (BYOK, live Gemini 3 Flash models)
│   │   ├── webSearch.js           # Client-side DuckDuckGo + Wikipedia free search engine
│   │   ├── speechInput.js         # Browser SpeechRecognition wrapper
│   │   ├── tts.js                 # Natural voice engine & singleton AudioContext manager
│   │   ├── useAI.js               # React hook: Gemini generation state & model resolution
│   │   └── useVoiceInput.js       # React hook: Speech-to-Text state & toggle controls
│   ├── components/
│   │   ├── AssistantStage.jsx     # Avatar viewport & canvas container
│   │   ├── AuthGate.jsx           # Google Sign-in screen for main web app
│   │   ├── ChatPanel.jsx          # Main app Firestore chat UI
│   │   └── MoodController.jsx     # Manual expression trigger controls
│   ├── context/
│   │   └── AuthContext.jsx        # Global React Context for main web app Firebase Auth
│   ├── extension/
│   │   ├── SidePanelApp.jsx       # Standalone extension side panel application root
│   │   └── SidePanelChat.jsx      # Standalone zero-auth two-sided chat with ephemeral cleanup
│   ├── firebase/
│   │   ├── auth.js                # Google popup auth & sign-out helpers
│   │   ├── chat.js                # Firestore CRUD & real-time snapshot listeners
│   │   └── config.js              # Firebase client initialization
│   ├── App.jsx                    # Main web app layout & Rive state machine binding
│   ├── main.jsx                   # Web app React DOM entry point
│   ├── sidepanel.jsx              # Extension side panel React DOM entry point
│   └── index.css                  # Tailwind CSS imports & global styling
├── sidepanel.html                 # Extension side panel HTML root
├── index.html                     # Main web app HTML root
├── firestore.rules                # Firestore security rules (per-user privacy)
├── package.json
└── vite.config.js                 # Multi-page build config (main app + side panel)
```

---

## 🚀 Getting Started Locally (Main Web App)

1. **Install dependencies**:
   ```bash
   git clone https://github.com/Dexter0013/Artrix.git
   cd Artrix
   npm install
   ```

2. **Configure environment**:
   Create `.env.local` in the project root and add your Firebase credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

3. **Run local dev server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🧩 Running as a Browser Extension (Microsoft Edge & Chrome)

Artrix runs as a native **Manifest V3 Side Panel Extension** directly inside Microsoft Edge or Google Chrome. Keep Artrix docked in your browser's side panel while reading articles or reviewing **PDF documents**.<br>

🔗 **Live Extension:** https://microsoftedge.microsoft.com/addons/detail/artrix-ai-companion-s/liiidoplhepbiifgbedjkfofpoplagjl

### ✨ Extension Highlights:
* **Zero Authentication Friction**: The side panel operates without login barriers or external OAuth redirects. Open it and start analyzing right away.
* **Ephemeral Sessions**: Every conversation in the side panel is private to your active session. Closing the extension window immediately wipes `localStorage` and `sessionStorage`.
* **Smart PDF & Document Reasoning**: Highlight text in the Edge/Chrome PDF viewer to send context to Artrix.
* **✂️ Area Snip / OCR & Vision**: Snip diagrams, equations, or charts on any tab for instant multimodal analysis.
* **Emotional Avatar Rig**: Deer-Girl animates directly inside the side panel with local WebAssembly.

### 📥 How to Load & Test in Microsoft Edge:
1. **Build the extension bundle**:
   ```bash
   npm run build
   ```
   This compiles the extension files into the `dist/` directory.

2. **Open Microsoft Edge Extensions page**:
   Navigate to:
   ```text
   edge://extensions
   ```

3. **Enable Developer Mode**:
   Toggle the **Developer mode** switch in the left sidebar.

4. **Load Unpacked Extension**:
   - Click **"Load unpacked"**.
   - Select the `dist` folder (`c:\work4 2026\AI-Assisant\dist`).

5. **Pin & Open**:
   - Pin **Artrix** in your browser toolbar.
   - Click the Artrix icon to open the **Side Panel**.
   - Highlight any text on a webpage or PDF to see the **"Ask Artrix 🦌"** pill, or click **✂️ Snip** in the toolbar to capture formulas and diagrams.

---

## 🔑 Google Gemini API Key Setup

Artrix connects directly to the official Google Gemini API using live Gemini 3 Flash models:

* 🌐 **Generate your API key**: [Google AI Studio — Get API Key](https://aistudio.google.com/app/apikey)
* 📖 **Official Documentation**: [Gemini API Key Quickstart & Guide](https://ai.google.dev/gemini-api/docs/api-key)
* 🔐 **Privacy Guarantee**: Your API key is stored strictly on your local machine (in `localStorage`) and is sent directly to Google's endpoints over HTTPS.

---

## 🔒 Security & Privacy

* **Firestore Isolation**: User chat data is isolated under `users/{userId}/messages` with security rules enforcing per-user read/write access (`request.auth.uid == userId`).
* **BYOK Privacy**: Gemini API keys are never stored on any intermediate server.
* **Ephemeral Side Panel**: Side panel data is removed on window close to guarantee that no local chat remnants linger.
* **Repository Safety**:
  - `.env.local` is listed in `.gitignore` to prevent credential commits.
  - `dist/` is listed in `.gitignore`. Because Vite inlines `VITE_*` environment variables during build time, never commit `dist/` to a public repository; package extensions as `.zip` archives for distribution instead.

---

## 📄 License

This project is open source under the [MIT License](LICENSE).
