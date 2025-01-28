// Generate unique ID for client
export const CLIENT_ID = `client_${Math.random().toString(36).substring(2)}`;

// Create default headers for API requests
export const getDefaultHeaders = (sessionId = null) => {
  const headers = {
    "x-client-id": CLIENT_ID,
  };

  if (sessionId) {
    headers["x-session-id"] = sessionId;
  }

  return headers;
};
