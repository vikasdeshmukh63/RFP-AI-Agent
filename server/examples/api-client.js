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
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
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
    return this.request(`/documents?${query}`);
  }

  async deleteDocument(id) {
    return this.request(`/documents/${id}`, { method: 'DELETE' });
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
    return this.request(`/chat/messages/${sessionId}`);
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
    return this.request(`/synopsis?${query}`);
  }

  async updateSynopsis(id, data) {
    return this.request(`/synopsis/${id}`, {
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