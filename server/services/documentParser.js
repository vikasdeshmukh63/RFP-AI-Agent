import fs from 'fs/promises';
import path from 'path';

class DocumentService {
  constructor() {
    this.maxDocumentSizeMB = parseInt(process.env.MAX_DOCUMENT_SIZE_MB) || 25;
  }

  async getDocumentAsBase64(filePath) {
    try {
      console.log(`📄 Reading document: ${filePath}`);
      
      // Check file size
      const stats = await fs.stat(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      
      if (fileSizeMB > this.maxDocumentSizeMB) {
        throw new Error(`Document size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size (${this.maxDocumentSizeMB}MB)`);
      }

      // Read file and convert to base64
      const fileBuffer = await fs.readFile(filePath);
      const base64Content = fileBuffer.toString('base64');
      
      return {
        base64: base64Content,
        size: stats.size,
        sizeMB: fileSizeMB,
        filename: path.basename(filePath)
      };

    } catch (error) {
      console.error('❌ Document reading failed:', error);
      throw new Error(`Failed to read document: ${error.message}`);
    }
  }

  async prepareDocumentForAI(filePath, mimeType) {
    try {
      const documentData = await this.getDocumentAsBase64(filePath);
      
      return {
        content: documentData.base64,
        mimeType: mimeType,
        filename: documentData.filename,
        size: documentData.size,
        sizeMB: documentData.sizeMB
      };

    } catch (error) {
      throw new Error(`Failed to prepare document for AI: ${error.message}`);
    }
  }

  // Utility method to check if file type is supported by Claude
  isSupportedFileType(mimeType) {
    const supportedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    return supportedTypes.includes(mimeType);
  }

  // Get file type description for user
  getFileTypeDescription(mimeType) {
    const typeMap = {
      'application/pdf': 'PDF Document',
      'application/msword': 'Word Document (Legacy)',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
      'application/vnd.ms-excel': 'Excel Spreadsheet (Legacy)',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
      'text/plain': 'Text File',
      'text/csv': 'CSV File',
      'image/jpeg': 'JPEG Image',
      'image/png': 'PNG Image',
      'image/gif': 'GIF Image',
      'image/webp': 'WebP Image'
    };
    
    return typeMap[mimeType] || 'Unknown File Type';
  }
}

export default new DocumentService();