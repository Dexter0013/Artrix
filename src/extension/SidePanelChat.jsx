// ─── Dedicated Side Panel Chat & Reasoner UI ────────────────────────────────
// Specifically engineered for narrow browser side panels (320px – 480px width)
// Guarantees zero horizontal overflow, responsive toolbar, and smart PDF/document context.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAI } from '../ai/useAI';
import { speakSegments, stopSpeech, unlockAudio } from '../ai/tts';
import { useVoiceInput } from '../ai/useVoiceInput';
import {
  Volume2,
  VolumeX,
  Key,
  Trash2,
  Mic,
  MicOff,
  Square,
  Send,
  Loader2,
  X,
  Sparkles,
  WifiOff,
  Globe,
  FileText,
  Scissors,
  ExternalLink,
} from 'lucide-react';
import { performWebSearch, isWebSearchQuery } from '../ai/webSearch';
import { parseEmotionalSegments, mergeTranscripts } from '../components/ChatPanel';

export default function SidePanelChat({ onMoodDetected, onSpeechStart, onSpeechEnd, onTyping }) {

  // Gemini AI hook
  const {
    hasKey,
    saveApiKey,
    clearApiKey,
    activeModel,
    generate,
    isGenerating,
  } = useAI();

  // ── Session Lifetime Management ─────────────────────────────────────────────
  // When the extension is closed, sessionStorage is cleared.
  // We wipe localStorage conversation history so every new extension open starts fresh.
  const [messages, setMessages] = useState(() => {
    try {
      const isSessionActive = sessionStorage.getItem('artrix_session_active');
      if (!isSessionActive) {
        localStorage.removeItem('artrix_sidepanel_messages');
        sessionStorage.setItem('artrix_session_active', 'true');
        return [];
      }
      const saved = localStorage.getItem('artrix_sidepanel_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Keep localStorage updated during the active session
  useEffect(() => {
    try {
      localStorage.setItem('artrix_sidepanel_messages', JSON.stringify(messages));
    } catch {
      // Ignore quota errors
    }
  }, [messages]);

  // Clean up localStorage whenever the extension side panel window closes or unloads
  useEffect(() => {
    const handleExtensionClosed = () => {
      try {
        localStorage.removeItem('artrix_sidepanel_messages');
        sessionStorage.removeItem('artrix_session_active');
      } catch {
        // Ignore
      }
    };

    window.addEventListener('beforeunload', handleExtensionClosed);
    window.addEventListener('pagehide', handleExtensionClosed);
    window.addEventListener('unload', handleExtensionClosed);

    // Maintain a live session port to background worker
    let port = null;
    if (typeof chrome !== 'undefined' && chrome?.runtime?.connect) {
      try {
        port = chrome.runtime.connect({ name: 'artrix_sidepanel_session' });
      } catch {
        // Ignore
      }
    }

    return () => {
      window.removeEventListener('beforeunload', handleExtensionClosed);
      window.removeEventListener('pagehide', handleExtensionClosed);
      window.removeEventListener('unload', handleExtensionClosed);
      if (port) {
        try {
          port.disconnect();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [tempKey, setTempKey] = useState('');
  const [keyInputError, setKeyInputError] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    const saved = localStorage.getItem('artrix_voice_enabled');
    return saved === null ? true : saved === 'true';
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [activeDocContext, setActiveDocContext] = useState(null);
  const bottomRef = useRef(null);

  // Synchronize document/selection/snip context from Edge/Chrome extension
  useEffect(() => {
    if (typeof chrome !== 'undefined') {
      const storage = chrome.storage?.session || chrome.storage?.local;
      if (storage?.get) {
        storage.get(['artrix_pending_context'], (res) => {
          if (res?.artrix_pending_context) {
            setActiveDocContext(res.artrix_pending_context);
            try {
              storage.remove(['artrix_pending_context']);
            } catch {
              // Ignore
            }
          }
        });
      }
    }

    const messageListener = (msg) => {
      if (msg.action === 'ACTIVE_CONTEXT_CHANGED' && msg.payload) {
        setActiveDocContext(msg.payload);
        if (msg.payload.type === 'SNIP') {
          setInput((prev) => prev.trim() ? prev : 'Please analyze and explain this snipped diagram / formula with step-by-step reasoning.');
        }
      }
      if (msg.action === 'SNIP_ERROR' && msg.message) {
        alert(msg.message);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(messageListener);
      return () => {
        try {
          chrome.runtime.onMessage.removeListener(messageListener);
        } catch {
          // Ignore
        }
      };
    }
  }, []);

  const handleTriggerSnip = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ action: 'TRIGGER_SNIP_FROM_PANEL' }, (res) => {
        if (chrome.runtime.lastError) {
          console.warn('[Artrix Snip Error]:', chrome.runtime.lastError.message);
          alert('Could not start snip. Please make sure you have an active webpage tab open.');
        }
      });
    } else {
      alert('Screen snip is available when running Artrix in the browser extension!');
    }
  };

  // ── Voice Input ────────────────────────────────────────────────────────────
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const preVoiceInputRef = useRef('');
  const accumulatedVoiceRef = useRef('');
  const lastSessionTextRef = useRef('');

  const handleTranscript = useCallback((text) => {
    if (!text) return;
    lastSessionTextRef.current = text;
    const base = preVoiceInputRef.current ? preVoiceInputRef.current.trim() : '';
    const accumulated = accumulatedVoiceRef.current ? accumulatedVoiceRef.current.trim() : '';
    const voiceText = mergeTranscripts(accumulated, text);
    setInput(mergeTranscripts(base, voiceText));
  }, []);

  const handleVoiceEnd = useCallback(() => {
    if (lastSessionTextRef.current) {
      const accumulated = accumulatedVoiceRef.current ? accumulatedVoiceRef.current.trim() : '';
      const sessionText = lastSessionTextRef.current.trim();
      if (sessionText) {
        accumulatedVoiceRef.current = mergeTranscripts(accumulated, sessionText);
      }
      lastSessionTextRef.current = '';
    }
  }, []);

  const {
    isListening: isMicListening,
    isSupported: isMicSupported,
    start: startMic,
    stop: stopMic,
  } = useVoiceInput({
    onTranscript: handleTranscript,
    onEnd: handleVoiceEnd,
  });

  const inFlightRef = useRef(false);
  const lastSentRef = useRef(0);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

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
      'Enter your Gemini API Key (or leave empty to clear):\n\n' +
      '• Get free key: https://aistudio.google.com/app/apikey\n' +
      '• Documentation: https://ai.google.dev/gemini-api/docs/api-key',
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

  const handleClear = () => {
    if (window.confirm('Clear all conversation history in this session?')) {
      setMessages([]);
      try {
        localStorage.removeItem('artrix_sidepanel_messages');
      } catch {
        // Ignore
      }
    }
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

  const handleSend = useCallback(async (customText, customOptions = {}) => {
    const text = (typeof customText === 'string' ? customText : input).trim();
    if (!text || sending || isGenerating || !isOnline) return;

    if (inFlightRef.current) return;
    const now = Date.now();
    if (now - lastSentRef.current < 900) return;

    inFlightRef.current = true;
    lastSentRef.current = now;
    stopMic();
    setInput('');
    preVoiceInputRef.current = '';
    accumulatedVoiceRef.current = '';
    lastSessionTextRef.current = '';
    setSending(true);
    unlockAudio();

    if (onMoodDetected) {
      onMoodDetected({ stateName: 'Confused', actionType: 'trigger_confusion' }, false);
    }

    try {
      const userMessage = {
        id: `user_${Date.now()}`,
        text,
        sender: 'user',
        role: 'user',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      let searchContext = '';
      const requiresSearch = isWebSearchEnabled || customOptions.forceWebSearch || isWebSearchQuery(text);

      if (requiresSearch) {
        setIsSearchingWeb(true);
        try {
          const searchRes = await performWebSearch(text);
          if (searchRes && searchRes.hasResults) {
            searchContext = searchRes.context;
          }
        } catch (searchErr) {
          console.warn('[WebSearch] Error:', searchErr);
        } finally {
          setIsSearchingWeb(false);
        }
      }

      const contextToUse = customOptions.docContext !== undefined ? customOptions.docContext : activeDocContext;
      const geminiOptions = {
        searchContext,
        image: contextToUse?.type === 'SNIP' ? contextToUse.image : null,
        pageContext: contextToUse ? {
          title: contextToUse.pageTitle,
          url: contextToUse.pageUrl,
          selectedText: contextToUse.type === 'SELECTION' ? contextToUse.text : null,
        } : null,
      };

      const rawAiResponse = await generate(text, messages, geminiOptions);
      const segments = parseEmotionalSegments(rawAiResponse);
      const cleanMessageText = rawAiResponse
        .replace(/\[(IDLE|NORMAL|SMILE|HAPPY|SURPRISE|CONFUSED|ANGRY)\]/gi, '')
        .replace(/\s+/g, ' ')
        .trim() || "I'm here to help!";

      const assistantMessage = {
        id: `assistant_${Date.now()}`,
        text: cleanMessageText,
        sender: 'assistant',
        role: 'assistant',
        rawAiResponse,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (voiceEnabled) {
        unlockAudio();
        if (onSpeechStart) onSpeechStart();
        setIsSpeaking(true);
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
      } else {
        const lastMood = segments[segments.length - 1]?.mood;
        if (lastMood && onMoodDetected) onMoodDetected(lastMood, true, 2000);
      }
    } catch (err) {
      console.error('Gemini error:', err);
      if (onMoodDetected) onMoodDetected({ stateName: 'Idle', actionType: 'idle' });
      const errorMessage = {
        id: `err_${Date.now()}`,
        text: `⚠️ AI Notice: ${err.message}`,
        sender: 'assistant',
        role: 'assistant',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setInput('');
      setSending(false);
      inFlightRef.current = false;
    }
  }, [input, sending, isGenerating, isOnline, messages, voiceEnabled, generate, onMoodDetected, onSpeechStart, onSpeechEnd, stopMic, activeDocContext, isWebSearchEnabled]);

  const handleAskContextAction = useCallback((actionPrompt, forceWeb = false) => {
    handleSend(actionPrompt, { forceWebSearch: forceWeb });
  }, [handleSend]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Header Card */}
      <div style={styles.header}>
        {/* Companion Identity */}
        <div style={styles.userInfoRow}>
          <div style={styles.userProfile}>
            <div style={styles.avatarPlaceholder}>🦌</div>
            <div style={styles.userMeta}>
              <span style={styles.userName}>Artrix Companion</span>
              <span style={styles.modelTag}>{hasKey ? activeModel : 'Key Needed'}</span>
            </div>
          </div>
        </div>

        {/* Compact Action Toolbar (Never overflows) */}
        <div style={styles.toolbarRow}>
          <button
            id="btn-sidepanel-websearch"
            title={isWebSearchEnabled ? 'Web Search: ON' : 'Web Search: AUTO'}
            style={{
              ...styles.iconBtn,
              background: isWebSearchEnabled ? 'rgba(62,207,207,0.22)' : 'rgba(255,255,255,0.08)',
              borderColor: isWebSearchEnabled ? 'rgba(62,207,207,0.45)' : 'rgba(255,255,255,0.12)',
              color: isWebSearchEnabled ? '#3ecfcf' : 'var(--text-dim)',
            }}
            onClick={() => setIsWebSearchEnabled((p) => !p)}
          >
            {isSearchingWeb ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-300" /> : <Globe className="w-3.5 h-3.5" />}
          </button>

          <button
            id="btn-sidepanel-voice"
            title={voiceEnabled ? 'Voice: Enabled' : 'Voice: Muted'}
            style={{
              ...styles.iconBtn,
              background: voiceEnabled ? 'rgba(140,179,116,0.22)' : 'rgba(255,255,255,0.06)',
              borderColor: voiceEnabled ? 'rgba(140,179,116,0.45)' : 'rgba(255,255,255,0.10)',
              color: voiceEnabled ? '#8cb374' : 'var(--text-dim)',
            }}
            onClick={handleToggleVoice}
          >
            {isSpeaking ? <Volume2 className="w-3.5 h-3.5 animate-bounce text-cyan-300" /> : voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            id="btn-sidepanel-snip"
            title="Snip area / equation / chart on page (OCR & Vision Reasoning)"
            style={styles.iconBtn}
            onClick={handleTriggerSnip}
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>

          {hasKey && (
            <button
              id="btn-sidepanel-key"
              title="Update or view Gemini API Key"
              style={styles.iconBtn}
              onClick={handleChangeKey}
            >
              <Key className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            id="btn-sidepanel-clear"
            title="Clear chat history"
            style={{ ...styles.iconBtn, color: 'var(--danger)' }}
            onClick={handleClear}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* API Key Missing Card */}
      {!hasKey ? (
        <div style={styles.keyCard}>
          <Key className="w-8 h-8 text-accent mb-2" />
          <h3 style={styles.keyCardTitle}>Connect Gemini API Key</h3>
          <p style={styles.keyCardDesc}>
            Enter your free Google Gemini API key to activate reasoning, vision OCR, and chat.
          </p>

          <div style={styles.keyInputRow}>
            <input
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
            <button onClick={handleSaveKey} style={styles.keySubmitBtn}>
              Save
            </button>
          </div>

          {keyInputError && <p style={styles.keyError}>{keyInputError}</p>}

          <div style={styles.keyLinks}>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={styles.keyLink}>
              Get a free API key on Google AI Studio →
            </a>
            <a href="https://ai.google.dev/gemini-api/docs/api-key" target="_blank" rel="noopener noreferrer" style={styles.keyDocLink}>
              <ExternalLink style={{ width: 11, height: 11 }} />
              API Key Quickstart &amp; Documentation
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Messages Stream */}
          <div style={styles.messageStream}>
            {!isOnline && (
              <div style={styles.offlineNotice}>
                <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Offline — messages will sync when back online.</span>
              </div>
            )}

            {messages.length === 0 && (
              <div style={styles.emptyState}>
                <p style={styles.emptyTitle}>🦌 Artrix Side Panel Ready</p>
                <p style={styles.emptyDesc}>
                  Highlight any text on a web page or PDF to ask Artrix, or click <b>✂️ Snip</b> to analyze charts &amp; formulas!
                </p>
              </div>
            )}

            {messages.map((m) => {
              const isUser = m.role === 'user' || m.sender === 'user';
              return (
                <div
                  key={m.id}
                  style={{
                    ...styles.bubble,
                    ...(isUser ? styles.userBubble : styles.assistantBubble),
                  }}
                >
                  <div
                    style={{
                      ...styles.bubbleHeader,
                      justifyContent: isUser ? 'flex-end' : 'space-between',
                    }}
                  >
                    <span
                      style={{
                        ...styles.bubbleRole,
                        color: isUser ? '#8cb374' : '#3ecfcf',
                      }}
                    >
                      {isUser ? 'You' : '🦌 Artrix'}
                    </span>
                    {!isUser && (
                      <button
                        title="Play voice"
                        style={styles.bubbleVoiceBtn}
                        onClick={() => {
                          unlockAudio();
                          const segs = parseEmotionalSegments(m.rawAiResponse || m.text);
                          speakSegments(segs);
                        }}
                      >
                        <Volume2 style={{ width: 11, height: 11 }} />
                      </button>
                    )}
                  </div>
                  <p style={styles.bubbleText}>{m.text}</p>
                </div>
              );
            })}

            {isGenerating && (
              <div style={{ ...styles.bubble, ...styles.assistantBubble }}>
                <div style={styles.bubbleHeader}>
                  <span style={{ ...styles.bubbleRole, color: '#3ecfcf' }}>🦌 Artrix</span>
                </div>
                <div style={styles.thinkingRow}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Thinking &amp; reasoning…</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Active Document Context Banner */}
          {activeDocContext && (
            <div style={styles.contextCard}>
              <div style={styles.contextHeader}>
                <span style={styles.contextTitle}>
                  <FileText style={{ width: 12, height: 12, flexShrink: 0 }} />
                  <span style={styles.contextTitleText}>{activeDocContext.pageTitle || 'Active Document / PDF'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveDocContext(null)}
                  title="Clear context"
                  style={styles.contextCloseBtn}
                >
                  <X style={{ width: 12, height: 12 }} />
                </button>
              </div>

              {activeDocContext.type === 'SELECTION' && (
                <p style={styles.contextSnippet}>"{activeDocContext.text}"</p>
              )}

              {activeDocContext.type === 'SNIP' && activeDocContext.image && (
                <div style={styles.contextImageWrap}>
                  <img src={activeDocContext.image} alt="Snipped diagram" style={styles.contextThumb} />
                  <span style={styles.contextImageText}>Snipped area ready for OCR &amp; vision reasoning</span>
                </div>
              )}

              <div style={styles.contextActions}>
                <button type="button" onClick={() => handleAskContextAction('Explain this simply and clearly')} style={styles.actionChip}>
                  💡 Explain
                </button>
                <button type="button" onClick={() => handleAskContextAction('Break this down step-by-step with deep reasoning')} style={styles.actionChip}>
                  🧠 Reason
                </button>
                <button type="button" onClick={() => handleAskContextAction('Fact check this with web search', true)} style={styles.actionChipCyan}>
                  🔍 Fact-Check
                </button>
                <button type="button" onClick={() => handleAskContextAction('Summarize the key takeaways')} style={styles.actionChip}>
                  📝 Summarize
                </button>
              </div>
            </div>
          )}

          {/* Chat Input Bar (Guaranteed No Horizontal Overflow) */}
          <div style={styles.inputArea}>
            <textarea
              id="sidepanel-chat-input"
              rows={1}
              style={styles.textarea}
              placeholder={isMicListening ? 'Listening…' : isGenerating ? 'Thinking…' : 'Ask Artrix anything…'}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (onTyping) onTyping();
              }}
              onKeyDown={handleKeyDown}
              disabled={sending || isGenerating || !isOnline}
            />

            {isMicSupported && (
              <button
                type="button"
                style={{
                  ...styles.sendBtn,
                  background: isMicListening ? 'rgba(255,107,107,0.3)' : 'rgba(255,255,255,0.08)',
                  color: isMicListening ? '#ff6b6b' : 'var(--text-dim)',
                }}
                onClick={() => {
                  if (isMicListening) {
                    stopMic();
                    setIsMicEnabled(false);
                  } else {
                    startMic();
                    setIsMicEnabled(true);
                  }
                }}
                title={isMicListening ? 'Stop mic' : 'Voice input'}
              >
                {isMicListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            <button
              type="button"
              style={{
                ...styles.sendBtn,
                background: 'linear-gradient(135deg, #8cb374, #5b8f45)',
                color: '#fff',
                opacity: input.trim() && !sending && !isGenerating ? 1 : 0.45,
              }}
              onClick={() => handleSend()}
              disabled={!input.trim() || sending || isGenerating || !isOnline}
              title="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '100%',
    height: '100%',
    overflowX: 'hidden',
    boxSizing: 'border-box',
    background: 'rgba(24, 39, 32, 0.92)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(140, 179, 116, 0.22)',
    borderRadius: '14px',
  },
  header: {
    padding: '8px 10px',
    borderBottom: '1px solid rgba(140, 179, 116, 0.16)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    boxSizing: 'border-box',
    width: '100%',
  },
  userInfoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    boxSizing: 'border-box',
  },
  userProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    minWidth: 0,
  },
  avatarImg: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
  },
  avatarPlaceholder: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    background: 'rgba(140, 179, 116, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    flexShrink: 0,
  },
  userMeta: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  userNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    minWidth: 0,
  },
  userName: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '90px',
  },
  modelTag: {
    fontSize: '10px',
    color: 'var(--text-dim)',
  },
  toolbarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    width: '100%',
    boxSizing: 'border-box',
    justifyContent: 'flex-start',
  },
  iconBtn: {
    padding: '5px 7px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    transition: 'all 0.15s ease',
  },
  keyCard: {
    padding: '16px 14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxSizing: 'border-box',
    width: '100%',
  },
  keyCardTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text)',
    margin: '0 0 6px',
  },
  keyCardDesc: {
    fontSize: '11px',
    color: 'var(--text-dim)',
    margin: '0 0 12px',
    lineHeight: '1.4',
  },
  keyInputRow: {
    display: 'flex',
    gap: '6px',
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: '8px',
  },
  keyInput: {
    flex: 1,
    minWidth: 0,
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '12px',
    padding: '6px 10px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  keySubmitBtn: {
    background: 'var(--accent)',
    border: 'none',
    borderRadius: '8px',
    color: '#121d17',
    fontSize: '12px',
    fontWeight: '700',
    padding: '6px 12px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  keyError: {
    fontSize: '10px',
    color: 'var(--danger)',
    margin: '0 0 8px',
  },
  keyLinks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'center',
    width: '100%',
  },
  keyLink: {
    fontSize: '11px',
    color: 'var(--accent)',
    textDecoration: 'none',
    fontWeight: '600',
  },
  keyDocLink: {
    fontSize: '10px',
    color: 'var(--text-dim)',
    textDecoration: 'underline',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  messageStream: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    boxSizing: 'border-box',
    width: '100%',
  },
  emptyState: {
    padding: '16px 8px',
    textAlign: 'center',
    color: 'var(--text-dim)',
  },
  emptyTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text)',
    marginBottom: '4px',
  },
  emptyDesc: {
    fontSize: '11px',
    lineHeight: '1.4',
  },
  offlineNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    borderRadius: '8px',
    background: 'rgba(255, 180, 0, 0.14)',
    color: '#FFB400',
    fontSize: '11px',
  },
  bubble: {
    maxWidth: '85%',
    padding: '8px 12px',
    fontSize: '12px',
    lineHeight: '1.45',
    boxSizing: 'border-box',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.22)',
  },
  userBubble: {
    alignSelf: 'flex-end',
    background: 'linear-gradient(135deg, rgba(140, 179, 116, 0.32), rgba(90, 140, 95, 0.22))',
    border: '1px solid rgba(140, 179, 116, 0.45)',
    borderRadius: '14px 14px 2px 14px',
    color: '#eef5ee',
    marginLeft: 'auto',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    background: 'rgba(23, 37, 30, 0.94)',
    border: '1px solid rgba(62, 207, 207, 0.28)',
    borderRadius: '14px 14px 14px 2px',
    color: '#f0fdf4',
    marginRight: 'auto',
  },
  bubbleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '3px',
    width: '100%',
  },
  bubbleRole: {
    fontSize: '9px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  bubbleVoiceBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    padding: '0 2px',
    display: 'inline-flex',
    alignItems: 'center',
    transition: 'color 0.15s ease',
  },
  bubbleText: {
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  thinkingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  contextCard: {
    margin: '4px 8px 6px',
    padding: '8px 10px',
    borderRadius: '10px',
    background: 'rgba(140, 179, 116, 0.12)',
    border: '1px solid rgba(140, 179, 116, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    boxSizing: 'border-box',
    width: 'calc(100% - 16px)',
    maxWidth: 'calc(100% - 16px)',
    overflow: 'hidden',
  },
  contextHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  contextTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--accent)',
    minWidth: 0,
    overflow: 'hidden',
  },
  contextTitleText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  contextCloseBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    padding: '1px',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  contextSnippet: {
    fontSize: '11px',
    color: 'var(--text)',
    fontStyle: 'italic',
    borderLeft: '2px solid var(--accent)',
    paddingLeft: '6px',
    margin: 0,
    lineHeight: '1.35',
    maxHeight: '48px',
    overflowY: 'auto',
    wordBreak: 'break-word',
  },
  contextImageWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  contextThumb: {
    height: '38px',
    maxHeight: '38px',
    borderRadius: '4px',
    border: '1px solid var(--border)',
    objectFit: 'contain',
    background: 'rgba(0,0,0,0.4)',
    flexShrink: 0,
  },
  contextImageText: {
    fontSize: '10px',
    color: 'var(--text-dim)',
  },
  contextActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap',
    width: '100%',
  },
  actionChip: {
    fontSize: '10px',
    fontWeight: '600',
    padding: '3px 6px',
    borderRadius: '5px',
    background: 'rgba(140, 179, 116, 0.18)',
    border: '1px solid rgba(140, 179, 116, 0.35)',
    color: '#8cb374',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  actionChipCyan: {
    fontSize: '10px',
    fontWeight: '600',
    padding: '3px 6px',
    borderRadius: '5px',
    background: 'rgba(62, 207, 207, 0.18)',
    border: '1px solid rgba(62, 207, 207, 0.35)',
    color: '#3ecfcf',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  inputArea: {
    padding: '8px',
    borderTop: '1px solid rgba(140, 179, 116, 0.16)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    width: '100%',
    boxSizing: 'border-box',
  },
  textarea: {
    flex: 1,
    minWidth: 0,
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '12px',
    padding: '8px 10px',
    outline: 'none',
    lineHeight: '1.4',
    height: '38px',
    minHeight: '38px',
    maxHeight: '90px',
    resize: 'none',
    boxSizing: 'border-box',
  },
  sendBtn: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },
};
