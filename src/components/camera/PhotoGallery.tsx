/**
 * PhotoGallery Component
 * Photo gallery selection with multiple photo support using expo-image-picker
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts } from '../../theme/uiTheme';
import Button from '../ui/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - spacing(4) * 2 - spacing(2) * 2) / 3;

interface PhotoGalleryProps {
  selectedPhotos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  onClose: () => void;
}

interface GalleryPhoto {
  uri: string;
  selected: boolean;
  selectionOrder?: number;
}

export default function PhotoGallery({
  selectedPhotos,
  onPhotosChange,
  maxPhotos = 5,
  onClose,
}: PhotoGalleryProps) {
  const [permission, requestPermission] = ImagePicker.useMediaLibraryPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [localSelection, setLocalSelection] = useState<string[]>(selectedPhotos);

  // Check permissions on mount
  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Handle photo selection from device gallery
  const handleSelectFromGallery = async (allowMultiple: boolean = true) => {
    if (!permission?.granted) {
      Alert.alert(
        'Permission Required',
        'Please grant access to your photo library to select photos.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant Permission', onPress: requestPermission },
        ]
      );
      return;
    }

    setIsLoading(true);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: allowMultiple && localSelection.length < maxPhotos,
        selectionLimit: allowMultiple ? Math.max(1, maxPhotos - localSelection.length) : 1,
        quality: 1,
        aspect: undefined, // Allow any aspect ratio
        allowsEditing: false, // We'll handle editing separately
      });

      if (!result.canceled && result.assets?.length > 0) {
        const newPhotos = result.assets.map(asset => asset.uri);
        const updatedSelection = [...localSelection];

        // Add new photos up to the limit
        for (const photoUri of newPhotos) {
          if (updatedSelection.length >= maxPhotos) break;
          if (!updatedSelection.includes(photoUri)) {
            updatedSelection.push(photoUri);
          }
        }

        setLocalSelection(updatedSelection);

        // Show feedback if we hit the limit
        if (updatedSelection.length >= maxPhotos && newPhotos.length > (maxPhotos - localSelection.length)) {
          Alert.alert(
            'Photo Limit Reached',
            `You can only select up to ${maxPhotos} photos. The first ${maxPhotos - localSelection.length} photo${maxPhotos - localSelection.length === 1 ? ' was' : 's were'} added.`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error selecting photos from gallery:', error);
      Alert.alert(
        'Error',
        'Failed to access photo gallery. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle single photo selection
  const handleSelectSinglePhoto = () => {
    handleSelectFromGallery(false);
  };

  // Handle multiple photo selection
  const handleSelectMultiplePhotos = () => {
    handleSelectFromGallery(true);
  };

  // Remove photo from selection
  const handleRemovePhoto = (photoUri: string) => {
    const updatedSelection = localSelection.filter(uri => uri !== photoUri);
    setLocalSelection(updatedSelection);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Clear all selected photos
  const handleClearAll = () => {
    Alert.alert(
      'Clear All Photos',
      'Are you sure you want to remove all selected photos?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            setLocalSelection([]);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
  };

  // Apply selection and close
  const handleApplySelection = () => {
    onPhotosChange(localSelection);
    onClose();
  };

  // Render selected photo item
  const renderSelectedPhoto = ({ item: photoUri, index }: { item: string; index: number }) => (
    <View style={styles.selectedPhotoContainer}>
      <Image source={{ uri: photoUri }} style={styles.selectedPhoto} />
      
      {/* Selection order indicator */}
      <View style={styles.selectionOrder}>
        <Text style={styles.selectionOrderText}>{index + 1}</Text>
      </View>

      {/* Remove button */}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemovePhoto(photoUri)}
        activeOpacity={0.7}
      >
        <MaterialIcons name="close" size={16} color={colors.white} />
      </TouchableOpacity>

      {/* Primary photo indicator */}
      {index === 0 && (
        <View style={styles.primaryIndicator}>
          <MaterialIcons name="star" size={12} color={colors.warning} />
        </View>
      )}
    </View>
  );

  // Show permission denied screen
  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Photo Gallery</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.permissionContainer}>
          <MaterialIcons name="photo-library" size={64} color={colors.textMuted} />
          <Text style={styles.permissionTitle}>Photo Library Access</Text>
          <Text style={styles.permissionText}>
            Palate needs access to your photo library to let you select photos for your posts.
          </Text>
          
          <Button
            variant="primary"
            size="large"
            onPress={requestPermission}
            style={styles.permissionButton}
          >
            Grant Permission
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <MaterialIcons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Photos</Text>
        {localSelection.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Selection Counter */}
      <View style={styles.counterContainer}>
        <Text style={styles.counterText}>
          {localSelection.length}/{maxPhotos} photos selected
        </Text>
        {localSelection.length > 0 && (
          <Text style={styles.primaryText}>
            First photo will be your cover image
          </Text>
        )}
      </View>

      {/* Selected Photos Grid */}
      {localSelection.length > 0 && (
        <View style={styles.selectedSection}>
          <Text style={styles.sectionTitle}>Selected Photos</Text>
          <FlatList
            data={localSelection}
            renderItem={renderSelectedPhoto}
            keyExtractor={(item, index) => `${item}_${index}`}
            numColumns={3}
            scrollEnabled={false}
            contentContainerStyle={styles.selectedGrid}
          />
        </View>
      )}

      {/* Selection Actions */}
      <View style={styles.actionsContainer}>
        {localSelection.length < maxPhotos && (
          <>
            <Button
              variant="outline"
              size="large"
              onPress={handleSelectSinglePhoto}
              style={styles.actionButton}
              loading={isLoading}
              disabled={isLoading}
              icon={<MaterialIcons name="photo" size={20} color={colors.primary} />}
            >
              Add Single Photo
            </Button>

            {localSelection.length < maxPhotos - 1 && (
              <Button
                variant="primary"
                size="large"
                onPress={handleSelectMultiplePhotos}
                style={styles.actionButton}
                loading={isLoading}
                disabled={isLoading}
                icon={<MaterialIcons name="photo-library" size={20} color={colors.white} />}
              >
                Add Multiple Photos
              </Button>
            )}
          </>
        )}

        {localSelection.length >= maxPhotos && (
          <View style={styles.limitReachedContainer}>
            <MaterialIcons name="info" size={20} color={colors.warning} />
            <Text style={styles.limitReachedText}>
              Maximum {maxPhotos} photos selected
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Actions */}
      {localSelection.length > 0 && (
        <View style={styles.bottomActions}>
          <Button
            variant="primary"
            size="large"
            onPress={handleApplySelection}
            style={styles.usePhotosButton}
          >
            Use Selected Photos ({localSelection.length})
          </Button>
        </View>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading photos...</Text>
          </View>
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
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },

  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },

  headerSpacer: {
    width: 40,
  },

  clearAllText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.error,
  },

  counterContainer: {
    alignItems: 'center',
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(4),
  },

  counterText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(0.5),
  },

  primaryText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
  },

  selectedSection: {
    paddingHorizontal: spacing(3),
    marginBottom: spacing(3),
  },

  sectionTitle: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(2),
  },

  selectedGrid: {
    gap: spacing(1),
  },

  selectedPhotoContainer: {
    position: 'relative',
    margin: spacing(0.5),
  },

  selectedPhoto: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
  },

  selectionOrder: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectionOrderText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.bold,
    color: colors.white,
  },

  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionsContainer: {
    paddingHorizontal: spacing(3),
    gap: spacing(2),
  },

  actionButton: {
    width: '100%',
  },

  limitReachedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(2),
    gap: spacing(1),
  },

  limitReachedText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.warning,
  },

  bottomActions: {
    marginTop: 'auto',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },

  usePhotosButton: {
    width: '100%',
  },

  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    minWidth: 200,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    borderRadius: 12,
  },

  loadingText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.text,
    marginTop: spacing(2),
  },
});