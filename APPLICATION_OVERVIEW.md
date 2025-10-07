# RFP Analysis Platform - Complete Application Overview

## 🚀 Application Summary

**RFP Analysis Platform** is a full-stack AI-powered application designed for presales and sales teams to analyze RFP (Request for Proposal) and technical documents. The application leverages advanced AI (Claude Sonnet 4 via OpenRouter) to extract insights, answer questions, and streamline the presales workflow.

### Key Features
- **AI-Powered Document Analysis**: Upload and analyze RFP documents with 131+ predefined questions
- **Interactive Chat Bot**: Ask questions about uploaded documents with contextual AI responses
- **Synopsis Management**: Create and manage tender synopsis with AI assistance
- **Document Management**: Upload, store, and manage documents across all modules
- **User Authentication**: Secure JWT-based authentication system
- **Multi-format Support**: PDF, Word, Excel, and image file processing

---

## 🏗️ Architecture Overview

### Frontend (React + Vite)
- **Framework**: React 18 with Vite build tool
- **UI Library**: Radix UI components with Tailwind CSS
- **Routing**: React Router DOM v7
- **State Management**: React Context API for authentication
- **Styling**: Tailwind CSS with custom design system

### Backend (Node.js + Express)
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with Sequelize ORM
- **AI Integration**: OpenRouter API with Claude Sonnet 4
- **Authentication**: JWT tokens with bcrypt password hashing
- **File Processing**: Multer for uploads, Sharp for image processing

### Database Schema
- **users**: User accounts and authentication
- **uploaded_documents**: Document metadata and file references
- **chat_sessions**: Chat session management
- **general_chat_messages**: Chat messages and AI responses
- **synopsis**: Tender synopsis data
- **analysis_results**: RFP analysis results and history

---

## 📁 Project Structure

```
project-root/
├── src/                          # Frontend React application
│   ├── components/               # Reusable UI components
│   │   ├── ui/                  # Radix UI components
│   │   ├── Login.jsx            # Authentication component
│   │   └── ProtectedRoute.jsx   # Route protection
│   ├── contexts/                # React contexts
│   │   └── AuthContext.jsx      # Authentication context
│   ├── pages/                   # Application pages
│   │   ├── Dashboard.jsx        # Main dashboard
│   │   ├── RFPChatBot.jsx      # AI chat interface
│   │   ├── RFPAnalysis.jsx     # Document analysis
│   │   ├── Synopsis.jsx         # Synopsis management
│   │   └── Layout.jsx           # Page layout wrapper
│   ├── api/                     # API client utilities
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utility libraries
│   └── utils/                   # Helper functions
├── server/                       # Backend Node.js application
│   ├── config/                  # Configuration files
│   │   └── database.js          # Database connection
│   ├── models/                  # Sequelize models
│   │   ├── User.js              # User model
│   │   ├── UploadedDocument.js  # Document model
│   │   ├── ChatSession.js       # Chat session model
│   │   ├── GeneralChatMessage.js # Message model
│   │   ├── Synopsis.js          # Synopsis model
│   │   └── AnalysisResult.js    # Analysis result model
│   ├── routes/                  # API route handlers
│   │   ├── auth.js              # Authentication routes
│   │   ├── documents.js         # Document management
│   │   ├── chat.js              # Chat functionality
│   │   ├── analysis.js          # RFP analysis
│   │   └── synopsis.js          # Synopsis management
│   ├── services/                # Business logic services
│   │   ├── openrouter.js        # AI service integration
│   │   ├── documentParser.js    # Document processing
│   │   └── fileUpload.js        # File upload handling
│   ├── middleware/              # Express middleware
│   │   ├── auth.js              # JWT authentication
│   │   └── validation.js        # Request validation
│   ├── scripts/                 # Database and migration scripts
│   └── uploads/                 # File storage directory
└── public/                      # Static assets
```

---

## 🔧 Technology Stack

### Frontend Dependencies
```json
{
  "core": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^7.2.0",
    "vite": "^6.1.0"
  },
  "ui": {
    "@radix-ui/*": "Latest versions",
    "tailwindcss": "^3.4.17",
    "lucide-react": "^0.475.0",
    "framer-motion": "^12.4.7"
  },
  "utilities": {
    "axios": "For API calls",
    "date-fns": "^4.1.0",
    "react-hook-form": "^7.54.2",
    "zod": "^3.24.2",
    "react-markdown": "^10.1.0"
  }
}
```

### Backend Dependencies
```json
{
  "core": {
    "express": "^4.18.2",
    "sequelize": "^6.35.2",
    "pg": "^8.11.3"
  },
  "security": {
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "express-rate-limit": "^7.1.5"
  },
  "ai": {
    "axios": "^1.6.2"
  },
  "file-processing": {
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.0"
  },
  "utilities": {
    "dotenv": "^16.3.1",
    "uuid": "^9.0.1",
    "joi": "^17.11.0",
    "compression": "^1.7.4",
    "morgan": "^1.10.0"
  }
}
```

---

## 🎯 Core Features Deep Dive

### 1. Dashboard
- **Purpose**: Central hub for accessing all application features
- **Features**: 
  - Quick access to Chat Bot, Analysis, and Synopsis
  - Feature overview cards
  - Navigation to all modules
- **File**: `src/pages/Dashboard.jsx`

### 2. RFP Chat Bot
- **Purpose**: Interactive AI assistant for document analysis
- **Features**:
  - Session-based document upload
  - Real-time AI chat with document context
  - Markdown support for AI responses
  - File attachment support (PDF, Word, Excel, Images)
  - Session management (new chat, clear chat)
- **File**: `src/pages/RFPChatBot.jsx`
- **AI Model**: Claude Sonnet 4 via OpenRouter

### 3. RFP Quick Analysis
- **Purpose**: Structured analysis with 131 predefined questions
- **Features**:
  - Document upload and selection from shared documents
  - Automated analysis with predefined questions
  - Excel export of results
  - Progress tracking and error handling
- **File**: `src/pages/RFPAnalysis.jsx`
- **Questions**: 131 comprehensive RFP analysis questions

### 4. Synopsis Management
- **Purpose**: Create and manage tender synopsis
- **Features**:
  - Form-based synopsis creation
  - AI-powered RFP analysis for auto-filling
  - Document association
  - PDF and Word export
  - CRUD operations for synopsis
- **File**: `src/pages/Synopsis.jsx`

### 5. Document Management
- **Purpose**: Centralized document storage and management
- **Features**:
  - Multi-format file upload (up to 25MB)
  - Document sharing across modules
  - Metadata tracking (upload source, dates)
  - Document deletion with confirmation
- **Integration**: All modules share the same document pool

---

## 🔐 Authentication & Security

### Authentication Flow
1. **Login**: JWT token generation with user credentials
2. **Token Storage**: Secure token storage in localStorage
3. **Route Protection**: ProtectedRoute component guards all pages
4. **API Security**: JWT middleware validates all API requests

### Security Features
- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: 7-day expiration with secure secrets
- **Rate Limiting**: 1000 requests/15min, 100 AI requests/min
- **CORS Protection**: Configured allowed origins
- **Helmet Security**: Security headers and CSP
- **Input Validation**: Joi schema validation
- **File Type Validation**: Restricted file types and sizes

---

## 🤖 AI Integration

### OpenRouter Configuration
- **Provider**: OpenRouter (https://openrouter.ai)
- **Model**: Claude Sonnet 4 (anthropic/claude-3.5-sonnet)
- **Features**:
  - Document analysis with base64 encoding
  - Contextual chat responses
  - Structured data extraction
  - Multi-format document processing

### AI Capabilities
1. **Document Analysis**: Extract answers to 131 predefined questions
2. **Interactive Chat**: Contextual Q&A about uploaded documents
3. **Synopsis Generation**: Auto-fill synopsis forms from RFP analysis
4. **Multi-format Support**: PDF, Word, Excel, and image processing

---

## 📊 Database Design

### Core Tables
```sql
-- Users table
users (
  id, username, email, password_hash, 
  created_at, updated_at
)

-- Document storage
uploaded_documents (
  id, name, file_url, size, uploaded_from,
  user_id, created_at, updated_at
)

-- Chat system
chat_sessions (
  id, session_id, session_name, user_id,
  created_at, updated_at
)

general_chat_messages (
  id, session_id, message, sender, file_url,
  file_name, user_id, created_at
)

-- Synopsis management
synopsis (
  id, tender_name, customer_name, submission_date,
  consultant_name, tender_fee, tender_emd,
  rfp_document_url, user_id, created_at
)

-- Analysis results
analysis_results (
  id, document_id, analysis_data, user_id,
  created_at, updated_at
)
```

---

## 🚀 Deployment & Hosting Requirements

### Infrastructure Requirements

#### Frontend Hosting
- **Platform Options**: Vercel, Netlify, AWS S3 + CloudFront
- **Build Command**: `npm run build`
- **Output Directory**: `dist/`
- **Environment Variables**: `VITE_API_URL`

#### Backend Hosting
- **Platform Options**: AWS EC2, DigitalOcean, Heroku, Railway
- **Requirements**:
  - Node.js 18+
  - PostgreSQL 12+
  - File storage (local or S3)
  - SSL certificate for HTTPS

#### Database
- **PostgreSQL Requirements**:
  - Version: 12+
  - Storage: 10GB+ (depending on document volume)
  - Backup strategy recommended
  - Connection pooling for production

#### File Storage
- **Local Storage**: `server/uploads/` directory
- **Cloud Storage**: AWS S3, Google Cloud Storage (configurable)
- **Requirements**: 
  - 25MB max file size
  - Support for PDF, Word, Excel, Images

### Environment Configuration

#### Frontend (.env)
```bash
VITE_API_URL=https://your-api-domain.com/api
VITE_APP_NAME=RFP Analysis Platform
VITE_APP_VERSION=2.0.0
```

#### Backend (.env)
```bash
# Server
PORT=3001
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
# OR individual settings:
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=rfp_analysis
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# AI Service
OPENROUTER_API_KEY=your-openrouter-api-key

# Security
JWT_SECRET=your-secure-jwt-secret-key
JWT_EXPIRES_IN=7d

# File Upload
MAX_DOCUMENT_SIZE_MB=25
UPLOAD_DIR=uploads

# CORS
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

### Deployment Steps

#### 1. Database Setup
```bash
# Create PostgreSQL database
createdb rfp_analysis

# Run database setup script
cd server
npm run setup-db
```

#### 2. Backend Deployment
```bash
# Install dependencies
cd server
npm install --production

# Start with PM2 (recommended)
pm2 start server.js --name "rfp-analysis-api"

# Or with node
npm start
```

#### 3. Frontend Deployment
```bash
# Build for production
npm run build

# Deploy dist/ folder to your hosting platform
```

#### 4. Reverse Proxy (Nginx)
```nginx
server {
    listen 80;
    server_name your-api-domain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- OpenRouter API account

### Quick Start
```bash
# 1. Clone and install frontend
npm install
cp .env.example .env
# Edit .env with your API URL

# 2. Setup backend
cd server
npm install
cp .env.example .env
# Edit .env with your database and API keys

# 3. Initialize database
npm run setup-db

# 4. Start development servers
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
npm run dev
```

### Development URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

---

## 📈 Performance & Scalability

### Current Capabilities
- **Concurrent Users**: 100+ (with proper hosting)
- **File Processing**: Up to 25MB documents
- **AI Requests**: Rate limited to 100/minute
- **Database**: Optimized queries with indexes

### Scaling Considerations
1. **Database**: Connection pooling, read replicas
2. **File Storage**: Move to cloud storage (S3)
3. **AI Requests**: Implement queuing system
4. **Caching**: Redis for session management
5. **Load Balancing**: Multiple backend instances

---

## 🛠️ Maintenance & Monitoring

### Health Monitoring
- **Endpoint**: `/health` - Database and service status
- **Logging**: Morgan for HTTP requests, custom error logging
- **Error Handling**: Comprehensive error responses

### Backup Strategy
- **Database**: Daily automated backups
- **Files**: Regular backup of uploads directory
- **Code**: Git repository with proper branching

### Updates & Maintenance
- **Dependencies**: Regular security updates
- **AI Model**: Monitor OpenRouter for model updates
- **Database**: Migration scripts for schema changes

---

## 🎓 Key Technical Decisions

### Why This Stack?
1. **React + Vite**: Fast development and build times
2. **Radix UI**: Accessible, customizable components
3. **PostgreSQL**: Robust relational database for complex queries
4. **OpenRouter**: Flexible AI provider with multiple models
5. **JWT**: Stateless authentication for scalability

### Architecture Benefits
- **Separation of Concerns**: Clear frontend/backend separation
- **Scalability**: Stateless design allows horizontal scaling
- **Security**: Multiple layers of protection
- **Maintainability**: Well-organized code structure
- **Flexibility**: Easy to add new features or change AI providers

---

## 📞 Support & Documentation

### API Documentation
- **Base URL**: `/api`
- **Authentication**: Bearer token in Authorization header
- **Rate Limits**: Documented in server responses
- **Error Codes**: Standardized HTTP status codes

### Common Issues & Solutions
1. **File Upload Fails**: Check file size (25MB limit) and type
2. **AI Analysis Timeout**: Try smaller documents or retry
3. **Database Connection**: Verify PostgreSQL is running
4. **CORS Errors**: Check ALLOWED_ORIGINS configuration

### Development Resources
- **Frontend**: React, Vite, Tailwind CSS documentation
- **Backend**: Express.js, Sequelize, PostgreSQL guides
- **AI**: OpenRouter API documentation
- **Deployment**: Platform-specific deployment guides

---

## 🔮 Future Enhancements

### Planned Features
1. **Multi-language Support**: UI internationalization
2. **Advanced Analytics**: Usage statistics and insights
3. **Team Collaboration**: Multi-user synopsis editing
4. **API Integrations**: CRM and project management tools
5. **Mobile App**: React Native companion app

### Technical Improvements
1. **Microservices**: Split into smaller services
2. **Real-time Updates**: WebSocket integration
3. **Advanced Caching**: Redis implementation
4. **CI/CD Pipeline**: Automated testing and deployment
5. **Monitoring**: Application performance monitoring

---

*This documentation provides a comprehensive overview of your RFP Analysis Platform. Keep it updated as you add new features or make architectural changes.*