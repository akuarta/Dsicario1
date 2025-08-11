import { useState, useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import { UI_CONSTANTS } from '../constants';

/**
 * Custom hook for responsive design calculations
 * @returns {Object} Responsive values and utilities
 */
export const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  const [numColumns, setNumColumns] = useState(2);

  // Calculate number of columns based on screen width
  useEffect(() => {
    const calculatedColumns = Math.floor(width / UI_CONSTANTS.MIN_PRODUCT_WIDTH);
    const columns = Math.max(
      UI_CONSTANTS.MIN_COLUMNS,
      Math.min(calculatedColumns, UI_CONSTANTS.MAX_COLUMNS)
    );
    setNumColumns(columns);
  }, [width]);

  // Device type detection
  const isSmallDevice = width < 375;
  const isTablet = width >= 768;
  const isLandscape = width > height;

  // Responsive values
  const itemWidth = (width - 48) / numColumns; // 48 = padding + margins
  const isCompact = width < 400;

  return {
    width,
    height,
    numColumns,
    itemWidth,
    isSmallDevice,
    isTablet,
    isLandscape,
    isCompact,
  };
};

export default useResponsive;