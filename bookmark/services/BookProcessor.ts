import { Book } from '../types/book';

interface ChunkOptions {
  maxChunkSize?: number;
  overlapSize?: number;
}

export class BookProcessor {
  private static instance: BookProcessor;

  private constructor() {}

  static getInstance(): BookProcessor {
    if (!BookProcessor.instance) {
      BookProcessor.instance = new BookProcessor();
    }
    return BookProcessor.instance;
  }

  async processBook(book: Book, options: ChunkOptions = {}): Promise<string> {
    const { maxChunkSize = 512, overlapSize = 50 } = options;

    try {
      // Clean and normalize text
      let text = book.content
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/[^\w\s.,!?-]/g, '') // Remove special characters
        .trim();

      // Split into sentences (basic implementation)
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

      // Combine sentences into chunks with overlap
      const chunks: string[] = [];
      let currentChunk = '';

      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim();
        
        // If adding this sentence would exceed maxChunkSize
        if (currentChunk.length + sentence.length > maxChunkSize) {
          // Save current chunk if not empty
          if (currentChunk) {
            chunks.push(currentChunk.trim());
          }

          // Start new chunk with overlap
          const lastWords = this.getLastWords(currentChunk, overlapSize);
          currentChunk = lastWords + ' ' + sentence;
        } else {
          // Add sentence to current chunk
          currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
      }

      // Add final chunk
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }

      // Add metadata to each chunk
      const processedChunks = chunks.map((chunk, index) => {
        return `[CHUNK ${index + 1}/${chunks.length}]\n${chunk}\n`;
      });

      // Add book metadata
      const metadata = [
        `Title: ${book.title}`,
        `Author: ${book.author || 'Unknown'}`,
        book.description ? `Description: ${book.description}` : null,
        book.categories?.length ? `Categories: ${book.categories.join(', ')}` : null,
      ].filter(Boolean).join('\n');

      // Combine everything
      return [
        metadata,
        '[CONTENT START]',
        ...processedChunks,
        '[CONTENT END]'
      ].join('\n\n');
    } catch (error) {
      console.error('Error processing book:', error);
      return book.content; // Return original content if processing fails
    }
  }

  private getLastWords(text: string, approxCharacters: number): string {
    const words = text.split(' ');
    let lastWords = '';
    
    for (let i = words.length - 1; i >= 0; i--) {
      const word = words[i];
      if (lastWords.length + word.length > approxCharacters) {
        break;
      }
      lastWords = word + (lastWords ? ' ' : '') + lastWords;
    }

    return lastWords;
  }

  async extractKeyTerms(text: string): Promise<string[]> {
    try {
      // Split text into words
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/);

      // Count word frequencies
      const wordFreq = new Map<string, number>();
      for (const word of words) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }

      // Filter out common words and sort by frequency
      const commonWords = new Set([
        'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
        'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
        'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
        'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
      ]);

      return Array.from(wordFreq.entries())
        .filter(([word]) => !commonWords.has(word) && word.length > 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([word]) => word);
    } catch (error) {
      console.error('Error extracting key terms:', error);
      return [];
    }
  }
}