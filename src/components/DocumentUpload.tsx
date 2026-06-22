import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Trash2, File, Check, AlertCircle } from 'lucide-react';
import { auth } from '../lib/firebase';

interface Document {
  id: string;
  name: string;
  uploadedAt: number;
}

interface DocumentUploadProps {
  onUploadSuccess?: () => void;
  highContrast?: boolean;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUploadSuccess, highContrast }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const response = await fetch('/api/documents', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  React.useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['.pdf', '.txt', '.docx'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validTypes.includes(fileExt)) {
      setErrorMessage('Only PDF, TXT, and DOCX files are supported');
      setUploadStatus('error');
      return;
    }

    // Validate file size (max 10MB to match server limits)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size must be less than 10MB');
      setUploadStatus('error');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Upload failed');
      }

      setUploadStatus('success');
      setErrorMessage('');
      await fetchDocuments();
      if (onUploadSuccess) onUploadSuccess();

      // Reset success message after 3 seconds
      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      await fetchDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      setErrorMessage('Failed to delete document');
      setUploadStatus('error');
    }
  };

  return (
    <div className="w-full max-w-md rounded-lg border border-accent/20 bg-bg p-4 shadow-lg">
      {/* Upload Section */}
      <div className="mb-4">
        <h3 className="mb-3 text-sm font-semibold text-text">Upload Documents</h3>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          disabled={isUploading}
          accept=".pdf,.txt,.docx"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={`w-full rounded-lg border-2 border-dashed p-3 transition-all ${
            highContrast
              ? 'border-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20 disabled:opacity-50'
              : 'border-accent/50 bg-accent/5 hover:bg-accent/10 disabled:opacity-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Upload className={`h-4 w-4 ${isUploading ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">
              {isUploading ? 'Processing...' : 'Click to upload (PDF, TXT, DOCX)'}
            </span>
          </div>
        </button>

        {/* Status Messages */}
        <AnimatePresence>
          {uploadStatus === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={`mt-2 flex items-center gap-2 rounded p-2 text-sm ${
                highContrast ? 'bg-yellow-400/20 text-yellow-600' : 'bg-green-100 text-green-700'
              }`}
            >
              <Check className="h-4 w-4" />
              <span>Document uploaded successfully</span>
            </motion.div>
          )}
          {uploadStatus === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-2 flex items-center gap-2 rounded bg-red-100 p-2 text-sm text-red-700"
            >
              <AlertCircle className="h-4 w-4" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Documents List */}
      {documents.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-text/60">
            Uploaded Documents ({documents.length})
          </h4>
          <div className="space-y-2">
            {documents.map(doc => (
              <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={`flex items-center justify-between rounded p-2 text-sm ${
                  highContrast ? 'bg-yellow-400/10' : 'bg-accent/5'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <File className="h-4 w-4 shrink-0 text-accent" />
                  <span className="truncate font-medium text-text">{doc.name}</span>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="ml-2 shrink-0 text-text/60 hover:text-red-500 transition-colors"
                  title="Delete document"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {documents.length === 0 && uploadStatus === 'idle' && (
        <p className="text-xs text-text/40">No documents uploaded yet</p>
      )}
    </div>
  );
};
