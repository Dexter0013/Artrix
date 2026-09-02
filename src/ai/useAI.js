// ─── useAI React Hook ────────────────────────────────────────────────────────
// Manages Google Gemini API state, generation, and active model version resolution.

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  generateGeminiReply,
  getGeminiApiKey,
  setGeminiApiKey,
  clearGeminiApiKey,
  getFastestModel,
} from './gemini';

export function useAI() {
  const [apiKey, setApiKeyState] = useState(() => getGeminiApiKey());
  const [activeModel, setActiveModel] = useState('Gemini 3.5 Flash');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Synchronous in-flight ref — prevents overlapping Gemini API calls
  // even if the caller bypasses the ChatPanel-level guards.
  const inFlightRef = useRef(false);

  // Detect and resolve the active optimal model name
  useEffect(() => {
    if (!apiKey) return;

    let isMounted = true;
    getFastestModel(apiKey).then((res) => {
      if (isMounted && res?.name) {
        setActiveModel(res.name);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  const saveApiKey = useCallback((key) => {
    setGeminiApiKey(key);
    setApiKeyState(getGeminiApiKey());
    setError(null);
  }, []);

  const clearApiKey = useCallback(() => {
    clearGeminiApiKey();
    setApiKeyState('');
    setActiveModel('Gemini 3.5 Flash');
    setError(null);
  }, []);

  const generate = useCallback(async (userText, recentMessages = [], options = {}) => {
    // Defensive hook-level guard: reject concurrent calls immediately
    if (inFlightRef.current) {
      throw new Error('A request is already in progress. Please wait.');
    }
    inFlightRef.current = true;
    setIsGenerating(true);
    setError(null);
    try {
      const reply = await generateGeminiReply(userText, recentMessages, options);
      return reply;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsGenerating(false);
      inFlightRef.current = false;
    }
  }, []);

  return {
    apiKey,
    hasKey: Boolean(apiKey && apiKey.trim()),
    saveApiKey,
    clearApiKey,
    activeModel,
    generate,
    isGenerating,
    error,
  };
}
