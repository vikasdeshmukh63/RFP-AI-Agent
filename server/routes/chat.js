import express from "express";
import { ChatSession, GeneralChatMessage, UploadedDocument, AnalysisResult } from "../models/index.js";
import { authenticateToken } from "../middleware/auth.js";
import { validateRequest, schemas } from "../middleware/validation.js";
import openRouterService from "../services/openrouter.js";
import documentService from "../services/documentParser.js";
import fs from "fs/promises";
import { Op } from "sequelize";

const router = express.Router();

// Create or get chat session
router.post("/sessions", authenticateToken, async (req, res) => {
  try {
    const { session_id, title } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: "session_id is required" });
    }

    // Create or get session
    const { session, created } = await ChatSession.createOrGet(session_id, req.user.id, title || "New Chat");

    res.json({
      session: session.toJSON(),
      created,
      message: created ? "Session created" : "Session found",
    });
  } catch (error) {
    console.error("Session creation error:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// Get user's chat sessions
router.get("/sessions", authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const sessions = await ChatSession.findByUser(req.user.id, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Get message counts for each session
    const sessionsWithCounts = await Promise.all(
      sessions.map(async (session) => {
        const messageCount = await GeneralChatMessage.countBySession(session.session_id, req.user.id);
        const recentMessages = await GeneralChatMessage.findBySession(session.session_id, req.user.id, {
          limit: 1,
          order: [["created_date", "DESC"]],
        });

        return {
          ...session.toJSON(),
          message_count: messageCount,
          last_message_at: recentMessages.length > 0 ? recentMessages[0].created_date : session.updated_at,
        };
      })
    );

    res.json({ sessions: sessionsWithCounts });
  } catch (error) {
    console.error("Sessions fetch error:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// Delete chat session
router.delete("/sessions/:sessionId", authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Delete messages first
    await GeneralChatMessage.deleteBySession(sessionId, req.user.id);

    // Clean up documents referenced in this session's messages
    const sessionMessages = await GeneralChatMessage.findAll({
      where: {
        session_id: sessionId,
        user_id: req.user.id,
        file_url: { [Op.ne]: null },
      },
      attributes: ["file_url"],
    });

    const sessionFileUrls = [...new Set(sessionMessages.map((msg) => msg.file_url).filter(Boolean))];

    for (const fileUrl of sessionFileUrls) {
      try {
        const doc = await UploadedDocument.findOne({
          where: {
            file_url: fileUrl,
            user_id: req.user.id,
            uploaded_from: "chatbot",
          },
        });

        if (doc) {
          // Delete physical file
          await fs.unlink(doc.file_path);
          // Delete database record
          await doc.destroy();
          console.log(`🗑️ Cleaned up session document: ${doc.original_name}`);
        }
      } catch (cleanupError) {
        console.error(`Failed to cleanup document ${fileUrl}:`, cleanupError);
      }
    }

    // Delete session
    const session = await ChatSession.findOne({
      where: {
        session_id: sessionId,
        user_id: req.user.id,
      },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    await session.destroy();

    res.json({ message: "Session deleted successfully" });
  } catch (error) {
    console.error("Session deletion error:", error);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

// Send message
router.post("/messages", authenticateToken, validateRequest(schemas.chatMessage), async (req, res) => {
  try {
    const { session_id, message, sender, file_url, file_name } = req.body;

    // Ensure session exists before saving message


    // Save user message
    const savedMessage = await GeneralChatMessage.create({
      session_id,
      message,
      sender,
      file_url,
      file_name,
      user_id: req.user.id,
      created_date: new Date(),
    });

    // If this is a user message, generate AI response
    if (sender === "user") {
      try {
        // Get conversation history
        const conversationHistory = await GeneralChatMessage.getConversationHistory(session_id, req.user.id, 10);

        // Get document content if available
        let documents = [];

        // First try to use the document from the message
        if (file_url) {
          try {
            console.log(`🔍 Looking for document with file_url: ${file_url} for user: ${req.user.id}`);

            const document = await UploadedDocument.findOne({
              where: {
                file_url: file_url,
                user_id: req.user.id,
              },
              attributes: ["file_path", "mime_type", "original_name"],
            });

            if (document) {
              console.log(`📄 Found document from message: ${document.original_name} (${document.mime_type})`);
              const preparedDoc = await documentService.prepareDocumentForAI(document.file_path, document.mime_type);
              documents = [preparedDoc];
            }
          } catch (parseError) {
            console.error("Document preparation error:", parseError);
          }
        }

        // If no document found from message, try to find the most recent document for this session
        if (documents.length === 0) {
          try {
            console.log(`🔍 No document in message, looking for session documents...`);

            // Find documents referenced in this session's messages
            const sessionMessages = await GeneralChatMessage.findAll({
              where: {
                session_id: session_id,
                user_id: req.user.id,
                file_url: { [Op.ne]: null },
              },
              attributes: ["file_url"],
              order: [["created_date", "DESC"]],
              limit: 1,
            });

            if (sessionMessages.length > 0) {
              const latestFileUrl = sessionMessages[0].file_url;
              console.log(`📄 Found session document: ${latestFileUrl}`);

              const document = await UploadedDocument.findOne({
                where: {
                  file_url: latestFileUrl,
                  user_id: req.user.id,
                },
                attributes: ["file_path", "mime_type", "original_name"],
              });

              if (document) {
                console.log(`📄 Using session document: ${document.original_name} (${document.mime_type})`);
                const preparedDoc = await documentService.prepareDocumentForAI(document.file_path, document.mime_type);
                documents = [preparedDoc];
              }
            } else {
              console.log(`📄 No documents found for this session`);
            }
          } catch (sessionDocError) {
            console.error("Session document lookup error:", sessionDocError);
          }
        }

        if (documents.length > 0) {
          console.log(`✅ Document prepared for AI:`, {
            filename: documents[0].filename,
            type: documents[0].type,
            contentLength: documents[0].content?.length || 0,
            mimeType: documents[0].mimeType,
          });
        } else {
          console.log(`❌ No documents available for this message`);
        }

        // Generate AI response
        console.log(`🎯 Calling AI with ${documents.length} documents for message: "${message}"`);
        console.log(`📝 Session ID: ${session_id}, User ID: ${req.user.id}`);

        if (documents.length > 0) {
          console.log(
            `📋 Document details:`,
            documents.map((d) => ({
              filename: d.filename,
              type: d.type,
              contentLength: d.content?.length || 0,
              mimeType: d.mimeType,
              hasContent: !!d.content,
            }))
          );

          // Log first 100 characters of document content
          if (documents[0].content) {
            console.log(`📄 Document content preview: "${documents[0].content.substring(0, 100)}..."`);
          }
        } else {
          console.log(`❌ NO DOCUMENTS FOUND - AI will not have document context`);
        }

        const aiResponse = await openRouterService.chatWithDocument(
          message,
          documents,
          conversationHistory.slice(0, -1) // Exclude the current message
        );

        // Save AI response
        const aiMessage = await GeneralChatMessage.create({
          session_id,
          message: aiResponse,
          sender: "ai",
          user_id: req.user.id,
          created_date: new Date(),
        });

        res.json({
          userMessage: savedMessage.toJSON(),
          aiMessage: aiMessage.toJSON(),
          message: "Messages sent successfully",
        });
      } catch (aiError) {
        console.error("AI response error:", aiError);

        // Save error message as AI response
        const errorMessage = `❌ I apologize, but I encountered an error processing your request: ${aiError.message}. Please try again or try with a different approach.`;

        const aiMessage = await GeneralChatMessage.create({
          session_id,
          message: errorMessage,
          sender: "ai",
          user_id: req.user.id,
          created_date: new Date(),
        });

        res.json({
          userMessage: savedMessage.toJSON(),
          aiMessage: aiMessage.toJSON(),
          message: "Message sent, but AI response failed",
        });
      }
    } else {
      // Just return the saved message for AI messages
      res.json({
        message: savedMessage.toJSON(),
        message: "Message saved successfully",
      });
    }
  } catch (error) {
    console.error("Message send error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Get messages for a session
router.get("/messages/:sessionId", authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await GeneralChatMessage.findBySession(sessionId, req.user.id, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({ messages: messages.map((msg) => msg.toJSON()) });
  } catch (error) {
    console.error("Messages fetch error:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Clear messages in a session
router.delete("/messages/:sessionId", authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    await GeneralChatMessage.deleteBySession(sessionId, req.user.id);

    res.json({ message: "Messages cleared successfully" });
  } catch (error) {
    console.error("Messages clear error:", error);
    res.status(500).json({ error: "Failed to clear messages" });
  }
});

// Analyze document with AI
router.post("/analyze-document", authenticateToken, async (req, res) => {
  try {
    const { document_id, questions } = req.body;

    if (!document_id || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: "document_id and questions array are required" });
    }

    // Get document
    const document = await UploadedDocument.findOne({
      where: {
        id: document_id,
        user_id: req.user.id,
      },
      attributes: ["file_path", "mime_type", "original_name"],
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    const { file_path, mime_type, original_name } = document;

    // Parse document
    console.log(`📄 Analyzing document: ${original_name}`);
    const preparedDoc = await documentService.prepareDocumentForAI(file_path, mime_type);

    // Analyze with AI
    const analysis = await openRouterService.analyzeDocument([preparedDoc], questions);

    // Save analysis results
    await AnalysisResult.create({
      document_id: document_id,
      analysis_type: "rfp_analysis",
      questions: JSON.stringify(questions),
      answers: JSON.stringify(analysis),
      user_id: req.user.id,
    });

    res.json({
      message: "Document analyzed successfully",
      analysis,
      document: {
        id: document_id,
        name: original_name,
        type: mime_type,
      },
    });
  } catch (error) {
    console.error("Document analysis error:", error);
    res.status(500).json({
      error: "Failed to analyze document",
      details: error.message,
    });
  }
});

// Get analysis history
router.get("/analysis-history", authenticateToken, async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    const analyses = await AnalysisResult.findByUser(req.user.id, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({ analyses: analyses.map((a) => a.toJSON()) });
  } catch (error) {
    console.error("Analysis history fetch error:", error);
    res.status(500).json({ error: "Failed to fetch analysis history" });
  }
});

export default router;
