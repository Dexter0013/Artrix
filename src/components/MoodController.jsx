import React from 'react';

const MOOD_PRESETS = [
  {
    id: 'idle',
    label: 'Idle',
    icon: '🟢',
    description: 'Normal / Idle State',
    stateName: 'Idle',
    actionType: 'idle',
  },
  {
    id: 'smile',
    label: 'Smile',
    icon: '😊',
    description: 'Smile Expression',
    stateName: 'Smile',
    actionType: 'trigger_smile',
  },
  {
    id: 'surprise',
    label: 'Surprise',
    icon: '⚡',
    description: 'Surprise / Thinking',
    stateName: 'Surprise',
    actionType: 'trigger_surprise',
  },
  {
    id: 'confused',
    label: 'Confused',
    icon: '❓',
    description: 'Confused / Query',
    stateName: 'Confused',
    actionType: 'trigger_confusion',
  },
  {
    id: 'angry',
    label: 'Angry',
    icon: '😠',
    description: 'Angry / Alert',
    stateName: 'Angry',
    actionType: 'trigger_angry',
  },
];

export default function MoodController({ onTriggerMood, activeState }) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h2 style={styles.title}>Expressions</h2>
        <span style={styles.badge}>5 States</span>
      </div>

      <div style={styles.grid}>
        {MOOD_PRESETS.map((mood) => {
          const isSelected = activeState === mood.stateName;
          return (
            <button
              key={mood.id}
              onClick={() => onTriggerMood(mood)}
              style={{
                ...styles.moodBtn,
                ...(isSelected ? styles.moodBtnActive : {}),
              }}
            >
              <span style={styles.btnIcon}>{mood.icon}</span>
              <span style={styles.btnLabel}>{mood.label}</span>
              <span style={styles.btnDesc}>{mood.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '22px',
    width: '100%',
    maxWidth: '460px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '14px',
  },
  title: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-dim)',
    margin: 0,
  },
  badge: {
    fontSize: '10px',
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
    border: '1px solid var(--accent-border)',
    borderRadius: '999px',
    padding: '2px 8px',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
  },
  moodBtn: {
    background: '#14221a',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '5px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left',
  },
  moodBtnActive: {
    background: 'var(--panel-light)',
    border: '1px solid var(--accent)',
    boxShadow: '0 0 12px rgba(140, 179, 116, 0.25)',
  },
  btnIcon: {
    fontSize: '20px',
  },
  btnLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text)',
  },
  btnDesc: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontFamily: 'JetBrains Mono, monospace',
  },
};
