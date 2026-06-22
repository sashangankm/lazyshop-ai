// ============================================================
// LazyShop - Voice Recognition Hook (Web Speech API)
// ============================================================

import { useCallback, useRef } from 'react';
import { useChatStore } from '@/lib/store';

interface SpeechRecognitionOptions {
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceRecognition({ onResult, onError }: SpeechRecognitionOptions) {
  const { setListening, setTranscript } = useChatStore();
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  // Keep refs updated without causing re-renders
  onResultRef.current = onResult;
  onErrorRef.current = onError;

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Prevent double-start
    if (isListeningRef.current) {
      console.log('[Voice] Already listening, ignoring start');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onErrorRef.current?.('Speech recognition not supported in this browser. Please use Chrome.');
      return;
    }

    // Always create a fresh instance to avoid stale state
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListeningRef.current = true;
      setListening(true);
      setTranscript('');
      console.log('[Voice] Started listening');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const current = finalTranscript || interimTranscript;
      setTranscript(current);

      if (finalTranscript) {
        const cleaned = finalTranscript.trim();
        // Don't send obviously incomplete commands
        // e.g. "Electronics under dollar under" — ends with a preposition
        const incompleteEndings = ['under', 'below', 'for', 'with', 'and', 'or', 'the', 'a', 'an', 'in', 'at', 'by', 'to', 'of', 'dollar', 'dollars', '$'];
        const lastWord = cleaned.split(' ').pop()?.toLowerCase() || '';

        if (incompleteEndings.includes(lastWord)) {
          console.log('[Voice] Incomplete command detected, waiting for more speech:', cleaned);
          setTranscript(cleaned + '... (speak price)');
          return; // Don't send yet
        }

        console.log('[Voice] Final transcript:', cleaned);
        onResultRef.current(cleaned);
      }
    };

    recognition.onerror = (event: any) => {
      // "aborted" is not a real error — it happens when we manually stop
      if (event.error === 'aborted') {
        console.log('[Voice] Recognition aborted (expected)');
        return;
      }
      // "no-speech" is common — user just didn't speak
      if (event.error === 'no-speech') {
        console.log('[Voice] No speech detected');
        setTranscript('');
        return;
      }
      console.error('[Voice] Recognition error:', event.error);
      onErrorRef.current?.(event.error);
    };

    recognition.onend = () => {
      console.log('[Voice] Recognition ended');
      isListeningRef.current = false;
      setListening(false);
      setTranscript('');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error('[Voice] Failed to start:', err);
      isListeningRef.current = false;
      setListening(false);
      recognitionRef.current = null;
    }
  }, [setListening, setTranscript]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.error('[Voice] Failed to stop:', err);
    }
    isListeningRef.current = false;
    setListening(false);
  }, [setListening]);

  return { startListening, stopListening };
}

// ── Text-to-Speech ─────────────────────────────────────────────
export function speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  // Don't speak if text is empty or just whitespace
  if (!text?.trim()) return;

  // Cancel any ongoing speech first
  window.speechSynthesis.cancel();

  // Small delay to let cancel complete
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 0.95;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = options?.volume ?? 0.9;
    utterance.lang = 'en-US';

    // Pick the best available voice
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find(v => v.name.includes('Google US English')) ||
      voices.find(v => v.name.includes('Samantha')) ||
      voices.find(v => v.name.includes('Daniel')) ||
      voices.find(v => v.lang === 'en-US' && !v.localService) ||
      voices.find(v => v.lang === 'en-US') ||
      voices[0];

    if (preferred) utterance.voice = preferred;

    utterance.onerror = (e) => {
      // Ignore interrupted errors — happen when new speech starts
      if (e.error !== 'interrupted') {
        console.error('[TTS] Speech error:', e.error);
      }
    };

    window.speechSynthesis.speak(utterance);
  }, 100);
}
