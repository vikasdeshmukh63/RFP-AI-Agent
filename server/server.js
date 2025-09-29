import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import database and models
import { testConnection } from './config/database.js';
import './models/index.js'; // Initialize models and associations

// Import routes
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import chatRoutes from './routes/chat.js';
import synopsisRoutes from './routes/synopsis.js';
import analysisRoutes from './routes/analysis.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://openrouter.ai"]
    }
  }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Stricter rate limiting for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 AI requests per minute
  message: {
    error: 'Too many AI requests, please wait before trying again.'
  }
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', aiLimiter, chatRoutes);
app.use('/api/synopsis', synopsisRoutes);
app.use('/api/analysis', aiLimiter, analysisRoutes);

// Serve uploaded files
app.use('/api/files', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'RFP Analysis Server',
    version: '1.0.0',
    description: 'Node.js server for RFP Analysis with OpenRouter Claude Sonnet 4 and PostgreSQL',
    endpoints: {
      auth: '/api/auth',
      documents: '/api/documents',
      chat: '/api/chat',
      synopsis: '/api/synopsis',
      analysis: '/api/analysis'
    },
    features: [
      'User authentication with JWT',
      'Document upload and parsing',
      'AI-powered chat with documents',
      'RFP quick analysis',
      'Synopsis management',
      'Document comparison',
      'OpenRouter Claude Sonnet 4 integration',
      'N8N document parsing agent support'
    ]
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large',
      details: `Maximum file size is ${Math.round((process.env.MAX_FILE_SIZE || 26214400) / 1024 / 1024)}MB`
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unexpected file field',
      details: 'Only single file uploads are allowed'
    });
  }

  // Database errors
  if (error.code === '23505') { // Unique constraint violation
    return res.status(400).json({
      error: 'Duplicate entry',
      details: 'A record with this information already exists'
    });
  }

  if (error.code === '23503') { // Foreign key constraint violation
    return res.status(400).json({
      error: 'Invalid reference',
      details: 'Referenced record does not exist'
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      details: 'Please log in again'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      details: 'Please log in again'
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Please check your configuration.');
      process.exit(1);
    }

    // Start the server
    app.listen(PORT, () => {
      console.log(`
🚀 RFP Analysis Server is running!

📍 Server: http://localhost:${PORT}
🏥 Health: http://localhost:${PORT}/health
📚 API Info: http://localhost:${PORT}/api
🌍 Environment: ${process.env.NODE_ENV || 'development'}

🔧 Features:
  ✅ User Authentication (JWT)
  ✅ Document Upload & Parsing
  ✅ AI Chat with OpenRouter Claude Sonnet 4
  ✅ RFP Quick Analysis
  ✅ Synopsis Management
  ✅ N8N Document Parsing Agent Support
  ✅ PostgreSQL Database

📝 Next Steps:
  1. Copy .env.example to .env and configure your settings
  2. Run 'npm run setup-db' to initialize the database
  3. Update your frontend to use this server
  4. Configure OpenRouter API key
  5. Set up N8N webhook for document parsing (optional)

🔗 Frontend Integration:
  Replace Base44 SDK calls with HTTP requests to this server
  Update API endpoints in your React app
      `);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();