/**
 * Responsive utility helpers
 * Provides consistent scaling across different screen sizes
 */

import { Dimensions, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');

// Guideline sizes based on iPhone 8
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 667;

// Scale function for width-based scaling
export const scale = (size: number): number => {
  const newSize = (width / guidelineBaseWidth) * size;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Vertical scale function for height-based scaling
export const verticalScale = (size: number): number => {
  const newSize = (height / guidelineBaseHeight) * size;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Moderate scale function with a factor to limit scaling
export const moderateScale = (size: number, factor = 0.5): number => {
  const newSize = size + (scale(size) - size) * factor;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Screen dimension helpers
export const screenData = {
  width,
  height,
  isSmallDevice: width < 375,
  isLargeDevice: width > 414,
  isTablet: width > 768,
};

// Font scaling with bounds
export const scaledFont = (size: number, minSize?: number, maxSize?: number): number => {
  const scaled = moderateScale(size);
  if (minSize && scaled < minSize) return minSize;
  if (maxSize && scaled > maxSize) return maxSize;
  return scaled;
};

export default {
  scale,
  verticalScale,
  moderateScale,
  screenData,
  scaledFont,
};