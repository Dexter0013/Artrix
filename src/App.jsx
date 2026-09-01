import React, { useState, useRef, useCallback } from 'react';
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import AssistantStage from './components/AssistantStage.jsx';
import ChatPanel from './components/ChatPanel.jsx';

const RIV_PATH = `${import.meta.env.BASE_URL || './'}20673-38905-deer-girl.riv`;
const BG_PATH  = `${import.meta.env.BASE_URL || './'}backgroundnature.gif`;
const SM_NAME = 'Main';

export default function App() {
  const [currentMood, setCurrentMood] = useState('Idle');
  const idleTimerRef = useRef(null);

  const { rive, RiveComponent } = useRive({
    src: RIV_PATH,
    stateMachine: SM_NAME,
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onLoadError: (err) => console.error('[Rive] Failed to load:', err),
  });

  // Bind each input via the non-deprecated hook
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
    // Trigger inputs have a .fire() method; number/boolean inputs use .value
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
    // Btn_Normal = 1 holds the SM in the idle state
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

    // Release the idle-lock first so the SM can transition
    if (inputNormal) inputNormal.value = 0;
    // Fire the selected trigger
    fireInput(mood.actionType, 1);

    if (autoRevert) {
      scheduleIdleRevert(delayMs);
    }
  }, [cancelIdleRevert, resetToIdle, inputNormal, scheduleIdleRevert]);

  return (
    <>
      {/* Background GIF — fixed layer below everything */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `url('${BG_PATH}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }} />
      {/* Dark green overlay — above GIF, below content */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1,
        background: 'rgba(4, 18, 8, 0.50)',
        pointerEvents: 'none',
      }} />

      {/* Page content — above both layers */}
      <div style={styles.page}>
        <header style={styles.header}>
          <h1 style={styles.mainTitle}>Artrix</h1>
        </header>
      <main className="app-layout">
        <div className="avatar-col">
          <AssistantStage
            RiveComponent={RiveComponent}
            currentMood={currentMood}
            onReset={resetToIdle}
          />
        </div>

        <div className="chat-col">
          <ChatPanel
            onMoodDetected={handleTriggerMood}
            onSpeechStart={cancelIdleRevert}
            onSpeechEnd={() => scheduleIdleRevert(2000)}
            onTyping={() => scheduleIdleRevert(2000)}
          />
        </div>
      </main>
      </div>
    </>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 20px 60px',
    position: 'relative',
    zIndex: 2,
  },
  header: {
    textAlign: 'center',
    maxWidth: '600px',
    marginBottom: '20px',
  },
  mainTitle: {
    fontSize: '24px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
    color: 'var(--text)',
    margin: 0,
  },
};
