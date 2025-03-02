import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

interface DownloadProgress {
  percent: number;
  bytesWritten: number;
  contentLength: number;
}

interface ModelConfig {
  name: string;
  url: string;
  size: number;
}

// Model configurations
const MODEL_CONFIGS: { [key: string]: ModelConfig } = {
  'whisper-tiny': {
    name: 'whisper-tiny',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    size: 75_000_000, // ~75MB
  },
  'en-us-amy': {
    name: 'en-us-amy',
    url: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx',
    size: 50_000_000, // ~50MB
  },
  'mistral-7b-instruct-q4': {
    name: 'mistral-7b-instruct-q4',
    url: 'https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.1-GGUF/resolve/main/mistral-7b-instruct-v0.1.Q4_K_M.gguf',
    size: 4_200_000_000, // ~4.2GB
  },
};

export class ModelDownloader {
  private static instance: ModelDownloader;
  private downloadCallbacks: Map<string, ((progress: DownloadProgress) => void)[]>;

  private constructor() {
    this.downloadCallbacks = new Map();
  }

  static getInstance(): ModelDownloader {
    if (!ModelDownloader.instance) {
      ModelDownloader.instance = new ModelDownloader();
    }
    return ModelDownloader.instance;
  }

  private getModelsDirectory(): string {
    return `${FileSystem.documentDirectory}models`;
  }

  private getModelPath(modelName: string): string {
    const config = MODEL_CONFIGS[modelName];
    if (!config) throw new Error(`Unknown model: ${modelName}`);
    return `${this.getModelsDirectory()}/${config.name}/${config.name}${Platform.OS === 'ios' ? '.mlmodel' : '.bin'}`;
  }

  async ensureModelDownloaded(
    modelName: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    const config = MODEL_CONFIGS[modelName];
    if (!config) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    const modelPath = this.getModelPath(modelName);

    try {
      // Check if model exists
      const info = await FileSystem.getInfoAsync(modelPath);
      if (info.exists) {
        // Model already downloaded
        if (onProgress) {
          onProgress({ percent: 1, bytesWritten: config.size, contentLength: config.size });
        }
        return modelPath;
      }

      // Create directory if needed
      const modelDir = modelPath.slice(0, modelPath.lastIndexOf('/'));
      await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });

      // Start download
      const downloadResumable = FileSystem.createDownloadResumable(
        config.url,
        modelPath,
        {},
        (downloadProgress) => {
          const { totalBytesWritten, totalBytesExpectedToWrite } = downloadProgress;
          const progress: DownloadProgress = {
            percent: totalBytesWritten / totalBytesExpectedToWrite,
            bytesWritten: totalBytesWritten,
            contentLength: totalBytesExpectedToWrite,
          };

          // Call progress callback
          if (onProgress) {
            onProgress(progress);
          }

          // Call any registered callbacks
          const callbacks = this.downloadCallbacks.get(modelName);
          if (callbacks) {
            callbacks.forEach(callback => callback(progress));
          }
        }
      );

      const { uri } = await downloadResumable.downloadAsync();
      if (!uri) {
        throw new Error('Download failed');
      }

      return modelPath;
    } catch (error) {
      // Clean up failed download
      const info = await FileSystem.getInfoAsync(modelPath);
      if (info.exists) {
        await FileSystem.deleteAsync(modelPath);
      }
      throw error;
    }
  }

  async isModelDownloaded(modelName: string): Promise<boolean> {
    const modelPath = this.getModelPath(modelName);
    const info = await FileSystem.getInfoAsync(modelPath);
    return info.exists;
  }

  async deleteModel(modelName: string): Promise<void> {
    const modelPath = this.getModelPath(modelName);
    const info = await FileSystem.getInfoAsync(modelPath);
    if (info.exists) {
      await FileSystem.deleteAsync(modelPath);
    }
  }

  addDownloadCallback(
    modelName: string,
    callback: (progress: DownloadProgress) => void
  ): void {
    const callbacks = this.downloadCallbacks.get(modelName) || [];
    callbacks.push(callback);
    this.downloadCallbacks.set(modelName, callbacks);
  }

  removeDownloadCallback(
    modelName: string,
    callback: (progress: DownloadProgress) => void
  ): void {
    const callbacks = this.downloadCallbacks.get(modelName);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
        if (callbacks.length === 0) {
          this.downloadCallbacks.delete(modelName);
        } else {
          this.downloadCallbacks.set(modelName, callbacks);
        }
      }
    }
  }

  async cleanup(): Promise<void> {
    this.downloadCallbacks.clear();
  }
}