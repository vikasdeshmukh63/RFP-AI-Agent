// Legacy integrations - now using API client
import { apiClient } from './client';

// Compatibility layer for existing code
export const InvokeLLM = async ({ prompt, file_urls, response_json_schema }) => {
  // This is now handled by specific analysis endpoints
  throw new Error('Use specific analysis methods like apiClient.quickRFPAnalysis() instead');
};

export const UploadFile = async ({ file }) => {
  const result = await apiClient.uploadFile(file);
  return {
    file_url: result.file_url
  };
};

// Placeholder for other integrations
export const SendEmail = async (data) => {
  throw new Error('Email integration not implemented in new server');
};

export const GenerateImage = async (data) => {
  throw new Error('Image generation not implemented in new server');
};

export const ExtractDataFromUploadedFile = async (data) => {
  throw new Error('Use document analysis endpoints instead');
};

export const CreateFileSignedUrl = async (data) => {
  throw new Error('File URLs are handled automatically');
};

export const UploadPrivateFile = async (data) => {
  throw new Error('Use apiClient.uploadFile() instead');
};

export const Core = {
  InvokeLLM,
  SendEmail,
  UploadFile,
  GenerateImage,
  ExtractDataFromUploadedFile,
  CreateFileSignedUrl,
  UploadPrivateFile
};






