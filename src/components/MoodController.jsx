import React from 'react';
import { Sparkles, Smile, Zap, HelpCircle, Flame } from 'lucide-react';

const MOOD_PRESETS = [
  {
    id: 'idle',
    label: 'Idle',
    Icon: Sparkles,
    iconColor: 'text-emerald-400',
    description: 'Normal / Idle State',
    stateName: 'Idle',
    actionType: 'idle',
  },
  {
    id: 'smile',
    label: 'Smile',
    Icon: Smile,
    iconColor: 'text-amber-400',
    description: 'Smile Expression',
    stateName: 'Smile',
    actionType: 'trigger_smile',
  },
  {
    id: 'surprise',
    label: 'Surprise',
    Icon: Zap,
    iconColor: 'text-cyan-400',
    description: 'Surprise / Thinking',
    stateName: 'Surprise',
    actionType: 'trigger_surprise',
  },
  {
    id: 'confused',
    label: 'Confused',
    Icon: HelpCircle,
    iconColor: 'text-purple-400',
    description: 'Confused / Query',
    stateName: 'Confused',
    actionType: 'trigger_confusion',
  },
  {
    id: 'angry',
    label: 'Angry',
    Icon: Flame,
    iconColor: 'text-rose-400',
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
          const IconComponent = mood.Icon;
          return (
            <button
              key={mood.id}
              onClick={() => onTriggerMood(mood)}
              className={`p-3.5 rounded-xl border flex flex-col items-start gap-1.5 transition-all duration-200 cursor-pointer text-left ${
                isSelected
                  ? 'bg-emerald-950/40 border-emerald-400/80 shadow-[0_0_14px_rgba(140,179,116,0.3)] scale-[1.02]'
                  : 'bg-emerald-950/20 border-emerald-900/40 hover:bg-emerald-950/35 hover:border-emerald-700/50'
              }`}
            >
              <IconComponent className={`w-5 h-5 ${mood.iconColor}`} />
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
