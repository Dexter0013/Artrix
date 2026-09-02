// ─── Browser SpeechRecognition API Wrapper ─────────────────────────────────────
// Wraps Web Speech API (SpeechRecognition / webkitSpeechRecognition)
// Supported in Chrome, Edge, Safari over HTTPS / localhost.

/**
 * Check if the browser supports Speech Recognition API.
 * @returns {boolean}
 */
export function isSpeechSupported() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Encapsulates browser SpeechRecognition lifecycle and events.
 */
export class SpeechInputWrapper {
  constructor({ onTranscript, onError, onStart, onEnd, lang = 'en-US' } = {}) {
    this.onTranscript = onTranscript;
    this.onError = onError;
    this.onStart = onStart;
    this.onEnd = onEnd;
    this.lang = lang;
    this.recognition = null;
    this.isListening = false;
  }

  /**
   * Start listening for voice input.
   */
  start() {
    if (!isSpeechSupported()) {
      if (this.onError) {
        this.onError(
          'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.',
          'not-supported'
        );
      }
      return;
    }

    if (this.isListening) {
      return;
    }

    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = this.lang;

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.onStart) this.onStart();
      };

      this.recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript || '';
          if (result.isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }

        const combinedText = (finalTranscript + interimTranscript).trim();

        if (this.onTranscript) {
          this.onTranscript({
            finalText: finalTranscript.trim(),
            interimText: interimTranscript.trim(),
            text: combinedText,
          });
        }
      };

      this.recognition.onerror = (event) => {
        console.warn('[SpeechInput] Error event:', event.error);
        let errorMsg = 'Speech recognition error occurred.';

        switch (event.error) {
          case 'not-allowed':
          case 'service-not-allowed':
            errorMsg =
              'Microphone permission was denied. Please allow microphone access in your browser settings to use voice input.';
            break;
          case 'no-speech':
            errorMsg = 'No speech detected. Please speak clearly into your microphone.';
            break;
          case 'audio-capture':
            errorMsg = 'No microphone was found on your device. Please connect a microphone.';
            break;
          case 'network':
            errorMsg = 'Network error occurred during speech recognition.';
            break;
          case 'aborted':
            errorMsg = 'Speech recognition was stopped.';
            break;
          default:
            errorMsg = `Speech recognition error: ${event.error}`;
            break;
        }

        this.isListening = false;
        if (this.onError) {
          this.onError(errorMsg, event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onEnd) this.onEnd();
      };

      this.recognition.start();
    } catch (err) {
      this.isListening = false;
      console.error('[SpeechInput] Failed to start recognition:', err);
      if (this.onError) {
        this.onError(
          err.message || 'Could not start speech recognition.',
          'start-failed'
        );
      }
    }
  }

  /**
   * Stop listening for voice input.
   */
  stop() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore if already stopped
      }
      this.isListening = false;
    }
  }
}
