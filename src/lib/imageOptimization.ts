import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';

export interface ImageOptimizationOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png' | 'webp';
  compress?: boolean;
}

export interface OptimizationResult {
  uri: string;
  width: number;
  height: number;
  size: number;
  compressionRatio?: number;
  format: string;
}

export interface ThumbnailOptions {
  size: number;
  quality?: number;
  format?: 'jpeg' | 'png';
}

export interface ValidationResult {
  isValid: boolean;
  width?: number;
  height?: number;
  size?: number;
  format?: string;
  error?: string;
}

// Default optimization settings
const DEFAULT_QUALITY = 0.8;
const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_MAX_HEIGHT = 1920;
const MAX_FILE_SIZE_MB = 10;
const THUMBNAIL_QUALITY = 0.7;

/**
 * Compress and optimize an image for upload or storage
 */
export const compressImage = async (
  uri: string,
  quality: number = DEFAULT_QUALITY
): Promise<string> => {
  try {
    if (!uri) {
      throw new Error('Image URI is required');
    }

    // Get original image info
    const originalInfo = await FileSystem.getInfoAsync(uri);
    if (!originalInfo.exists) {
      throw new Error('Image file does not exist');
    }

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [], // No resize, just compress
      {
        compress: Math.max(0.1, Math.min(1.0, quality)),
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return result.uri;
  } catch (error) {
    console.error('Image compression failed:', error);
    throw new Error(`Failed to compress image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generate a thumbnail from an image
 */
export const generateThumbnail = async (
  uri: string,
  size: number,
  options: Omit<ThumbnailOptions, 'size'> = {}
): Promise<string> => {
  try {
    const { quality = THUMBNAIL_QUALITY, format = 'jpeg' } = options;

    if (!uri) {
      throw new Error('Image URI is required');
    }

    if (size <= 0 || size > 1000) {
      throw new Error('Thumbnail size must be between 1 and 1000 pixels');
    }

    // Get image dimensions first
    const dimensions = await calculateImageDimensions(uri);
    
    // Calculate resize dimensions maintaining aspect ratio
    const aspectRatio = dimensions.width / dimensions.height;
    let newWidth = size;
    let newHeight = size;
    
    if (aspectRatio > 1) {
      // Landscape
      newHeight = Math.round(size / aspectRatio);
    } else {
      // Portrait or square
      newWidth = Math.round(size * aspectRatio);
    }

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: newWidth, height: newHeight } }],
      {
        compress: quality,
        format: format === 'png' ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG,
      }
    );

    return result.uri;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    throw new Error(`Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Optimize image for upload with comprehensive settings
 */
export const optimizeForUpload = async (
  uri: string,
  options: ImageOptimizationOptions = {}
): Promise<OptimizationResult> => {
  try {
    const {
      quality = DEFAULT_QUALITY,
      maxWidth = DEFAULT_MAX_WIDTH,
      maxHeight = DEFAULT_MAX_HEIGHT,
      format = 'jpeg',
      compress = true,
    } = options;

    if (!uri) {
      throw new Error('Image URI is required');
    }

    // Get original image info
    const originalInfo = await FileSystem.getInfoAsync(uri);
    const originalSize = originalInfo.size || 0;
    
    // Get original dimensions
    const originalDimensions = await calculateImageDimensions(uri);
    
    // Calculate optimized dimensions
    const { width: newWidth, height: newHeight } = calculateOptimalDimensions(
      originalDimensions.width,
      originalDimensions.height,
      maxWidth,
      maxHeight
    );

    // Prepare manipulations
    const manipulations: ImageManipulator.Action[] = [];
    
    // Resize if needed
    if (newWidth !== originalDimensions.width || newHeight !== originalDimensions.height) {
      manipulations.push({
        resize: { width: newWidth, height: newHeight }
      });
    }

    // Apply manipulations
    const result = await ImageManipulator.manipulateAsync(
      uri,
      manipulations,
      {
        compress: compress ? quality : 1.0,
        format: getImageManipulatorFormat(format),
      }
    );

    // Get final file info
    const finalInfo = await FileSystem.getInfoAsync(result.uri);
    const finalSize = finalInfo.size || 0;
    
    const compressionRatio = originalSize > 0 ? finalSize / originalSize : 1;

    return {
      uri: result.uri,
      width: result.width || newWidth,
      height: result.height || newHeight,
      size: finalSize,
      compressionRatio,
      format,
    };
  } catch (error) {
    console.error('Image optimization failed:', error);
    throw new Error(`Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Validate image size and format
 */
export const validateImageSize = async (
  uri: string,
  maxSizeMB: number = MAX_FILE_SIZE_MB
): Promise<boolean> => {
  try {
    if (!uri) return false;

    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists || !fileInfo.size) return false;

    const fileSizeMB = fileInfo.size / (1024 * 1024);
    return fileSizeMB <= maxSizeMB;
  } catch (error) {
    console.error('Image size validation failed:', error);
    return false;
  }
};

/**
 * Convert image to different format
 */
export const convertImageFormat = async (
  uri: string,
  format: 'jpeg' | 'png' | 'webp'
): Promise<string> => {
  try {
    if (!uri) {
      throw new Error('Image URI is required');
    }

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [], // No transformations, just format conversion
      {
        compress: 1.0, // No quality loss during format conversion
        format: getImageManipulatorFormat(format),
      }
    );

    return result.uri;
  } catch (error) {
    console.error('Image format conversion failed:', error);
    throw new Error(`Failed to convert image format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Calculate image dimensions
 */
export const calculateImageDimensions = async (
  uri: string
): Promise<{ width: number; height: number }> => {
  try {
    if (!uri) {
      throw new Error('Image URI is required');
    }

    return new Promise((resolve, reject) => {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        (error) => reject(new Error(`Failed to get image dimensions: ${error}`))
      );
    });
  } catch (error) {
    console.error('Failed to calculate image dimensions:', error);
    throw error;
  }
};

/**
 * Validate image file and get metadata
 */
export const validateImage = async (uri: string): Promise<ValidationResult> => {
  try {
    if (!uri) {
      return {
        isValid: false,
        error: 'Image URI is required',
      };
    }

    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      return {
        isValid: false,
        error: 'Image file does not exist',
      };
    }

    // Get file size
    const size = fileInfo.size || 0;
    if (size === 0) {
      return {
        isValid: false,
        error: 'Image file is empty',
      };
    }

    // Check file size limit
    const sizeMB = size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      return {
        isValid: false,
        error: `Image file too large (${sizeMB.toFixed(1)}MB). Maximum size is ${MAX_FILE_SIZE_MB}MB`,
      };
    }

    try {
      // Get image dimensions
      const dimensions = await calculateImageDimensions(uri);
      
      // Basic dimension validation
      if (dimensions.width < 1 || dimensions.height < 1) {
        return {
          isValid: false,
          error: 'Invalid image dimensions',
        };
      }

      // Determine format from URI
      const format = getImageFormat(uri);

      return {
        isValid: true,
        width: dimensions.width,
        height: dimensions.height,
        size,
        format,
      };
    } catch (dimensionError) {
      return {
        isValid: false,
        error: 'Failed to read image dimensions. File may be corrupted or in an unsupported format',
      };
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Image validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Batch optimize multiple images
 */
export const batchOptimizeImages = async (
  uris: string[],
  options: ImageOptimizationOptions = {},
  onProgress?: (completed: number, total: number) => void
): Promise<OptimizationResult[]> => {
  const results: OptimizationResult[] = [];
  
  for (let i = 0; i < uris.length; i++) {
    try {
      const result = await optimizeForUpload(uris[i], options);
      results.push(result);
      onProgress?.(i + 1, uris.length);
    } catch (error) {
      console.error(`Failed to optimize image ${i + 1}:`, error);
      // Continue with next image instead of failing entire batch
    }
  }
  
  return results;
};

// Helper functions

/**
 * Calculate optimal dimensions maintaining aspect ratio
 */
const calculateOptimalDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  const aspectRatio = originalWidth / originalHeight;
  
  let newWidth = originalWidth;
  let newHeight = originalHeight;
  
  // Scale down if too large
  if (newWidth > maxWidth) {
    newWidth = maxWidth;
    newHeight = Math.round(newWidth / aspectRatio);
  }
  
  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = Math.round(newHeight * aspectRatio);
  }
  
  return { width: newWidth, height: newHeight };
};

/**
 * Convert format string to ImageManipulator format
 */
const getImageManipulatorFormat = (format: string): ImageManipulator.SaveFormat => {
  switch (format.toLowerCase()) {
    case 'png':
      return ImageManipulator.SaveFormat.PNG;
    case 'webp':
      return ImageManipulator.SaveFormat.WEBP;
    case 'jpeg':
    case 'jpg':
    default:
      return ImageManipulator.SaveFormat.JPEG;
  }
};

/**
 * Get image format from URI
 */
const getImageFormat = (uri: string): string => {
  const extension = uri.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'png':
      return 'png';
    case 'webp':
      return 'webp';
    case 'jpg':
    case 'jpeg':
    default:
      return 'jpeg';
  }
};

/**
 * Estimate compression ratio for given quality
 */
export const estimateCompressionRatio = (quality: number): number => {
  // Rough estimation based on typical JPEG compression behavior
  return Math.max(0.1, Math.min(1.0, quality * 0.7 + 0.2));
};

/**
 * Get recommended quality based on image dimensions and target file size
 */
export const getRecommendedQuality = (
  width: number,
  height: number,
  targetSizeKB: number = 500
): number => {
  const pixels = width * height;
  const baseQuality = Math.min(1.0, targetSizeKB / (pixels / 1000));
  return Math.max(0.3, Math.min(0.9, baseQuality));
};