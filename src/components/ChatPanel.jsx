// ─── Chat Panel ───────────────────────────────────────────────────────────────
// Real-time Firestore-backed chat panel.
// Displays the user's private message history and lets them send new messages.
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendMessage, subscribeToMessages, clearHistory } from '../firebase/chat';

export default function ChatPanel({ onMoodDetected }) {
  const { currentUser, signOut } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const bottomRef               = useRef(null);

  // Subscribe to real-time Firestore messages
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToMessages(currentUser.uid, setMessages);
    return unsubscribe;
  }, [currentUser]);

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const detectMoodFromText = (msgText) => {
    const t = msgText.toLowerCase();
    if (t.includes('smile') || t.includes('happy') || t.includes('haha') || t.includes('love') || t.includes('great') || t.includes('good') || t.includes('yay') || t.includes('😊') || t.includes('😄')) {
      return { stateName: 'Smile', actionType: 'trigger_smile' };
    }
    if (t.includes('wow') || t.includes('omg') || t.includes('really') || t.includes('surpris') || t.includes('think') || t.includes('⚡') || t.includes('😲')) {
      return { stateName: 'Surprise', actionType: 'trigger_surprise' };
    }
    if (t.includes('?') || t.includes('why') || t.includes('what') || t.includes('how') || t.includes('confus') || t.includes('huh') || t.includes('❓')) {
      return { stateName: 'Confused', actionType: 'trigger_confusion' };
    }
    if (t.includes('angry') || t.includes('mad') || t.includes('hate') || t.includes('bad') || t.includes('stop') || t.includes('annoy') || t.includes('😠') || t.includes('😡')) {
      return { stateName: 'Angry', actionType: 'trigger_angry' };
    }
    return null;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    // Trigger mood expression based on message content
    const detectedMood = detectMoodFromText(text);
    if (detectedMood && onMoodDetected) {
      onMoodDetected(detectedMood);
    }

    try {
      await sendMessage(currentUser.uid, text, 'user');
      // Simulated assistant response (or plug in Gemini API here)
      setTimeout(async () => {
        const replies = [
          { text: "I'm listening! What else can I help you with?", mood: { stateName: 'Smile', actionType: 'trigger_smile' } },
          { text: "That's really interesting! Tell me more.", mood: { stateName: 'Surprise', actionType: 'trigger_surprise' } },
          { text: "Hmm, let me think about that...", mood: { stateName: 'Confused', actionType: 'trigger_confusion' } },
        ];
        const pick = replies[Math.floor(Math.random() * replies.length)];
        if (onMoodDetected) onMoodDetected(pick.mood);
        await sendMessage(currentUser.uid, pick.text, 'assistant');
      }, 1000);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = async () => {
    if (window.confirm('Clear all chat history?')) {
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
          <span style={styles.userName}>
            {currentUser?.displayName || 'User'}
          </span>
        </div>
        <div style={styles.actions}>
          <button
            id="btn-clear-chat"
            title="Clear history"
            style={styles.iconBtn}
            onClick={handleClear}
          >
            🗑️
          </button>
          <button
            id="btn-sign-out"
            style={styles.signOutBtn}
            onClick={signOut}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Message List */}
      <div style={styles.messageList}>
        {messages.length === 0 && (
          <div style={styles.empty}>
            <span>💬</span>
            <p>No messages yet. Say hello!</p>
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
            <span style={styles.roleLabel}>
              {msg.role === 'user' ? 'You' : 'Assistant'}
            </span>
            <p style={styles.msgText}>{msg.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div style={styles.inputRow}>
        <textarea
          id="chat-input"
          style={styles.textarea}
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          id="btn-send"
          style={{
            ...styles.sendBtn,
            opacity: sending || !input.trim() ? 0.5 : 1,
          }}
          onClick={handleSend}
          disabled={sending || !input.trim()}
        >
          {sending ? '…' : '➤'}
        </button>
      </div>
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
    height: '100%',
    minHeight: '560px',
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
    padding: '14px 16px',
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
  userName: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
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
    borderRadius: '6px',
    transition: 'background 0.15s',
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
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  empty: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    marginTop: 'auto',
    marginBottom: 'auto',
    fontSize: '14px',
  },
  bubble: {
    maxWidth: '85%',
    padding: '10px 14px',
    borderRadius: '16px',
    lineHeight: '1.5',
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
  roleLabel: {
    display: 'block',
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
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
    padding: '10px 14px',
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: '1.5',
    maxHeight: '120px',
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
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'transform 0.15s',
  },
};
