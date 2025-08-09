/**
 * Supabase Storage Integration
 * Handles image uploads, deletions, and URL generation for food photos
 */

import { supabase } from './supabase';
import { processImageForUpload, generateThumbnail } from './imageUtils';
import * as FileSystem from 'expo-file-system';

export interface UploadResult {
  success: boolean;
  url?: string;
  thumbnailUrl?: string;
  path?: string;
  error?: string;
  uploadProgress?: number;
}

export interface MultiUploadResult {
  success: boolean;
  results?: UploadResult[];
  successCount?: number;
  errorCount?: number;
  errors?: string[];
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

const BUCKET_NAME = 'food-photos';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Generate unique file path for user uploads
 * @param userId - User ID
 * @param extension - File extension (default: 'jpg')
 * @returns Unique file path
 */
const generateFilePath = (userId: string, extension: string = 'jpg'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `users/${userId}/posts/${timestamp}_${random}.${extension}`;
};

/**
 * Convert base64 string to ArrayBuffer
 * @param base64 - Base64 encoded string
 * @returns ArrayBuffer
 */
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Convert file URI to ArrayBuffer for upload
 * @param uri - File URI
 * @returns Promise with file data as ArrayBuffer
 */
const uriToArrayBuffer = async (uri: string): Promise<ArrayBuffer> => {
  try {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to ArrayBuffer using built-in function
    return base64ToArrayBuffer(base64);
  } catch (error) {
    console.error('Error converting URI to ArrayBuffer:', error);
    throw new Error('Failed to process image file');
  }
};

/**
 * Upload single image to Supabase Storage
 * @param imageUri - Local image URI
 * @param userId - User ID for file path
 * @param options - Upload options
 * @returns Promise with upload result
 */
export const uploadImage = async (
  imageUri: string,
  userId: string,
  options: {
    generateThumbnail?: boolean;
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): Promise<UploadResult> => {
  const {
    generateThumbnail: shouldGenerateThumbnail = true,
    quality = 0.8,
    maxWidth = 1920,
    maxHeight = 1080,
  } = options;

  try {
    console.log('Starting image upload process...');

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      throw new Error('User not authenticated or invalid user ID');
    }

    // Step 1: Process image for upload
    console.log('Processing image for upload...');
    const processResult = await processImageForUpload(imageUri, {
      quality,
      maxWidth,
      maxHeight,
    });

    if (!processResult.success || !processResult.uri) {
      throw new Error(processResult.error || 'Failed to process image');
    }

    // Step 2: Convert to ArrayBuffer
    console.log('Converting image to ArrayBuffer...');
    const imageArrayBuffer = await uriToArrayBuffer(processResult.uri);

    // Step 3: Generate file path
    const filePath = generateFilePath(userId, 'jpg');
    
    // Step 4: Upload main image
    console.log(`Uploading image to ${filePath}...`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, imageArrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    if (!uploadData?.path) {
      throw new Error('Upload succeeded but no file path returned');
    }

    // Step 5: Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uploadData.path);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to generate public URL');
    }

    let thumbnailUrl: string | undefined;

    // Step 6: Generate and upload thumbnail (optional)
    if (shouldGenerateThumbnail) {
      try {
        console.log('Generating thumbnail...');
        const thumbnailResult = await generateThumbnail(processResult.uri);
        
        if (thumbnailResult.success && thumbnailResult.uri) {
          const thumbnailArrayBuffer = await uriToArrayBuffer(thumbnailResult.uri);
          const thumbnailPath = generateFilePath(userId, 'thumb.jpg');

          const { data: thumbUploadData, error: thumbUploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(thumbnailPath, thumbnailArrayBuffer, {
              contentType: 'image/jpeg',
              upsert: false,
            });

          if (!thumbUploadError && thumbUploadData?.path) {
            const { data: thumbUrlData } = supabase.storage
              .from(BUCKET_NAME)
              .getPublicUrl(thumbUploadData.path);

            thumbnailUrl = thumbUrlData?.publicUrl;
          }

          // Clean up thumbnail file
          await FileSystem.deleteAsync(thumbnailResult.uri, { idempotent: true });
        }
      } catch (thumbError) {
        console.warn('Thumbnail generation failed, continuing without thumbnail:', thumbError);
      }
    }

    // Clean up processed image file if different from original
    if (processResult.uri !== imageUri) {
      await FileSystem.deleteAsync(processResult.uri, { idempotent: true });
    }

    console.log('Image upload completed successfully');

    return {
      success: true,
      url: urlData.publicUrl,
      thumbnailUrl,
      path: uploadData.path,
    };

  } catch (error) {
    console.error('Error uploading image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload image',
    };
  }
};

/**
 * Upload multiple images with progress tracking
 * @param imageUris - Array of local image URIs
 * @param userId - User ID for file paths
 * @param options - Upload options
 * @returns Promise with batch upload results
 */
export const uploadMultipleImages = async (
  imageUris: string[],
  userId: string,
  options: {
    generateThumbnails?: boolean;
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<MultiUploadResult> => {
  const { onProgress, ...uploadOptions } = options;

  try {
    if (!imageUris.length) {
      throw new Error('No images provided for upload');
    }

    console.log(`Starting batch upload of ${imageUris.length} images...`);

    const results: UploadResult[] = [];
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Upload images sequentially to avoid overwhelming the server
    for (let i = 0; i < imageUris.length; i++) {
      const imageUri = imageUris[i];
      
      console.log(`Uploading image ${i + 1} of ${imageUris.length}...`);
      
      const result = await uploadImage(imageUri, userId, uploadOptions);
      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        if (result.error) {
          errors.push(`Image ${i + 1}: ${result.error}`);
        }
      }

      // Report progress
      onProgress?.(i + 1, imageUris.length);
    }

    console.log(`Batch upload completed: ${successCount} successful, ${errorCount} failed`);

    return {
      success: successCount > 0,
      results,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
    };

  } catch (error) {
    console.error('Error in batch upload:', error);
    return {
      success: false,
      results: [],
      successCount: 0,
      errorCount: imageUris.length,
      errors: [error instanceof Error ? error.message : 'Batch upload failed'],
    };
  }
};

/**
 * Delete image from Supabase Storage
 * @param imageUrl - Public URL or file path of the image to delete
 * @returns Promise with deletion result
 */
export const deleteImage = async (imageUrl: string): Promise<DeleteResult> => {
  try {
    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Extract file path from URL if it's a full URL
    let filePath = imageUrl;
    
    if (imageUrl.includes('/storage/v1/object/public/')) {
      const pathMatch = imageUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
      if (pathMatch) {
        filePath = pathMatch[1];
      }
    }

    console.log(`Deleting image: ${filePath}`);

    // Delete from storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }

    console.log('Image deleted successfully');

    return { success: true };

  } catch (error) {
    console.error('Error deleting image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete image',
    };
  }
};

/**
 * Get public URL for uploaded image
 * @param imagePath - File path in storage
 * @returns Public URL string
 */
export const getImageUrl = (imagePath: string): string => {
  if (!imagePath) {
    throw new Error('Image path is required');
  }

  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(imagePath);

  if (!data?.publicUrl) {
    throw new Error('Failed to generate public URL');
  }

  return data.publicUrl;
};

/**
 * Upload image with retry logic for better reliability
 * @param imageUri - Local image URI
 * @param userId - User ID
 * @param options - Upload options
 * @returns Promise with upload result
 */
export const uploadImageWithRetry = async (
  imageUri: string,
  userId: string,
  options: Parameters<typeof uploadImage>[2] = {},
  maxRetries: number = MAX_RETRIES
): Promise<UploadResult> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Upload attempt ${attempt} of ${maxRetries}...`);
      
      const result = await uploadImage(imageUri, userId, options);
      
      if (result.success) {
        if (attempt > 1) {
          console.log(`Upload succeeded on attempt ${attempt}`);
        }
        return result;
      }

      lastError = new Error(result.error || 'Upload failed');
      
      // If it's the last attempt, don't wait
      if (attempt < maxRetries) {
        console.log(`Upload attempt ${attempt} failed, retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt < maxRetries) {
        console.log(`Upload attempt ${attempt} failed with error, retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }
    }
  }

  console.error(`All ${maxRetries} upload attempts failed`);
  
  return {
    success: false,
    error: lastError?.message || 'All upload attempts failed',
  };
};

/**
 * Check if storage bucket exists and is accessible
 * @returns Promise with availability status
 */
export const checkStorageAvailability = async (): Promise<{
  available: boolean;
  error?: string;
}> => {
  try {
    // Try to list files in the bucket (with limit 1 to minimize data)
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 1 });

    if (error) {
      throw new Error(`Storage not accessible: ${error.message}`);
    }

    return { available: true };

  } catch (error) {
    console.error('Storage availability check failed:', error);
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Storage unavailable',
    };
  }
};