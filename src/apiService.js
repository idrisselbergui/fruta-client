// The base URL of your deployed API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:44374';

/**
 * A helper function to get the current user's session data.
 * @returns {object|null} The parsed user object or null if not logged in.
 */
const getUserSession = () => {
  const savedUser = sessionStorage.getItem('user');
  return savedUser ? JSON.parse(savedUser) : null;
};

/**
 * Creates the authorization and database headers for an API request.
 * @param {object} options - The fetch options (e.g., { method: 'GET', body: '...' }).
 * @param {string} databaseName - Optional database name to override session database.
 * @returns {Headers} A Headers object with conditional Content-Type, X-Database-Name, and ngrok bypass.
 */
const getHeaders = (options = {}, databaseName = null) => {
  const headers = new Headers();

  // Add ngrok bypass header to skip the free-tier warning page for all requests
  headers.append('ngrok-skip-browser-warning', 'true');

  // Conditionally add Content-Type only for requests with a body (e.g., POST/PUT)
  const hasBody = options.body || options.method?.toUpperCase() !== 'GET';
  if (hasBody) {
    headers.append('Content-Type', 'application/json');
  }

  // Use provided database name, or fall back to session database
  const dbName = databaseName || (getUserSession()?.database);
  if (dbName) {
    headers.append('X-Database-Name', dbName);
  }

  return headers;
};

/**
 * A wrapper for the fetch API that automatically adds headers and handles errors.
 * @param {string} endpoint - The API endpoint to call (e.g., '/api/dashboard/data').
 * @param {object} options - The options for the fetch call (method, body, etc.).
 * @param {string} databaseName - Optional database name to override session database.
 * @returns {Promise<any>} A promise that resolves with the JSON response.
 */
const apiFetch = async (endpoint, options = {}, databaseName = null) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = getHeaders(options, databaseName);

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP error! status: ${response.status}`
      }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    // Handle no content responses (e.g., 204 from DELETE)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Export specific methods for different types of requests
export const apiGet = (endpoint, params, databaseName = null) => {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  if (params) {
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        url.searchParams.append(key, params[key]);
      }
    });
  }
  return apiFetch(url.pathname + url.search, { method: 'GET' }, databaseName);
};

export const apiPost = (endpoint, body, databaseName = null) => {
  return apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  }, databaseName);
};

export const apiPut = (endpoint, body, databaseName = null) => {
  return apiFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  }, databaseName);
};

export const apiDelete = (endpoint, databaseName = null) => {
  return apiFetch(endpoint, { method: 'DELETE' }, databaseName);
};

// User management functions
export const getUsers = (databaseName = null) => {
  return apiGet('/api/users', null, databaseName);
};

export const updateUser = (userId, userData, databaseName = null) => {
  return apiPut(`/api/users/${userId}`, userData, databaseName);
};

export const deleteUser = (userId, databaseName = null) => {
  return apiDelete(`/api/users/${userId}`, databaseName);
};

// Export API_BASE_URL for debugging
export { API_BASE_URL, getUserSession };
