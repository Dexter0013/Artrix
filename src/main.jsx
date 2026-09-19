import React from 'react';
import ReactDOM from 'react-dom/client';
import { RuntimeLoader } from '@rive-app/canvas';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import AuthGate from './components/AuthGate.jsx';
import './index.css';

try {
  RuntimeLoader.setWasmUrl(`${import.meta.env.BASE_URL || './'}rive.wasm`);
  RuntimeLoader.setWasmFallbackUrl(`${import.meta.env.BASE_URL || './'}rive_fallback.wasm`);
} catch {
  // Ignore
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </AuthProvider>
  </React.StrictMode>
);
