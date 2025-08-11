import { useState, useEffect, useMemo } from 'react';
import { searchProducts } from '../utils/api';
import { UI_CONSTANTS } from '../constants';

/**
 * Custom hook for search functionality with debouncing
 * @param {Array} data - Data to search through
 * @param {number} debounceDelay - Debounce delay in milliseconds
 * @returns {Object} Search state and functions
 */
export const useSearch = (data = [], debounceDelay = UI_CONSTANTS.DEBOUNCE_DELAY) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search term
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, debounceDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm, debounceDelay]);

  // Filter data based on debounced search term
  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return data;
    }
    return searchProducts(data, debouncedSearchTerm);
  }, [data, debouncedSearchTerm]);

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
  };

  // Check if search is active
  const hasActiveSearch = debouncedSearchTerm.trim().length > 0;

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    filteredData,
    isSearching,
    clearSearch,
    hasActiveSearch,
    resultCount: filteredData.length,
  };
};

export default useSearch;