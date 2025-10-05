import express from "express";
import { ChatSession, GeneralChatMessage, UploadedDocument, AnalysisResult } from "../models/index.js";
import { authenticateToken } from "../middleware/auth.js";
import { validateRequest, schemas } from "../middleware/validation.js";
import openRouterService from "../services/openrouter.js";
import documentService from "../services/documentParser.js";

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
        if (file_url) {
          try {
            console.log(`🔍 Looking for document with file_url: ${file_url} for user: ${req.user.id}`);
            
            // Debug: Check what documents exist for this user
            const allUserDocs = await UploadedDocument.findAll({
              where: { user_id: req.user.id },
              attributes: ["id", "file_url", "original_name"],
              limit: 5
            });
            console.log(`📚 User has ${allUserDocs.length} documents:`, allUserDocs.map(d => ({ url: d.file_url, name: d.original_name })));
            
            // Find document by URL
            const document = await UploadedDocument.findOne({
              where: {
                file_url: file_url,
                user_id: req.user.id,
              },
              attributes: ["file_path", "mime_type", "original_name"],
            });

            console.log(`📄 Document found:`, document ? `${document.original_name} (${document.mime_type})` : 'None');

            if (document) {
              const preparedDoc = await documentService.prepareDocumentForAI(document.file_path, document.mime_type);
              documents = [preparedDoc];
              console.log(`✅ Document prepared for AI: ${preparedDoc.filename}`);
            } else {
              console.log(`❌ No document found with file_url: ${file_url}`);
            }
          } catch (parseError) {
            console.error("Document preparation error:", parseError);
          }
        }

        // Generate AI response
        console.log(`🎯 Calling AI with ${documents.length} documents`);
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
