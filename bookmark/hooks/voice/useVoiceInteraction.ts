import { useState, useCallback, useEffect } from 'react';
import { VoiceService } from '../../services/VoiceService';

type VoiceCallback = (text: string) => void;

export function useVoiceInteraction() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initProgress, setInitProgress] = useState(0);

  useEffect(() => {
    const initVoice = async () => {
      try {
        const voiceService = VoiceService.getInstance();
        const success = await voiceService.initialize((progress) => {
          setInitProgress(progress);
        });
        setIsInitialized(success);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize voice service');
      }
    };

    initVoice();

    return () => {
      VoiceService.getInstance().cleanup().catch(console.error);
    };
  }, []);

  const startListening = useCallback(async (callback: VoiceCallback) => {
    try {
      setError(null);
      const voiceService = VoiceService.getInstance();
      await voiceService.startListening((text) => {
        setIsListening(false);
        callback(text);
      });
      setIsListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start listening');
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      setError(null);
      const voiceService = VoiceService.getInstance();
      await voiceService.stopListening();
      setIsListening(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop listening');
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    try {
      setError(null);
      const voiceService = VoiceService.getInstance();
      await voiceService.speak(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to speak text');
    }
  }, []);

  return {
    isInitialized,
    isListening,
    error,
    initProgress,
    startListening,
    stopListening,
    speak,
  };
}