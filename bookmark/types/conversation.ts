export interface ConversationSession {
  id: string;
  bookId: string;
  startTime: Date;
  endTime?: Date;
  messages: ConversationMessage[];
  summary?: string;
}

export interface ConversationMessage {
  id: string;
  sessionId: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'ai';
  relevantChunks?: string[]; // References to BookChunk ids
}

export interface Note {
  id: string;
  sessionId: string;
  bookId: string;
  content: string;
  timestamp: Date;
  type: 'highlight' | 'comment' | 'vocabulary' | 'summary';
  context?: string;
  tags?: string[];
}

export interface VocabularyEntry extends Note {
  word: string;
  definition: string;
  examples: string[];
  contextSentence: string;
}