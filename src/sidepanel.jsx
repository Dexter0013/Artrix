import React from 'react';
import ReactDOM from 'react-dom/client';
import { RuntimeLoader } from '@rive-app/canvas';
import SidePanelApp from './extension/SidePanelApp.jsx';
import './index.css';

// Ensure Rive WASM loads from the local extension package in Manifest V3 (MV3 compliant)
if (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) {
  try {
    const wasmUrl = chrome.runtime.getURL('rive.wasm');
    const fallbackWasmUrl = chrome.runtime.getURL('rive_fallback.wasm');
    RuntimeLoader.setWasmUrl(wasmUrl);
    RuntimeLoader.setWasmFallbackUrl(fallbackWasmUrl);
    console.log('[Artrix SidePanel] Local Rive WASM registered:', wasmUrl);
  } catch (err) {
    console.warn('[Artrix SidePanel] Failed to set local WASM URL:', err);
  }
} else {
  try {
    RuntimeLoader.setWasmUrl(`${import.meta.env.BASE_URL || './'}rive.wasm`);
    RuntimeLoader.setWasmFallbackUrl(`${import.meta.env.BASE_URL || './'}rive_fallback.wasm`);
  } catch {
    // fallback will use default
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SidePanelApp />
  </React.StrictMode>
);
