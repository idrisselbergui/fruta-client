import { useState, useEffect } from 'react';

/**
 * A custom hook to debounce a value.
 * This is useful for delaying an expensive operation (like an API call)
 * until the user has stopped typing or changing a filter.
 * @param {any} value The value to debounce (e.g., a filter state).
 * @param {number} delay The debounce delay in milliseconds (e.g., 500).
 * @returns {any} The debounced value.
 */
function useDebounce(value, delay) {
  // State to store the debounced value
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(
    () => {
      // Set up a timer to update the debounced value after the delay
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      // Clean up the timer if the value changes before the delay has passed
      return () => {
        clearTimeout(handler);
      };
    },
    [value, delay] // Only re-run the effect if value or delay changes
  );

  return debouncedValue;
}

export default useDebounce;
