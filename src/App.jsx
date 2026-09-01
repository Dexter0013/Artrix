import React, { useState } from 'react';
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import AssistantStage from './components/AssistantStage.jsx';
import MoodController from './components/MoodController.jsx';
import ChatPanel from './components/ChatPanel.jsx';

const RIV_PATH = `${import.meta.env.BASE_URL}20673-38905-deer-girl.riv`.replace(/\/+/g, '/');
const SM_NAME = 'Main';

export default function App() {
  const [currentMood, setCurrentMood] = useState('Idle');

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

  const resetToIdle = () => {
    setCurrentMood('Idle');
    // Btn_Normal = 1 holds the SM in the idle state
    if (inputNormal) inputNormal.value = 1;
    if (inputBtnSmile) inputBtnSmile.value = 0;
  };

  const handleTriggerMood = (mood) => {
    setCurrentMood(mood.stateName);

    if (mood.actionType === 'idle') {
      resetToIdle();
      return;
    }

    // Release the idle-lock first so the SM can transition
    if (inputNormal) inputNormal.value = 0;
    // Fire the selected trigger
    fireInput(mood.actionType, 1);
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.mainTitle}>AI Assistant</h1>
      </header>

      <main style={styles.layout}>
        <div style={styles.avatarColumn}>
          <AssistantStage
            RiveComponent={RiveComponent}
            currentMood={currentMood}
            onReset={resetToIdle}
          />
          <MoodController
            onTriggerMood={handleTriggerMood}
            activeState={currentMood}
          />
        </div>

        <div style={styles.chatColumn}>
          <ChatPanel onMoodDetected={handleTriggerMood} />
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 20px 60px',
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
  layout: {
    display: 'flex',
    gap: '24px',
    width: '100%',
    maxWidth: '920px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  avatarColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
    maxWidth: '430px',
    flex: '1 1 360px',
  },
  chatColumn: {
    width: '100%',
    maxWidth: '430px',
    flex: '1 1 360px',
  },
};
