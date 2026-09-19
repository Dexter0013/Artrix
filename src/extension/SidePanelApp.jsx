// ─── Dedicated Side Panel Application Root ──────────────────────────────────
// Completely separate from the main web application UI.
// Tailored for Microsoft Edge & Chrome native side panels.

import React, { useState, useRef, useCallback } from 'react';
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { RuntimeLoader } from '@rive-app/canvas';
import AssistantStage from '../components/AssistantStage.jsx';
import SidePanelChat from './SidePanelChat.jsx';

const getAssetUrl = (filename) => {
  if (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) {
    try {
      return chrome.runtime.getURL(filename);
    } catch {
      // Ignore extension context errors
    }
  }
  return `./${filename}`;
};

// Configure local WASM binaries for Manifest V3 (MV3 CSP compliance)
if (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) {
  try {
    RuntimeLoader.setWasmUrl(chrome.runtime.getURL('rive.wasm'));
    RuntimeLoader.setWasmFallbackUrl(chrome.runtime.getURL('rive_fallback.wasm'));
  } catch {
    // fallback will use default
  }
} else {
  try {
    RuntimeLoader.setWasmUrl(`${import.meta.env.BASE_URL || './'}rive.wasm`);
    RuntimeLoader.setWasmFallbackUrl(`${import.meta.env.BASE_URL || './'}rive_fallback.wasm`);
  } catch {
    // fallback will use default
  }
}

const RIV_PATH = getAssetUrl('20673-38905-deer-girl.riv');
const BG_PATH  = getAssetUrl('backgroundnature.gif');
const SM_NAME = 'Main';

export default function SidePanelApp() {
  const [currentMood, setCurrentMood] = useState('Idle');
  const [isAvatarCollapsed, setIsAvatarCollapsed] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const idleTimerRef = useRef(null);

  const { rive, RiveComponent } = useRive({
    src: RIV_PATH,
    stateMachine: SM_NAME,
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onLoad: () => {
      console.log('[Rive SidePanel] Avatar loaded successfully');
      setAvatarError(null);
    },
    onLoadError: (err) => {
      console.error('[Rive SidePanel] Failed to load avatar:', err);
      setAvatarError(err?.message || 'Animation file could not be decoded.');
    },
  });

  const inputSmile    = useStateMachineInput(rive, SM_NAME, 'trigger_smile');
  const inputSurprise = useStateMachineInput(rive, SM_NAME, 'trigger_surprise');
  const inputConfuse  = useStateMachineInput(rive, SM_NAME, 'trigger_confusion');
  const inputAngry    = useStateMachineInput(rive, SM_NAME, 'trigger_angry');
  const inputNormal   = useStateMachineInput(rive, SM_NAME, 'Btn_Normal');
  const inputBtnSmile = useStateMachineInput(rive, SM_NAME, 'Btn_Smile');

  const INPUT_MAP = {
    trigger_smile:     inputSmile,
    trigger_surprise:  inputSurprise,
    trigger_confusion: inputConfuse,
    trigger_angry:     inputAngry,
    Btn_Normal:        inputNormal,
    Btn_Smile:         inputBtnSmile,
  };

  const fireInput = (key, val) => {
    const input = INPUT_MAP[key];
    if (!input) return;
    if (typeof input.fire === 'function') {
      if (val) input.fire();
    } else {
      input.value = Number(val);
    }
  };

  const cancelIdleRevert = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const resetToIdle = useCallback(() => {
    cancelIdleRevert();
    setCurrentMood('Idle');
    if (inputNormal) inputNormal.value = 1;
    if (inputBtnSmile) inputBtnSmile.value = 0;
  }, [cancelIdleRevert, inputNormal, inputBtnSmile]);

  const scheduleIdleRevert = useCallback((delayMs = 2000) => {
    cancelIdleRevert();
    idleTimerRef.current = setTimeout(() => {
      resetToIdle();
    }, delayMs);
  }, [cancelIdleRevert, resetToIdle]);

  const handleTriggerMood = useCallback((mood, autoRevert = true, delayMs = 2000) => {
    cancelIdleRevert();
    setCurrentMood(mood.stateName);

    if (mood.actionType === 'idle') {
      resetToIdle();
      return;
    }

    if (inputNormal) inputNormal.value = 0;
    fireInput(mood.actionType, 1);

    if (autoRevert) {
      scheduleIdleRevert(delayMs);
    }
  }, [cancelIdleRevert, resetToIdle, inputNormal, scheduleIdleRevert]);

  return (
    <div style={styles.sidepanelWrapper}>
      {/* Background GIF layer */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `url('${BG_PATH}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }} />
      {/* Green tint overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1,
        background: 'rgba(4, 18, 8, 0.58)',
        pointerEvents: 'none',
      }} />

      {/* Main Column */}
      <div style={styles.contentColumn}>
        {/* Compact Header */}
        <header style={styles.header}>
          <div style={styles.headerRow}>
            <div>
              <h1 style={styles.title}>Artrix</h1>
              <p style={styles.subtitle}>AI Companion &amp; Reasoner</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAvatarCollapsed((prev) => !prev)}
              title={isAvatarCollapsed ? 'Show Avatar' : 'Fold Avatar to maximize chat'}
              style={styles.foldBtn}
            >
              {isAvatarCollapsed ? '🦌 Show Avatar' : 'Fold Avatar'}
            </button>
          </div>
        </header>

        {/* Avatar Stage (Collapsible) */}
        {!isAvatarCollapsed && (
          <div style={styles.avatarSection}>
            <AssistantStage
              RiveComponent={RiveComponent}
              currentMood={currentMood}
              onReset={resetToIdle}
              error={avatarError}
            />
          </div>
        )}

        {/* Chat Section */}
        <div style={styles.chatSection}>
          <SidePanelChat
            onMoodDetected={handleTriggerMood}
            onSpeechStart={cancelIdleRevert}
            onSpeechEnd={() => scheduleIdleRevert(2000)}
            onTyping={() => scheduleIdleRevert(2000)}
          />
        </div>
      </div>
    </div>
  );
}

const styles = {
  sidepanelWrapper: {
    position: 'relative',
    width: '100vw',
    maxWidth: '100vw',
    height: '100vh',
    maxHeight: '100vh',
    overflowX: 'hidden',
    overflowY: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  contentColumn: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '100%',
    height: '100%',
    padding: '8px 8px 10px',
    boxSizing: 'border-box',
    overflowX: 'hidden',
    gap: '6px',
  },
  header: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '0 4px',
    flexShrink: 0,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  title: {
    fontSize: '17px',
    fontWeight: '700',
    letterSpacing: '-0.3px',
    color: 'var(--text)',
    margin: 0,
    lineHeight: '1.2',
  },
  subtitle: {
    fontSize: '11px',
    color: 'var(--text-dim)',
    margin: '1px 0 0',
    fontWeight: '500',
  },
  foldBtn: {
    background: 'rgba(140, 179, 116, 0.16)',
    border: '1px solid rgba(140, 179, 116, 0.38)',
    color: '#8cb374',
    fontSize: '11px',
    fontWeight: '600',
    padding: '3px 8px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  avatarSection: {
    width: '100%',
    height: '210px',
    minHeight: '180px',
    maxHeight: '230px',
    flexShrink: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  },
  chatSection: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
};
