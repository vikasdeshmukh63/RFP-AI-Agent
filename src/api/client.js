// API client for the Node.js server
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

  async getProfile() {
    return this.request('/auth/profile');
  }

  async updateProfile(name) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
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

  async getDocument(id) {
    return this.request(`/documents/${id}`);
  }

  async deleteDocument(id) {
    return this.request(`/documents/${id}`, { method: 'DELETE' });
  }

  async prepareDocument(id) {
    return this.request(`/documents/${id}/prepare`, { method: 'POST' });
  }

  async getDocumentStats() {
    return this.request('/documents/stats/overview');
  }

  // Chat methods
  async createSession(sessionId, title = 'New Chat') {
    return this.request('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, title }),
    });
  }

  async getSessions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/chat/sessions?${query}`);
  }

  async deleteSession(sessionId) {
    return this.request(`/chat/sessions/${sessionId}`, { method: 'DELETE' });
  }

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

  async getMessages(sessionId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/chat/messages/${sessionId}?${query}`);
  }

  async clearMessages(sessionId) {
    return this.request(`/chat/messages/${sessionId}`, { method: 'DELETE' });
  }

  async analyzeDocumentWithChat(documentId, questions) {
    return this.request('/chat/analyze-document', {
      method: 'POST',
      body: JSON.stringify({ document_id: documentId, questions }),
    });
  }

  async getAnalysisHistory(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/chat/analysis-history?${query}`);
  }

  // Analysis methods
  async quickRFPAnalysis(documentId, customQuestions = null) {
    return this.request('/analysis/rfp-quick-analysis', {
      method: 'POST',
      body: JSON.stringify({ 
        document_id: documentId,
        custom_questions: customQuestions 
      }),
    });
  }

  async customAnalysis(documentId, questions, analysisName = null) {
    return this.request('/analysis/custom-analysis', {
      method: 'POST',
      body: JSON.stringify({ 
        document_id: documentId, 
        questions,
        analysis_name: analysisName 
      }),
    });
  }

  async getPredefinedQuestions() {
    return this.request('/analysis/predefined-questions');
  }

  async getAnalysisResults(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/analysis/results?${query}`);
  }

  async getAnalysisResult(id) {
    return this.request(`/analysis/results/${id}`);
  }

  async deleteAnalysisResult(id) {
    return this.request(`/analysis/results/${id}`, { method: 'DELETE' });
  }

  async compareDocuments(documentIds, questions = null) {
    return this.request('/analysis/compare-documents', {
      method: 'POST',
      body: JSON.stringify({ 
        document_ids: documentIds,
        questions 
      }),
    });
  }

  async getAnalysisStats() {
    return this.request('/analysis/stats');
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

  async getSynopsisById(id) {
    return this.request(`/synopsis/${id}`);
  }

  async updateSynopsis(id, data) {
    return this.request(`/synopsis/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSynopsis(id) {
    return this.request(`/synopsis/${id}`, { method: 'DELETE' });
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

  async getSynopsisStats() {
    return this.request('/synopsis/stats/overview');
  }

  async searchSynopsis(query, params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    return this.request(`/synopsis/search/${encodeURIComponent(query)}?${searchParams}`);
  }
}

export const apiClient = new ApiClient();