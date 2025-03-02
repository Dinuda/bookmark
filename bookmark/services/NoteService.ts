import { Note, ConversationMessage, ConversationSession } from '../types/conversation';
import { ModelService } from './ModelService';

interface NoteFilter {
  bookId?: string;
  sessionId?: string;
  type?: 'highlight' | 'comment' | 'vocabulary' | 'summary';
  startDate?: Date;
  endDate?: Date;
}

interface ExtractionPrompt {
  systemPrompt: string;
  userPrompt: string;
  exampleOutput?: string;
}

export class NoteService {
  private notes: Map<string, Note> = new Map();
  private modelService: ModelService;
  
  constructor(modelService: ModelService) {
    this.modelService = modelService;
  }

  /**
   * Extract important points from a conversation message
   */
  async extractNotes(message: ConversationMessage, sessionId: string, bookId: string): Promise<Note[]> {
    try {
      // Create prompt for note extraction
      const prompt = this.createExtractionPrompt(message);
      
      // Use model to extract important points
      const result = await this.modelService.generateText(prompt.userPrompt, {
        systemPrompt: prompt.systemPrompt,
        maxTokens: 500,
        temperature: 0.3
      });
      
      // Parse the result into notes
      const notes = this.parseNotesFromResult(result, {
        sessionId,
        bookId,
        timestamp: new Date(),
        context: message.content
      });
      
      // Save the notes
      for (const note of notes) {
        await this.saveNote(note);
      }
      
      return notes;
    } catch (error) {
      console.error('Error extracting notes:', error);
      return [];
    }
  }

  /**
   * Create a new note with the given content
   */
  async createNote(content: string, options: {
    sessionId: string;
    bookId: string;
    type: 'highlight' | 'comment' | 'vocabulary' | 'summary';
    context?: string;
    tags?: string[];
  }): Promise<Note> {
    const note: Note = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      timestamp: new Date(),
      ...options
    };
    
    await this.saveNote(note);
    return note;
  }

  /**
   * Save a note to storage
   */
  private async saveNote(note: Note): Promise<void> {
    try {
      // Store in memory
      this.notes.set(note.id, note);
      
      // In a real implementation, this would:
      // 1. Save to persistent storage (SQLite, AsyncStorage, etc.)
      // 2. Update any indexes or metadata
      
      console.log(`Saved note ${note.id}`);
    } catch (error) {
      console.error('Error saving note:', error);
      throw error;
    }
  }

  /**
   * Get notes based on filter criteria
   */
  async getNotes(filter?: NoteFilter): Promise<Note[]> {
    try {
      let filteredNotes = Array.from(this.notes.values());
      
      if (filter) {
        if (filter.bookId) {
          filteredNotes = filteredNotes.filter(note => note.bookId === filter.bookId);
        }
        if (filter.sessionId) {
          filteredNotes = filteredNotes.filter(note => note.sessionId === filter.sessionId);
        }
        if (filter.type) {
          filteredNotes = filteredNotes.filter(note => note.type === filter.type);
        }
        if (filter.startDate) {
          filteredNotes = filteredNotes.filter(note => note.timestamp >= filter.startDate!);
        }
        if (filter.endDate) {
          filteredNotes = filteredNotes.filter(note => note.timestamp <= filter.endDate!);
        }
      }
      
      return filteredNotes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Error getting notes:', error);
      return [];
    }
  }

  /**
   * Create extraction prompt for the model
   */
  private createExtractionPrompt(message: ConversationMessage): ExtractionPrompt {
    return {
      systemPrompt: `You are an AI assistant that extracts important information from conversations about books. 
Your task is to identify key points, insights, and noteworthy information from the given text.
Format each point as a separate note with a clear, concise description.`,
      
      userPrompt: `Extract important points from this conversation:
${message.content}

Focus on:
- Main ideas and themes
- Character insights
- Plot developments
- Literary analysis
- Significant quotes

Format each point as a separate note.`,
      
      exampleOutput: `1. The protagonist's internal conflict reflects the theme of identity
2. Symbolism of the river represents constant change
3. Key quote: "We are all shaped by the stories we tell ourselves"
4. Character development shows growth through adversity`
    };
  }

  /**
   * Parse model output into structured notes
   */
  private parseNotesFromResult(result: string, metadata: {
    sessionId: string;
    bookId: string;
    timestamp: Date;
    context: string;
  }): Note[] {
    try {
      // Split into separate notes (assuming one per line)
      const lines = result.split('\n').filter(line => line.trim());
      
      return lines.map(line => ({
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: line.replace(/^\d+\.\s*/, '').trim(), // Remove leading numbers
        type: 'comment',
        timestamp: metadata.timestamp,
        sessionId: metadata.sessionId,
        bookId: metadata.bookId,
        context: metadata.context
      }));
    } catch (error) {
      console.error('Error parsing notes from result:', error);
      return [];
    }
  }

  /**
   * Delete a note by ID
   */
  async deleteNote(noteId: string): Promise<boolean> {
    try {
      const success = this.notes.delete(noteId);
      
      // In a real implementation, this would:
      // 1. Remove from persistent storage
      // 2. Update any indexes or metadata
      
      return success;
    } catch (error) {
      console.error('Error deleting note:', error);
      return false;
    }
  }

  /**
   * Update a note's content or metadata
   */
  async updateNote(noteId: string, updates: Partial<Note>): Promise<Note | null> {
    try {
      const existingNote = this.notes.get(noteId);
      if (!existingNote) {
        return null;
      }
      
      const updatedNote = {
        ...existingNote,
        ...updates,
        id: noteId // Ensure ID doesn't change
      };
      
      await this.saveNote(updatedNote);
      return updatedNote;
    } catch (error) {
      console.error('Error updating note:', error);
      return null;
    }
  }

  /**
   * Generate a summary of notes for a session
   */
  async generateSessionSummary(sessionId: string): Promise<string> {
    try {
      const sessionNotes = await this.getNotes({ sessionId });
      
      if (sessionNotes.length === 0) {
        return 'No notes found for this session.';
      }
      
      // Create prompt for summarization
      const noteContents = sessionNotes.map(note => note.content).join('\n');
      const prompt = `Summarize the following notes from a book discussion session:
${noteContents}

Create a concise summary that captures the main points and insights discussed.`;
      
      // Generate summary using model
      const summary = await this.modelService.generateText(prompt, {
        maxTokens: 300,
        temperature: 0.4
      });
      
      return summary;
    } catch (error) {
      console.error('Error generating session summary:', error);
      return 'Failed to generate summary.';
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      // In a real implementation, this would:
      // 1. Save any unsaved notes
      // 2. Close database connections
      
      this.notes.clear();
      console.log('Note service cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up note service:', error);
    }
  }
}