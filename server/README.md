# RFP Analysis Server

A Node.js server built with Express and PostgreSQL that replicates the functionality of your Base44 RFP analysis application. This server uses OpenRouter with Claude Sonnet 4 for AI processing and supports N8N agents for document parsing.

## Features

- 🔐 **User Authentication** - JWT-based authentication system
- 📄 **Document Management** - Upload, parse, and manage RFP documents
- 🤖 **AI-Powered Chat** - Interactive chat with document analysis using Claude Sonnet 4
- 📊 **RFP Quick Analysis** - Automated analysis with 47 predefined questions
- 📋 **Synopsis Management** - Create and manage tender synopsis with AI assistance
- 🔍 **Document Comparison** - Compare multiple RFP documents side by side
- 📄 **Direct Document Processing** - Base64 document processing with Claude Sonnet 4
- 📈 **Analytics & Statistics** - Track usage and analysis history

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **AI**: OpenRouter API with Claude Sonnet 4
- **File Processing**: Multer, Sharp, PDF-Parse, Mammoth, XLSX
- **Authentication**: JWT, bcryptjs
- **Security**: Helmet, CORS, Rate Limiting

## Quick Start

### 1. Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- OpenRouter API account

### 2. Installation

```bash
# Clone and navigate to server directory
cd server

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
```

### 3. Configuration

Edit `.env` file with your settings:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rfp_analysis
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# OpenRouter API
OPENROUTER_API_KEY=your_openrouter_api_key

# Document Processing
MAX_DOCUMENT_SIZE_MB=25

# JWT Secret
JWT_SECRET=your_secure_jwt_secret
```

### 4. Database Setup

```bash
# Initialize database tables
npm run setup-db
```

### 5. Start Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server will be available at `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Documents
- `POST /api/documents/upload` - Upload document
- `GET /api/documents` - List user documents
- `GET /api/documents/:id` - Get single document
- `DELETE /api/documents/:id` - Delete document
- `POST /api/documents/:id/parse` - Parse document content

### Chat
- `POST /api/chat/sessions` - Create chat session
- `GET /api/chat/sessions` - List chat sessions
- `POST /api/chat/messages` - Send message
- `GET /api/chat/messages/:sessionId` - Get session messages
- `POST /api/chat/analyze-document` - Analyze document with AI

### Analysis
- `POST /api/analysis/rfp-quick-analysis` - Quick RFP analysis (47 questions)
- `POST /api/analysis/custom-analysis` - Custom analysis with user questions
- `GET /api/analysis/predefined-questions` - Get predefined questions
- `GET /api/analysis/results` - List analysis results
- `POST /api/analysis/compare-documents` - Compare multiple documents

### Synopsis
- `POST /api/synopsis` - Create synopsis
- `GET /api/synopsis` - List synopsis
- `GET /api/synopsis/:id` - Get single synopsis
- `PUT /api/synopsis/:id` - Update synopsis
- `DELETE /api/synopsis/:id` - Delete synopsis
- `POST /api/synopsis/analyze-rfp` - Analyze RFP for synopsis

## Frontend Integration

Replace your Base44 SDK calls with HTTP requests to this server:

### Before (Base44 SDK):
```javascript
import { InvokeLLM, UploadFile } from "@/api/integrations";
import { GeneralChatMessage, UploadedDocument } from "@/api/entities";

// Upload file
const result = await UploadFile({ file });

// Send chat message
await GeneralChatMessage.create(messageData);

// Invoke LLM
const response = await InvokeLLM({ prompt, file_urls });
```

### After (HTTP API):
```javascript
// Upload file
const formData = new FormData();
formData.append('file', file);
const result = await fetch('/api/documents/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

// Send chat message
await fetch('/api/chat/messages', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` 
  },
  body: JSON.stringify(messageData)
});

// Quick RFP Analysis
const response = await fetch('/api/analysis/rfp-quick-analysis', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` 
  },
  body: JSON.stringify({ document_id })
});
```

## Document Processing

The server processes documents directly with Claude Sonnet 4 using base64 encoding:

### Supported File Types
- PDF documents
- Word documents (.doc, .docx)
- Excel spreadsheets (.xls, .xlsx)
- Images (JPEG, PNG, GIF, WebP)
- Text files (.txt, .csv)

### Processing Method
Documents are converted to base64 and sent directly to Claude Sonnet 4 for analysis, eliminating the need for separate parsing libraries or external services.

## OpenRouter Configuration

1. Sign up at [OpenRouter](https://openrouter.ai)
2. Get your API key
3. Add to `.env`:
```env
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
```

The server uses Claude Sonnet 4 by default. You can modify the model in `services/openrouter.js`.

## Database Schema

The server creates these tables:
- `users` - User accounts
- `uploaded_documents` - Document metadata
- `chat_sessions` - Chat session management
- `general_chat_messages` - Chat messages
- `synopsis` - Tender synopsis data
- `analysis_results` - Analysis results and history

## Security Features

- JWT authentication
- Rate limiting (1000 requests/15min, 10 AI requests/min)
- CORS protection
- Helmet security headers
- File type validation
- File size limits (25MB default)
- SQL injection protection (parameterized queries)

## Development

```bash
# Install dependencies
npm install

# Start in development mode with auto-reload
npm run dev

# Run database setup
npm run setup-db

# Check logs
tail -f logs/server.log
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Set up reverse proxy (nginx)
4. Configure SSL certificates
5. Set up database backups
6. Monitor logs and performance

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists
- Run `npm run setup-db`

### OpenRouter API Issues
- Verify API key is correct
- Check rate limits
- Monitor API usage
- Review error logs

### File Upload Issues
- Check file size limits
- Verify upload directory permissions
- Review supported file types
- Check disk space

## Support

For issues and questions:
1. Check the logs for error details
2. Verify configuration settings
3. Test with smaller files first
4. Review API documentation

## License

MIT License - see LICENSE file for details.