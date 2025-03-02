import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'faiss-native' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n';

const FaissNative = NativeModules.FaissNative
  ? NativeModules.FaissNative
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

interface SearchResult {
  index: number;
  distance: number;
}

export interface FaissModule {
  createIndex(dimension: number): Promise<boolean>;
  loadIndex(path: string): Promise<boolean>;
  cleanup(): Promise<void>;
  addEmbedding(embedding: Float32Array): Promise<boolean>;
  search(query: Float32Array, k: number): Promise<SearchResult[]>;
  saveIndex(path: string): Promise<boolean>;
  clearIndex(): Promise<void>;
  getSize(): Promise<number>;
}

class FaissModuleImpl implements FaissModule {
  private static instance: FaissModuleImpl;
  private constructor() {}

  static getInstance(): FaissModuleImpl {
    if (!FaissModuleImpl.instance) {
      FaissModuleImpl.instance = new FaissModuleImpl();
    }
    return FaissModuleImpl.instance;
  }

  async createIndex(dimension: number): Promise<boolean> {
    return await FaissNative.createIndex(dimension);
  }

  async loadIndex(path: string): Promise<boolean> {
    return await FaissNative.loadIndex(path);
  }

  async cleanup(): Promise<void> {
    await FaissNative.cleanup();
  }

  async addEmbedding(embedding: Float32Array): Promise<boolean> {
    return await FaissNative.addEmbedding(Array.from(embedding));
  }

  async search(query: Float32Array, k: number): Promise<SearchResult[]> {
    return await FaissNative.search(Array.from(query), k);
  }

  async saveIndex(path: string): Promise<boolean> {
    return await FaissNative.saveIndex(path);
  }

  async clearIndex(): Promise<void> {
    await FaissNative.clearIndex();
  }

  async getSize(): Promise<number> {
    return await FaissNative.getSize();
  }
}

export { FaissModuleImpl as FaissModule };