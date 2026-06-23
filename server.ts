import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { ragService } from "./src/services/ragService.ts";
import { documentProcessor } from "./src/services/documentProcessor.ts";
import { vectorDb } from "./src/services/vectorDb.ts";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Multer upload config with 10MB limit and PDF/TXT/DOCX file filter
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    const allowedExtensions = [".pdf", ".txt", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, TXT, and DOCX files are allowed"));
    }
  }
});

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "uploads")));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    groqConfigured: !!process.env.GROQ_API_KEY,
    grokConfigured: !!process.env.GROQ_API_KEY 
  });
});

// RAG Query endpoint
app.post("/api/chat/rag", async (req, res) => {
  try {
    const { message, userContext } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await ragService.ragQuery(message, userContext);
    res.json({ response });
  } catch (error) {
    console.error("RAG chat error:", error);
    res.status(500).json({
      error: "Failed to process query",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Document upload endpoint
app.post("/api/documents/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    console.log(`Processing file: ${fileName}`);

    // Process the document
    const processed = await documentProcessor.processFile(filePath, fileName);
    if (!processed) {
      documentProcessor.cleanupUploadedFile(filePath);
      return res.status(400).json({ error: "Failed to process document" });
    }

    // Generate embeddings and store
    const success = await documentProcessor.embedAndStoreDocument(processed);
    documentProcessor.cleanupUploadedFile(filePath);

    if (!success) {
      return res.status(500).json({ error: "Failed to embed and store document" });
    }

    res.json({
      success: true,
      documentId: processed.id,
      name: processed.name,
      chunks: processed.chunks.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    if (req.file) {
      documentProcessor.cleanupUploadedFile(req.file.path);
    }
    res.status(500).json({
      error: "Failed to process upload",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get documents list
app.get("/api/documents", (req, res) => {
  try {
    const documents = vectorDb.getDocuments();
    res.json({ documents });
  } catch (error) {
    console.error("Get documents error:", error);
    res.status(500).json({ error: "Failed to retrieve documents" });
  }
});

// Delete document endpoint
app.delete("/api/documents/:docId", (req, res) => {
  try {
    const { docId } = req.params;
    const success = vectorDb.deleteDocument(docId);
    if (!success) {
      return res.status(500).json({ error: "Failed to delete document" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

// Error handling middleware for Multer and general errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Maximum size allowed is 10MB." });
    }
    return res.status(400).json({ error: `Multer upload error: ${err.code}` });
  }
  if (err.message === "Only PDF, TXT, and DOCX files are allowed") {
    return res.status(400).json({ error: err.message });
  }
  console.error("Express middleware error:", err);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

// Standalone server execution check (do not call listen if imported by Vercel serverless functions)
if (!process.env.VERCEL) {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then((vite) => {
      app.use(vite.middlewares);
      
      const server = app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
      server.on("error", (err) => {
        console.error("Express Server Error:", err);
      });
    }).catch((err) => {
      console.error("Failed to create Vite server:", err);
    });
  } else {
    // Local production execution
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    server.on("error", (err) => {
      console.error("Express Server Error:", err);
    });
  }
}

// Global crash handler
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

export default app;
