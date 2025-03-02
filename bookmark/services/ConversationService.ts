import { RAGService } from './RAGService';
import { ModelService } from './ModelService';
import { DatabaseService } from './DatabaseService';
import { BookProcessor } from './BookProcessor';
import { Book } from '../types/book';

interface ConversationState {
  bookId: string;
  history: { role: 'user' | 'assistant'; content: string }[];
}

export class ConversationService {
  private static instance: ConversationService;
  private ragService: RAGService;
  private modelService: ModelService;
  private dbService: DatabaseService;
  private bookProcessor: BookProcessor;
  private isInitialized: boolean = false;
  private currentState: ConversationState | null = null;

  private constructor() {
    this.ragService = RAGService.getInstance();
    this.modelService = ModelService.getInstance();
    this.dbService = DatabaseService.getInstance();
    this.bookProcessor = BookProcessor.getInstance();
  }

  static getInstance(): ConversationService {
    if (!ConversationService.instance) {
      ConversationService.instance = new ConversationService();
    }
    return ConversationService.instance;
  }

  async initialize(onProgress?: (progress: number) => void): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Initialize services with progress reporting
      await Promise.all([
        this.ragService.initialize((progress) => {
          if (onProgress) onProgress(progress * 0.6); // 60% for RAG
        }),
        this.modelService.initialize((progress) => {
          if (onProgress) onProgress(0.6 + progress * 0.4); // 40% for Model
        }),
      ]);

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing ConversationService:', error);
      return false;
    }
  }

  async setBook(book: Book): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('ConversationService not initialized');
    }

    try {
      // Get processed text from BookProcessor
      const processedText = await this.bookProcessor.processBook(book);
      if (!processedText) return false;

      // Add text to RAG system
      await this.ragService.addText(processedText);

      // Initialize conversation state
      this.currentState = {
        bookId: book.id,
        history: [],
      };

      return true;
    } catch (error) {
      console.error('Error setting book:', error);
      return false;
    }
  }

  async processMessage(message: string): Promise<string> {
    if (!this.isInitialized || !this.currentState) {
      throw new Error('ConversationService not properly initialized');
    }

    try {
      // Add user message to history
      this.currentState.history.push({ role: 'user', content: message });

      // Create system prompt with context
      let systemPrompt = 'You are a helpful assistant discussing a book. ';
      systemPrompt += 'Use the provided context to answer questions about the book. ';
      systemPrompt += 'If you are not sure about something, say so rather than making things up.';

      // Format conversation history
      const historyContext = this.currentState.history
        .slice(-4) // Keep last 4 messages for context
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      // Get response using RAG
      const response = await this.ragService.processQuery(
        `${historyContext}\nUser: ${message}\nAssistant:`,
        1024, // max tokens
        0.7 // temperature
      );

      // Add assistant response to history
      this.currentState.history.push({ role: 'assistant', content: response });

      // Save conversation to database
      await this.dbService.saveConversation(
        this.currentState.bookId,
        this.currentState.history
      );

      return response;
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }

  async getConversationHistory(bookId: string): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
    try {
      return await this.dbService.getConversation(bookId);
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.isInitialized) {
        await Promise.all([
          this.ragService.cleanup(),
          this.modelService.cleanup(),
        ]);
        this.isInitialized = false;
        this.currentState = null;
      }
    } catch (error) {
      console.error('Error cleaning up ConversationService:', error);
    }
  }
}