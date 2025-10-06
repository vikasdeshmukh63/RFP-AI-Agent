import express from "express";
import { UploadedDocument } from "../models/index.js";
import { authenticateToken, optionalAuth } from "../middleware/auth.js";
import fileUploadService from "../services/fileUpload.js";
import documentService from "../services/documentParser.js";
import fs from "fs/promises";

const router = express.Router();

// Upload document
router.post("/upload", authenticateToken, (req, res) => {
  const upload = fileUploadService.getMulterConfig();

  upload.single("file")(req, res, async (err) => {
    if (err) {
      console.error("Upload error:", err);
      return res.status(400).json({
        error: err.message || "File upload failed",
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    try {
      // Process the uploaded file
      const fileData = await fileUploadService.processUploadedFile(req.file, req.user.id);

      // Save to database using Sequelize
      console.log(`📤 Saving document for user ${req.user.id} (${req.user.email}): ${fileData.originalName} from ${req.body.uploaded_from || "unknown"}`);
      
      const document = await UploadedDocument.create({
        name: fileData.name,
        original_name: fileData.originalName,
        file_path: fileData.filePath,
        file_url: fileData.fileUrl,
        mime_type: fileData.mimeType,
        size_bytes: fileData.sizeBytes,
        uploaded_from: req.body.uploaded_from || "unknown",
        user_id: req.user.id,
      });

      console.log(`✅ Document saved with ID ${document.id} for user ${req.user.id}`);
      
      // Verify the document was saved by checking the count
      const userDocCount = await UploadedDocument.count({ where: { user_id: req.user.id } });
      console.log(`📊 User ${req.user.id} now has ${userDocCount} total documents`);

      res.status(201).json({
        message: "File uploaded successfully",
        document: {
          id: document.id,
          name: document.original_name,
          url: document.file_url,
          type: document.mime_type,
          size: document.size_bytes,
          uploaded_from: document.uploaded_from,
          created_at: document.created_at,
        },
        file_url: document.file_url, // For compatibility with frontend
      });
    } catch (error) {
      console.error("Document save error:", error);

      // Clean up uploaded file on error
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error("Failed to clean up file:", unlinkError);
      }

      res.status(500).json({ error: "Failed to save document" });
    }
  });
});

// Get all documents for user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, sort = "-created_at" } = req.query;

    console.log(`📄 Fetching documents for user ${req.user.id} (${req.user.email})`);

    // Parse sort parameter
    const sortField = sort.startsWith("-") ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith("-") ? "DESC" : "ASC";

    const validSortFields = ["created_at", "name", "size_bytes", "uploaded_from"];
    const finalSortField = validSortFields.includes(sortField) ? sortField : "created_at";

    const { count, rows: documents } = await UploadedDocument.findAndCountAll({
      where: { user_id: req.user.id },
      order: [[finalSortField, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: ["id", "name", "original_name", "file_url", "mime_type", "size_bytes", "uploaded_from", "created_at", "updated_at"],
    });

    console.log(`📄 Found ${documents.length} documents for user ${req.user.id}`);
    console.log(`📄 Document sources:`, documents.map(doc => ({ name: doc.original_name, uploaded_from: doc.uploaded_from })));

    const formattedDocuments = documents.map((doc) => ({
      id: doc.id,
      name: doc.original_name,
      url: doc.file_url,
      type: doc.mime_type,
      size: doc.size_bytes,
      uploaded_from: doc.uploaded_from,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    }));

    res.json({
      documents: formattedDocuments,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + documents.length < count,
      },
    });
  } catch (error) {
    console.error("Documents fetch error:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// Get single document
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const document = await UploadedDocument.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id,
      },
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json({
      id: document.id,
      name: document.original_name,
      url: document.file_url,
      type: document.mime_type,
      size: document.size_bytes,
      uploaded_from: document.uploaded_from,
      created_at: document.created_at,
      updated_at: document.updated_at,
    });
  } catch (error) {
    console.error("Document fetch error:", error);
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

// Delete document
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const document = await UploadedDocument.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id,
      },
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    const filePath = document.file_path;

    // Delete from database
    await document.destroy();

    // Delete physical file
    try {
      await fileUploadService.deleteFile(filePath);
    } catch (fileError) {
      console.error("Failed to delete physical file:", fileError);
      // Continue even if file deletion fails
    }

    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Document deletion error:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

// Prepare document for AI analysis
router.post("/:id/prepare", authenticateToken, async (req, res) => {
  try {
    const document = await UploadedDocument.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id,
      },
      attributes: ["id", "file_path", "mime_type", "original_name"],
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Check if file type is supported
    if (!documentService.isSupportedFileType(document.mime_type)) {
      return res.status(400).json({ 
        error: "Unsupported file type",
        details: `${documentService.getFileTypeDescription(document.mime_type)} is not supported for AI analysis`
      });
    }

    console.log(`📄 Preparing document for AI: ${document.original_name}`);
    const preparedDocument = await documentService.prepareDocumentForAI(document.file_path, document.mime_type);

    res.json({
      message: "Document prepared successfully",
      document: {
        id: document.id,
        name: document.original_name,
        type: document.mime_type,
        typeDescription: documentService.getFileTypeDescription(document.mime_type),
        size: preparedDocument.size,
        sizeMB: preparedDocument.sizeMB,
        ready: true
      }
    });
  } catch (error) {
    console.error("Document preparation error:", error);
    res.status(500).json({
      error: "Failed to prepare document",
      details: error.message,
    });
  }
});

// Serve uploaded files
router.get("/files/:filename", optionalAuth, async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = await fileUploadService.getFileStream(filename);

    // Check if user has access to this file (if authenticated)
    if (req.user) {
      const document = await UploadedDocument.findOne({
        where: {
          name: filename,
          user_id: req.user.id,
        },
      });

      if (!document) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    res.sendFile(filePath, { root: "." });
  } catch (error) {
    console.error("File serve error:", error);
    res.status(404).json({ error: "File not found" });
  }
});

// Get document statistics
router.get("/stats/overview", authenticateToken, async (req, res) => {
  try {
    const { sequelize } = UploadedDocument;

    console.log(`📊 Fetching document stats for user ${req.user.id}`);

    // Get stats by source
    const statsBySource = await UploadedDocument.findAll({
      where: { user_id: req.user.id },
      attributes: ["uploaded_from", [sequelize.fn("COUNT", sequelize.col("id")), "count_by_source"]],
      group: ["uploaded_from"],
      raw: true,
    });

    // Get total stats
    const totalStats = await UploadedDocument.findOne({
      where: { user_id: req.user.id },
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "total_documents"],
        [sequelize.fn("SUM", sequelize.col("size_bytes")), "total_size"],
        [sequelize.fn("COUNT", sequelize.literal("CASE WHEN mime_type = 'application/pdf' THEN 1 END")), "pdf_count"],
        [
          sequelize.fn("COUNT", sequelize.literal("CASE WHEN mime_type LIKE 'application/vnd.openxmlformats-officedocument%' THEN 1 END")),
          "office_count",
        ],
        [sequelize.fn("COUNT", sequelize.literal("CASE WHEN mime_type LIKE 'image/%' THEN 1 END")), "image_count"],
      ],
      raw: true,
    });

    console.log(`📊 Stats for user ${req.user.id}:`, {
      total: totalStats.total_documents,
      by_source: statsBySource
    });

    res.json({
      overview: {
        total_documents: parseInt(totalStats.total_documents) || 0,
        total_size: parseInt(totalStats.total_size) || 0,
        pdf_count: parseInt(totalStats.pdf_count) || 0,
        office_count: parseInt(totalStats.office_count) || 0,
        image_count: parseInt(totalStats.image_count) || 0,
      },
      by_source: statsBySource,
    });
  } catch (error) {
    console.error("Stats fetch error:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

export default router;
