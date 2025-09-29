import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68d4f891cec7993a97ab0571", 
  requiresAuth: true // Ensure authentication is required for all operations
});
