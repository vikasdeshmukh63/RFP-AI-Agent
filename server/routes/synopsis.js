import express from 'express';
import { Synopsis, UploadedDocument } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest, schemas } from '../middleware/validation.js';
import openRouterService from '../services/openrouter.js';
import documentService from '../services/documentParser.js';

const router = express.Router();

// Create synopsis
router.post('/', authenticateToken, validateRequest(schemas.synopsis), async (req, res) => {
  try {
    const synopsisData = {
      ...req.body,
      user_id: req.user.id
    };

    const synopsis = await Synopsis.create(synopsisData);

    res.status(201).json({
      message: 'Synopsis created successfully',
      synopsis: synopsis.toJSON()
    });

  } catch (error) {
    console.error('Synopsis creation error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors.map(e => e.message)
      });
    }
    res.status(500).json({ error: 'Failed to create synopsis' });
  }
});

// Get all synopsis for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, sort = '-created_at' } = req.query;
    
    // Parse sort parameter
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? 'DESC' : 'ASC';
    
    const validSortFields = ['created_at', 'tender_name', 'customer_name', 'submission_date'];
    const finalSortField = validSortFields.includes(sortField) ? sortField : 'created_at';

    const { count, rows: synopsis } = await Synopsis.findAndCountAll({
      where: { user_id: req.user.id },
      order: [[finalSortField, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      synopsis: synopsis.map(s => s.toJSON()),
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + synopsis.length < count
      }
    });

  } catch (error) {
    console.error('Synopsis fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch synopsis' });
  }
});

// Get single synopsis
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const synopsis = await Synopsis.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      }
    });

    if (!synopsis) {
      return res.status(404).json({ error: 'Synopsis not found' });
    }

    res.json({ synopsis: synopsis.toJSON() });

  } catch (error) {
    console.error('Synopsis fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch synopsis' });
  }
});

// Update synopsis
router.put('/:id', authenticateToken, validateRequest(schemas.synopsis), async (req, res) => {
  try {
    const synopsis = await Synopsis.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      }
    });

    if (!synopsis) {
      return res.status(404).json({ error: 'Synopsis not found' });
    }

    await synopsis.update(req.body);

    res.json({
      message: 'Synopsis updated successfully',
      synopsis: synopsis.toJSON()
    });

  } catch (error) {
    console.error('Synopsis update error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors.map(e => e.message)
      });
    }
    res.status(500).json({ error: 'Failed to update synopsis' });
  }
});

// Delete synopsis
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const synopsis = await Synopsis.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      }
    });

    if (!synopsis) {
      return res.status(404).json({ error: 'Synopsis not found' });
    }

    await synopsis.destroy();

    res.json({ message: 'Synopsis deleted successfully' });

  } catch (error) {
    console.error('Synopsis deletion error:', error);
    res.status(500).json({ error: 'Failed to delete synopsis' });
  }
});

// Analyze RFP document for synopsis
router.post('/analyze-rfp', authenticateToken, async (req, res) => {
  try {
    const { document_url, document_name } = req.body;

    if (!document_url) {
      return res.status(400).json({ error: 'document_url is required' });
    }

    // Find document in database
    const document = await UploadedDocument.findOne({
      where: { 
        file_url: document_url,
        user_id: req.user.id 
      },
      attributes: ['file_path', 'mime_type']
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const { file_path, mime_type } = document;

    // Prepare document for AI
    console.log(`📄 Analyzing RFP document for synopsis: ${document_name}`);
    const preparedDoc = await documentService.prepareDocumentForAI(file_path, mime_type);

    // Define synopsis fields to extract
    const synopsisFields = [
      'tender_name',
      'customer_name', 
      'submission_date',
      'prebid_meeting',
      'prebid_query_submission_date',
      'consultant_name',
      'consultant_email',
      'help_desk',
      'tender_fee',
      'tender_emd',
      'branches',
      'cbs_software',
      'dc',
      'dr'
    ];

    const prompt = `As an expert RFP analyzer for ESDS, extract the following 14 fields from the provided document.

**INSTRUCTIONS:**
- Return ONLY the extracted values.
- Use specified formats (YYYY-MM-DD for dates, numbers only for fees).
- If info is not found, return an empty string "".
- Return a JSON object with the exact field names provided.

**Fields to Extract:**
1. tender_name
2. customer_name
3. submission_date
4. prebid_meeting
5. prebid_query_submission_date
6. consultant_name
7. consultant_email
8. help_desk
9. tender_fee
10. tender_emd
11. branches
12. cbs_software
13. dc
14. dr`;

    const schema = {
      type: "object",
      properties: synopsisFields.reduce((acc, field) => {
        acc[field] = { type: "string" };
        return acc;
      }, {}),
      required: synopsisFields
    };

    const analysis = await openRouterService.invokeLLM({
      prompt,
      documents: [preparedDoc],
      responseJsonSchema: schema
    });

    res.json({
      message: 'RFP document analyzed successfully',
      analysis,
      document: {
        url: document_url,
        name: document_name,
        type: mime_type
      }
    });

  } catch (error) {
    console.error('RFP analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze RFP document',
      details: error.message 
    });
  }
});

// Get synopsis statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const stats = await Synopsis.getStatsByUser(req.user.id);

    const recentActivity = await Synopsis.findAll({
      where: { user_id: req.user.id },
      order: [['updated_at', 'DESC']],
      limit: 5,
      attributes: ['tender_name', 'customer_name', 'created_at', 'updated_at']
    });

    res.json({
      overview: stats,
      recent_activity: recentActivity.map(s => s.toJSON())
    });

  } catch (error) {
    console.error('Synopsis stats error:', error);
    res.status(500).json({ error: 'Failed to fetch synopsis statistics' });
  }
});

// Search synopsis
router.get('/search/:query', authenticateToken, async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 10 } = req.query;

    const results = await Synopsis.searchByUser(req.user.id, query, {
      limit: parseInt(limit)
    });

    res.json({
      query,
      results: results.map(s => s.toJSON()),
      count: results.length
    });

  } catch (error) {
    console.error('Synopsis search error:', error);
    res.status(500).json({ error: 'Failed to search synopsis' });
  }
});

export default router;