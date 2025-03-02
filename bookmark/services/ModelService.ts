import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import * as Progress from 'expo-progress';
import { MLCLLMModule } from '../native/mlc-llm';
import { ModelDownloader } from './ModelDownloader';

// Type definitions for MLC LLM interfaces
interface MLCModelConfig {
  modelId: string;
  modelPath: string;
  quantizationLevel: '4bit' | '8bit';
  contextSize: number;
  temperature: number;
}

interface InferenceOptions {
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

interface ModelOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export class ModelService {
  private static instance: ModelService;
  private llmModule: MLCLLMModule;
  private isInitialized: boolean = false;

  private constructor() {
    this.llmModule = MLCLLMModule.getInstance();
  }

  static getInstance(): ModelService {
    if (!ModelService.instance) {
      ModelService.instance = new ModelService();
    }
    return ModelService.instance;
  }

  async initialize(onProgress?: (progress: number) => void): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      const modelDownloader = ModelDownloader.getInstance();

      // Download required models
      const [modelPath, tokenizerPath] = await Promise.all([
        modelDownloader.ensureModelDownloaded(
          'mistral-7b-instruct-q4',
          progress => onProgress?.(progress.percent)
        ),
        FileSystem.downloadAsync(
          'https://huggingface.co/mistralai/Mistral-7B/raw/main/tokenizer.json',
          `${FileSystem.documentDirectory}models/mistral-7b-instruct-q4/tokenizer.json`
        ).then(result => result.uri)
      ]);

      // Initialize LLM
      const success = await this.llmModule.initialize(modelPath, tokenizerPath);
      this.isInitialized = success;
      return success;
    } catch (error) {
      console.error('Error initializing ModelService:', error);
      return false;
    }
  }

  async generateResponse(
    prompt: string,
    systemPrompt: string = '',
    maxTokens: number = 512,
    temperature: number = 0.7
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('ModelService not initialized');
    }

    try {
      return await this.llmModule.generate(
        prompt,
        systemPrompt,
        maxTokens,
        temperature,
        0.95
      );
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }

  async getEmbeddings(text: string): Promise<Float32Array> {
    if (!this.isInitialized) {
      throw new Error('ModelService not initialized');
    }

    try {
      return await this.llmModule.getEmbeddings(text);
    } catch (error) {
      console.error('Error getting embeddings:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.isInitialized) {
        await this.llmModule.cleanup();
        this.isInitialized = false;
      }
    } catch (error) {
      console.error('Error cleaning up ModelService:', error);
    }
  }
}