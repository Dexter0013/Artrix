import React, { useState } from 'react';
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import AssistantStage from './components/AssistantStage.jsx';
import MoodController from './components/MoodController.jsx';

const RIV_PATH = '/20673-38905-deer-girl.riv';
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
        <AssistantStage
          RiveComponent={RiveComponent}
          currentMood={currentMood}
          onReset={resetToIdle}
        />
        <MoodController
          onTriggerMood={handleTriggerMood}
          activeState={currentMood}
        />
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
    padding: '32px 20px 80px',
  },
  header: {
    textAlign: 'center',
    maxWidth: '600px',
    marginBottom: '28px',
  },
  mainTitle: {
    fontSize: '24px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
    color: 'var(--text)',
    marginBottom: '6px',
  },
  subtitle: {
    color: 'var(--text-dim)',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: 0,
  },
  layout: {
    display: 'flex',
    gap: '24px',
    width: '100%',
    maxWidth: '890px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
};
