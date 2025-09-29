# Changelog

## v2.0.0 - Sequelize + Direct Document Processing

### 🎯 Major Changes

#### **Added Sequelize ORM**
- ✅ **Rich Models** with instance and class methods
- ✅ **Automatic Relationships** between entities
- ✅ **Built-in Validation** and constraints
- ✅ **Password Hashing** with hooks
- ✅ **Query Optimization** with proper indexing

#### **Simplified Document Processing**
- ✅ **Removed N8N Dependency** - No longer needed
- ✅ **Direct Base64 Processing** - Documents sent directly to Claude Sonnet 4
- ✅ **Removed Parsing Libraries** - No more pdf-parse, mammoth, xlsx dependencies
- ✅ **Streamlined Architecture** - Simpler, more reliable document handling

### 🔧 Technical Improvements

#### **Database Layer**
```javascript
// Before (Raw SQL)
const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

// After (Sequelize)
const user = await User.findByEmail(email);
```

#### **Document Processing**
```javascript
// Before (Complex Parsing)
const parsedDoc = await documentParserService.parseDocument(filePath, mimeType);
const analysis = await openRouterService.analyzeDocument(parsedDoc.text, questions);

// After (Direct Processing)
const preparedDoc = await documentService.prepareDocumentForAI(filePath, mimeType);
const analysis = await openRouterService.analyzeDocument([preparedDoc], questions);
```

### 📊 Model Features

#### **User Model**
- `user.validatePassword(password)` - Password validation
- `user.toJSON()` - Safe serialization (excludes password)
- `User.findByEmail(email)` - Find by email
- `User.hashPassword(password)` - Hash password

#### **UploadedDocument Model**
- `document.getFileSize()` - Get size in bytes/KB/MB
- `document.isImage()` - Check if image
- `document.isPDF()` - Check if PDF
- `UploadedDocument.findByUser(userId)` - Find user documents
- `UploadedDocument.getTotalSizeByUser(userId)` - Get total size

#### **Synopsis Model**
- `synopsis.hasDocument()` - Check if has RFP document
- `synopsis.isSubmissionDue(days)` - Check if submission is due
- `synopsis.getFinancialSummary()` - Get financial overview
- `Synopsis.searchByUser(userId, query)` - Search synopsis
- `Synopsis.getUpcomingDeadlines(userId)` - Get upcoming deadlines

### 🚀 Performance Improvements

- **Faster Queries** - Sequelize query optimization
- **Better Caching** - Model-level caching
- **Reduced Dependencies** - Removed 3 parsing libraries
- **Simpler Architecture** - Direct AI processing
- **Better Error Handling** - Sequelize validation errors

### 🔄 Migration Guide

#### **Dependencies Removed**
```json
{
  "removed": [
    "pdf-parse",
    "mammoth", 
    "xlsx"
  ],
  "added": [
    "sequelize",
    "pg-hstore"
  ]
}
```

#### **API Changes**
- `/api/documents/:id/parse` → `/api/documents/:id/prepare`
- Document parsing now returns preparation status instead of parsed text
- All other endpoints remain the same

#### **Environment Variables**
```env
# Removed
N8N_WEBHOOK_URL=...
N8N_API_KEY=...

# Added
MAX_DOCUMENT_SIZE_MB=25
```

### 🎯 Benefits

1. **Simpler Architecture** - No external parsing dependencies
2. **Better Performance** - Direct AI processing with base64
3. **More Reliable** - Fewer failure points
4. **Easier Maintenance** - Sequelize ORM benefits
5. **Better Scalability** - Optimized database queries
6. **Enhanced Features** - Rich model methods and relationships

### 📝 Breaking Changes

- **Document Parsing Endpoint** changed from `/parse` to `/prepare`
- **N8N Configuration** no longer needed
- **Parsing Libraries** removed from dependencies

### 🔧 Upgrade Instructions

1. **Update Dependencies**
   ```bash
   npm install
   ```

2. **Run Database Migration**
   ```bash
   npm run setup-db
   ```

3. **Update Environment**
   - Remove N8N variables
   - Add MAX_DOCUMENT_SIZE_MB if needed

4. **Test Functionality**
   - Document upload ✅
   - AI analysis ✅
   - Chat functionality ✅
   - Synopsis management ✅

### 🎉 Result

Your RFP Analysis server is now:
- **More Reliable** - Fewer dependencies and failure points
- **Better Structured** - Sequelize ORM with rich models
- **Easier to Maintain** - Clean architecture and better error handling
- **More Performant** - Optimized queries and direct AI processing

All existing functionality is preserved while the underlying architecture is significantly improved!