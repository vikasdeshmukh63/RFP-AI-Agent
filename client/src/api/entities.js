// Legacy entities - now using API client
import { apiClient } from './client';

// Compatibility layer for existing code
export const GeneralChatMessage = {
  create: async (data) => {
    return apiClient.sendMessage(data.session_id, data.message, data.sender, data.file_url, data.file_name);
  },
  filter: async (filter, orderBy) => {
    const { messages } = await apiClient.getMessages(filter.session_id);
    return messages;
  }
};

export const UploadedDocument = {
  create: async (data) => {
    // This is handled by the upload endpoint
    throw new Error('Use apiClient.uploadFile() instead');
  },
  list: async (orderBy, limit) => {
    const { documents } = await apiClient.getDocuments({ 
      limit, 
      sort: orderBy 
    });
    return documents;
  },
  delete: async (id) => {
    return apiClient.deleteDocument(id);
  }
};

export const Synopsis = {
  create: async (data) => {
    return apiClient.createSynopsis(data);
  },
  list: async (orderBy, limit) => {
    const { synopsis } = await apiClient.getSynopsis({ 
      limit, 
      sort: orderBy 
    });
    return synopsis;
  },
  update: async (id, data) => {
    return apiClient.updateSynopsis(id, data);
  },
  delete: async (id) => {
    return apiClient.deleteSynopsis(id);
  }
};

// Auth compatibility
export const User = {
  login: (email, password) => apiClient.login(email, password),
  register: (email, password, name) => apiClient.register(email, password, name),
  getProfile: () => apiClient.getProfile()
};