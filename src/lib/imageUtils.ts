/**
 * Image Processing Utilities
 * Handles image compression, resizing, and processing for mobile optimization
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

export interface ImageProcessingOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: ImageManipulator.SaveFormat;
}

export interface ImageInfo {
  uri: string;
  width: number;
  height: number;
  fileSize?: number;
}

export interface ProcessingResult {
  success: boolean;
  uri?: string;
  error?: string;
  originalSize?: number;
  processedSize?: number;
}

/**
 * Compress image with specified quality
 * @param uri - Image URI to compress
 * @param quality - Compression quality (0-1, default: 0.8)
 * @returns Promise with compressed image URI
 */
export const compressImage = async (
  uri: string, 
  quality: number = 0.8
): Promise<ProcessingResult> => {
  try {
    // Validate input
    if (!uri) {
      throw new Error('Image URI is required');
    }

    if (quality < 0 || quality > 1) {
      throw new Error('Quality must be between 0 and 1');
    }

    // Get original file info
    const originalInfo = await FileSystem.getInfoAsync(uri);
    const originalSize = originalInfo.exists ? originalInfo.size || 0 : 0;

    // Compress image
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // Get processed file info
    const processedInfo = await FileSystem.getInfoAsync(result.uri);
    const processedSize = processedInfo.exists ? processedInfo.size || 0 : 0;

    console.log(`Image compressed: ${originalSize} → ${processedSize} bytes (${Math.round((1 - processedSize / originalSize) * 100)}% reduction)`);

    return {
      success: true,
      uri: result.uri,
      originalSize,
      processedSize,
    };
  } catch (error) {
    console.error('Error compressing image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compress image',
    };
  }
};

/**
 * Resize image to fit within maximum dimensions while maintaining aspect ratio
 * @param uri - Image URI to resize
 * @param maxWidth - Maximum width (default: 1920)
 * @param maxHeight - Maximum height (default: 1080)
 * @returns Promise with resized image URI
 */
export const resizeImage = async (
  uri: string,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): Promise<ProcessingResult> => {
  try {
    if (!uri) {
      throw new Error('Image URI is required');
    }

    // Get image dimensions
    const imageInfo = await getImageInfo(uri);
    if (!imageInfo.success) {
      throw new Error('Failed to get image dimensions');
    }

    const { width: originalWidth, height: originalHeight } = imageInfo.info!;

    // Calculate new dimensions maintaining aspect ratio
    const aspectRatio = originalWidth / originalHeight;
    let newWidth = originalWidth;
    let newHeight = originalHeight;

    if (originalWidth > maxWidth || originalHeight > maxHeight) {
      if (aspectRatio > maxWidth / maxHeight) {
        // Image is wider than the max aspect ratio
        newWidth = maxWidth;
        newHeight = Math.round(maxWidth / aspectRatio);
      } else {
        // Image is taller than the max aspect ratio
        newHeight = maxHeight;
        newWidth = Math.round(maxHeight * aspectRatio);
      }
    }

    // Only resize if dimensions changed
    if (newWidth === originalWidth && newHeight === originalHeight) {
      return {
        success: true,
        uri,
      };
    }

    // Get original file size
    const originalInfo = await FileSystem.getInfoAsync(uri);
    const originalSize = originalInfo.exists ? originalInfo.size || 0 : 0;

    // Resize image
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: newWidth, height: newHeight } }],
      {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // Get processed file size
    const processedInfo = await FileSystem.getInfoAsync(result.uri);
    const processedSize = processedInfo.exists ? processedInfo.size || 0 : 0;

    console.log(`Image resized: ${originalWidth}x${originalHeight} → ${newWidth}x${newHeight} (${originalSize} → ${processedSize} bytes)`);

    return {
      success: true,
      uri: result.uri,
      originalSize,
      processedSize,
    };
  } catch (error) {
    console.error('Error resizing image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resize image',
    };
  }
};

/**
 * Generate thumbnail version of image (300x300 crop)
 * @param uri - Image URI to create thumbnail from
 * @returns Promise with thumbnail image URI
 */
export const generateThumbnail = async (uri: string): Promise<ProcessingResult> => {
  try {
    if (!uri) {
      throw new Error('Image URI is required');
    }

    const thumbnailSize = 300;

    // Get image info to determine crop area
    const imageInfo = await getImageInfo(uri);
    if (!imageInfo.success) {
      throw new Error('Failed to get image dimensions');
    }

    const { width, height } = imageInfo.info!;
    const minDimension = Math.min(width, height);

    // Calculate crop area (center crop)
    const cropX = (width - minDimension) / 2;
    const cropY = (height - minDimension) / 2;

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          crop: {
            originX: cropX,
            originY: cropY,
            width: minDimension,
            height: minDimension,
          },
        },
        {
          resize: {
            width: thumbnailSize,
            height: thumbnailSize,
          },
        },
      ],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log(`Thumbnail generated: ${width}x${height} → ${thumbnailSize}x${thumbnailSize}`);

    return {
      success: true,
      uri: result.uri,
    };
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate thumbnail',
    };
  }
};

/**
 * Get image dimensions and file info
 * @param uri - Image URI to analyze
 * @returns Promise with image information
 */
export const getImageInfo = async (
  uri: string
): Promise<{ success: boolean; info?: ImageInfo; error?: string }> => {
  try {
    if (!uri) {
      throw new Error('Image URI is required');
    }

    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('Image file does not exist');
    }

    // Get image dimensions using ImageManipulator
    const imageResult = await ImageManipulator.manipulateAsync(uri, [], {});
    
    return {
      success: true,
      info: {
        uri,
        width: imageResult.width,
        height: imageResult.height,
        fileSize: fileInfo.size,
      },
    };
  } catch (error) {
    console.error('Error getting image info:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get image info',
    };
  }
};

/**
 * Validate image file (size, dimensions, format)
 * @param uri - Image URI to validate
 * @returns Promise with validation result
 */
export const validateImage = async (uri: string): Promise<{ valid: boolean; error?: string }> => {
  try {
    if (!uri) {
      return { valid: false, error: 'Image URI is required' };
    }

    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      return { valid: false, error: 'Image file does not exist' };
    }

    // Check file size (max 50MB)
    const maxFileSize = 50 * 1024 * 1024; // 50MB in bytes
    if (fileInfo.size && fileInfo.size > maxFileSize) {
      return { valid: false, error: 'Image file is too large (max 50MB)' };
    }

    // Get image dimensions
    const imageInfo = await getImageInfo(uri);
    if (!imageInfo.success) {
      return { valid: false, error: 'Invalid image format' };
    }

    const { width, height } = imageInfo.info!;

    // Check minimum dimensions (at least 100x100)
    if (width < 100 || height < 100) {
      return { valid: false, error: 'Image is too small (minimum 100x100 pixels)' };
    }

    // Check maximum dimensions (max 8000x8000)
    if (width > 8000 || height > 8000) {
      return { valid: false, error: 'Image is too large (maximum 8000x8000 pixels)' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating image:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate image',
    };
  }
};

/**
 * Process image for upload (resize + compress)
 * @param uri - Original image URI
 * @param options - Processing options
 * @returns Promise with processed image URI
 */
export const processImageForUpload = async (
  uri: string,
  options: ImageProcessingOptions = {}
): Promise<ProcessingResult> => {
  try {
    const {
      quality = 0.8,
      maxWidth = 1920,
      maxHeight = 1080,
      format = ImageManipulator.SaveFormat.JPEG,
    } = options;

    console.log('Processing image for upload...');

    // Step 1: Validate image
    const validation = await validateImage(uri);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Step 2: Resize image if needed
    const resizeResult = await resizeImage(uri, maxWidth, maxHeight);
    if (!resizeResult.success) {
      throw new Error(resizeResult.error);
    }

    // Step 3: Compress image
    const compressResult = await compressImage(resizeResult.uri!, quality);
    if (!compressResult.success) {
      throw new Error(compressResult.error);
    }

    // Clean up intermediate file if different from original
    if (resizeResult.uri && resizeResult.uri !== uri && resizeResult.uri !== compressResult.uri) {
      await FileSystem.deleteAsync(resizeResult.uri, { idempotent: true });
    }

    return {
      success: true,
      uri: compressResult.uri!,
      originalSize: resizeResult.originalSize,
      processedSize: compressResult.processedSize,
    };
  } catch (error) {
    console.error('Error processing image for upload:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process image',
    };
  }
};

/**
 * Rotate image by specified degrees
 * @param uri - Image URI to rotate
 * @param degrees - Rotation degrees (90, 180, 270)
 * @returns Promise with rotated image URI
 */
export const rotateImage = async (
  uri: string,
  degrees: number
): Promise<ProcessingResult> => {
  try {
    if (!uri) {
      throw new Error('Image URI is required');
    }

    if (![90, 180, 270].includes(degrees)) {
      throw new Error('Rotation must be 90, 180, or 270 degrees');
    }

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ rotate: degrees }],
      {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log(`Image rotated by ${degrees} degrees`);

    return {
      success: true,
      uri: result.uri,
    };
  } catch (error) {
    console.error('Error rotating image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rotate image',
    };
  }
};

/**
 * Crop image to specified dimensions
 * @param uri - Image URI to crop
 * @param cropArea - Crop area specification
 * @returns Promise with cropped image URI
 */
export const cropImage = async (
  uri: string,
  cropArea: {
    originX: number;
    originY: number;
    width: number;
    height: number;
  }
): Promise<ProcessingResult> => {
  try {
    if (!uri) {
      throw new Error('Image URI is required');
    }

    const { originX, originY, width, height } = cropArea;

    if (originX < 0 || originY < 0 || width <= 0 || height <= 0) {
      throw new Error('Invalid crop area dimensions');
    }

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ crop: { originX, originY, width, height } }],
      {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log(`Image cropped: ${width}x${height} from (${originX}, ${originY})`);

    return {
      success: true,
      uri: result.uri,
    };
  } catch (error) {
    console.error('Error cropping image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to crop image',
    };
  }
};