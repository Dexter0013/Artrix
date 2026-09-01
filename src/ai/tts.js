// ─── Instant Natural Voice Engine (Microsoft Jenny / Aria Natural) ───────────
// High-definition streaming voice with 0ms latency, zero downloads, and zero cost.
// Prioritizes calm, mature natural female voices (Jenny / Aria / Google UK Female).

let isVoicesLoaded = false;
let cachedFemaleVoice = null;
let lastSpokenText = '';
let lastSpokenTime = 0;

/** Unlock audio playback context on user click/tap */
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

/** Resolves the highest quality natural/neural female voice available */
export function getBestFemaleVoice() {
  if (cachedFemaleVoice) return cachedFemaleVoice;
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const enVoices = voices.filter((v) => (v.lang || '').toLowerCase().startsWith('en'));

  // Priority ranking: Microsoft Jenny & Aria Natural adult voices first (calm, mature)
  const topNaturalVoices = [
    'jenny online (natural)',    // Microsoft natural mature female voice
    'aria online (natural)',     // Microsoft calm soothing adult voice
    'natural',
    'google uk english female',  // Calm British female
    'google us english female',
    'samantha',                  // Apple natural female voice
    'victoria',
    'karen',
    'hazel',
    'fiona',
    'jenny',
    'aria',
    'female',
    'zira',                      // Fallback only
  ];

  const maleKeywords = [
    'david',
    'mark',
    'george',
    'guy',
    'richard',
    'male',
    'james',
    'ryan',
    'stefan',
    'ravi',
  ];

  // 1. Search for highest quality natural female voices
  for (const kw of topNaturalVoices) {
    const match = enVoices.find((v) => {
      const name = v.name.toLowerCase();
      return name.includes(kw) && !maleKeywords.some((m) => name.includes(m));
    });
    if (match) {
      cachedFemaleVoice = match;
      return match;
    }
  }

  // 2. Search any voice labeled 'female'
  const anyFemale = voices.find((v) => {
    const combined = (v.name + ' ' + (v.voiceURI || '')).toLowerCase();
    return (
      (combined.includes('female') || combined.includes('woman')) &&
      !maleKeywords.some((m) => combined.includes(m))
    );
  });
  if (anyFemale) {
    cachedFemaleVoice = anyFemale;
    return anyFemale;
  }

  // 3. Fallback: first English voice that is NOT an obvious male
  const nonMale = enVoices.find((v) => {
    const name = v.name.toLowerCase();
    return !maleKeywords.some((m) => name.includes(m));
  });

  cachedFemaleVoice = nonMale || enVoices[0] || voices[0];
  return cachedFemaleVoice;
}

// Pre-warm voices list on load
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    isVoicesLoaded = true;
    cachedFemaleVoice = null;
    getBestFemaleVoice();
  };
}

/** Stop any currently active speech */
export function stopSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
}

/**
 * Speak text immediately using the calm, mature natural voice (Microsoft Jenny).
 * Zero latency, runs directly in the browser, protected by anti-repeat guards.
 */
export function speakText(rawText, onStart, onEnd) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (onEnd) onEnd();
    return;
  }

  // Clean emotion tags & markdown symbols before speaking
  const clean = rawText
    .replace(/\[(SMILE|SURPRISE|CONFUSED|ANGRY)\]/gi, '')
    .replace(/[*_#`]/g, '')
    .trim();

  if (!clean) {
    if (onEnd) onEnd();
    return;
  }

  // Anti-repeat guard: ignore duplicate calls within 2 seconds
  const now = Date.now();
  if (clean === lastSpokenText && now - lastSpokenTime < 2000) {
    return;
  }
  lastSpokenText = clean;
  lastSpokenTime = now;

  stopSpeech();
  unlockAudio();

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.pitch = 1.12; // Mature, calm female tone
  utterance.rate  = 1.0;  // Natural conversational tempo

  const voice = getBestFemaleVoice();
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onstart = () => {
    if (onStart) onStart();
  };

  utterance.onend = () => {
    if (onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    console.warn('[TTS] Speech error:', e);
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
}
