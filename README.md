# 🦌 Personal AI Assistant

An interactive AI Assistant web application featuring a real-time animated avatar powered by **[Rive](https://rive.app)**, paired with a full **Firebase** backend for authentication and private chat persistence, built with **React** and **Vite**, and deployed via **GitHub Pages**.

---

## ✨ Features

- **Interactive 2D Avatar** — Driven by the Deer-Girl rig (`public/20673-38905-deer-girl.riv`) with 5 expressive states:
  - 🟢 **Idle** — Neutral relaxed stance
  - 😊 **Smile** — Happy & friendly expression
  - ⚡ **Surprise** — Thinking / shocked reaction
  - ❓ **Confused** — Curious / query state
  - 😠 **Angry** — Alert / frustration state
- **Google Authentication** — Secure Google Sign-In with session persistence and user profile display (`AuthGate` & `AuthContext`).
- **Real-Time Chat with Firestore** — Messages are synced in real-time to Cloud Firestore under private per-user collections (`users/{userId}/messages`).
- **Chat Sentiment Reactions** — Assistant automatically reacts with facial expressions matching message keywords (e.g., questions `?`, `"happy"`, `"wow"`, `"angry"`).
- **Automated CI/CD** — Zero-downtime deployment to GitHub Pages via GitHub Actions upon pushing to `main`.
- **State Machine Driven** — Clean state transitions via Rive state machine inputs with hover overrides and viewport clipping.

---

## 🛠️ Tech Stack

- **Frontend**: [React 18](https://react.dev/), [Vite 8](https://vitejs.dev/)
- **Animation Engine**: [@rive-app/react-canvas](https://rive.app/)
- **Backend & Auth**: [Firebase](https://firebase.google.com/) (Authentication & Cloud Firestore)
- **CI/CD & Hosting**: [GitHub Actions](https://github.com/features/actions) & [GitHub Pages](https://pages.github.com/)

---

## 📁 Project Structure

```
AI-Assisant/
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Actions workflow for Pages deployment
├── public/
│   └── 20673-38905-deer-girl.riv# Rive animation binary rig
├── src/
│   ├── components/
│   │   ├── AssistantStage.jsx   # Avatar viewport, canvas wrapper & aura glow
│   │   ├── AuthGate.jsx         # Google Sign-in screen & loading spinner
│   │   ├── ChatPanel.jsx        # Real-time Firestore chat UI & sentiment triggers
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
└── vite.config.js               # Dynamic base path for local dev and GitHub Pages
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

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Dexter0013/AI-Assisant.git
cd AI-Assisant
npm install
```

### 3. Configure Environment Variables

Create a local environment file by copying `.env.example`:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your Firebase project credentials from the [Firebase Console](https://console.firebase.google.com/) (Project Settings > General > Your Apps > Web):

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Start Development Server

```bash
npm run dev
```

Open your browser at `http://localhost:5173/`.

---

## 🔒 Security Rules (Cloud Firestore)

To ensure users can only access their own private chat logs, publish these security rules in the Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/messages/{messageId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 🌐 Deploying to GitHub Pages

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys the application.

1. **Add Repository Secrets**:
   * Navigate to **Settings** > **Secrets and variables** > **Actions** on GitHub.
   * Add the 6 secrets matching your `.env.local` keys:
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
   * In Firebase Console > **Authentication** > **Settings** > **Authorized domains**, add your GitHub Pages domain (e.g., `Dexter0013.github.io`).

4. **Deploy**:
   * Push your changes to the `main` branch. GitHub Actions will handle building the production bundle and publishing it live.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
