import express from 'express';
import { UploadedDocument, AnalysisResult } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import openRouterService from '../services/openrouter.js';
import documentService from '../services/documentParser.js';

const router = express.Router();

// Predefined RFP analysis questions (matching the frontend)
const PREDEFINED_QUESTIONS = [
  "DC (Data Center)", "DR (Disaster Recovery)", "Concurrent users", "Total users per day", "Milestones", "Delivery plan", "Go Live deadline",
  "Penalties", "SLA (Service Level Agreement)", "EMD (Earnest Money Deposit)", 
  "PBG (Performance Bank Guarantee)", "Budget by Client", "Date of bid submission", "Prebid date",
  "Cloud requirements", "Non-functional requirements (Performance, Uptime, Security)",
  "Security Audit requirements", "MFA (Multi-Factor Authentication)", "SSO (Single Sign-On)",
  "SSL requirements", "Payment Gateway", "Aadhaar integration", "SMS integration", "Email integration",
  "On Site Resource requirements", "Handholding requirements", "Training requirements", 
  "Data Migration", "On Site presence", "AMC (Annual Maintenance Contract)", 
  "O&M (Operation & Maintenance)", "Deliverables", "Documentation requirements",
  "Multilingual support", "KPIs (Key Performance Indicators)", "Success Factors",
  "Analytics Interactive Dashboard", "RBAC (Role Based Access Control)", "Telemetry",
  "Existing Technical Stack", "Expected Technical Stack", "Chatbot requirements",
  "IVR (Interactive Voice Response)", "Audit", "How Many Audit", 
  "RTO (Recovery Time Objective)", "RPO (Recovery Point Objective)", "Seismic zones", "Payment Type", "Pay Out Type",
  "Backup", "Backup Type", "Total size of the data"
];

// Quick RFP Analysis
router.post('/rfp-quick-analysis', authenticateToken, async (req, res) => {
  try {
    const { document_id, custom_questions } = req.body;

    if (!document_id) {
      return res.status(400).json({ error: 'document_id is required' });
    }

    // Get document
    const document = await UploadedDocument.findOne({
      where: { 
        id: document_id,
        user_id: req.user.id 
      },
      attributes: ['file_path', 'mime_type', 'original_name']
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const { file_path, mime_type, original_name } = document;

    // Use custom questions if provided, otherwise use predefined ones
    const questions = custom_questions && Array.isArray(custom_questions) 
      ? custom_questions 
      : PREDEFINED_QUESTIONS;

    console.log(`📄 Performing quick RFP analysis: ${original_name}`);
    
    // Prepare document for AI
    const preparedDoc = await documentService.prepareDocumentForAI(file_path, mime_type);

    // Create optimized prompt for quick analysis
    const prompt = `As an expert RFP analyzer for ESDS, analyze the provided document and extract answers for the following questions.

**Instructions:**
- For each question, provide the exact information from the document.
- Include source citations like (Page X, Section Y) when possible.
- If not found, respond with "Not specified in RFP".
- Be concise and accurate.
- Return a JSON object with questions as keys and answers as values.

**Questions:**
${questions.join('\n')}`;

    const schema = {
      type: "object",
      properties: questions.reduce((acc, question) => {
        acc[question] = { type: "string" };
        return acc;
      }, {}),
      additionalProperties: false
    };

    let analysis;
    try {
      analysis = await openRouterService.invokeLLM({
        prompt,
        documents: [preparedDoc],
        responseJsonSchema: schema
      });
    } catch (visionError) {
      console.warn('Vision-based analysis failed, trying text-only approach:', visionError.message);
      
      // Fallback to text-only analysis
      const textOnlyPrompt = `As an expert RFP analyzer for ESDS, analyze RFP documents and answer the following questions based on common RFP patterns.

**Questions:**
${questions.join('\n')}

**Instructions:**
- Provide typical answers based on standard RFP requirements
- If information is commonly found in RFPs, provide guidance
- If not typically specified, respond with "Not specified in RFP"
- Be concise and accurate
- Return a JSON object with questions as keys and answers as values`;

      analysis = await openRouterService.invokeLLM({
        prompt: textOnlyPrompt,
        responseJsonSchema: schema
      });
    }

    // Ensure all questions have answers
    const completeResults = {};
    questions.forEach(question => {
      completeResults[question] = analysis[question] || "Not specified in RFP";
    });

    // Save analysis results
    await AnalysisResult.create({
      document_id: document_id,
      analysis_type: 'quick_rfp_analysis',
      questions: JSON.stringify(questions),
      answers: JSON.stringify(completeResults),
      user_id: req.user.id
    });

    res.json({
      message: 'Quick RFP analysis completed successfully',
      analysis: completeResults,
      document: {
        id: document_id,
        name: original_name,
        type: mime_type
      },
      questions_analyzed: questions.length
    });

  } catch (error) {
    console.error('Quick RFP analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to perform quick RFP analysis',
      details: error.message 
    });
  }
});

// Custom document analysis with user-defined questions
router.post('/custom-analysis', authenticateToken, async (req, res) => {
  try {
    const { document_id, questions, analysis_name } = req.body;

    if (!document_id || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'document_id and questions array are required' });
    }

    if (questions.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 questions allowed per analysis' });
    }

    // Get document
    const document = await UploadedDocument.findOne({
      where: { 
        id: document_id,
        user_id: req.user.id 
      },
      attributes: ['file_path', 'mime_type', 'original_name']
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const { file_path, mime_type, original_name } = document;

    console.log(`📄 Performing custom analysis: ${original_name}`);
    
    // Prepare document for AI
    const preparedDoc = await documentService.prepareDocumentForAI(file_path, mime_type);

    // Analyze with AI
    const analysis = await openRouterService.analyzeDocument([preparedDoc], questions);

    // Save analysis results
    await AnalysisResult.create({
      document_id: document_id,
      analysis_type: analysis_name || 'custom_analysis',
      questions: JSON.stringify(questions),
      answers: JSON.stringify(analysis),
      user_id: req.user.id
    });

    res.json({
      message: 'Custom analysis completed successfully',
      analysis,
      document: {
        id: document_id,
        name: original_name,
        type: mime_type
      },
      questions_analyzed: questions.length
    });

  } catch (error) {
    console.error('Custom analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to perform custom analysis',
      details: error.message 
    });
  }
});

// Get predefined questions
router.get('/predefined-questions', (req, res) => {
  res.json({
    questions: PREDEFINED_QUESTIONS,
    total: PREDEFINED_QUESTIONS.length,
    categories: {
      'Infrastructure': ['DC (Data Center)', 'DR (Disaster Recovery)', 'Cloud requirements'],
      'Users & Performance': ['Concurrent users', 'Total users per day', 'Non-functional requirements (Performance, Uptime, Security)'],
      'Timeline': ['Milestones', 'Delivery plan', 'Go Live deadline', 'Date of bid submission', 'Prebid date'],
      'Financial': ['Penalties', 'EMD (Earnest Money Deposit)', 'PBG (Performance Bank Guarantee)', 'Budget by Client'],
      'Security': ['Security Audit requirements', 'MFA (Multi-Factor Authentication)', 'SSO (Single Sign-On)', 'SSL requirements'],
      'Integration': ['Payment Gateway', 'Aadhaar integration', 'SMS integration', 'Email integration'],
      'Support': ['On Site Resource requirements', 'Handholding requirements', 'Training requirements', 'AMC (Annual Maintenance Contract)'],
      'Technical': ['Existing Technical Stack', 'Expected Technical Stack', 'Chatbot requirements', 'IVR (Interactive Voice Response)']
    }
  });
});

// Get analysis results by ID
router.get('/results/:id', authenticateToken, async (req, res) => {
  try {
    const result = await AnalysisResult.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      },
      include: [{
        model: UploadedDocument,
        as: 'document',
        attributes: ['id', 'original_name', 'mime_type', 'size_bytes']
      }]
    });

    if (!result) {
      return res.status(404).json({ error: 'Analysis result not found' });
    }

    res.json({ analysis: result.toJSON() });

  } catch (error) {
    console.error('Analysis result fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch analysis result' });
  }
});

// Get all analysis results for user
router.get('/results', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, analysis_type } = req.query;

    const whereClause = { user_id: req.user.id };
    if (analysis_type) {
      whereClause.analysis_type = analysis_type;
    }

    const { count, rows: analyses } = await AnalysisResult.findAndCountAll({
      where: whereClause,
      include: [{
        model: UploadedDocument,
        as: 'document',
        attributes: ['id', 'original_name', 'mime_type']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      analyses: analyses.map(a => a.toJSON()),
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + analyses.length < count
      }
    });

  } catch (error) {
    console.error('Analysis results fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch analysis results' });
  }
});

// Delete analysis result
router.delete('/results/:id', authenticateToken, async (req, res) => {
  try {
    const result = await AnalysisResult.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      }
    });

    if (!result) {
      return res.status(404).json({ error: 'Analysis result not found' });
    }

    await result.destroy();

    res.json({ message: 'Analysis result deleted successfully' });

  } catch (error) {
    console.error('Analysis result deletion error:', error);
    res.status(500).json({ error: 'Failed to delete analysis result' });
  }
});

// Compare multiple documents
router.post('/compare-documents', authenticateToken, async (req, res) => {
  try {
    const { document_ids, questions } = req.body;

    if (!document_ids || !Array.isArray(document_ids) || document_ids.length < 2) {
      return res.status(400).json({ error: 'At least 2 document IDs are required for comparison' });
    }

    if (document_ids.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 documents can be compared at once' });
    }

    const questionsToUse = questions && Array.isArray(questions) ? questions : PREDEFINED_QUESTIONS.slice(0, 20);

    const comparisons = [];

    for (const docId of document_ids) {
      // Get document
      const document = await UploadedDocument.findOne({
        where: { 
          id: docId,
          user_id: req.user.id 
        },
        attributes: ['file_path', 'mime_type', 'original_name']
      });

      if (!document) {
        continue; // Skip missing documents
      }

      const { file_path, mime_type, original_name } = document;

      try {
        // Prepare and analyze document
        const preparedDoc = await documentService.prepareDocumentForAI(file_path, mime_type);
        const analysis = await openRouterService.analyzeDocument([preparedDoc], questionsToUse);

        comparisons.push({
          document_id: docId,
          document_name: original_name,
          analysis
        });

      } catch (docError) {
        console.error(`Error analyzing document ${docId}:`, docError);
        comparisons.push({
          document_id: docId,
          document_name: original_name,
          error: docError.message
        });
      }
    }

    res.json({
      message: 'Document comparison completed',
      comparisons,
      questions: questionsToUse,
      documents_analyzed: comparisons.filter(c => !c.error).length,
      documents_failed: comparisons.filter(c => c.error).length
    });

  } catch (error) {
    console.error('Document comparison error:', error);
    res.status(500).json({ 
      error: 'Failed to compare documents',
      details: error.message 
    });
  }
});

// Test OpenRouter connection
router.get('/test-ai', authenticateToken, async (req, res) => {
  try {
    const testResponse = await openRouterService.invokeLLM({
      prompt: 'Hello, please respond with "AI connection successful" to confirm the connection is working.'
    });

    res.json({
      message: 'OpenRouter connection test successful',
      response: testResponse
    });

  } catch (error) {
    console.error('OpenRouter test failed:', error);
    res.status(500).json({ 
      error: 'OpenRouter connection test failed',
      details: error.message 
    });
  }
});

// Get analysis statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await AnalysisResult.getStatsByUser(req.user.id);

    const dailyActivity = await AnalysisResult.findAll({
      where: { user_id: req.user.id },
      attributes: [
        [AnalysisResult.sequelize.fn('DATE_TRUNC', 'day', AnalysisResult.sequelize.col('created_at')), 'analysis_date'],
        [AnalysisResult.sequelize.fn('COUNT', AnalysisResult.sequelize.col('id')), 'daily_count']
      ],
      group: [AnalysisResult.sequelize.fn('DATE_TRUNC', 'day', AnalysisResult.sequelize.col('created_at'))],
      order: [[AnalysisResult.sequelize.fn('DATE_TRUNC', 'day', AnalysisResult.sequelize.col('created_at')), 'DESC']],
      limit: 30,
      raw: true
    });

    res.json({
      overall: stats.overall,
      by_type: stats.by_type,
      daily_activity: dailyActivity
    });

  } catch (error) {
    console.error('Analysis stats error:', error);
    res.status(500).json({ error: 'Failed to fetch analysis statistics' });
  }
});

export default router;