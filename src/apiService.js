// The base URL of your deployed API
const API_BASE_URL = 'https://fruta-dkd7h0e6bggjfqav.canadacentral-01.azurewebsites.net';

/**VITE_API_BASE_URL=https://localhost:44374
 * const API_BASE_URL = 'https://fruta-dkd7h0e6bggjfqav.canadacentral-01.azurewebsites.net';
 * A helper function to get the current user's session data.
 * @returns {object|null} The parsed user object or null if not logged in.
 */
const getUserSession = () => {
  const savedUser = sessionStorage.getItem('user');
  return savedUser ? JSON.parse(savedUser) : null;
};

/**
 * Creates the authorization and database headers for an API request.
 * @returns {Headers} A Headers object with Content-Type and X-Database-Name.
 */
const getHeaders = () => {
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');

    const user = getUserSession();
    if (user && user.database) {
        headers.append('X-Database-Name', user.database);
    }
    // Note: If no user is logged in, the header will be omitted,
    // which is correct for public endpoints like login.
    return headers;
}

/**
 * A wrapper for the fetch API that automatically adds headers and handles errors.
 * @param {string} endpoint - The API endpoint to call (e.g., '/api/dashboard/data').
 * @param {object} options - The options for the fetch call (method, body, etc.).
 * @returns {Promise<any>} A promise that resolves with the JSON response.
 */
const apiFetch = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = getHeaders();

    const config = {
        ...options,
        headers,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred.' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
};

// --- Export specific methods for different types of requests ---

export const apiGet = (endpoint, params) => {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    if (params) {
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    return apiFetch(url.pathname + url.search, { method: 'GET' });
};

export const apiPost = (endpoint, body) => {
    return apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
    });
};

export const apiPut = (endpoint, body) => {
    return apiFetch(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body),
    });
};

export const apiDelete = (endpoint) => {
    return apiFetch(endpoint, { method: 'DELETE' });
};

