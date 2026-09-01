import React from 'react';

export default function AssistantStage({ RiveComponent, currentMood, onReset }) {
  const isLocked = currentMood !== 'Idle';

  return (
    <div style={styles.stageCard}>
      {/* Avatar Viewport */}
      <div style={styles.canvasContainer}>
        <div style={styles.auraGlow} />
        {RiveComponent ? (
          <RiveComponent style={styles.canvas} />
        ) : (
          <div style={styles.loadingBox}>Loading Avatar...</div>
        )}
        {/* Blocks Rive hover events while a mood is locked in */}
        {isLocked && <div style={styles.hoverBlocker} />}
      </div>

      {/* Mood Status Footer */}
      <div style={styles.statusFooter}>
        <div style={styles.moodIndicator}>
          <span style={{
            ...styles.moodDot,
            background: isLocked ? 'var(--accent)' : '#666',
            boxShadow: isLocked ? '0 0 8px var(--accent)' : 'none',
          }} />
          <span style={styles.moodLabel}>
            State: <strong>{currentMood}</strong>
          </span>
        </div>
        <button onClick={onReset} style={styles.resetBtn} title="Reset to Idle">
          ↺ Idle
        </button>
      </div>
    </div>
  );
}

const styles = {
  stageCard: {
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '22px',
    width: '100%',
    maxWidth: '420px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
    position: 'relative',
  },
  dialogueBubble: {
    background: '#131e18',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 16px',
    position: 'relative',
  },
  bubbleHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  assistantBadge: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--accent)',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
  },
  speakingIndicator: {
    fontSize: '10px',
    color: 'var(--info)',
    background: 'var(--info-soft)',
    padding: '1px 6px',
    borderRadius: '4px',
    fontWeight: '600',
    animation: 'pulseGlow 1.5s infinite ease-in-out',
  },
  bubbleText: {
    fontSize: '13px',
    color: 'var(--text)',
    lineHeight: '1.45',
    margin: 0,
    fontStyle: 'italic',
  },
  canvasContainer: {
    width: '100%',
    aspectRatio: '1 / 1',
    borderRadius: 'var(--radius-md)',
    background: '#09100c',
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid #192b21',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraGlow: {
    position: 'absolute',
    width: '60%',
    height: '60%',
    background: 'radial-gradient(circle, rgba(140, 179, 116, 0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '135%', // renders the full artboard but clips the bottom ~27% (the hover buttons)
    display: 'block',
    zIndex: 1,
  },
  hoverBlocker: {
    position: 'absolute',
    inset: 0,
    zIndex: 2,
    cursor: 'default',
    // transparent — just blocks pointer events from reaching the Rive canvas
  },
  loadingBox: {
    color: 'var(--text-dim)',
    fontSize: '13px',
  },
  statusFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '6px',
  },
  moodIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  moodDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--accent)',
    boxShadow: '0 0 8px var(--accent)',
  },
  moodLabel: {
    fontSize: '12px',
    color: 'var(--text-dim)',
  },
  resetBtn: {
    background: '#15241c',
    color: 'var(--text-dim)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '5px 12px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};
