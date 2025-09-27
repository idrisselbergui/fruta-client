// The base URL of your deployed API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://41.140.246.34:44374';


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
 * @returns {Headers} A Headers object with Content-Type and X-Database-Name.
 */
const getHeaders = () => {
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');

    const user = getUserSession();
    if (user && user.database) {
        headers.append('X-Database-Name', user.database);
    }
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
export const apiGet = (endpoint, params) => {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    if (params) {
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });
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

// Export API_BASE_URL for debugging
export { API_BASE_URL };