// Generate unique IDs for client and session
export const CLIENT_ID = `client_${Math.random().toString(36).substring(2)}`;
export const SESSION_ID = `session_${Math.random().toString(36).substring(2)}`;

// Create default headers for API requests
export const getDefaultHeaders = () => ({
  "x-client-id": CLIENT_ID,
  "x-session-id": SESSION_ID,
});
