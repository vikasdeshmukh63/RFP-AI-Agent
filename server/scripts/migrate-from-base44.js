#!/usr/bin/env node

/**
 * Migration script to help transition from Base44 SDK to this Node.js server
 * This script provides guidance and examples for updating your frontend code
 */

import fs from 'fs/promises';
import path from 'path';

const MIGRATION_GUIDE = `
# Migration Guide: Base44 SDK → Node.js Server

## Overview
This guide helps you migrate your React application from Base44 SDK to use this Node.js server.

## Step 1: Update API Client

### Create a new API client (src/api/client.js):
\`\`\`javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  async request(endpoint, options = {}) {
    const url = \`\${API_BASE_URL}\${endpoint}\`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (this.token) {
      config.headers.Authorization = \`Bearer \${this.token}\`;
    }

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth methods
  async login(email, password) {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(result.token);
    return result;
  }

  async register(email, password, name) {
    const result = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    this.setToken(result.token);
    return result;
  }

  // Document methods
  async uploadFile(file, uploadedFrom = 'unknown') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploaded_from', uploadedFrom);

    return this.request('/documents/upload', {
      method: 'POST',
      headers: {}, // Remove Content-Type to let browser set it for FormData
      body: formData,
    });
  }

  async getDocuments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(\`/documents?\${query}\`);
  }

  async deleteDocument(id) {
    return this.request(\`/documents/\${id}\`, { method: 'DELETE' });
  }

  // Chat methods
  async sendMessage(sessionId, message, sender = 'user', fileUrl = null, fileName = null) {
    return this.request('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        message,
        sender,
        file_url: fileUrl,
        file_name: fileName,
      }),
    });
  }

  async getMessages(sessionId) {
    return this.request(\`/chat/messages/\${sessionId}\`);
  }

  // Analysis methods
  async quickRFPAnalysis(documentId) {
    return this.request('/analysis/rfp-quick-analysis', {
      method: 'POST',
      body: JSON.stringify({ document_id: documentId }),
    });
  }

  // Synopsis methods
  async createSynopsis(data) {
    return this.request('/synopsis', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSynopsis(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(\`/synopsis?\${query}\`);
  }

  async updateSynopsis(id, data) {
    return this.request(\`/synopsis/\${id}\`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async analyzeRFPForSynopsis(documentUrl, documentName) {
    return this.request('/synopsis/analyze-rfp', {
      method: 'POST',
      body: JSON.stringify({
        document_url: documentUrl,
        document_name: documentName,
      }),
    });
  }
}

export const apiClient = new ApiClient();
\`\`\`

## Step 2: Update Entity Imports

### Before (Base44):
\`\`\`javascript
import { GeneralChatMessage, UploadedDocument, Synopsis } from "@/api/entities";
import { InvokeLLM, UploadFile } from "@/api/integrations";
\`\`\`

### After (New API):
\`\`\`javascript
import { apiClient } from "@/api/client";
\`\`\`

## Step 3: Update Component Code

### Chat Component Updates:

#### Before:
\`\`\`javascript
// Upload file
const uploadResult = await UploadFile({ file });

// Send message
await GeneralChatMessage.create({
  session_id: sessionId,
  message: userMessage,
  sender: "user"
});

// Get messages
const messages = await GeneralChatMessage.filter({ session_id: sessionId }, "created_date");
\`\`\`

#### After:
\`\`\`javascript
// Upload file
const uploadResult = await apiClient.uploadFile(file, 'chatbot');

// Send message (AI response is automatic)
const result = await apiClient.sendMessage(sessionId, userMessage, 'user');

// Get messages
const { messages } = await apiClient.getMessages(sessionId);
\`\`\`

### RFP Analysis Updates:

#### Before:
\`\`\`javascript
const response = await InvokeLLM({
  prompt: prompt,
  file_urls: [uploadedDocument.url],
  response_json_schema: schema
});
\`\`\`

#### After:
\`\`\`javascript
const { analysis } = await apiClient.quickRFPAnalysis(uploadedDocument.id);
\`\`\`

### Synopsis Updates:

#### Before:
\`\`\`javascript
const createdDoc = await UploadedDocument.create(documentData);
const synopsis = await Synopsis.create(synopsisData);
\`\`\`

#### After:
\`\`\`javascript
const { document } = await apiClient.uploadFile(file, 'synopsis');
const { synopsis } = await apiClient.createSynopsis(synopsisData);
\`\`\`

## Step 4: Update Authentication

### Create Auth Context (src/contexts/AuthContext.js):
\`\`\`javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      apiClient.setToken(token);
      // Optionally verify token with server
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const { user } = await apiClient.request('/auth/profile');
      setUser(user);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const result = await apiClient.login(email, password);
    setUser(result.user);
    return result;
  };

  const register = async (email, password, name) => {
    const result = await apiClient.register(email, password, name);
    setUser(result.user);
    return result;
  };

  const logout = () => {
    apiClient.setToken(null);
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
\`\`\`

## Step 5: Environment Variables

### Add to your .env file:
\`\`\`
REACT_APP_API_URL=http://localhost:3001/api
\`\`\`

## Step 6: Update App.js

\`\`\`javascript
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Pages />
      <Toaster />
    </AuthProvider>
  );
}
\`\`\`

## Step 7: Add Login Component

### Create Login.jsx:
\`\`\`javascript
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isLogin ? 'Login' : 'Register'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
\`\`\`

## Step 8: Update Route Protection

### Create ProtectedRoute.jsx:
\`\`\`javascript
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return children;
}
\`\`\`

### Update Pages/index.jsx:
\`\`\`javascript
import ProtectedRoute from './ProtectedRoute';

export default function Pages() {
  return (
    <Router>
      <ProtectedRoute>
        <PagesContent />
      </ProtectedRoute>
    </Router>
  );
}
\`\`\`

## Step 9: Testing

1. Start your Node.js server: \`npm run dev\`
2. Update your React app with the new API client
3. Test each feature:
   - User registration/login
   - Document upload
   - Chat functionality
   - RFP analysis
   - Synopsis management

## Step 10: Production Deployment

1. Deploy your Node.js server
2. Update \`REACT_APP_API_URL\` to your production server URL
3. Configure CORS in your server for your production domain
4. Set up SSL certificates
5. Configure environment variables for production

## Common Issues & Solutions

### CORS Errors
- Update \`ALLOWED_ORIGINS\` in server .env
- Ensure credentials are included in requests

### Authentication Issues
- Check JWT token storage
- Verify token expiration handling
- Test login/logout flow

### File Upload Issues
- Check file size limits
- Verify supported file types
- Test with different file formats

### API Response Differences
- Update response handling for new API structure
- Check error message formats
- Verify data field names

## Need Help?

1. Check server logs for errors
2. Use browser dev tools to inspect network requests
3. Test API endpoints with Postman/curl
4. Review the server README.md for detailed API documentation
`;

async function createMigrationFiles() {
  try {
    // Create migration guide
    await fs.writeFile('MIGRATION_GUIDE.md', MIGRATION_GUIDE);
    
    // Create example API client
    const apiClientExample = `
// Example API client for your React app
// Copy this to src/api/client.js in your React project

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  async request(endpoint, options = {}) {
    const url = \`\${API_BASE_URL}\${endpoint}\`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (this.token) {
      config.headers.Authorization = \`Bearer \${this.token}\`;
    }

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth methods
  async login(email, password) {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(result.token);
    return result;
  }

  async register(email, password, name) {
    const result = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    this.setToken(result.token);
    return result;
  }

  // Document methods
  async uploadFile(file, uploadedFrom = 'unknown') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploaded_from', uploadedFrom);

    return this.request('/documents/upload', {
      method: 'POST',
      headers: {}, // Remove Content-Type for FormData
      body: formData,
    });
  }

  async getDocuments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(\`/documents?\${query}\`);
  }

  async deleteDocument(id) {
    return this.request(\`/documents/\${id}\`, { method: 'DELETE' });
  }

  // Chat methods
  async sendMessage(sessionId, message, sender = 'user', fileUrl = null, fileName = null) {
    return this.request('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        message,
        sender,
        file_url: fileUrl,
        file_name: fileName,
      }),
    });
  }

  async getMessages(sessionId) {
    return this.request(\`/chat/messages/\${sessionId}\`);
  }

  // Analysis methods
  async quickRFPAnalysis(documentId) {
    return this.request('/analysis/rfp-quick-analysis', {
      method: 'POST',
      body: JSON.stringify({ document_id: documentId }),
    });
  }

  // Synopsis methods
  async createSynopsis(data) {
    return this.request('/synopsis', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSynopsis(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(\`/synopsis?\${query}\`);
  }

  async updateSynopsis(id, data) {
    return this.request(\`/synopsis/\${id}\`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async analyzeRFPForSynopsis(documentUrl, documentName) {
    return this.request('/synopsis/analyze-rfp', {
      method: 'POST',
      body: JSON.stringify({
        document_url: documentUrl,
        document_name: documentName,
      }),
    });
  }
}

export const apiClient = new ApiClient();
`;

    await fs.writeFile('examples/api-client.js', apiClientExample);
    
    console.log('✅ Migration files created successfully!');
    console.log('📁 Files created:');
    console.log('  - MIGRATION_GUIDE.md');
    console.log('  - examples/api-client.js');
    console.log('');
    console.log('📖 Next steps:');
    console.log('  1. Read MIGRATION_GUIDE.md for detailed instructions');
    console.log('  2. Copy examples/api-client.js to your React project');
    console.log('  3. Follow the step-by-step migration process');
    
  } catch (error) {
    console.error('❌ Error creating migration files:', error);
  }
}

// Create examples directory
try {
  await fs.mkdir('examples', { recursive: true });
} catch (error) {
  // Directory might already exist
}

// Run the migration file creation
createMigrationFiles();
`;

await fs.writeFile('examples/api-client.js', apiClientExample);