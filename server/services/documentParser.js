import fs from "fs/promises";
import path from "path";

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
      const base64Content = fileBuffer.toString("base64");

      return {
        base64: base64Content,
        size: stats.size,
        sizeMB: fileSizeMB,
        filename: path.basename(filePath),
      };
    } catch (error) {
      console.error("❌ Document reading failed:", error);
      throw new Error(`Failed to read document: ${error.message}`);
    }
  }

  async extractTextFromPDF(filePath) {
    try {
      console.log(`📄 Extracting text from PDF: ${filePath}`);

      // Check if file exists
      const stats = await fs.stat(filePath);
      console.log(`📊 PDF file size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);

      // Dynamic import to avoid initialization issues
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

      const fileBuffer = await fs.readFile(filePath);
      console.log(`📖 File buffer loaded: ${fileBuffer.length} bytes`);
      
      // Convert Buffer to Uint8Array for pdfjs-dist
      const uint8Array = new Uint8Array(fileBuffer);
      console.log(`🔄 Converted to Uint8Array: ${uint8Array.length} bytes`);
      
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({
        data: uint8Array,
        verbosity: 0 // Suppress console output
      });
      
      const pdfDocument = await loadingTask.promise;
      const numPages = pdfDocument.numPages;
      console.log(`📄 PDF loaded: ${numPages} pages`);

      let fullText = '';
      
      // Extract text from each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        try {
          const page = await pdfDocument.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          // Combine all text items from the page
          const pageText = textContent.items
            .map(item => item.str)
            .join(' ');
          
          fullText += pageText + '\n\n';
          console.log(`📄 Page ${pageNum}: ${pageText.length} characters`);
        } catch (pageError) {
          console.warn(`⚠️ Failed to extract text from page ${pageNum}:`, pageError.message);
        }
      }

      // Clean up the text
      fullText = fullText.trim();

      console.log(`✅ PDF text extracted: ${fullText.length} characters, ${numPages} pages`);
      
      // Log first 200 characters to verify content
      if (fullText.length > 0) {
        console.log(`📝 First 200 chars: "${fullText.substring(0, 200)}..."`);
      } else {
        console.warn(`⚠️ PDF text is empty! This might be a scanned PDF with images only.`);
      }

      return {
        text: fullText,
        pages: numPages,
        info: { pages: numPages },
      };
    } catch (error) {
      console.error("❌ PDF text extraction failed:", error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  async prepareDocumentForAI(filePath, mimeType) {
    try {
      // For PDFs, extract text instead of using base64
      if (mimeType === "application/pdf") {
        console.log(`📄 Preparing PDF for AI with text extraction: ${path.basename(filePath)}`);

        const pdfData = await this.extractTextFromPDF(filePath);

        return {
          content: pdfData.text,
          mimeType: mimeType,
          filename: path.basename(filePath),
          pages: pdfData.pages,
          type: "text", // Indicate this is text content, not base64
        };
      } else {
        // For other files, use base64 (images, etc.)
        const documentData = await this.getDocumentAsBase64(filePath);

        return {
          content: documentData.base64,
          mimeType: mimeType,
          filename: documentData.filename,
          size: documentData.size,
          sizeMB: documentData.sizeMB,
          type: "base64", // Indicate this is base64 content
        };
      }
    } catch (error) {
      throw new Error(`Failed to prepare document for AI: ${error.message}`);
    }
  }

  // Utility method to check if file type is supported by Claude
  isSupportedFileType(mimeType) {
    const supportedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/csv",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    return supportedTypes.includes(mimeType);
  }

  // Get file type description for user
  getFileTypeDescription(mimeType) {
    const typeMap = {
      "application/pdf": "PDF Document",
      "application/msword": "Word Document (Legacy)",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
      "application/vnd.ms-excel": "Excel Spreadsheet (Legacy)",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
      "text/plain": "Text File",
      "text/csv": "CSV File",
      "image/jpeg": "JPEG Image",
      "image/png": "PNG Image",
      "image/gif": "GIF Image",
      "image/webp": "WebP Image",
    };

    return typeMap[mimeType] || "Unknown File Type";
  }
}

export default new DocumentService();
