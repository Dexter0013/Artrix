// ─── Cross-Device Edge Neural TTS (Powered by Cloudflare Worker) ────────────
// Streams Microsoft Jenny Neural (en-US-JennyNeural) from Cloudflare Worker,
// guaranteeing the exact same calm, mature voice across phones, tablets, and PCs.

const WORKER_URL = 'https://artrix-tts.deeprajsingha1122.workers.dev/';
const DEFAULT_VOICE = 'en-US-JennyNeural';

let currentAudio = null;

/** Unlock audio playback context on user click/tap for iOS/Safari/Android */
export function unlockAudio() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    }
  } catch {
    // Ignore audio context unlock warnings
  }
}

/** Stop any currently active speech */
export function stopSpeech() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      // Ignore
    }
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
}

/** Local browser fallback if offline or worker unreachable */
function speakWithLocalVoice(cleanText, onStart, onEnd) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (onEnd) onEnd();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.pitch = 1.12; // Natural, slightly older, calm female tone
  utterance.rate  = 1.0;  // Standard conversational speed

  const voices = window.speechSynthesis.getVoices() || [];
  const enVoices = voices.filter((v) => (v.lang || '').toLowerCase().startsWith('en'));

  const priorityNames = [
    'jenny online (natural)',
    'aria online (natural)',
    'natural',
    'google uk english female',
    'google us english female',
    'samantha',
    'victoria',
    'karen',
    'hazel',
    'fiona',
    'jenny',
    'aria',
    'female',
    'zira',
  ];

  for (const kw of priorityNames) {
    const match = enVoices.find((v) => v.name.toLowerCase().includes(kw));
    if (match) {
      utterance.voice = match;
      break;
    }
  }

  utterance.onstart = () => { if (onStart) onStart(); };
  utterance.onend = () => { if (onEnd) onEnd(); };
  utterance.onerror = () => { if (onEnd) onEnd(); };

  window.speechSynthesis.speak(utterance);
}

let lastSpokenText = '';
let lastSpokenTime = 0;

/**
 * Speaks text using the Cloudflare Worker streaming Microsoft Jenny Neural voice.
 * Features strict single-execution guards to prevent any message repetition.
 */
export async function speakText(rawText, onStart, onEnd) {
  const clean = rawText
    .replace(/\[(SMILE|SURPRISE|CONFUSED|ANGRY)\]/gi, '')
    .replace(/[*_#`]/g, '')
    .trim();

  if (!clean) {
    if (onEnd) onEnd();
    return;
  }

  // 1. Anti-Repeat Guard: Ignore identical speech requests within 2 seconds
  const now = Date.now();
  if (clean === lastSpokenText && now - lastSpokenTime < 2000) {
    return;
  }
  lastSpokenText = clean;
  lastSpokenTime = now;

  stopSpeech();
  unlockAudio();

  // 2. Single-Execution Guard: Ensure fallback is triggered at most once
  let fallbackInvoked = false;
  const triggerFallbackOnce = () => {
    if (fallbackInvoked) return;
    fallbackInvoked = true;
    speakWithLocalVoice(clean, onStart, onEnd);
  };

  const ttsUrl = `${WORKER_URL}?text=${encodeURIComponent(clean)}&voice=${encodeURIComponent(DEFAULT_VOICE)}`;

  try {
    const player = new Audio(ttsUrl);
    currentAudio = player;

    player.onplay = () => {
      if (onStart) onStart();
    };

    player.onended = () => {
      if (onEnd) onEnd();
      if (currentAudio === player) currentAudio = null;
    };

    player.onerror = () => {
      if (currentAudio === player) currentAudio = null;
      triggerFallbackOnce();
    };

    await player.play();
  } catch {
    triggerFallbackOnce();
  }
}
