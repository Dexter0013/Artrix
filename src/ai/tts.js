// ─── Instant Natural Female Voice Engine ─────────────────────────────────────
// Uses high-definition streaming neural voices (Microsoft Jenny/Aria Natural,
// Google UK Female, Samantha) with 0ms latency, zero downloads, and zero cost.

let isVoicesLoaded = false;
let cachedFemaleVoice = null;

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

  // Priority ranking: Ultra-realistic "Natural" & "Online" neural voices FIRST
  const topNaturalVoices = [
    'jenny online (natural)',
    'aria online (natural)',
    'google uk english female',
    'google us english female',
    'natural',
    'jenny',
    'aria',
    'samantha',
    'victoria',
    'karen',
    'hazel',
    'fiona',
    'moira',
    'tessa',
    'catherine',
    'linda',
    'female',
    'zira', // Fallback only
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
      // Ignore cancel errors
    }
  }
}

/**
 * Speak text immediately using the best natural female voice.
 * Zero model downloads, zero latency, runs 100% locally in browser.
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

  stopSpeech();
  unlockAudio();

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 1.05; // Natural conversational tempo
  utterance.pitch = 1.2;  // Cheerful feminine pitch for deer girl Artrix

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
