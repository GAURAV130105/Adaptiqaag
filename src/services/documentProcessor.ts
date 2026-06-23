import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { ragService } from './ragService.ts';
import { vectorDb, DocumentChunk } from './vectorDb.ts';

interface ProcessedDocument {
  id: string;
  name: string;
  type: string;
  chunks: string[];
  size: number;
}

class DocumentProcessor {
  private uploadDir = process.env.VERCEL
    ? '/tmp/uploads'
    : path.join(process.cwd(), 'uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      try {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      } catch (err) {
        console.error('Failed to create upload directory:', err);
      }
    }
  }

  async processFile(filePath: string, fileName: string): Promise<ProcessedDocument | null> {
    try {
      const fileType = path.extname(fileName).toLowerCase();
      let text = '';

      if (fileType === '.pdf') {
        text = await this.processPDF(filePath);
      } else if (fileType === '.docx') {
        text = await this.processDOCX(filePath);
      } else if (fileType === '.txt') {
        text = await this.processTXT(filePath);
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      if (!text || text.trim().length === 0) {
        throw new Error('No extractable text found in document');
      }

      // Split into chunks (roughly 500 characters per chunk with overlap)
      const chunks = this.chunkText(text, 500, 50);

      if (chunks.length === 0) {
        throw new Error('Could not create valid chunks from document');
      }

      const docId = randomBytes(8).toString('hex');
      const fileStats = fs.statSync(filePath);

      return {
        id: docId,
        name: fileName,
        type: fileType,
        chunks,
        size: fileStats.size,
      };
    } catch (error) {
      console.error('Document processing error:', error);
      throw error;
    }
  }

  private async processPDF(filePath: string): Promise<string> {
    const fileBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(fileBuffer);
    return data.text || '';
  }

  private async processDOCX(filePath: string): Promise<string> {
    const fileBuffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value || '';
  }

  private async processTXT(filePath: string): Promise<string> {
    return fs.readFileSync(filePath, 'utf-8');
  }

  private chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.substring(start, end).trim();

      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      if (end >= text.length) {
        break;
      }

      start = end - overlap;
      if (start < 0) start = 0;
    }

    return chunks.length > 0 ? chunks : [text];
  }

  private async generateEmbeddingWithRetry(
    text: string,
    maxRetries: number = 3,
    initialDelayMs: number = 1000
  ): Promise<number[] | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const embedding = await ragService.generateEmbedding(text);
        if (embedding) {
          return embedding;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if it's a rate limit error (429) or server error (5xx)
        if (attempt < maxRetries - 1) {
          const delayMs = initialDelayMs * Math.pow(2, attempt);
          console.warn(
            `Grok API attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`,
            lastError.message
          );
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    if (lastError) {
      console.error(`Grok API failed after ${maxRetries} retries:`, lastError.message);
    }
    return null;
  }

  async embedAndStoreDocument(doc: ProcessedDocument): Promise<boolean> {
    try {
      // Add document record
      const added = vectorDb.addDocument(doc.id, doc.name, doc.type, doc.size);
      if (!added) {
        throw new Error('Failed to add document to database');
      }

      // Generate embeddings for each chunk and store
      for (let i = 0; i < doc.chunks.length; i++) {
        const chunk = doc.chunks[i];
        
        try {
          const embedding = await this.generateEmbeddingWithRetry(chunk);

          if (!embedding) {
            console.warn(`Failed to generate embedding for chunk ${i} of ${doc.name}`);
            continue;
          }

          const chunkRecord: DocumentChunk = {
            id: `${doc.id}_${i}`,
            docId: doc.id,
            docName: doc.name,
            content: chunk,
            embedding,
            chunkIndex: i,
            createdAt: Date.now(),
          };

          const stored = vectorDb.addChunk(chunkRecord);
          if (!stored) {
            console.warn(`Failed to store chunk ${i} of ${doc.name}`);
          }
        } catch (chunkError) {
          console.error(
            `Grok API error for chunk ${i} of ${doc.name}:`,
            chunkError instanceof Error ? chunkError.message : String(chunkError)
          );
          continue;
        }
      }

      console.log(`Successfully embedded and stored document: ${doc.name}`);
      return true;
    } catch (error) {
      console.error('Embedding and storage error:', error);
      // Clean up partially added document
      vectorDb.deleteDocument(doc.id);
      return false;
    }
  }

  cleanupUploadedFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn('Failed to cleanup file:', filePath);
    }
  }

  getUploadDir(): string {
    return this.uploadDir;
  }
}

export const documentProcessor = new DocumentProcessor();
