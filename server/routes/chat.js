import express from 'express';
import { ChatSession, GeneralChatMessage, UploadedDocument, AnalysisResult } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest, schemas } from '../middleware/validation.js';
import openRouterService from '../services/openrouter.js';
import documentService from '../services/documentParser.js';

const router = express.Router();

// Create or get chat session
router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const { session_id, title } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    // Create or get session
    const { session, created } = await ChatSession.createOrGet(
      session_id, 
      req.user.id, 
      title || 'New Chat'
    );

    res.json({
      session: session.toJSON(),
      created,
      message: created ? 'Session created' : 'Session found'
    });

  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get user's chat sessions
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT cs.*, 
             COUNT(gcm.id) as message_count,
             MAX(gcm.created_date) as last_message_at
      FROM chat_sessions cs
      LEFT JOIN general_chat_messages gcm ON cs.session_id = gcm.session_id
      WHERE cs.user_id = $1
      GROUP BY cs.id
      ORDER BY COALESCE(MAX(gcm.created_date), cs.created_at) DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, parseInt(limit), parseInt(offset)]);

    res.json({ sessions: result.rows });

  } catch (error) {
    console.error('Sessions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Delete chat session
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Delete messages first (due to foreign key)
    await pool.query(
      'DELETE FROM general_chat_messages WHERE session_id = $1 AND user_id = $2',
      [sessionId, req.user.id]
    );

    // Delete session
    const result = await pool.query(
      'DELETE FROM chat_sessions WHERE session_id = $1 AND user_id = $2 RETURNING *',
      [sessionId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session deleted successfully' });

  } catch (error) {
    console.error('Session deletion error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Send message
router.post('/messages', authenticateToken, validateRequest(schemas.chatMessage), async (req, res) => {
  try {
    const { session_id, message, sender, file_url, file_name } = req.body;

    // Save user message
    const messageResult = await pool.query(`
      INSERT INTO general_chat_messages (session_id, message, sender, file_url, file_name, user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [session_id, message, sender, file_url, file_name, req.user.id]);

    const savedMessage = messageResult.rows[0];

    // If this is a user message, generate AI response
    if (sender === 'user') {
      try {
        // Get conversation history
        const historyResult = await pool.query(`
          SELECT message, sender, created_date
          FROM general_chat_messages
          WHERE session_id = $1 AND user_id = $2
          ORDER BY created_date ASC
          LIMIT 10
        `, [session_id, req.user.id]);

        const conversationHistory = historyResult.rows;

        // Get document content if available
        let documents = [];
        if (file_url) {
          try {
            // Find document by URL
            const document = await UploadedDocument.findOne({
              where: { 
                file_url: file_url,
                user_id: req.user.id 
              },
              attributes: ['file_path', 'mime_type']
            });

            if (document) {
              const preparedDoc = await documentService.prepareDocumentForAI(document.file_path, document.mime_type);
              documents = [preparedDoc];
            }
          } catch (parseError) {
            console.error('Document preparation error:', parseError);
          }
        }

        // Generate AI response
        const aiResponse = await openRouterService.chatWithDocument(
          message,
          documents,
          conversationHistory.slice(0, -1) // Exclude the current message
        );

        // Save AI response
        const aiMessageResult = await pool.query(`
          INSERT INTO general_chat_messages (session_id, message, sender, user_id)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [session_id, aiResponse, 'ai', req.user.id]);

        res.json({
          userMessage: savedMessage,
          aiMessage: aiMessageResult.rows[0],
          message: 'Messages sent successfully'
        });

      } catch (aiError) {
        console.error('AI response error:', aiError);
        
        // Save error message as AI response
        const errorMessage = `❌ I apologize, but I encountered an error processing your request: ${aiError.message}. Please try again or try with a different approach.`;
        
        const aiMessageResult = await pool.query(`
          INSERT INTO general_chat_messages (session_id, message, sender, user_id)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [session_id, errorMessage, 'ai', req.user.id]);

        res.json({
          userMessage: savedMessage,
          aiMessage: aiMessageResult.rows[0],
          message: 'Message sent, but AI response failed'
        });
      }
    } else {
      // Just return the saved message for AI messages
      res.json({
        message: savedMessage,
        message: 'Message saved successfully'
      });
    }

  } catch (error) {
    console.error('Message send error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get messages for a session
router.get('/messages/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT id, session_id, message, sender, file_url, file_name, created_date
      FROM general_chat_messages
      WHERE session_id = $1 AND user_id = $2
      ORDER BY created_date ASC
      LIMIT $3 OFFSET $4
    `, [sessionId, req.user.id, parseInt(limit), parseInt(offset)]);

    res.json({ messages: result.rows });

  } catch (error) {
    console.error('Messages fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Clear messages in a session
router.delete('/messages/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    await pool.query(
      'DELETE FROM general_chat_messages WHERE session_id = $1 AND user_id = $2',
      [sessionId, req.user.id]
    );

    res.json({ message: 'Messages cleared successfully' });

  } catch (error) {
    console.error('Messages clear error:', error);
    res.status(500).json({ error: 'Failed to clear messages' });
  }
});

// Analyze document with AI
router.post('/analyze-document', authenticateToken, async (req, res) => {
  try {
    const { document_id, questions } = req.body;

    if (!document_id || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'document_id and questions array are required' });
    }

    // Get document
    const docResult = await pool.query(
      'SELECT file_path, mime_type, original_name FROM uploaded_documents WHERE id = $1 AND user_id = $2',
      [document_id, req.user.id]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const { file_path, mime_type, original_name } = docResult.rows[0];

    // Parse document
    console.log(`📄 Analyzing document: ${original_name}`);
    const parsedDoc = await documentParserService.parseDocument(file_path, mime_type);

    // Analyze with AI
    const analysis = await openRouterService.analyzeDocument(parsedDoc.text, questions);

    // Save analysis results
    await pool.query(`
      INSERT INTO analysis_results (document_id, analysis_type, questions, answers, user_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [document_id, 'rfp_analysis', JSON.stringify(questions), JSON.stringify(analysis), req.user.id]);

    res.json({
      message: 'Document analyzed successfully',
      analysis,
      document: {
        id: document_id,
        name: original_name,
        type: mime_type
      }
    });

  } catch (error) {
    console.error('Document analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze document',
      details: error.message 
    });
  }
});

// Get analysis history
router.get('/analysis-history', authenticateToken, async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT ar.*, ud.original_name as document_name, ud.mime_type
      FROM analysis_results ar
      JOIN uploaded_documents ud ON ar.document_id = ud.id
      WHERE ar.user_id = $1
      ORDER BY ar.created_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, parseInt(limit), parseInt(offset)]);

    res.json({ analyses: result.rows });

  } catch (error) {
    console.error('Analysis history fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch analysis history' });
  }
});

export default router;