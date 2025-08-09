/**
 * PhotoSelectionScreen
 * Dedicated screen for photo selection and management workflow
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
// import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import { colors, spacing, fonts } from '../theme/uiTheme';
import Button from '../components/ui/Button';
import PhotoManager from '../components/camera/PhotoManager';
import PhotoGallery from '../components/camera/PhotoGallery';
import PhotoPreview from '../components/camera/PhotoPreview';
import { usePhotoSelection } from '../hooks/usePhotoSelection';

// Navigation types (add these to your navigation types file)
type PhotoSelectionStackParamList = {
  PhotoSelection: {
    initialPhotos?: string[];
    maxPhotos?: number;
  };
  Camera: undefined;
  PostCreation: {
    photoUrls: string[];
  };
};

type PhotoSelectionScreenNavigationProp = any; // TODO: Add proper navigation types

type PhotoSelectionScreenRouteProp = RouteProp<
  PhotoSelectionStackParamList,
  'PhotoSelection'
>;

interface PhotoSelectionScreenProps {
  navigation: PhotoSelectionScreenNavigationProp;
  route: PhotoSelectionScreenRouteProp;
}

type ViewMode = 'manager' | 'gallery' | 'preview';

export default function PhotoSelectionScreen({
  navigation,
  route,
}: PhotoSelectionScreenProps) {
  const { initialPhotos = [], maxPhotos = 5 } = route.params || {};
  
  const [viewMode, setViewMode] = useState<ViewMode>('manager');
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);

  const photoSelection = usePhotoSelection(maxPhotos);
  const { user } = { user: { id: 'temp-user-id' } }; // TODO: Get from auth context

  // Initialize with any initial photos
  useEffect(() => {
    if (initialPhotos.length > 0) {
      initialPhotos.forEach(uri => {
        photoSelection.actions.addPhoto(uri);
      });
    }
  }, [initialPhotos]);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [viewMode]);

  // Handle back navigation
  const handleBackPress = (): boolean => {
    if (viewMode === 'preview') {
      setViewMode('manager');
      return true;
    }
    
    if (viewMode === 'gallery') {
      setShowGallery(false);
      return true;
    }

    // If user has photos selected, confirm before leaving
    if (photoSelection.hasPhotos) {
      Alert.alert(
        'Discard Photos?',
        'Are you sure you want to discard your selected photos?',
        [
          { text: 'Keep Photos', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              photoSelection.actions.clearSelection();
              navigation.goBack();
            },
          },
        ]
      );
      return true;
    }

    return false;
  };

  // Handle header back button
  const handleHeaderBack = () => {
    handleBackPress();
  };

  // Handle photo reordering
  const handleReorder = (fromIndex: number, toIndex: number) => {
    photoSelection.actions.reorderPhotos(fromIndex, toIndex);
  };

  // Handle photo removal
  const handleRemove = (index: number) => {
    photoSelection.actions.removePhoto(index);
  };

  // Handle photo editing
  const handleEdit = (index: number) => {
    setPreviewIndex(index);
    setViewMode('preview');
  };

  // Handle set primary photo
  const handleSetPrimary = (index: number) => {
    photoSelection.actions.setPrimaryPhoto(index);
  };

  // Handle remove all photos
  const handleRemoveAll = () => {
    photoSelection.actions.clearSelection();
  };

  // Handle add more photos
  const handleAddMore = () => {
    if (photoSelection.remainingSlots > 0) {
      setShowGallery(true);
    } else {
      Alert.alert(
        'Maximum Photos Reached',
        `You can only select up to ${maxPhotos} photos per post.`,
        [{ text: 'OK' }]
      );
    }
  };

  // Handle gallery photo selection
  const handleGalleryPhotos = async (photoUris: string[]) => {
    const addedCount = await photoSelection.actions.addMultiplePhotos(photoUris);
    setShowGallery(false);
    
    if (addedCount > 0) {
      Alert.alert(
        'Photos Added',
        `${addedCount} photo${addedCount > 1 ? 's' : ''} added to your selection.`,
        [{ text: 'OK' }]
      );
    }
  };

  // Handle photo preview editing
  const handlePreviewEdit = (editedUri: string) => {
    if (previewIndex >= 0 && previewIndex < photoSelection.photos.length) {
      photoSelection.actions.updatePhoto(previewIndex, {
        uri: editedUri,
        isEdited: true,
      });
    }
  };

  // Handle retake photo (go back to camera)
  const handleRetake = () => {
    navigation.navigate('Camera');
  };

  // Handle continue from preview
  const handlePreviewContinue = (finalUri: string) => {
    if (previewIndex >= 0 && previewIndex < photoSelection.photos.length) {
      photoSelection.actions.updatePhoto(previewIndex, {
        uri: finalUri,
        isEdited: true,
      });
    }
    setViewMode('manager');
  };

  // Handle preview cancel
  const handlePreviewCancel = () => {
    setViewMode('manager');
  };

  // Handle continue to post creation
  const handleContinueToPost = async () => {
    if (!photoSelection.hasPhotos) {
      Alert.alert('No Photos', 'Please select at least one photo to continue.');
      return;
    }

    const validation = photoSelection.actions.validateSelection();
    if (!validation.valid) {
      Alert.alert('Invalid Selection', validation.errors.join('\n'));
      return;
    }

    try {
      // Upload photos
      Alert.alert(
        'Upload Photos',
        'Upload your photos to continue creating your post?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upload',
            onPress: async () => {
              const uploadResult = await photoSelection.actions.uploadPhotos(user.id);
              
              if (uploadResult.success && uploadResult.urls) {
                // Navigate to post creation with uploaded URLs
                navigation.navigate('PostCreation', {
                  photoUrls: uploadResult.urls,
                });
              } else {
                Alert.alert(
                  'Upload Failed',
                  uploadResult.errors?.join('\n') || 'Failed to upload photos. Please try again.',
                  [{ text: 'OK' }]
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error continuing to post:', error);
      Alert.alert('Error', 'Failed to process photos. Please try again.');
    }
  };

  // Render header
  const renderHeader = () => {
    let title = 'Select Photos';
    let showAddButton = false;

    switch (viewMode) {
      case 'preview':
        title = `Photo ${previewIndex + 1} of ${photoSelection.photoCount}`;
        break;
      case 'manager':
        title = photoSelection.hasPhotos 
          ? `${photoSelection.photoCount}/${maxPhotos} Photos`
          : 'Select Photos';
        showAddButton = photoSelection.remainingSlots > 0;
        break;
    }

    return (
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleHeaderBack}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>{title}</Text>
        
        {showAddButton ? (
          <TouchableOpacity style={styles.headerButton} onPress={handleAddMore}>
            <MaterialIcons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>
    );
  };

  // Render content based on view mode
  const renderContent = () => {
    switch (viewMode) {
      case 'preview':
        const currentPhoto = photoSelection.photos[previewIndex];
        if (!currentPhoto) return null;

        return (
          <PhotoPreview
            photoUri={currentPhoto.uri}
            onEdit={handlePreviewEdit}
            onRetake={handleRetake}
            onContinue={handlePreviewContinue}
            onCancel={handlePreviewCancel}
          />
        );

      case 'manager':
      default:
        if (!photoSelection.hasPhotos) {
          return (
            <View style={styles.emptyState}>
              <MaterialIcons name="photo-library" size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Photos Selected</Text>
              <Text style={styles.emptyText}>
                Add photos from your gallery or take new ones to create your post
              </Text>
              
              <View style={styles.emptyActions}>
                <Button
                  variant="outline"
                  size="large"
                  onPress={() => navigation.navigate('Camera')}
                  style={styles.emptyActionButton}
                  icon={<MaterialIcons name="camera-alt" size={20} color={colors.primary} />}
                >
                  Take Photo
                </Button>
                
                <Button
                  variant="primary"
                  size="large"
                  onPress={handleAddMore}
                  style={styles.emptyActionButton}
                  icon={<MaterialIcons name="photo-library" size={20} color={colors.white} />}
                >
                  Choose from Gallery
                </Button>
              </View>
            </View>
          );
        }

        return (
          <PhotoManager
            photos={photoSelection.photos}
            onReorder={handleReorder}
            onRemove={handleRemove}
            onEdit={handleEdit}
            onSetPrimary={handleSetPrimary}
            onRemoveAll={handleRemoveAll}
            isUploading={photoSelection.isUploading}
            uploadProgress={photoSelection.uploadProgress}
          />
        );
    }
  };

  // Render bottom actions
  const renderBottomActions = () => {
    if (viewMode === 'preview') return null;

    if (!photoSelection.hasPhotos) return null;

    return (
      <View style={styles.bottomActions}>
        <Button
          variant="outline"
          size="large"
          onPress={handleAddMore}
          style={styles.bottomActionButton}
          disabled={photoSelection.remainingSlots === 0 || photoSelection.isUploading}
        >
          Add More ({photoSelection.remainingSlots} left)
        </Button>
        
        <Button
          variant="primary"
          size="large"
          onPress={handleContinueToPost}
          style={styles.bottomActionButton}
          loading={photoSelection.isUploading}
          disabled={photoSelection.isUploading}
        >
          {photoSelection.isUploading ? 'Uploading...' : 'Continue to Post'}
        </Button>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <View style={styles.content}>
        {renderContent()}
      </View>
      
      {renderBottomActions()}

      {/* Gallery Modal */}
      {showGallery && (
        <View style={styles.galleryModal}>
          <PhotoGallery
            selectedPhotos={photoSelection.photos.map(p => p.uri)}
            onPhotosChange={handleGalleryPhotos}
            maxPhotos={photoSelection.remainingSlots}
            onClose={() => setShowGallery(false)}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },

  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },

  content: {
    flex: 1,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(4),
  },

  emptyTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginTop: spacing(3),
    marginBottom: spacing(1),
  },

  emptyText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.5,
    marginBottom: spacing(4),
  },

  emptyActions: {
    gap: spacing(3),
    width: '100%',
    maxWidth: 280,
  },

  emptyActionButton: {
    width: '100%',
  },

  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    gap: spacing(2),
  },

  bottomActionButton: {
    flex: 1,
  },

  galleryModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 100,
  },
});