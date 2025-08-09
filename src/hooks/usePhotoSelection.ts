/**
 * usePhotoSelection Hook
 * Custom hook for managing photo selection state and operations
 */

import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { validateImage, processImageForUpload, generateThumbnail } from '../lib/imageUtils';
import { uploadMultipleImages, UploadResult } from '../lib/storage';

export interface PhotoItem {
  uri: string;
  thumbnailUri?: string;
  isEdited: boolean;
  uploadProgress?: number;
  uploadUrl?: string;
  id: string;
}

export interface PhotoSelectionState {
  photos: PhotoItem[];
  isUploading: boolean;
  uploadProgress: number;
  maxPhotos: number;
}

export interface PhotoSelectionActions {
  addPhoto: (uri: string, edited?: boolean) => Promise<boolean>;
  addMultiplePhotos: (uris: string[]) => Promise<number>;
  removePhoto: (index: number) => void;
  removePhotoById: (id: string) => void;
  reorderPhotos: (fromIndex: number, toIndex: number) => void;
  updatePhoto: (index: number, updates: Partial<PhotoItem>) => void;
  setPrimaryPhoto: (index: number) => void;
  clearSelection: () => void;
  validateSelection: () => { valid: boolean; errors: string[] };
  uploadPhotos: (userId: string) => Promise<{ success: boolean; urls?: string[]; errors?: string[] }>;
  processPhotoForUpload: (uri: string) => Promise<{ success: boolean; processedUri?: string; thumbnailUri?: string; error?: string }>;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per photo
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total
const DEFAULT_MAX_PHOTOS = 5;

// Generate unique ID for photos
const generatePhotoId = (): string => {
  return `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const usePhotoSelection = (maxPhotos: number = DEFAULT_MAX_PHOTOS) => {
  const [state, setState] = useState<PhotoSelectionState>({
    photos: [],
    isUploading: false,
    uploadProgress: 0,
    maxPhotos,
  });

  const uploadAbortController = useRef<AbortController | null>(null);

  // Add a single photo to selection
  const addPhoto = useCallback(async (uri: string, edited: boolean = false): Promise<boolean> => {
    try {
      // Check if we've reached the maximum
      if (state.photos.length >= maxPhotos) {
        Alert.alert(
          'Maximum Photos Reached',
          `You can only select up to ${maxPhotos} photos per post.`,
          [{ text: 'OK' }]
        );
        return false;
      }

      // Check for duplicates
      const isDuplicate = state.photos.some(photo => photo.uri === uri);
      if (isDuplicate) {
        Alert.alert('Duplicate Photo', 'This photo is already selected.');
        return false;
      }

      // Validate the image
      const validation = await validateImage(uri);
      if (!validation.valid) {
        Alert.alert('Invalid Photo', validation.error || 'Please select a valid photo.');
        return false;
      }

      // Generate thumbnail
      const thumbnailResult = await generateThumbnail(uri);
      const thumbnailUri = thumbnailResult.success ? thumbnailResult.uri : undefined;

      // Create photo item
      const photoItem: PhotoItem = {
        uri,
        thumbnailUri,
        isEdited: edited,
        id: generatePhotoId(),
      };

      setState(prev => ({
        ...prev,
        photos: [...prev.photos, photoItem],
      }));

      return true;
    } catch (error) {
      console.error('Error adding photo:', error);
      Alert.alert('Error', 'Failed to add photo. Please try again.');
      return false;
    }
  }, [state.photos, maxPhotos]);

  // Add multiple photos to selection
  const addMultiplePhotos = useCallback(async (uris: string[]): Promise<number> => {
    const remainingSlots = maxPhotos - state.photos.length;
    const photosToAdd = uris.slice(0, remainingSlots);
    
    if (uris.length > remainingSlots) {
      Alert.alert(
        'Photo Limit',
        `You can only add ${remainingSlots} more photo${remainingSlots === 1 ? '' : 's'}. The first ${remainingSlots} photo${remainingSlots === 1 ? '' : 's'} will be added.`,
        [{ text: 'OK' }]
      );
    }

    let successCount = 0;
    for (const uri of photosToAdd) {
      const success = await addPhoto(uri);
      if (success) successCount++;
    }

    return successCount;
  }, [addPhoto, maxPhotos, state.photos.length]);

  // Remove photo by index
  const removePhoto = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  }, []);

  // Remove photo by ID
  const removePhotoById = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      photos: prev.photos.filter(photo => photo.id !== id),
    }));
  }, []);

  // Reorder photos
  const reorderPhotos = useCallback((fromIndex: number, toIndex: number) => {
    setState(prev => {
      const newPhotos = [...prev.photos];
      const [removed] = newPhotos.splice(fromIndex, 1);
      newPhotos.splice(toIndex, 0, removed);
      
      return {
        ...prev,
        photos: newPhotos,
      };
    });
  }, []);

  // Update photo properties
  const updatePhoto = useCallback((index: number, updates: Partial<PhotoItem>) => {
    setState(prev => ({
      ...prev,
      photos: prev.photos.map((photo, i) => 
        i === index ? { ...photo, ...updates } : photo
      ),
    }));
  }, []);

  // Set primary photo (move to first position)
  const setPrimaryPhoto = useCallback((index: number) => {
    if (index === 0) return; // Already primary
    
    setState(prev => {
      const newPhotos = [...prev.photos];
      const [primaryPhoto] = newPhotos.splice(index, 1);
      newPhotos.unshift(primaryPhoto);
      
      return {
        ...prev,
        photos: newPhotos,
      };
    });
  }, []);

  // Clear all selected photos
  const clearSelection = useCallback(() => {
    // Cancel any ongoing upload
    if (uploadAbortController.current) {
      uploadAbortController.current.abort();
    }

    setState(prev => ({
      ...prev,
      photos: [],
      isUploading: false,
      uploadProgress: 0,
    }));
  }, []);

  // Validate current selection
  const validateSelection = useCallback(() => {
    const errors: string[] = [];

    if (state.photos.length === 0) {
      errors.push('Please select at least one photo');
    }

    if (state.photos.length > maxPhotos) {
      errors.push(`Maximum ${maxPhotos} photos allowed`);
    }

    // Validate individual photos
    state.photos.forEach((photo, index) => {
      if (!photo.uri) {
        errors.push(`Photo ${index + 1} is invalid`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }, [state.photos, maxPhotos]);

  // Process single photo for upload
  const processPhotoForUpload = useCallback(async (uri: string) => {
    try {
      // Process image for optimal upload
      const processResult = await processImageForUpload(uri, {
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1080,
      });

      if (!processResult.success || !processResult.uri) {
        return {
          success: false,
          error: processResult.error || 'Failed to process image',
        };
      }

      // Generate thumbnail
      const thumbnailResult = await generateThumbnail(processResult.uri);

      return {
        success: true,
        processedUri: processResult.uri,
        thumbnailUri: thumbnailResult.success ? thumbnailResult.uri : undefined,
      };
    } catch (error) {
      console.error('Error processing photo for upload:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process photo',
      };
    }
  }, []);

  // Upload all selected photos
  const uploadPhotos = useCallback(async (userId: string) => {
    if (state.isUploading) {
      return { success: false, errors: ['Upload already in progress'] };
    }

    const validation = validateSelection();
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    setState(prev => ({ ...prev, isUploading: true, uploadProgress: 0 }));

    try {
      // Create abort controller for this upload session
      uploadAbortController.current = new AbortController();

      // Process all photos for upload first
      const processedPhotos: string[] = [];
      for (let i = 0; i < state.photos.length; i++) {
        const photo = state.photos[i];
        
        // Update progress for processing
        setState(prev => ({ 
          ...prev, 
          uploadProgress: (i / (state.photos.length * 2)) * 100 
        }));

        const processResult = await processPhotoForUpload(photo.uri);
        if (processResult.success && processResult.processedUri) {
          processedPhotos.push(processResult.processedUri);
        } else {
          throw new Error(`Failed to process photo ${i + 1}: ${processResult.error}`);
        }
      }

      // Upload processed photos with progress tracking
      const uploadResult = await uploadMultipleImages(
        processedPhotos,
        userId,
        {
          generateThumbnails: true,
          quality: 0.8,
          onProgress: (completed, total) => {
            const uploadProgress = 50 + ((completed / total) * 50);
            setState(prev => ({ ...prev, uploadProgress }));
          },
        }
      );

      if (!uploadResult.success || !uploadResult.results) {
        throw new Error('Upload failed');
      }

      // Extract successful URLs
      const successfulUrls = uploadResult.results
        .filter(result => result.success && result.url)
        .map(result => result.url!);

      setState(prev => ({ 
        ...prev, 
        isUploading: false, 
        uploadProgress: 100 
      }));

      return {
        success: true,
        urls: successfulUrls,
      };

    } catch (error) {
      console.error('Error uploading photos:', error);
      
      setState(prev => ({ 
        ...prev, 
        isUploading: false, 
        uploadProgress: 0 
      }));

      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Upload failed'],
      };
    }
  }, [state.photos, state.isUploading, validateSelection, processPhotoForUpload]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (uploadAbortController.current) {
      uploadAbortController.current.abort();
    }
  }, []);

  const actions: PhotoSelectionActions = {
    addPhoto,
    addMultiplePhotos,
    removePhoto,
    removePhotoById,
    reorderPhotos,
    updatePhoto,
    setPrimaryPhoto,
    clearSelection,
    validateSelection,
    uploadPhotos,
    processPhotoForUpload,
  };

  return {
    ...state,
    actions,
    cleanup,
    
    // Computed properties
    hasPhotos: state.photos.length > 0,
    canAddMore: state.photos.length < maxPhotos,
    remainingSlots: maxPhotos - state.photos.length,
    primaryPhoto: state.photos[0] || null,
    photoCount: state.photos.length,
  };
};