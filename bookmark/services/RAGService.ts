import * as FileSystem from 'expo-file-system';
import { FaissModule } from '../native/faiss';
import { MLCLLMModule } from '../native/mlc-llm';
import { ModelDownloader } from './ModelDownloader';

interface Chunk {
  text: string;
  index: number;
}

export class RAGService {
  private static instance: RAGService;
  private faissModule: FaissModule;
  private llmModule: MLCLLMModule;
  private chunks: Chunk[] = [];
  private isInitialized: boolean = false;

  private constructor() {
    this.faissModule = FaissModule.getInstance();
    this.llmModule = MLCLLMModule.getInstance();
  }

  static getInstance(): RAGService {
    if (!RAGService.instance) {
      RAGService.instance = new RAGService();
    }
    return RAGService.instance;
  }

  async initialize(onProgress?: (progress: number) => void): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      const modelDownloader = ModelDownloader.getInstance();

      // Download and load LLM model
      const [modelPath, tokenizerPath] = await Promise.all([
        modelDownloader.ensureModelDownloaded(
          'mistral-7b-instruct-q4',
          (progress) => {
            if (onProgress) onProgress(progress.percent * 0.8); // 80% for LLM
          }
        ),
        FileSystem.downloadAsync(
          'https://huggingface.co/mistralai/Mistral-7B/raw/main/tokenizer.json',
          `${FileSystem.documentDirectory}models/mistral-7b-instruct-q4/tokenizer.json`
        ).then(result => result.uri)
      ]);

      // Initialize LLM
      const llmInitialized = await this.llmModule.initialize(modelPath, tokenizerPath);
      if (!llmInitialized) throw new Error('Failed to initialize LLM');

      // Create FAISS index (768 dimensions for embeddings)
      const faissInitialized = await this.faissModule.createIndex(768);
      if (!faissInitialized) throw new Error('Failed to create FAISS index');

      if (onProgress) onProgress(1); // 100% complete
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing RAGService:', error);
      return false;
    }
  }

  async addText(text: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('RAGService not initialized');
    }

    try {
      // Split text into chunks (simple implementation - could be improved)
      const chunks = text.split('\n\n').filter(chunk => chunk.trim().length > 0);

      // Get embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const embeddings = await this.llmModule.getEmbeddings(chunks[i]);
        await this.faissModule.addEmbedding(embeddings);
        this.chunks.push({ text: chunks[i], index: i });
      }

      return true;
    } catch (error) {
      console.error('Error adding text to RAG:', error);
      return false;
    }
  }

  async query(
    question: string,
    k: number = 3
  ): Promise<{ chunks: string[]; distances: number[] }> {
    if (!this.isInitialized) {
      throw new Error('RAGService not initialized');
    }

    try {
      // Get embeddings for the question
      const queryEmbeddings = await this.llmModule.getEmbeddings(question);

      // Search for similar chunks
      const results = await this.faissModule.search(queryEmbeddings, k);

      // Map results to chunks
      const chunks = results.map(r => this.chunks[r.index].text);
      const distances = results.map(r => r.distance);

      return { chunks, distances };
    } catch (error) {
      console.error('Error querying RAG:', error);
      throw error;
    }
  }

  async generate(
    prompt: string,
    context: string[] = [],
    maxTokens: number = 512,
    temperature: number = 0.7
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('RAGService not initialized');
    }

    try {
      // Create prompt with context
      const contextStr = context.join('\n\n');
      const fullPrompt = context.length > 0
        ? `Context:\n${contextStr}\n\nQuestion: ${prompt}\n\nAnswer:`
        : prompt;

      // Generate response
      return await this.llmModule.generate(
        fullPrompt,
        'You are a helpful assistant that answers questions based on the given context.',
        maxTokens,
        temperature,
        0.95
      );
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }

  async processQuery(
    question: string,
    maxTokens: number = 512,
    temperature: number = 0.7
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('RAGService not initialized');
    }

    try {
      // Get relevant chunks
      const { chunks } = await this.query(question);

      // Generate response using chunks as context
      return await this.generate(question, chunks, maxTokens, temperature);
    } catch (error) {
      console.error('Error processing query:', error);
      throw error;
    }
  }

  async saveIndex(path: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('RAGService not initialized');
    }

    try {
      // Save FAISS index
      const success = await this.faissModule.saveIndex(path);
      if (!success) throw new Error('Failed to save index');

      // Save chunks
      await FileSystem.writeAsStringAsync(
        path.replace('.index', '.json'),
        JSON.stringify(this.chunks)
      );

      return true;
    } catch (error) {
      console.error('Error saving RAG index:', error);
      return false;
    }
  }

  async loadIndex(path: string): Promise<boolean> {
    try {
      // Load FAISS index
      const success = await this.faissModule.loadIndex(path);
      if (!success) throw new Error('Failed to load index');

      // Load chunks
      const chunksJson = await FileSystem.readAsStringAsync(
        path.replace('.index', '.json')
      );
      this.chunks = JSON.parse(chunksJson);

      return true;
    } catch (error) {
      console.error('Error loading RAG index:', error);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.isInitialized) {
        await Promise.all([
          this.faissModule.cleanup(),
          this.llmModule.cleanup()
        ]);
        this.isInitialized = false;
      }
    } catch (error) {
      console.error('Error cleaning up RAGService:', error);
    }
  }
}