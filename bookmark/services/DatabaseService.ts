import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Note } from '../types/conversation';
import { Book, BookChunk } from '../types/book';

interface Conversation {
  id: string;
  bookId: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  createdAt: number;
  updatedAt: number;
}

interface BookIndex {
  id: string;
  bookId: string;
  path: string;
  version: number;
  createdAt: number;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLite.WebSQLDatabase;
  private initialized: boolean = false;

  private constructor() {
    this.db = SQLite.openDatabase('bookmark.db');
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create tables if they don't exist
      await this.db.transaction(tx => {
        // Books table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS books (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            author TEXT,
            path TEXT NOT NULL,
            description TEXT,
            categories TEXT,
            coverPath TEXT,
            createdAt INTEGER NOT NULL,
            lastOpenedAt INTEGER
          )
        `);

        // Conversations table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            bookId TEXT NOT NULL,
            history TEXT NOT NULL,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL,
            FOREIGN KEY (bookId) REFERENCES books(id)
          )
        `);

        // Book indices table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS book_indices (
            id TEXT PRIMARY KEY,
            bookId TEXT NOT NULL,
            path TEXT NOT NULL,
            version INTEGER NOT NULL,
            createdAt INTEGER NOT NULL,
            FOREIGN KEY (bookId) REFERENCES books(id)
          )
        `);

        // Book chunks table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS book_chunks (
            id TEXT PRIMARY KEY,
            book_id TEXT NOT NULL,
            content TEXT NOT NULL,
            embedding BLOB,
            start_position INTEGER,
            end_position INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books (id)
          )
        `);

        // Notes table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            book_id TEXT NOT NULL,
            content TEXT NOT NULL,
            type TEXT NOT NULL,
            context TEXT,
            tags TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books (id)
          )
        `);

        // Sessions table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            book_id TEXT NOT NULL,
            start_time DATETIME NOT NULL,
            end_time DATETIME,
            summary TEXT,
            FOREIGN KEY (book_id) REFERENCES books (id)
          )
        `);

        // FAISS index metadata table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS faiss_indices (
            id TEXT PRIMARY KEY,
            book_id TEXT NOT NULL,
            index_path TEXT NOT NULL,
            dimension INTEGER NOT NULL,
            num_vectors INTEGER NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books (id)
          )
        `);

        // Create indices
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_conversations_bookId ON conversations(bookId)');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_book_indices_bookId ON book_indices(bookId)');
      });

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  async saveBook(book: Book): Promise<void> {
    await this.initialize();

    try {
      const now = Date.now();
      await this.db.transaction(tx => {
        tx.executeSql(
          `INSERT OR REPLACE INTO books (
            id, title, author, path, description, categories, coverPath, createdAt, lastOpenedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            book.id,
            book.title,
            book.author || null,
            book.path,
            book.description || null,
            book.categories ? JSON.stringify(book.categories) : null,
            book.coverPath || null,
            book.createdAt || now,
            now,
          ]
        );
      });
    } catch (error) {
      console.error('Error saving book:', error);
      throw error;
    }
  }

  async getBooks(): Promise<Book[]> {
    await this.initialize();

    try {
      const result = await this.db.transaction(tx => {
        const { rows } = tx.executeSql(
          'SELECT * FROM books ORDER BY lastOpenedAt DESC'
        );
        return rows;
      });

      return result.map(row => ({
        ...row,
        categories: row.categories ? JSON.parse(row.categories) : [],
      }));
    } catch (error) {
      console.error('Error getting books:', error);
      throw error;
    }
  }

  async saveConversation(
    bookId: string,
    history: { role: 'user' | 'assistant'; content: string }[]
  ): Promise<void> {
    await this.initialize();

    try {
      const now = Date.now();
      await this.db.transaction(tx => {
        // Get existing conversation for book
        const { rows } = tx.executeSql(
          'SELECT id FROM conversations WHERE bookId = ?',
          [bookId]
        );

        const id = rows[0]?.id || Math.random().toString(36).slice(2);
        tx.executeSql(
          `INSERT OR REPLACE INTO conversations (
            id, bookId, history, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            id,
            bookId,
            JSON.stringify(history),
            rows[0]?.createdAt || now,
            now,
          ]
        );
      });
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
  }

  async getConversation(
    bookId: string
  ): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
    await this.initialize();

    try {
      const result = await this.db.transaction(tx => {
        const { rows } = tx.executeSql(
          'SELECT history FROM conversations WHERE bookId = ?',
          [bookId]
        );
        return rows[0]?.history ? JSON.parse(rows[0].history) : [];
      });

      return result;
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  }

  async saveBookIndex(bookId: string, indexPath: string): Promise<void> {
    await this.initialize();

    try {
      const now = Date.now();
      await this.db.transaction(tx => {
        // Get current version
        const { rows } = tx.executeSql(
          'SELECT version FROM book_indices WHERE bookId = ? ORDER BY version DESC LIMIT 1',
          [bookId]
        );
        const version = (rows[0]?.version || 0) + 1;

        // Save new index
        tx.executeSql(
          `INSERT INTO book_indices (
            id, bookId, path, version, createdAt
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            Math.random().toString(36).slice(2),
            bookId,
            indexPath,
            version,
            now,
          ]
        );

        // Delete old versions (keep last 2)
        tx.executeSql(
          `DELETE FROM book_indices 
           WHERE bookId = ? 
           AND version NOT IN (
             SELECT version FROM book_indices 
             WHERE bookId = ? 
             ORDER BY version DESC 
             LIMIT 2
           )`,
          [bookId, bookId]
        );
      });
    } catch (error) {
      console.error('Error saving book index:', error);
      throw error;
    }
  }

  async getLatestBookIndex(bookId: string): Promise<BookIndex | null> {
    await this.initialize();

    try {
      const result = await this.db.transaction(tx => {
        const { rows } = tx.executeSql(
          `SELECT * FROM book_indices 
           WHERE bookId = ? 
           ORDER BY version DESC 
           LIMIT 1`,
          [bookId]
        );
        return rows[0] || null;
      });

      return result;
    } catch (error) {
      console.error('Error getting book index:', error);
      throw error;
    }
  }

  async deleteBook(bookId: string): Promise<void> {
    await this.initialize();

    try {
      await this.db.transaction(async tx => {
        // Get book details
        const { rows } = tx.executeSql(
          'SELECT path, coverPath FROM books WHERE id = ?',
          [bookId]
        );
        const book = rows[0];

        if (book) {
          // Delete book file
          await FileSystem.deleteAsync(book.path, { idempotent: true });
          
          // Delete cover image if exists
          if (book.coverPath) {
            await FileSystem.deleteAsync(book.coverPath, { idempotent: true });
          }

          // Delete from database
          tx.executeSql('DELETE FROM books WHERE id = ?', [bookId]);
          tx.executeSql('DELETE FROM conversations WHERE bookId = ?', [bookId]);
          
          // Get and delete indices
          const { rows: indexRows } = tx.executeSql(
            'SELECT path FROM book_indices WHERE bookId = ?',
            [bookId]
          );
          
          for (const index of indexRows) {
            await FileSystem.deleteAsync(index.path, { idempotent: true });
          }
          
          tx.executeSql('DELETE FROM book_indices WHERE bookId = ?', [bookId]);
        }
      });
    } catch (error) {
      console.error('Error deleting book:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (!this.initialized) return;

    try {
      await this.db.closeAsync();
      this.initialized = false;
    } catch (error) {
      console.error('Error cleaning up database:', error);
      throw error;
    }
  }

  /**
   * Save book chunks
   */
  async saveBookChunks(chunks: BookChunk[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        chunks.forEach(chunk => {
          tx.executeSql(
            `INSERT OR REPLACE INTO book_chunks (id, book_id, content, embedding, start_position, end_position)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              chunk.id,
              chunk.bookId,
              chunk.content,
              Buffer.from(new Float32Array(chunk.embedding).buffer),
              chunk.startPosition,
              chunk.endPosition
            ]
          );
        });
      }, reject, resolve);
    });
  }

  /**
   * Save a note
   */
  async saveNote(note: Note): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT OR REPLACE INTO notes (id, session_id, book_id, content, type, context, tags, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            note.id,
            note.sessionId,
            note.bookId,
            note.content,
            note.type,
            note.context || null,
            note.tags ? JSON.stringify(note.tags) : null,
            note.timestamp.toISOString()
          ],
          (_, result) => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Get all notes for a book
   */
  async getBookNotes(bookId: string): Promise<Note[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM notes WHERE book_id = ? ORDER BY timestamp DESC`,
          [bookId],
          (_, { rows: { _array } }) => {
            const notes = _array.map(row => ({
              ...row,
              timestamp: new Date(row.timestamp),
              tags: row.tags ? JSON.parse(row.tags) : undefined
            }));
            resolve(notes);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Get all notes for a session
   */
  async getSessionNotes(sessionId: string): Promise<Note[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM notes WHERE session_id = ? ORDER BY timestamp DESC`,
          [sessionId],
          (_, { rows: { _array } }) => {
            const notes = _array.map(row => ({
              ...row,
              timestamp: new Date(row.timestamp),
              tags: row.tags ? JSON.parse(row.tags) : undefined
            }));
            resolve(notes);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Get book chunks with their embeddings
   */
  async getBookChunks(bookId: string): Promise<BookChunk[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM book_chunks WHERE book_id = ? ORDER BY start_position`,
          [bookId],
          (_, { rows: { _array } }) => {
            const chunks = _array.map(row => ({
              ...row,
              embedding: Array.from(new Float32Array(row.embedding))
            }));
            resolve(chunks);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Delete a note
   */
  async deleteNote(noteId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `DELETE FROM notes WHERE id = ?`,
          [noteId],
          (_, result) => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Save FAISS index metadata
   */
  async saveFaissIndex(data: {
    id: string;
    bookId: string;
    indexPath: string;
    dimension: number;
    numVectors: number;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT OR REPLACE INTO faiss_indices (id, book_id, index_path, dimension, num_vectors)
           VALUES (?, ?, ?, ?, ?)`,
          [data.id, data.bookId, data.indexPath, data.dimension, data.numVectors],
          (_, result) => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Get FAISS index metadata for a book
   */
  async getFaissIndex(bookId: string): Promise<{
    id: string;
    bookId: string;
    indexPath: string;
    dimension: number;
    numVectors: number;
    updatedAt: Date;
  } | null> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM faiss_indices WHERE book_id = ?`,
          [bookId],
          (_, { rows: { _array } }) => {
            if (_array.length === 0) {
              resolve(null);
            } else {
              const row = _array[0];
              resolve({
                ...row,
                updatedAt: new Date(row.updated_at)
              });
            }
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }
}