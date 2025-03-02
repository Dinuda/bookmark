import { Book, BookChunk, BookMetadata } from '../types/book';

export class BookProcessor {
  private chunkSize: number = 512; // Default chunk size for text splitting
  
  async processBook(content: string, metadata: Partial<BookMetadata>): Promise<Book> {
    const chunks = this.splitIntoChunks(content);
    const bookId = this.generateBookId();
    
    const processedChunks = await Promise.all(
      chunks.map((chunk, index) => this.processChunk(chunk, bookId, index))
    );
    
    return {
      id: bookId,
      title: metadata.title || 'Untitled Book',
      author: metadata.author || 'Unknown Author',
      content,
      chunks: processedChunks,
      metadata: {
        totalPages: metadata.totalPages || 0,
        language: metadata.language || 'en',
        wordCount: this.countWords(content),
        ...metadata,
      },
    };
  }

  private splitIntoChunks(content: string): string[] {
    // Split into sentences first
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= this.chunkSize) {
        currentChunk += sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      }
    }
    
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
  }

  private async processChunk(
    content: string, 
    bookId: string, 
    index: number
  ): Promise<BookChunk> {
    // TODO: Implement actual embedding generation using local ML model
    const mockEmbedding = new Array(384).fill(0).map(() => Math.random());
    
    return {
      id: `${bookId}-chunk-${index}`,
      bookId,
      content,
      embedding: mockEmbedding,
      startPosition: index * this.chunkSize,
      endPosition: (index * this.chunkSize) + content.length,
    };
  }

  private generateBookId(): string {
    return 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }
}