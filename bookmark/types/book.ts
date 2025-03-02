export interface Book {
  id: string;
  title: string;
  author: string;
  content: string;
  chunks: BookChunk[];
  metadata: BookMetadata;
}

export interface BookChunk {
  id: string;
  bookId: string;
  content: string;
  embedding: number[];
  startPosition: number;
  endPosition: number;
}

export interface BookMetadata {
  isbn?: string;
  publicationYear?: number;
  genre?: string;
  summary?: string;
  totalPages: number;
  language: string;
  wordCount: number;
}