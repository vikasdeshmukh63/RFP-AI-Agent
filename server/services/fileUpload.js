import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

class FileUploadService {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || 'uploads';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 26214400; // 25MB default
    this.allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff'
    ];

    this.initializeUploadDir();
  }

  async initializeUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      console.log(`📁 Created upload directory: ${this.uploadDir}`);
    }
  }

  getMulterConfig() {
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        try {
          await this.initializeUploadDir();
          cb(null, this.uploadDir);
        } catch (error) {
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      }
    });

    const fileFilter = (req, file, cb) => {
      if (this.allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${file.mimetype} is not allowed. Supported types: PDF, Word, Excel, Images`), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: this.maxFileSize,
        files: 1
      }
    });
  }

  async processUploadedFile(file, userId = null) {
    try {
      const filePath = file.path;
      const fileUrl = `/api/files/${file.filename}`;
      
      // Optimize images
      if (file.mimetype.startsWith('image/')) {
        await this.optimizeImage(filePath, file.mimetype);
      }

      // Get file stats
      const stats = await fs.stat(filePath);

      return {
        id: uuidv4(),
        name: file.filename,
        originalName: file.originalname,
        filePath: filePath,
        fileUrl: fileUrl,
        mimeType: file.mimetype,
        sizeBytes: stats.size,
        userId: userId,
        createdAt: new Date()
      };

    } catch (error) {
      // Clean up file if processing fails
      try {
        await fs.unlink(file.path);
      } catch (unlinkError) {
        console.error('Failed to clean up file:', unlinkError);
      }
      throw error;
    }
  }

  async optimizeImage(filePath, mimeType) {
    try {
      if (!mimeType.startsWith('image/')) return;

      const tempPath = `${filePath}.temp`;
      
      await sharp(filePath)
        .resize(2048, 2048, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: 85,
          progressive: true 
        })
        .toFile(tempPath);

      // Replace original with optimized version
      await fs.rename(tempPath, filePath);
      
      console.log(`🖼️ Image optimized: ${path.basename(filePath)}`);
    } catch (error) {
      console.error('Image optimization failed:', error);
      // Continue without optimization if it fails
    }
  }

  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      console.log(`🗑️ File deleted: ${filePath}`);
    } catch (error) {
      console.error('File deletion failed:', error);
      throw error;
    }
  }

  async getFileStream(filename) {
    const filePath = path.join(this.uploadDir, filename);
    
    try {
      await fs.access(filePath);
      return filePath;
    } catch (error) {
      throw new Error('File not found');
    }
  }

  validateFileSize(size) {
    return size <= this.maxFileSize;
  }

  validateMimeType(mimeType) {
    return this.allowedMimeTypes.includes(mimeType);
  }

  getFileExtension(filename) {
    return path.extname(filename).toLowerCase();
  }

  generateUniqueFilename(originalName) {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    return `${name}-${uuidv4()}-${Date.now()}${ext}`;
  }
}

export default new FileUploadService();