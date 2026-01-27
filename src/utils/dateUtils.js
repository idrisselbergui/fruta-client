/**
 * Format a date string (YYYY-MM-DD or ISO) to DD/MM/YYYY for display.
 * This treats the input string as a local date and avoids timezone conversion issues.
 * @param {string} dateString 
 * @returns {string} Formatted date or empty string
 */
export const formatDateForDisplay = (dateString, options = {}) => {
    if (!dateString) return '';

    try {
        // If it's a simple YYYY-MM-DD string, manually parse it to avoid Date object timezone issues
        if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString.split('T')[0])) {
            const parts = dateString.split('T')[0].split('-');
            if (parts.length === 3) {
                // If specific format options are requested, we might need to fallback to Date object
                // but for standard DD/MM/YYYY transparency is best
                if (Object.keys(options).length === 0) {
                    return `${parts[2]}/${parts[1]}/${parts[0]}`;
                }

                // Construct a safe local date (midnight)
                const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                return date.toLocaleDateString('fr-FR', options);
            }
        }

        // Fallback for other formats or if options are present
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('fr-FR', options);
    } catch (e) {
        console.error('Error formatting date:', e);
        return dateString;
    }
};

/**
 * Format a date string for input[type="date"] (YYYY-MM-DD).
 * Avoids timezone shifts by parsing YYYY-MM-DD directly or using local time methods.
 */
export const formatDateForInput = (dateString) => {
    if (!dateString) return '';

    // If we already have YYYY-MM-DD part at the start, just use it
    if (typeof dateString === 'string') {
        const match = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) {
            return match[1];
        }
    }

    // Fallback to local time components if it's a Date object or weird string
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
