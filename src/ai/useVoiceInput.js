import { useState, useEffect, useRef, useCallback } from 'react';
import { isSpeechSupported, SpeechInputWrapper } from './speechInput';

/**
 * Custom React Hook to manage browser voice recognition state and lifecycle.
 *
 * @param {Function|Object} onTranscriptCallback - (text, fullData) => void OR { onTranscript, onError, lang }
 * @param {Function} [onErrorCallback] - (errorMsg, errorCode) => void
 * @returns {Object} { isListening, isSupported, errorMessage, setErrorMessage, start, stop, toggle }
 */
export function useVoiceInput(onTranscriptCallback, onErrorCallback) {
  let options = {};
  if (typeof onTranscriptCallback === 'function') {
    options = { onTranscript: onTranscriptCallback, onError: onErrorCallback };
  } else if (onTranscriptCallback && typeof onTranscriptCallback === 'object') {
    options = onTranscriptCallback;
  }

  const { onTranscript, onError, lang = 'en-US' } = options;

  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSupported] = useState(() => isSpeechSupported());

  // Keep latest callbacks in refs to avoid re-instantiating recognizer unnecessarily
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const speechInputRef = useRef(null);

  useEffect(() => {
    if (!isSupported) return;

    const recognizer = new SpeechInputWrapper({
      lang,
      onTranscript: (data) => {
        if (onTranscriptRef.current) {
          onTranscriptRef.current(data.text, data);
        }
      },
      onError: (msg, code) => {
        setIsListening(false);
        setErrorMessage(msg);
        if (onErrorRef.current) {
          onErrorRef.current(msg, code);
        }
      },
      onStart: () => {
        setIsListening(true);
        setErrorMessage('');
      },
      onEnd: () => {
        setIsListening(false);
      },
    });

    speechInputRef.current = recognizer;

    return () => {
      if (speechInputRef.current) {
        speechInputRef.current.stop();
      }
    };
  }, [isSupported, lang]);

  const start = useCallback(() => {
    setErrorMessage('');
    if (speechInputRef.current) {
      speechInputRef.current.start();
    }
  }, []);

  const stop = useCallback(() => {
    if (speechInputRef.current) {
      speechInputRef.current.stop();
    }
  }, []);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  return {
    isListening,
    isSupported,
    errorMessage,
    setErrorMessage,
    start,
    stop,
    toggle,
  };
}

export default useVoiceInput;
