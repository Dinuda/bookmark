import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'whisper-native' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n';

const WhisperNative = NativeModules.WhisperNative
  ? NativeModules.WhisperNative
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

interface WhisperOptions {
  language?: string;
  task?: 'transcribe' | 'translate';
}

export interface WhisperModule {
  initialize(modelPath: string): Promise<boolean>;
  cleanup(): Promise<void>;
  transcribe(audioData: Float32Array, sampleRate: number, options: WhisperOptions): Promise<string>;
}

class WhisperModuleImpl implements WhisperModule {
  private static instance: WhisperModuleImpl;
  private constructor() {}

  static getInstance(): WhisperModuleImpl {
    if (!WhisperModuleImpl.instance) {
      WhisperModuleImpl.instance = new WhisperModuleImpl();
    }
    return WhisperModuleImpl.instance;
  }

  async initialize(modelPath: string): Promise<boolean> {
    return await NativeModules.WhisperNative.createContext(modelPath);
  }

  async cleanup(): Promise<void> {
    await NativeModules.WhisperNative.cleanup();
  }

  async transcribe(
    audioData: Float32Array,
    sampleRate: number,
    options: WhisperOptions = {}
  ): Promise<string> {
    return await NativeModules.WhisperNative.transcribe(
      Array.from(audioData),
      sampleRate,
      options
    );
  }
}

export { WhisperModuleImpl as WhisperModule };