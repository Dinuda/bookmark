import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'mlc-llm-native' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n';

const MLCLLMNative = NativeModules.MLCLLMNative
  ? NativeModules.MLCLLMNative
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export interface MLCLLMModule {
  initialize(modelPath: string, tokenizerPath: string): Promise<boolean>;
  cleanup(): Promise<void>;
  generate(
    prompt: string,
    systemPrompt: string,
    maxTokens: number,
    temperature: number,
    topP: number
  ): Promise<string>;
  getEmbeddings(text: string): Promise<Float32Array>;
}

class MLCLLMModuleImpl implements MLCLLMModule {
  private static instance: MLCLLMModuleImpl;
  private constructor() {}

  static getInstance(): MLCLLMModuleImpl {
    if (!MLCLLMModuleImpl.instance) {
      MLCLLMModuleImpl.instance = new MLCLLMModuleImpl();
    }
    return MLCLLMModuleImpl.instance;
  }

  async initialize(modelPath: string, tokenizerPath: string): Promise<boolean> {
    const initialized = await MLCLLMNative.createContext(modelPath, tokenizerPath);
    if (initialized) {
      return await MLCLLMNative.loadModel();
    }
    return false;
  }

  async cleanup(): Promise<void> {
    await MLCLLMNative.cleanup();
  }

  async generate(
    prompt: string,
    systemPrompt: string = '',
    maxTokens: number = 512,
    temperature: number = 0.7,
    topP: number = 0.95
  ): Promise<string> {
    return await MLCLLMNative.generate(
      prompt,
      systemPrompt,
      maxTokens,
      temperature,
      topP
    );
  }

  async getEmbeddings(text: string): Promise<Float32Array> {
    const embeddings = await MLCLLMNative.getEmbeddings(text);
    return new Float32Array(embeddings);
  }
}

export { MLCLLMModuleImpl as MLCLLMModule };