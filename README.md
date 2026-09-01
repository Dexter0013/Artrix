# 🦌 Artrix — AI Assistant

An interactive AI Assistant web application featuring a real-time animated avatar powered by **[Rive](https://rive.app)**, conversational intelligence via **[Google Gemini](https://ai.google.dev/)** (defaulting to Gemini 2.0 Flash Lite), and a full **Firebase** backend for authentication and private chat persistence, built with **React** and **Vite**, and deployed via **GitHub Pages**.

🔗 **Live Demo:** [https://dexter0013.github.io/Artrix/](https://dexter0013.github.io/Artrix/)

---

## ✨ Features

- **Interactive 2D Avatar** — Driven by the Deer-Girl rig (`public/20673-38905-deer-girl.riv`) with 5 expressive states:
  - 🟢 **Idle** — Neutral relaxed stance
  - 😊 **Smile** — Happy & friendly expression
  - ⚡ **Surprise** — Thinking / shocked reaction
  - ❓ **Confused** — Curious / query state
  - 😠 **Angry** — Alert / frustration state
- **High-Token Flash AI Architecture** — Strictly routes inference through Google's latest **Flash series** models (`gemini-2.0-flash-lite`, `gemini-2.5-flash-lite`, `gemini-2.0-flash`, `gemini-1.5-flash`). Delivers sub-second latency, 800 output tokens, and maximizes token capacity (up to 4M TPM free-tier throughput and 1M+ context window) while dynamically displaying the active version in the header badge.
- **Bring-Your-Own-Key (BYOK) Security** — Dedicated in-app connect screen. Users enter their free Google Gemini API key, stored exclusively in their own browser's `localStorage`. Keys are never sent to your backend or stored in Firestore.
- **AI-Driven Emotion Synchronization** — Assistant generates emotional tags (`[SMILE]`, `[SURPRISE]`, `[CONFUSED]`, `[ANGRY]`) to dynamically animate the Rive avatar's face in real-time as she speaks.
- **Google Authentication** — Secure Google Sign-In with session persistence and user profile display (`AuthGate` & `AuthContext`).
- **Real-Time Chat with Firestore** — Messages are synced in real-time to Cloud Firestore under private per-user collections (`users/{userId}/messages`).
- **Fixed-Height Scrollable Chatbox** — Fixed viewport bounds with smooth auto-scrolling; chat never stretches or extends downwards.
- **Automated CI/CD** — Zero-downtime deployment to GitHub Pages via GitHub Actions upon pushing to `main`.
- **State Machine Driven** — Clean state transitions via Rive state machine inputs with hover overrides and viewport clipping.

---

## 🛠️ Tech Stack

- **Frontend**: [React 18](https://react.dev/), [Vite 8](https://vitejs.dev/)
- **AI Engine**: [Google Gemini Flash Series](https://ai.google.dev/) (Direct REST API, 0 external SDKs, prioritized for high-token Flash throughput)
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
│   │   ├── gemini.js            # Gemini API client with auto-discovery & highest-quota model selection
│   │   └── useAI.js             # React hook for conversation state, key storage & active model version
│   ├── components/
│   │   ├── AssistantStage.jsx   # Avatar viewport, canvas wrapper & aura glow
│   │   ├── AuthGate.jsx         # Google Sign-in screen & loading spinner
│   │   ├── ChatPanel.jsx        # Real-time Firestore chat UI, key connect card & active version badge
│   │   └── MoodController.jsx   # 5 manual expression trigger buttons
│   ├── context/
│   │   └── AuthContext.jsx      # Global React Context for Firebase Auth state
│   ├── firebase/
│   │   ├── auth.js              # Google popup auth & sign-out helpers
│   │   ├── chat.js              # Firestore CRUD & real-time snapshot listeners
│   │   └── config.js            # Firebase App, Auth & Firestore initialization
│   ├── App.jsx                  # Main application layout & Rive state machine binding
│   ├── index.css                # Design system tokens & global styling
│   └── main.jsx                 # React DOM entry point wrapped in AuthProvider & AuthGate
├── .env.example                 # Public environment variables template
├── .gitignore                   # Ignores sensitive credentials (.env.local), rules & cache
├── firestore.rules              # Recommended Firestore security rules (per-user privacy)
├── package.json
└── vite.config.js               # Relative base configuration for universal deployment
```

---

## 🎮 Rive Rig State Machine Inputs

The rig binds to the `Main` state machine on the Deer-Girl artboard:

| Input Name | Type | Description |
| :--- | :--- | :--- |
| `Btn_Normal` | Number | Gates the idle loop (`1` = lock in idle, `0` = allow state transitions) |
| `Btn_Smile` | Number | Auxiliary smile toggle |
| `trigger_smile` | Trigger | Fires the happy / smiling animation sequence |
| `trigger_surprise`| Trigger | Fires the surprise / thinking animation sequence |
| `trigger_confusion`| Trigger | Fires the confused / question animation sequence |
| `trigger_angry` | Trigger | Fires the alert / angry animation sequence |

---

## 🚀 Getting Started Locally

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* A Firebase Project with **Authentication (Google)** and **Cloud Firestore** enabled
* A Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey) (Free)

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Dexter0013/Artrix.git
cd Artrix
npm install
```

### 3. Configure Environment Variables

Create a local environment file by copying `.env.example`:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your Firebase and Gemini credentials:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Optional: You can pre-set a Gemini key here, or enter it directly in the app UI
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 4. Start Development Server

```bash
npm run dev
```

Open your browser at `http://localhost:5173/`.

---

## 🔒 Security & Privacy

* **Firestore Privacy**: User messages are partitioned under `users/{userId}/messages` with Firestore rules ensuring each user can only read and write their own data.
* **API Key Safety (BYOK)**: User Gemini API keys are saved strictly in the visitor's local browser storage (`localStorage`). Keys are sent directly from the browser to Google's HTTPS API endpoint and are never stored in Firestore or transmitted to any third party.

---

## 🌐 Deploying to GitHub Pages

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys the application on push to `main`.

1. **Add Repository Secrets**:
   * Navigate to **Settings** > **Secrets and variables** > **Actions** on GitHub.
   * Add the secrets matching your Firebase environment keys:
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_STORAGE_BUCKET`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`
     - `VITE_FIREBASE_APP_ID`

2. **Enable GitHub Pages**:
   * Go to **Settings** > **Pages**.
   * Set **Source** to **GitHub Actions**.

3. **Authorize Domain in Firebase**:
   * In Firebase Console > **Authentication** > **Settings** > **Authorized domains**, add your GitHub Pages domain (e.g., `dexter0013.github.io`).

4. **Deploy**:
   * Push your changes to the `main` branch. GitHub Actions will build and publish your app live at `https://dexter0013.github.io/Artrix/`.

### Custom Domain Support

Because the application uses relative asset paths (`base: './'`), you can attach any custom domain (e.g., `artrix.ai` or `app.yourdomain.com`) in your **GitHub Repository** ➔ **Settings** ➔ **Pages** ➔ **Custom domain** with free automated SSL.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
