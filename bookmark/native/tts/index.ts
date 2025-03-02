import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'tts-native' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n';

const TTSNative = NativeModules.TTSNative
  ? NativeModules.TTSNative
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export interface TTSModule {
  initialize(modelPath: string, configPath: string): Promise<boolean>;
  cleanup(): Promise<void>;
  synthesize(text: string): Promise<Float32Array>;
}

class TTSModuleImpl implements TTSModule {
  private static instance: TTSModuleImpl;
  private constructor() {}

  static getInstance(): TTSModuleImpl {
    if (!TTSModuleImpl.instance) {
      TTSModuleImpl.instance = new TTSModuleImpl();
    }
    return TTSModuleImpl.instance;
  }

  async initialize(modelPath: string, configPath: string): Promise<boolean> {
    const initialized = await TTSNative.createContext(modelPath, configPath);
    if (initialized) {
      return await TTSNative.loadModel();
    }
    return false;
  }

  async cleanup(): Promise<void> {
    await TTSNative.cleanup();
  }

  async synthesize(text: string): Promise<Float32Array> {
    const samples = await TTSNative.synthesize(text);
    return new Float32Array(samples);
  }
}

export { TTSModuleImpl as TTSModule };