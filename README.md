# 🦌 Artrix — Your Personal AI Companion & Assistant

<p align="center">
  <img src="public/TitleArtrix.png" alt="Artrix — Your Personal AI Companion & Assistant" width="100%" style="border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.4);" />
</p>

An interactive AI Assistant web application featuring a real-time animated avatar powered by **[Rive](https://rive.app)**, conversational intelligence via **[Google Gemini](https://ai.google.dev/)** (defaulting to Gemini 3.5 Flash), continuous voice input via the **Web Speech API**, direct natural neural voice synthesis, **Tailwind CSS v4** + **Lucide Icons** modern button UI, and a full **Firebase** backend for authentication and private chat persistence, built with **React** and **Vite**, and deployed via **GitHub Pages**.

🔗 **Live Demo:** [https://dexter0013.github.io/Artrix/](https://dexter0013.github.io/Artrix/)

---

## ✨ Features

- **Interactive 2D Avatar** — Driven by the Deer-Girl rig (`public/20673-38905-deer-girl.riv`) with 5 expressive states:
  - 🟢 **Idle** — Neutral relaxed stance
  - 😊 **Smile** — Happy & friendly expression
  - ⚡ **Surprise** — Thinking / shocked reaction
  - ❓ **Confused** — Curious / query state
  - 😠 **Angry** — Alert / frustration state
- **Continuous Real-Time Voice Input (Speech-to-Text)** — Native browser speech recognition powered by Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`):
  - **Always-On by Default**: Starts listening automatically when the panel loads and seamlessly resumes listening after AI speech responses.
  - **Unified Toggle**: One-tap toggle (`<Mic />` / `<MicOff />`) on all screen sizes (desktop and mobile).
  - **Review Before Send (Mobile)**: Streams real-time speech into the input field so mobile users can review or edit text before sending manually.
  - **4-Second Auto-Send (Desktop)**: On desktop / larger screens, automatically sends the message after a 4-second pause in typing or speaking, featuring a live countdown badge (`⚡ Auto-sending after 4s pause…`). Continuously resets if new input is spoken or typed.
  - **Smart Merge Algorithm (`mergeTranscripts`)**: Intelligent deduplication algorithm eliminates phrase repetitions across session restarts on mobile WebKit/Blink browsers.
  - **Permission & Error Handling**: Surfaces clear alert banners for mic permission denials or audio capture errors instead of failing silently.
  - **Graceful Fallback**: Automatically hides the mic button if browser speech recognition is unsupported.
- **Tailwind CSS v4 & Lucide Icons Modern Button UI** — Fully styled with Tailwind CSS v4 (`@tailwindcss/vite`) and crisp SVG vector icons from `lucide-react`:
  - Sleek glassmorphism button styling, subtle hover states, active press animations, and glowing micro-interactions across all header actions, expression triggers, and send/voice controls.
- **Gemini 3 Frontier AI Architecture** — Strictly targets currently-live Gemini 3 Flash models with a zero-failure priority chain: **`gemini-3.5-flash`** ➔ **`gemini-3.5-flash-lite`** ➔ **`gemini-3.1-flash-lite`** (safe older fallback). Skips dead and deprecated model versions entirely. Delivers sub-second latency, 800 output tokens, and massive context capacity while dynamically displaying the active model version in the chat header badge.
- **Direct Natural Female Voice Engine** — Zero-latency streaming voice engine that automatically prioritizes the calm, mature Microsoft Jenny Online (Natural) & Aria voices. Zero model downloads, 0ms lag, zero server costs, with built-in anti-repeat single-execution guards and one-click muting (`<Volume2 />` / `<VolumeX />`).
- **Bring-Your-Own-Key (BYOK) Security & Local Isolation** — Dedicated in-app connect screen. Users enter their free Google Gemini API key, stored exclusively in their own browser's `localStorage`. Keys are never sent to your backend or stored in Firestore.
- **End-to-End Encrypted & Secure Session** — Protected by client-to-cloud HTTPS/TLS encryption and strict per-user Firestore security rules (`request.auth.uid == userId`). Features an explicit `<ShieldCheck />` security badge in the chat window.
- **Automatic Key Purge on Sign-Out** — Signing out completely wipes the stored Gemini API key from browser `localStorage`, ensuring shared or public devices remain fully secure.
- **Multi-Turn Context & Persistent Memory** — Full conversational memory across the last 20 interaction turns, backed by Firestore real-time storage. Artrix remembers past topics, user preferences, and details across turns and sessions, with one-click history clearing (`<Trash2 />`).
- **Multi-Expression Switching & 2-Second Idle Revert** — Artrix dynamically shifts across multiple facial expressions (`[IDLE]`, `[SMILE]` / `[HAPPY]`, `[SURPRISE]`, `[CONFUSED]`, `[ANGRY]`) **within a single response**. Her avatar transitions expressions in real-time as each sentence begins speaking. Exactly 2 seconds after finishing all sentences with no new typing, she smoothly relaxes back to **Idle** state. Keystrokes in the chat input also refresh the idle timer.
- **Google Authentication** — Secure Google Sign-In with session persistence and user profile display (`AuthGate` & `AuthContext`).
- **Real-Time Chat with Firestore** — Messages are synced in real-time to Cloud Firestore under private per-user collections (`users/{userId}/messages`).
- **Fixed-Height Scrollable Chatbox** — Fixed viewport bounds with smooth auto-scrolling and clean compact input. Chat never stretches or extends downwards.
- **Rate Limiting & Cost Guardrails** — A two-layer, ref-based in-flight guard prevents duplicate or rapid-fire Gemini API requests. A synchronous mutex (`inFlightRef`) blocks concurrent calls before React's render cycle can catch them, while a 1-second inter-request cooldown (`lastSentRef`) stops accidental retry loops or key-repeat events. Applies at both the UI (`ChatPanel`) and hook (`useAI`) levels.
- **Offline / Connection-Loss Handling** — The app gracefully degrades when connectivity is lost. An amber banner appears in the message list, the send button and textarea are disabled, and a `<WifiOff />` icon replaces the send arrow. Mid-request network failures surface as a user-friendly `⚡ No internet connection` bubble. All states auto-clear when the connection is restored.
- **Keyboard Accessibility & Contrast** — All interactive elements show a visible focus ring on keyboard navigation (`:focus-visible`). Contrast tokens (`--text-dim`, `--text-muted`) and inline chat colours meet WCAG AA ≥ 4.5:1. Animations respect the OS `prefers-reduced-motion` preference.
- **Instant Chat Scroll** — On first load the message list snaps instantly to the latest message (no flash-at-top). Subsequent new messages scroll in smoothly.
- **Emotion-Synchronized Replay** — The `<Volume2 />` replay button on each assistant message re-drives the avatar through the same expression timeline as the original response. The raw tagged AI response is stored as `rawText` in Firestore alongside the clean display text, enabling full mood-sync on replay with or without voice.
- **Responsive Layout** — On desktop the chatbox keeps its fixed 520 px height. On mobile (≤ 800 px) it flexes to fill the remaining viewport height after the avatar canvas so both panels are visible without page scrolling.
- **Automated CI/CD** — Zero-downtime deployment to GitHub Pages via GitHub Actions upon pushing to `main`.

---

## 🛠️ Tech Stack

- **Frontend**: [React 18](https://react.dev/), [Vite 8](https://vitejs.dev/)
- **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/) (`@tailwindcss/vite`), [Lucide Icons](https://lucide.dev/) (`lucide-react`)
- **Voice Recognition (STT)**: Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`, zero-latency streaming)
- **AI Engine**: [Google Gemini Flash Series](https://ai.google.dev/) (Direct REST API, 0 external SDKs, prioritized for high-token Flash throughput)
- **Voice Engine (TTS)**: Microsoft Natural Neural Voice Engine (`pitch: 1.12`, `rate: 1.0`, zero downloads, 0ms latency)
- **Animation Engine**: [@rive-app/react-canvas](https://rive.app/)
- **Backend & Auth**: [Firebase](https://firebase.google.com/) (Authentication & Cloud Firestore)
- **CI/CD & Hosting**: [GitHub Actions](https://github.com/features/actions) & [GitHub Pages](https://pages.github.com/)

---

## 📁 Project Structure

```
Artrix/
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Actions workflow for Pages deployment
├── public/
│   └── 20673-38905-deer-girl.riv# Rive animation binary rig
├── src/
│   ├── ai/
│   │   ├── gemini.js            # Gemini API client with 20-turn memory context & frontier model fallback
│   │   ├── speechInput.js       # Browser SpeechRecognition API wrapper with zero-latency streaming
│   │   ├── tts.js               # Natural voice engine with speakSegments() synchronized speech queue
│   │   ├── useAI.js             # React hook: conversation state, key storage, active model & in-flight guard
│   │   └── useVoiceInput.js     # React hook: Speech-to-Text state, toggle controls & callbacks
│   ├── components/
│   │   ├── AssistantStage.jsx   # Avatar viewport, canvas wrapper & aura glow
│   │   ├── AuthGate.jsx         # Google Sign-in screen & loading spinner with Lucide icons
│   │   ├── ChatPanel.jsx        # Real-time Firestore chat UI, speech recognition, multi-expression parser & Tailwind UI
│   │   └── MoodController.jsx   # 5 manual expression trigger buttons with Lucide SVG icons & Tailwind cards
│   ├── context/
│   │   └── AuthContext.jsx      # Global React Context for Firebase Auth state
│   ├── firebase/
│   │   ├── auth.js              # Google popup auth & sign-out helpers
│   │   ├── chat.js              # Firestore CRUD & real-time snapshot listeners
│   │   └── config.js            # Firebase App, Auth & Firestore initialization
│   ├── App.jsx                  # Main application layout & Rive state machine binding
│   ├── index.css                # Tailwind CSS imports, design system tokens & global styling
│   └── main.jsx                 # React DOM entry point wrapped in AuthProvider & AuthGate
├── .env.example                 # Public environment variables template
├── .gitignore                   # Ignores sensitive credentials (.env.local), rules & cache
├── firestore.rules              # Recommended Firestore security rules (per-user privacy)
├── package.json
└── vite.config.js               # Tailwind CSS v4 plugin & relative base configuration for deployment
```

---

## 🔒 Security & Privacy

* **Firestore Privacy**: User messages are partitioned under `users/{userId}/messages` with Firestore rules ensuring each user can only read and write their own data:
  ```javascript
  match /users/{userId}/messages/{messageId} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }
  ```
* **API Key Safety (BYOK)**: User Gemini API keys are saved strictly in the visitor's local browser storage (`localStorage`). Keys are sent directly from the browser to Google's HTTPS API endpoint and are never stored in Firestore or transmitted to any third party.
* **Firebase Key Safety**: The Firebase API key is a public client identifier. Application data security is fully enforced via Firestore rules and Firebase Authorized Domain restrictions.
* **Automatic Key Purge on Logout**: Signing out immediately deletes the stored Gemini API key from `localStorage`. Users can also clear or update their key at any time while logged in by clicking the **🔑 Key button** in the chat header.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
