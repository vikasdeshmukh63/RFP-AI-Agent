# Client-Side Migration Guide

## 🎯 Overview

This guide shows how to migrate your React application from Base44 SDK to use your new Node.js server with Sequelize and OpenRouter.

## 📁 New Files Created

### 1. **API Client** (`src/api/client.js`)
- Complete API client for your Node.js server
- Handles authentication, documents, chat, analysis, and synopsis
- JWT token management
- Error handling

### 2. **Authentication Context** (`src/contexts/AuthContext.jsx`)
- React context for user authentication
- Login, register, logout functionality
- Profile management
- Token persistence

### 3. **Protected Route** (`src/components/ProtectedRoute.jsx`)
- Route protection component
- Redirects to login if not authenticated
- Loading states

### 4. **Login Component** (`src/components/Login.jsx`)
- Modern login/register form
- Form validation
- Error handling
- Demo account info

## 🔄 Updated Files

### 1. **App.jsx**
```jsx
// Added AuthProvider wrapper
import { AuthProvider } from "@/contexts/AuthContext"

function App() {
  return (
    <AuthProvider>
      <Pages />
      <Toaster />
    </AuthProvider>
  )
}
```

### 2. **Pages/index.jsx**
```jsx
// Added ProtectedRoute wrapper
import ProtectedRoute from "@/components/ProtectedRoute";

export default function Pages() {
    return (
        <Router>
            <ProtectedRoute>
                <PagesContent />
            </ProtectedRoute>
        </Router>
    );
}
```

### 3. **API Files Updated**
- `src/api/entities.js` - Compatibility layer for existing code
- `src/api/integrations.js` - Compatibility layer for existing code

## 🚀 Key Changes

### **Before (Base44 SDK)**
```javascript
import { InvokeLLM, UploadFile } from "@/api/integrations";
import { GeneralChatMessage, UploadedDocument } from "@/api/entities";

// Upload file
const result = await UploadFile({ file });

// Send message
await GeneralChatMessage.create({
  session_id: sessionId,
  message: userMessage,
  sender: "user"
});

// Get messages
const messages = await GeneralChatMessage.filter({ session_id: sessionId }, "created_date");
```

### **After (New API Client)**
```javascript
import { apiClient } from "@/api/client";

// Upload file
const result = await apiClient.uploadFile(file, 'chatbot');

// Send message (AI response is automatic)
const result = await apiClient.sendMessage(sessionId, userMessage, 'user');

// Get messages
const { messages } = await apiClient.getMessages(sessionId);
```

## 🔧 Environment Configuration

### **Create `.env` file:**
```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_NAME=RFP Analysis Platform
REACT_APP_VERSION=2.0.0
```

## 📊 Component Updates

### **RFPChatBot.jsx**
- ✅ Updated to use `apiClient.sendMessage()`
- ✅ Updated to use `apiClient.getMessages()`
- ✅ Updated to use `apiClient.uploadFile()`
- ✅ Updated to use `apiClient.getDocuments()`
- ✅ Automatic AI responses (no manual LLM calls)

### **RFPAnalysis.jsx**
- ✅ Updated to use `apiClient.quickRFPAnalysis()`
- ✅ Updated to use `apiClient.uploadFile()`
- ✅ Updated to use `apiClient.getDocuments()`
- ✅ Simplified analysis flow

### **Synopsis.jsx**
- ✅ Updated to use `apiClient.createSynopsis()`
- ✅ Updated to use `apiClient.analyzeRFPForSynopsis()`
- ✅ Updated to use `apiClient.uploadFile()`

## 🎯 Authentication Flow

### **1. Login Process**
```javascript
const { user, login } = useAuth();

// Login
await login(email, password);

// User is now authenticated and token is stored
```

### **2. Protected Routes**
```javascript
// All pages are now protected
<ProtectedRoute>
  <YourComponent />
</ProtectedRoute>
```

### **3. API Calls**
```javascript
// Token is automatically included in all API calls
const result = await apiClient.getDocuments();
```

## 🔄 Migration Steps

### **1. Install Dependencies**
```bash
# No new dependencies needed - using fetch API
```

### **2. Start Your Server**
```bash
cd server
npm run dev
```

### **3. Update Environment**
```bash
# Copy .env.example to .env
cp .env.example .env
```

### **4. Test Authentication**
- Visit your React app
- You'll see the login screen
- Use demo account: `admin@esds.com` / `admin123`

### **5. Test Features**
- ✅ Document upload
- ✅ Chat functionality  
- ✅ RFP analysis
- ✅ Synopsis management

## 🎉 Benefits

### **1. Better Architecture**
- Clean separation of concerns
- Proper authentication flow
- Error handling
- Loading states

### **2. Improved UX**
- Modern login interface
- Better error messages
- Loading indicators
- Responsive design

### **3. Enhanced Security**
- JWT authentication
- Protected routes
- Token management
- Secure API calls

### **4. Maintainability**
- Single API client
- Consistent error handling
- Type-safe operations
- Easy to extend

## 🔍 Testing Checklist

### **Authentication**
- [ ] Login with demo account
- [ ] Register new account
- [ ] Logout functionality
- [ ] Token persistence
- [ ] Protected route access

### **Document Management**
- [ ] Upload documents
- [ ] View document list
- [ ] Delete documents
- [ ] Document sync across modules

### **Chat Functionality**
- [ ] Send messages
- [ ] Receive AI responses
- [ ] Upload documents in chat
- [ ] Message history

### **RFP Analysis**
- [ ] Quick analysis with predefined questions
- [ ] Upload documents for analysis
- [ ] Download Excel reports
- [ ] Error handling

### **Synopsis Management**
- [ ] Create synopsis
- [ ] Edit synopsis
- [ ] RFP document analysis
- [ ] Download reports

## 🚨 Troubleshooting

### **CORS Issues**
```javascript
// Make sure your server allows your frontend origin
// In server .env:
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### **Authentication Issues**
```javascript
// Clear localStorage if having token issues
localStorage.removeItem('auth_token');
```

### **API Connection Issues**
```javascript
// Check your API URL in .env
REACT_APP_API_URL=http://localhost:3001/api
```

## 🎯 Next Steps

1. **Test all functionality** with the new API
2. **Update any remaining components** that use Base44 SDK
3. **Add error boundaries** for better error handling
4. **Implement loading states** where needed
5. **Add user feedback** for better UX

Your React application is now fully migrated to use your Node.js server with Sequelize and OpenRouter! 🎉