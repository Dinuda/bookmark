import { useState, useCallback, useEffect } from 'react';
import { ModelService } from '../../services/ModelService';
import { RAGService } from '../../services/RAGService';
import { Book } from '../../types/book';

export function useModel(book?: Book) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initProgress, setInitProgress] = useState(0);

  // Initialize model services
  useEffect(() => {
    const initServices = async () => {
      try {
        setError(null);
        const modelService = ModelService.getInstance();
        const ragService = RAGService.getInstance();

        // Initialize both services in parallel
        await Promise.all([
          modelService.initialize((progress) => {
            setInitProgress(progress * 0.5); // First 50%
          }),
          ragService.initialize((progress) => {
            setInitProgress(0.5 + progress * 0.5); // Last 50%
          }),
        ]);

        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize models');
        setIsInitialized(false);
      }
    };

    if (!isInitialized) {
      initServices();
    }

    return () => {
      // Cleanup on unmount
      if (isInitialized) {
        Promise.all([
          ModelService.getInstance().cleanup(),
          RAGService.getInstance().cleanup(),
        ]).catch(console.error);
      }
    };
  }, [isInitialized]);

  // Load book into RAG system when book changes
  useEffect(() => {
    const loadBook = async () => {
      if (!book || !isInitialized) return;

      try {
        setError(null);
        setIsProcessing(true);
        const ragService = RAGService.getInstance();
        await ragService.addText(book.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load book');
      } finally {
        setIsProcessing(false);
      }
    };

    loadBook();
  }, [book, isInitialized]);

  const generateResponse = useCallback(async (
    prompt: string,
    systemPrompt?: string,
    maxTokens: number = 512,
    temperature: number = 0.7
  ): Promise<string> => {
    if (!isInitialized) {
      throw new Error('Model not initialized');
    }

    try {
      setError(null);
      setIsProcessing(true);
      const ragService = RAGService.getInstance();
      return await ragService.processQuery(prompt, maxTokens, temperature);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate response';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  }, [isInitialized]);

  const getEmbeddings = useCallback(async (text: string): Promise<Float32Array> => {
    if (!isInitialized) {
      throw new Error('Model not initialized');
    }

    try {
      setError(null);
      const modelService = ModelService.getInstance();
      return await modelService.getEmbeddings(text);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get embeddings';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [isInitialized]);

  return {
    isInitialized,
    isProcessing,
    error,
    initProgress,
    generateResponse,
    getEmbeddings,
  };
}