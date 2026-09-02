// ─── Chat Panel ───────────────────────────────────────────────────────────────
// Real-time Firestore-backed chat panel powered by Google Gemini 3.5 Flash & Instant Natural Voice.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendMessage, subscribeToMessages, clearHistory } from '../firebase/chat';
import { useAI } from '../ai/useAI';
import { speakText, speakSegments, stopSpeech, unlockAudio } from '../ai/tts';
import { useVoiceInput } from '../ai/useVoiceInput';
import {
  Volume2,
  VolumeX,
  Key,
  Trash2,
  LogOut,
  Mic,
  Square,
  Send,
  Loader2,
  X,
  Sparkles,
  WifiOff,
  ShieldCheck,
} from 'lucide-react';

export function parseEmotionalSegments(rawText) {
  if (!rawText) return [];
  const moodMap = {
    smile:    { stateName: 'Smile', actionType: 'trigger_smile' },
    happy:    { stateName: 'Smile', actionType: 'trigger_smile' },
    surprise: { stateName: 'Surprise', actionType: 'trigger_surprise' },
    confused: { stateName: 'Confused', actionType: 'trigger_confusion' },
    angry:    { stateName: 'Angry', actionType: 'trigger_angry' },
    idle:     { stateName: 'Idle', actionType: 'idle' },
    normal:   { stateName: 'Idle', actionType: 'idle' },
  };

  const parts = rawText.split(/(\[(?:IDLE|NORMAL|SMILE|HAPPY|SURPRISE|CONFUSED|ANGRY)\])/gi);
  const segments = [];
  let pendingMood = null;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    const match = /^\[(IDLE|NORMAL|SMILE|HAPPY|SURPRISE|CONFUSED|ANGRY)\]$/i.exec(part.trim());
    if (match) {
      const tag = match[1].toLowerCase();
      const mood = moodMap[tag] || { stateName: 'Idle', actionType: 'idle' };
      if (segments.length > 0 && !segments[segments.length - 1].hasExplicitMood && !pendingMood) {
        segments[segments.length - 1].mood = mood;
        segments[segments.length - 1].hasExplicitMood = true;
      } else {
        pendingMood = mood;
      }
    } else {
      const text = part.trim();
      if (text) {
        const mood = pendingMood || { stateName: 'Idle', actionType: 'idle' };
        segments.push({ text, mood, hasExplicitMood: pendingMood !== null });
        pendingMood = null;
      }
    }
  }

  if (segments.length === 0 && rawText.trim()) {
    return [{ text: rawText.trim(), mood: { stateName: 'Idle', actionType: 'idle' } }];
  }

  return segments;
}

export default function ChatPanel({ onMoodDetected, onSpeechStart, onSpeechEnd, onTyping }) {
  const { currentUser, signOut } = useAuth();
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const [tempKey, setTempKey]     = useState('');
  const [keyInputError, setKeyInputError] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    const saved = localStorage.getItem('artrix_voice_enabled');
    return saved === null ? true : saved === 'true';
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const bottomRef                 = useRef(null);

  // ── Voice Input & Coarse Pointer Detection ──────────────────────────────
  const [isCoarsePointer, setIsCoarsePointer] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(pointer: coarse)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(pointer: coarse)');
    const onChange = (e) => setIsCoarsePointer(e.matches);
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    } else if (mql.addListener) {
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    }
  }, []);

  const initialInputRef = useRef('');

  const handleTranscript = useCallback((text) => {
    const base = initialInputRef.current ? initialInputRef.current.trim() : '';
    if (text) {
      setInput(base ? `${base} ${text}` : text);
    }
  }, []);

  const {
    isListening: isMicListening,
    isSupported: isMicSupported,
    errorMessage: micErrorMessage,
    setErrorMessage: setMicErrorMessage,
    start: startMic,
    stop: stopMic,
  } = useVoiceInput(handleTranscript);

  const handleStartListeningSession = useCallback(() => {
    initialInputRef.current = input;
    startMic();
  }, [input, startMic]);

  const handleMicClick = useCallback((e) => {
    if (isCoarsePointer) return;
    if (isMicListening) {
      stopMic();
    } else {
      handleStartListeningSession();
    }
  }, [isCoarsePointer, isMicListening, stopMic, handleStartListeningSession]);

  const handleMicPointerDown = useCallback((e) => {
    if (!isCoarsePointer) return;
    e.preventDefault();
    handleStartListeningSession();
  }, [isCoarsePointer, handleStartListeningSession]);

  const handleMicPointerUp = useCallback((e) => {
    if (!isCoarsePointer) return;
    e.preventDefault();
    stopMic();
  }, [isCoarsePointer, stopMic]);

  const handleMicPointerLeave = useCallback((e) => {
    if (!isCoarsePointer) return;
    stopMic();
  }, [isCoarsePointer, stopMic]);

  // ── Rate-limiting / in-flight guards ─────────────────────────────────────
  // `inFlightRef` is a synchronous mutex — set to true *before* the first
  // await so React state lag cannot let a second call slip through.
  const inFlightRef = useRef(false);
  // `lastSentRef` enforces a 1-second minimum gap between consecutive sends,
  // guarding against accidental rapid-fire retry loops or key-repeat events.
  const lastSentRef = useRef(0);
  const MIN_SEND_INTERVAL_MS = 1000;

  // ── Offline / connection-loss handling ────────────────────────────────────
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [firestoreError, setFirestoreError] = useState('');

  useEffect(() => {
    const goOnline  = () => { setIsOnline(true);  setFirestoreError(''); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Gemini AI hook
  const {
    hasKey,
    saveApiKey,
    clearApiKey,
    activeModel,
    generate,
    isGenerating,
  } = useAI();

  // Subscribe to real-time Firestore messages
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToMessages(
      currentUser.uid,
      setMessages,
      (err) => setFirestoreError(`Firestore sync error: ${err.message}`)
    );
    return unsubscribe;
  }, [currentUser]);

  // Auto-scroll to latest message.
  // - First paint: instant jump so the user never sees stale scroll position.
  // - Subsequent updates: smooth scroll for a polished feel.
  const isFirstScrollRef = useRef(true);
  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    if (isFirstScrollRef.current) {
      // Instant on initial render — avoids the "flash at top" on page load
      el.scrollIntoView({ behavior: 'instant', block: 'end' });
      isFirstScrollRef.current = false;
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isGenerating]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const detectMoodFromText = (msgText) => {
    const t = msgText.toLowerCase();
    if (t.includes('smile') || t.includes('happy') || t.includes('haha') || t.includes('love') || t.includes('great') || t.includes('good') || t.includes('yay') || t.includes('😊') || t.includes('😄')) {
      return { stateName: 'Smile', actionType: 'trigger_smile' };
    }
    if (t.includes('wow') || t.includes('omg') || t.includes('really') || t.includes('surpris') || t.includes('think') || t.includes('⚡') || t.includes('😲')) {
      return { stateName: 'Surprise', actionType: 'trigger_surprise' };
    }
    if (t.includes('why') || t.includes('how') || t.includes('confus') || t.includes('huh') || t.includes('❓')) {
      return { stateName: 'Confused', actionType: 'trigger_confusion' };
    }
    if (t.includes('angry') || t.includes('mad') || t.includes('hate') || t.includes('bad') || t.includes('stop') || t.includes('annoy') || t.includes('😠') || t.includes('😡')) {
      return { stateName: 'Angry', actionType: 'trigger_angry' };
    }
    return { stateName: 'Idle', actionType: 'idle' };
  };

  const handleSaveKey = () => {
    const trimmed = tempKey.trim();
    if (!trimmed) {
      setKeyInputError('Please enter a valid Gemini API key.');
      return;
    }
    saveApiKey(trimmed);
    setTempKey('');
    setKeyInputError('');
  };

  const handleChangeKey = () => {
    const newKey = window.prompt(
      'Enter a new Gemini API Key to update, or leave empty and click OK to delete the stored key from this browser:',
      ''
    );
    if (newKey !== null) {
      if (newKey.trim()) {
        saveApiKey(newKey.trim());
      } else {
        clearApiKey();
      }
    }
  };

  const handleSignOut = async () => {
    stopSpeech();
    clearApiKey();
    await signOut();
  };

  const handleToggleVoice = () => {
    unlockAudio();
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      if (onSpeechEnd) onSpeechEnd();
      return;
    }
    setVoiceEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('artrix_voice_enabled', next ? 'true' : 'false');
      return next;
    });
  };

  const handleSpeakMessage = (text, rawText) => {
    unlockAudio();
    // Use rawText (tagged) when available for full emotion-sync; fall back to clean text
    const sourceText = rawText || text;
    const segments = parseEmotionalSegments(sourceText);
    const hasTaggedMoods = segments.some((s) => s.hasExplicitMood);

    if (onSpeechStart) onSpeechStart();
    setIsSpeaking(true);

    if (voiceEnabled) {
      // Speak with synchronized avatar expression changes
      speakSegments(
        segments,
        (seg) => {
          if (seg.mood && onMoodDetected) onMoodDetected(seg.mood, false);
        },
        () => {
          setIsSpeaking(false);
          if (onSpeechEnd) onSpeechEnd();
        }
      );
    } else if (hasTaggedMoods) {
      // Voice muted but tagged moods exist — run visual-only timeline
      let delay = 0;
      segments.forEach((seg, idx) => {
        const isLast = idx === segments.length - 1;
        setTimeout(() => {
          if (seg.mood && onMoodDetected) onMoodDetected(seg.mood, isLast, 2000);
        }, delay);
        delay += 1600;
      });
      // Mark speaking done after timeline finishes
      setTimeout(() => {
        setIsSpeaking(false);
        if (onSpeechEnd) onSpeechEnd();
      }, delay);
    } else {
      // No tags and voice muted — nothing to animate
      setIsSpeaking(false);
      if (onSpeechEnd) onSpeechEnd();
    }
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || isGenerating) return;

    // Block sends while the device has no network connection
    if (!isOnline) return;

    // Synchronous in-flight mutex — blocks before any React state update
    if (inFlightRef.current) return;

    // Inter-request cooldown — prevents rapid-fire duplicate sends
    const now = Date.now();
    if (now - lastSentRef.current < MIN_SEND_INTERVAL_MS) return;

    inFlightRef.current = true;
    lastSentRef.current = now;
    setInput('');
    setSending(true);
    unlockAudio(); // Unlock audio immediately on user click

    // Initial avatar reaction to user message
    const userMood = detectMoodFromText(text);
    if (userMood && onMoodDetected) {
      onMoodDetected(userMood, false);
    }

    try {
      // 1. Write user message to Firestore
      await sendMessage(currentUser.uid, text, 'user');

      // 2. Generate response via Gemini API
      const rawAiResponse = await generate(text, messages);

      // 3. Parse multi-expression emotional timeline segments
      const segments = parseEmotionalSegments(rawAiResponse);

      const cleanMessageText = rawAiResponse
        .replace(/\[(IDLE|NORMAL|SMILE|HAPPY|SURPRISE|CONFUSED|ANGRY)\]/gi, '')
        .replace(/\s+/g, ' ')
        .trim() || "I'm here to help!";

      // 4. Save clean AI response to Firestore (rawAiResponse kept for replay animations)
      await sendMessage(currentUser.uid, cleanMessageText, 'assistant', rawAiResponse);

      // 5. Play synchronized multi-expression sequence
      if (voiceEnabled) {
        unlockAudio();
        if (onSpeechStart) onSpeechStart();
        setIsSpeaking(true);

        speakSegments(
          segments,
          (seg) => {
            if (seg.mood && onMoodDetected) {
              onMoodDetected(seg.mood, false);
            }
          },
          () => {
            setIsSpeaking(false);
            if (onSpeechEnd) onSpeechEnd(); // Automatically starts 2-second idle revert!
          }
        );
      } else {
        // Voice is muted: transition through the expressions visually
        let delay = 0;
        segments.forEach((seg, idx) => {
          const isLast = idx === segments.length - 1;
          setTimeout(() => {
            if (seg.mood && onMoodDetected) {
              onMoodDetected(seg.mood, isLast, 2000);
            }
          }, delay);
          delay += 1600;
        });
      }
    } catch (err) {
      console.error('Gemini error:', err);
      if (onMoodDetected) {
        onMoodDetected({ stateName: 'Idle', actionType: 'idle' });
      }
      await sendMessage(
        currentUser.uid,
        `⚠️ AI Notice: ${err.message}`,
        'assistant'
      );
    } finally {
      setSending(false);
      inFlightRef.current = false;
    }
  }, [input, sending, isGenerating, isOnline, messages, voiceEnabled, generate, currentUser, onMoodDetected, onSpeechStart, onSpeechEnd]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = async () => {
    if (window.confirm('Clear all chat history?')) {
      stopSpeech();
      await clearHistory(currentUser.uid);
    }
  };

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.userInfo}>
          {currentUser?.photoURL && (
            <img
              src={currentUser.photoURL}
              alt="avatar"
              style={styles.avatar}
            />
          )}
          <div style={styles.nameBlock}>
            <span style={styles.userName}>
              {currentUser?.displayName || 'User'}
            </span>
            <span style={styles.modelBadge}>
              {hasKey ? activeModel : 'API Key Required'}
            </span>
          </div>
        </div>

        <div style={styles.actions}>
          {/* Voice Toggle Button (Kokoro TTS) */}
          <button
            id="btn-toggle-voice"
            title={
              isSpeaking
                ? 'Speaking… (Click to stop)'
                : voiceEnabled
                ? 'Voice Enabled (Click to Mute)'
                : 'Voice Muted (Click to Enable)'
            }
            className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer ${
              isSpeaking
                ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(62,207,207,0.5)] animate-pulse'
                : voiceEnabled
                ? 'bg-white/10 hover:bg-white/20 text-white/90 border border-white/10'
                : 'bg-white/5 hover:bg-white/10 text-white/40 border border-white/5'
            }`}
            onClick={handleToggleVoice}
          >
            {isSpeaking ? (
              <Volume2 className="w-4 h-4 text-cyan-300 animate-bounce" />
            ) : voiceEnabled ? (
              <Volume2 className="w-4 h-4 text-white/90" />
            ) : (
              <VolumeX className="w-4 h-4 text-white/40" />
            )}
          </button>

          {hasKey && (
            <button
              id="btn-change-api-key"
              title="Change or Clear Gemini API Key"
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 transition-all duration-200 cursor-pointer flex items-center justify-center"
              onClick={handleChangeKey}
            >
              <Key className="w-4 h-4" />
            </button>
          )}
          <button
            id="btn-clear-chat"
            title="Clear history"
            className="p-2.5 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:border-rose-500/30 text-white/80 hover:text-rose-300 border border-white/10 transition-all duration-200 cursor-pointer flex items-center justify-center"
            onClick={handleClear}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            id="btn-sign-out"
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/15 text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5"
            onClick={handleSignOut}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* If API Key is missing, show Key Prompt Card */}
      {!hasKey ? (
        <div style={styles.keyPromptContainer}>
          <div style={styles.keyPromptCard}>
            <Key className="w-10 h-10 text-cyan-400 mb-1" />
            <h3 style={styles.keyPromptTitle}>Connect Gemini API Key</h3>
            <p style={styles.keyPromptDesc}>
              To begin chatting with Artrix, please enter your free Google Gemini API key. It is saved securely in your browser.
            </p>

            <div style={styles.keyInputRow}>
              <input
                id="gemini-key-input"
                type="password"
                placeholder="AIzaSy..."
                value={tempKey}
                onChange={(e) => {
                  setTempKey(e.target.value);
                  setKeyInputError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                style={styles.keyInput}
              />
              <button
                id="btn-save-gemini-key"
                onClick={handleSaveKey}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 hover:from-indigo-600 hover:to-cyan-500 text-white font-semibold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-md flex-shrink-0"
              >
                Connect
              </button>
            </div>

            {keyInputError && (
              <p style={styles.keyErrorText}>{keyInputError}</p>
            )}

            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.keyLink}
            >
              Get a free Gemini API key →
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Message List */}
          <div style={styles.messageList}>
            {/* Offline banner */}
            {!isOnline && (
              <div style={styles.offlineBanner} role="alert" aria-live="assertive">
                <WifiOff className="w-4 h-4 flex-shrink-0" />
                <span>No internet connection — messages will resume once you're back online.</span>
              </div>
            )}

            {/* Firestore error notice */}
            {firestoreError && isOnline && (
              <div style={styles.firestoreNotice} role="alert">
                <span>⚠️ {firestoreError}</span>
                <button
                  className="p-1 rounded-md hover:bg-rose-500/20 text-rose-400 transition-colors duration-150 cursor-pointer border-none bg-transparent flex items-center justify-center"
                  onClick={() => setFirestoreError('')}
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Mic error notice */}
            {micErrorMessage && (
              <div style={styles.micErrorNotice} role="alert">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{micErrorMessage}</span>
                </div>
                <button
                  className="p-1 rounded-md hover:bg-rose-500/20 text-rose-400 transition-colors duration-150 cursor-pointer border-none bg-transparent flex items-center justify-center"
                  onClick={() => setMicErrorMessage('')}
                  aria-label="Dismiss microphone error"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {messages.length === 0 && (
              <div style={styles.empty}>
                <Sparkles className="w-8 h-8 text-cyan-400 mb-1 animate-pulse" />
                <p style={styles.emptyTitle}>Chat with Artrix</p>
                <p style={styles.emptySub}>
                  Powered by Google {activeModel} • Natural Neural Voice
                </p>
                <div className="flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>End-to-End Encrypted &amp; Secure Session</span>
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  ...styles.bubble,
                  ...(msg.role === 'user' ? styles.userBubble : styles.assistantBubble),
                }}
              >
                <div style={styles.bubbleHeader}>
                  <span style={styles.roleLabel}>
                    {msg.role === 'user' ? 'You' : 'Artrix'}
                  </span>
                  {msg.role === 'assistant' && (
                    <button
                      title="Play speech (Natural Voice)"
                      className="p-1 rounded-md text-white/50 hover:text-cyan-300 hover:bg-white/10 transition-colors duration-150 cursor-pointer border-none bg-transparent flex items-center justify-center"
                      onClick={() => handleSpeakMessage(msg.text, msg.rawText)}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p style={styles.msgText}>{msg.text}</p>
              </div>
            ))}

            {/* Thinking / Generating Indicator */}
            {isGenerating && (
              <div style={{ ...styles.bubble, ...styles.assistantBubble, ...styles.thinkingBubble }}>
                <span style={styles.roleLabel}>Artrix</span>
                <div style={styles.thinkingDots}>
                  <span style={styles.pulseDot}>●</span>
                  <span style={{ ...styles.pulseDot, animationDelay: '0.2s' }}>●</span>
                  <span style={{ ...styles.pulseDot, animationDelay: '0.4s' }}>●</span>
                  <span style={styles.thinkingText}>thinking…</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input Bar */}
          <div style={styles.inputRow}>
            <textarea
              id="chat-input"
              style={styles.textarea}
              placeholder={
                isMicListening
                  ? 'Listening to speech…'
                  : isGenerating
                  ? 'Thinking…'
                  : 'Enter your thoughts…'
              }
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (onTyping) onTyping();
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={sending || isGenerating || !isOnline}
            />
            {isMicSupported && (
              <button
                id="btn-mic"
                title={
                  isCoarsePointer
                    ? isMicListening ? 'Listening… (Release to finish)' : 'Press & hold to speak'
                    : isMicListening ? 'Listening… (Click to stop)' : 'Click to speak'
                }
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer select-none touch-none border ${
                  isMicListening
                    ? 'bg-rose-500/30 border-rose-500 text-rose-400 shadow-[0_0_16px_rgba(244,63,94,0.6)] animate-pulse'
                    : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border-white/15'
                } ${sending || isGenerating || !isOnline ? 'opacity-40 cursor-not-allowed' : ''}`}
                onClick={handleMicClick}
                onPointerDown={handleMicPointerDown}
                onPointerUp={handleMicPointerUp}
                onPointerLeave={handleMicPointerLeave}
                onPointerCancel={handleMicPointerLeave}
                onTouchStart={(e) => {
                  if (isCoarsePointer) {
                    e.preventDefault();
                    handleStartListeningSession();
                  }
                }}
                onTouchEnd={(e) => {
                  if (isCoarsePointer) {
                    e.preventDefault();
                    stopMic();
                  }
                }}
                onTouchCancel={() => {
                  if (isCoarsePointer) {
                    stopMic();
                  }
                }}
                disabled={sending || isGenerating || !isOnline}
              >
                {isMicListening ? (
                  <Square className="w-4 h-4 fill-rose-500 text-rose-500" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            )}
            <button
              id="btn-send"
              className={`w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 text-white flex items-center justify-center transition-all duration-200 shadow-md ${
                sending || isGenerating || !input.trim() || !isOnline
                  ? 'opacity-40 cursor-not-allowed shadow-none'
                  : 'hover:scale-105 hover:shadow-cyan-500/25 active:scale-95 cursor-pointer'
              }`}
              onClick={handleSend}
              disabled={sending || isGenerating || !input.trim() || !isOnline}
              title={!isOnline ? 'No internet connection' : isGenerating ? 'Generating response…' : 'Send message'}
            >
              {sending || isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : !isOnline ? (
                <WifiOff className="w-5 h-5" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minWidth: '300px',
    maxWidth: '100%',
    height: '520px',
    maxHeight: 'calc(100vh - 160px)',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    overflow: 'hidden',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  nameBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  userName: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    lineHeight: 1.2,
  },
  modelBadge: {
    fontSize: '11px',
    color: '#3ECFCF',
    fontWeight: '600',
    letterSpacing: '0.02em',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    borderRadius: '8px',
    transition: 'all 0.15s ease',
  },
  signOutBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '12px',
    padding: '5px 10px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  keyPromptContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  keyPromptCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    maxWidth: '360px',
    gap: '12px',
  },
  keyPromptIcon: {
    fontSize: '36px',
    marginBottom: '2px',
  },
  keyPromptTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#fff',
    margin: 0,
  },
  keyPromptDesc: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: '1.5',
    margin: 0,
  },
  keyInputRow: {
    display: 'flex',
    gap: '8px',
    width: '100%',
    marginTop: '6px',
  },
  keyInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '13px',
    padding: '10px 12px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  saveKeyBtn: {
    background: 'linear-gradient(135deg, #6C63FF, #3ECFCF)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontWeight: '600',
    fontSize: '13px',
    padding: '10px 16px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  keyErrorText: {
    fontSize: '12px',
    color: '#FF6B6B',
    margin: 0,
  },
  keyLink: {
    fontSize: '12px',
    color: '#3ECFCF',
    textDecoration: 'none',
    marginTop: '4px',
  },
  messageList: {
    flex: '1 1 0',
    minHeight: 0,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    scrollBehavior: 'smooth',
  },
  empty: {
    textAlign: 'center',
    /* was 0.35 (1.9:1) — bumped to 0.65 (WCAG AA) */
    color: 'rgba(255,255,255,0.65)',
    marginTop: 'auto',
    marginBottom: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  emptyIcon: {
    fontSize: '32px',
    marginBottom: '4px',
  },
  emptyTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    margin: 0,
  },
  emptySub: {
    fontSize: '12px',
    /* was 0.4 (2.2:1) — bumped to 0.65 (WCAG AA) */
    color: 'rgba(255,255,255,0.65)',
    margin: 0,
  },
  bubble: {
    maxWidth: '85%',
    padding: '10px 14px',
    borderRadius: '16px',
    lineHeight: '1.5',
  },
  bubbleHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
    gap: '8px',
  },
  userBubble: {
    alignSelf: 'flex-end',
    background: 'linear-gradient(135deg, #6C63FF, #3ECFCF)',
    color: '#fff',
    borderBottomRightRadius: '4px',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.85)',
    borderBottomLeftRadius: '4px',
  },
  speakMsgBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '1px 3px',
    opacity: 0.6,
    borderRadius: '4px',
    transition: 'all 0.15s ease',
  },
  thinkingBubble: {
    opacity: 0.85,
  },
  thinkingDots: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 0',
  },
  pulseDot: {
    fontSize: '10px',
    color: '#3ECFCF',
  },
  thinkingText: {
    fontSize: '12px',
    /* was 0.5 (2.7:1) — bumped to 0.72 (WCAG AA) */
    color: 'rgba(255,255,255,0.72)',
    marginLeft: '6px',
    fontStyle: 'italic',
  },
  roleLabel: {
    display: 'block',
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    opacity: 0.7,
  },
  msgText: {
    margin: 0,
    fontSize: '14px',
    whiteSpace: 'pre-wrap',
  },
  inputRow: {
    display: 'flex',
    gap: '10px',
    padding: '12px 16px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1,
    resize: 'none',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '14px',
    padding: '11px 14px',
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: '1.4',
    height: '44px',
    minHeight: '44px',
    maxHeight: '120px',
    boxSizing: 'border-box',
    overflowY: 'auto',
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #6C63FF, #3ECFCF)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '18px',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'transform 0.15s',
  },
  offlineBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '10px',
    background: 'rgba(255, 180, 0, 0.12)',
    border: '1px solid rgba(255, 180, 0, 0.35)',
    color: '#FFB400',
    fontSize: '12px',
    fontWeight: '600',
    flexShrink: 0,
  },
  firestoreNotice: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '7px 12px',
    borderRadius: '10px',
    background: 'rgba(255, 107, 107, 0.10)',
    border: '1px solid rgba(255, 107, 107, 0.30)',
    color: '#FF6B6B',
    fontSize: '12px',
    fontWeight: '500',
    flexShrink: 0,
  },
  dismissBtn: {
    background: 'none',
    border: 'none',
    color: '#FF6B6B',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '0 2px',
    flexShrink: 0,
    opacity: 0.8,
  },
  micBtn: {
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '18px',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.15s ease',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
  },
  micErrorNotice: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '10px',
    background: 'rgba(255, 107, 107, 0.12)',
    border: '1px solid rgba(255, 107, 107, 0.35)',
    color: '#FF6B6B',
    fontSize: '12px',
    fontWeight: '500',
    flexShrink: 0,
  },
};
