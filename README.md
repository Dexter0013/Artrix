# 🦌 Artrix — Your Personal AI Companion & Assistant

<p align="center">
  <img src="public/TitleArtrix.png" alt="Artrix — Your Personal AI Companion & Assistant" width="100%" style="border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.4);" />
</p>

An interactive AI Assistant web application featuring a real-time animated avatar powered by **[Rive](https://rive.app)**, conversational intelligence via **[Google Gemini](https://ai.google.dev/)** (Gemini 3.5 Flash), continuous voice recognition, natural neural voice synthesis, **Tailwind CSS v4** + **Lucide Icons** UI, and **Firebase** authentication & storage.

🔗 **Live Demo:** [https://dexter0013.github.io/Artrix/](https://dexter0013.github.io/Artrix/)

---

## ✨ Key Features

- **Interactive 2D Avatar** — Rive animated Deer-Girl rig (`public/20673-38905-deer-girl.riv`) with 5 real-time facial expression states (`Idle`, `Smile`, `Surprise`, `Confused`, `Angry`).
- **Conversational Intelligence** — Powered by Google Gemini 3 Flash models with multi-turn memory context across past turns.
- **Continuous Voice Input (STT)** — Native browser speech recognition (Web Speech API) with zero-latency streaming into the input field:
  - **Auto-Pause While Assistant Speaks**: Microphone turns off while audio plays out loud to prevent feedback loops, resuming automatically 100ms after speech ends.
  - **4-Second Pause Auto-Send (Desktop)**: On desktop screens, automatically sends text after a 4-second pause with a live countdown indicator.
  - **Smart Merge Algorithm**: Deduplicates mobile WebKit speech streams across session restarts.
- **Natural Neural Voice (TTS)**: Direct zero-latency streaming voice engine synchronized sentence-by-sentence with avatar expression changes.
- **Modern Tailwind CSS v4 & Lucide Icons UI**: Sleek glassmorphism styling, glowing micro-interactions, and SVG vector icons.
- **Bring-Your-Own-Key (BYOK) Security**: Gemini API keys are saved exclusively in the user's browser `localStorage` and purged automatically on sign-out.
- **Firebase Auth & Firestore Persistence**: Google Sign-In with private, per-user chat collection rules (`request.auth.uid == userId`).

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite 8, Tailwind CSS v4, Lucide Icons
- **AI & Speech**: Google Gemini Flash API, Web Speech API (STT), Microsoft Natural Voice Engine (TTS)
- **Animation**: `@rive-app/react-canvas`
- **Backend & Auth**: Firebase Auth (Google Sign-In) & Cloud Firestore
- **Hosting**: GitHub Pages via GitHub Actions

---

## 🚀 Getting Started Locally

1. **Install dependencies**:
   ```bash
   git clone https://github.com/Dexter0013/Artrix.git
   cd Artrix
   npm install
   ```

2. **Configure environment**:
   Copy `.env.example` to `.env.local` and add your Firebase credentials:
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

---

## 🔒 Security & Privacy

* **Firestore Isolation**: User chat data is isolated under `users/{userId}/messages` with strict security rules enforcing per-user read/write access.
* **Local Key Storage**: Visitor Gemini API keys are stored only in local browser `localStorage` and sent directly to Google's HTTPS endpoint. Keys are purged completely upon signing out.

---

## 📄 License

This project is open source under the [MIT License](LICENSE).
