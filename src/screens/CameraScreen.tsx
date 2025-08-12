/**
 * CameraScreen Component
 * Full-screen camera interface for capturing food photos
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Alert,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CameraScreenProps } from '../navigation/types';
import PhotoCapture from '../components/camera/PhotoCapture';
import PhotoGallery from '../components/camera/PhotoGallery';
import { colors, spacing, fonts } from '../theme/uiTheme';
import { usePhotoSelection } from '../hooks/usePhotoSelection';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CameraScreen({ navigation }: CameraScreenProps) {
  const insets = useSafeAreaInsets();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashMode, setFlashMode] = useState<FlashMode>('auto');
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [showGrid, setShowGrid] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  const cameraRef = useRef<CameraView | null>(null);
  const photoSelection = usePhotoSelection(5);

  // Request camera permissions on mount
  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Handle camera ready state
  const handleCameraReady = () => {
    setIsCameraReady(true);
  };

  // Handle photo capture
  const handleCapture = async (photoUri: string) => {
    setIsCapturing(true);
    
    try {
      // Add captured photo to selection
      const success = await photoSelection.actions.addPhoto(photoUri);
      
      if (success) {
        // Navigate to photo selection screen or show success
        Alert.alert(
          'Photo Captured!',
          photoSelection.hasPhotos 
            ? `${photoSelection.photoCount} photo${photoSelection.photoCount > 1 ? 's' : ''} selected. Continue to create your post?`
            : 'Photo captured successfully!',
          [
            { text: 'Take Another', style: 'cancel' },
            { 
              text: photoSelection.hasPhotos ? 'Create Post' : 'Continue', 
              onPress: handleContinueToSelection 
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error handling captured photo:', error);
      Alert.alert(
        'Error',
        'Failed to process photo. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle flash mode toggle
  const handleFlashToggle = () => {
    const modes: FlashMode[] = ['auto', 'on', 'off'];
    const currentIndex = modes.indexOf(flashMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setFlashMode(modes[nextIndex]);
  };

  // Handle camera flip
  const handleCameraFlip = () => {
    setCameraType(current => current === 'back' ? 'front' : 'back');
  };

  // Handle grid toggle
  const handleGridToggle = () => {
    setShowGrid(current => !current);
  };

  // Handle zoom change
  const handleZoomChange = (zoom: number) => {
    setZoomLevel(Math.max(0, Math.min(1, zoom)));
  };

  // Handle close button
  const handleClose = () => {
    navigation.goBack();
  };

  // Handle gallery toggle
  const handleGalleryToggle = () => {
    setShowGallery(!showGallery);
  };

  // Handle gallery photo selection
  const handleGalleryPhotos = async (photoUris: string[]) => {
    const addedCount = await photoSelection.actions.addMultiplePhotos(photoUris);
    setShowGallery(false);
    
    if (addedCount > 0) {
      Alert.alert(
        'Photos Added',
        `${addedCount} photo${addedCount > 1 ? 's' : ''} added to your selection.`,
        [
          { text: 'Add More', style: 'cancel' },
          { text: 'Create Post', onPress: handleContinueToSelection }
        ]
      );
    }
  };

  // Handle continue to photo selection screen
  const handleContinueToSelection = () => {
    if (photoSelection.hasPhotos) {
      // Navigate to CreatePost screen with selected photos
      (navigation as any).navigate('CreatePost', {
        photos: photoSelection.selectedPhotos,
      });
    }
  };

  // Handle gallery access from bottom controls
  const handleGalleryAccess = () => {
    setShowGallery(true);
  };

  // Show permission request screen
  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Requesting camera permissions...</Text>
      </View>
    );
  }

  // Show permission denied screen
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialIcons name="camera-alt" size={64} color={colors.textMuted} />
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionText}>
          Palate needs access to your camera to let you capture photos of your meals.
        </Text>
        
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
        hidden={false}
      />

      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraType}
        flash={flashMode}
        zoom={zoomLevel}
        onCameraReady={handleCameraReady}
      />

      {/* Camera Controls Overlay */}
      {isCameraReady && (
        <PhotoCapture
          onCapture={handleCapture}
          cameraRef={cameraRef}
          isCapturing={isCapturing}
          flashMode={flashMode}
          cameraType={cameraType}
          onFlashToggle={handleFlashToggle}
          onCameraFlip={handleCameraFlip}
          onGridToggle={handleGridToggle}
          showGrid={showGrid}
          zoomLevel={zoomLevel}
          onZoomChange={handleZoomChange}
        />
      )}

      {/* Gallery Access Button */}
      <TouchableOpacity
        style={[styles.galleryAccessButton, { bottom: insets.bottom + spacing(12) }]}
        onPress={handleGalleryAccess}
        activeOpacity={0.7}
      >
        <MaterialIcons name="photo-library" size={24} color={colors.white} />
        {photoSelection.hasPhotos && (
          <View style={styles.photoCountBadge}>
            <Text style={styles.photoCountText}>{photoSelection.photoCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Selected Photos Indicator */}
      {photoSelection.hasPhotos && (
        <View style={[styles.selectedPhotosIndicator, { bottom: insets.bottom + spacing(2) }]}>
          <Text style={styles.selectedPhotosText}>
            {photoSelection.photoCount}/{photoSelection.maxPhotos} photos selected
          </Text>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinueToSelection}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Close Button */}
      <TouchableOpacity
        style={[styles.closeButtonOverlay, { top: insets.top + spacing(2) }]}
        onPress={handleClose}
        activeOpacity={0.7}
      >
        <MaterialIcons name="close" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* Camera Type Indicator */}
      <View style={[styles.cameraIndicator, { top: insets.top + spacing(2) }]}>
        <Text style={styles.cameraIndicatorText}>
          {cameraType === 'back' ? 'Back Camera' : 'Front Camera'}
        </Text>
      </View>

      {/* Loading Overlay */}
      {!isCameraReady && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Initializing camera...</Text>
        </View>
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },

  camera: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },

  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing(4),
  },

  permissionTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing(3),
    marginBottom: spacing(2),
  },

  permissionText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.5,
    marginBottom: spacing(4),
  },

  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
    borderRadius: 25,
    marginBottom: spacing(2),
    minWidth: 200,
  },

  permissionButtonText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.white,
    textAlign: 'center',
  },

  closeButton: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },

  closeButtonText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  closeButtonOverlay: {
    position: 'absolute',
    left: spacing(3),
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  cameraIndicator: {
    position: 'absolute',
    right: spacing(3),
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: 12,
    zIndex: 10,
  },

  cameraIndicatorText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.medium,
    color: colors.white,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },

  loadingText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.white,
  },

  galleryAccessButton: {
    position: 'absolute',
    left: spacing(3),
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  photoCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },

  photoCountText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.bold,
    color: colors.white,
  },

  selectedPhotosIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  selectedPhotosText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.white,
  },

  continueButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: 20,
  },

  continueButtonText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.white,
  },

  galleryModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 100,
  },
});