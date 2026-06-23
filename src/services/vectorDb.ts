import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.VERCEL
  ? path.join(process.cwd(), 'rag_vectors.db')
  : path.join(__dirname, '../../rag_vectors.db');

export interface DocumentChunk {
  id: string;
  docId: string;
  docName: string;
  content: string;
  embedding: number[];
  chunkIndex: number;
  createdAt: number;
}

class VectorDatabase {
  private db: any = null;
  private SQL: any = null;

  async init() {
    if (this.db) return;

    this.SQL = await initSqlJs();
    
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      this.db = new this.SQL.Database(fileBuffer);
    } else {
      this.db = new this.SQL.Database();
      this.initializeSchema();
      this.save();
    }
  }

  private initializeSchema() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        size INTEGER NOT NULL,
        uploadedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        doc_id TEXT NOT NULL,
        doc_name TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (doc_id) REFERENCES documents(id)
      );

      CREATE INDEX IF NOT EXISTS idx_doc_id ON chunks(doc_id);
    `);
  }

  private save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }

  addDocument(id: string, name: string, type: string, size: number): boolean {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO documents (id, name, type, size, uploadedAt)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run([id, name, type, size, Date.now()]);
      stmt.free();
      this.save();
      return true;
    } catch (error) {
      console.error('Error adding document:', error);
      return false;
    }
  }

  addChunk(chunk: DocumentChunk): boolean {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO chunks (id, doc_id, doc_name, content, embedding, chunk_index, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run([
        chunk.id,
        chunk.docId,
        chunk.docName,
        chunk.content,
        JSON.stringify(chunk.embedding),
        chunk.chunkIndex,
        chunk.createdAt
      ]);
      stmt.free();
      this.save();
      return true;
    } catch (error) {
      console.error('Error adding chunk:', error);
      return false;
    }
  }

  searchByEmbedding(queryEmbedding: number[], topK: number = 5): DocumentChunk[] {
    try {
      const stmt = this.db.prepare(`
        SELECT id, doc_id, doc_name, content, embedding, chunk_index, created_at
        FROM chunks
      `);
      
      const chunks: any[] = [];
      while (stmt.step()) {
        chunks.push(stmt.getAsObject());
      }
      stmt.free();

      const scored = chunks.map(chunk => {
        const embedding = JSON.parse(chunk.embedding) as number[];
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);
        return { ...chunk, similarity };
      });

      return scored
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK)
        .map(chunk => ({
          id: chunk.id,
          docId: chunk.doc_id,
          docName: chunk.doc_name,
          content: chunk.content,
          embedding: JSON.parse(chunk.embedding),
          chunkIndex: chunk.chunk_index,
          createdAt: chunk.created_at,
        }));
    } catch (error) {
      console.error('Error searching embeddings:', error);
      return [];
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  getDocuments(): any[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM documents ORDER BY uploadedAt DESC');
      const docs: any[] = [];
      while (stmt.step()) {
        docs.push(stmt.getAsObject());
      }
      stmt.free();
      return docs;
    } catch (error) {
      console.error('Error getting documents:', error);
      return [];
    }
  }

  deleteDocument(docId: string): boolean {
    try {
      this.db.run('BEGIN TRANSACTION');
      const deleteChunks = this.db.prepare('DELETE FROM chunks WHERE doc_id = ?');
      const deleteDoc = this.db.prepare('DELETE FROM documents WHERE id = ?');
      deleteChunks.run([docId]);
      deleteDoc.run([docId]);
      deleteChunks.free();
      deleteDoc.free();
      this.db.run('COMMIT');
      this.save();
      return true;
    } catch (error) {
      this.db.run('ROLLBACK');
      console.error('Error deleting document:', error);
      return false;
    }
  }

  getChunksByDocId(docId: string): DocumentChunk[] {
    try {
      const stmt = this.db.prepare(`
        SELECT id, doc_id, doc_name, content, embedding, chunk_index, created_at
        FROM chunks WHERE doc_id = ?
        ORDER BY chunk_index
      `);
      stmt.bind([docId]);
      
      const chunks: any[] = [];
      while (stmt.step()) {
        chunks.push(stmt.getAsObject());
      }
      stmt.free();

      return chunks.map(chunk => ({
        id: chunk.id,
        docId: chunk.doc_id,
        docName: chunk.doc_name,
        content: chunk.content,
        embedding: JSON.parse(chunk.embedding),
        chunkIndex: chunk.chunk_index,
        createdAt: chunk.created_at,
      }));
    } catch (error) {
      console.error('Error getting chunks:', error);
      return [];
    }
  }

  close(): void {
    if (this.db) {
      this.save();
      this.db.close();
    }
  }
}

const vectorDbInstance = new VectorDatabase();
await vectorDbInstance.init();
export const vectorDb = vectorDbInstance;
