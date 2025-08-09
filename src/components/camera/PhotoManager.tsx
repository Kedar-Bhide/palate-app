/**
 * PhotoManager Component
 * Component to manage multiple selected photos with reordering, editing, and removal
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts } from '../../theme/uiTheme';
import Button from '../ui/Button';
import { PhotoItem } from '../../hooks/usePhotoSelection';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_WIDTH = 120;
const PHOTO_HEIGHT = 120;

interface PhotoManagerProps {
  photos: PhotoItem[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (index: number) => void;
  onEdit?: (index: number) => void;
  onSetPrimary: (index: number) => void;
  onRemoveAll?: () => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

interface DragState {
  isDragging: boolean;
  dragIndex: number | null;
  draggedItem: PhotoItem | null;
}

export default function PhotoManager({
  photos,
  onReorder,
  onRemove,
  onEdit,
  onSetPrimary,
  onRemoveAll,
  isUploading = false,
  uploadProgress = 0,
}: PhotoManagerProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragIndex: null,
    draggedItem: null,
  });

  // Handle photo removal with confirmation
  const handleRemovePhoto = (index: number) => {
    const photo = photos[index];
    const isLastPhoto = photos.length === 1;
    
    const title = isLastPhoto ? 'Remove Photo' : 'Remove Photo';
    const message = isLastPhoto 
      ? 'Are you sure you want to remove this photo? Your selection will be empty.'
      : `Are you sure you want to remove photo ${index + 1}?`;

    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onRemove(index);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
  };

  // Handle setting primary photo
  const handleSetPrimary = (index: number) => {
    if (index === 0) return; // Already primary
    
    Alert.alert(
      'Set Cover Photo',
      `Make photo ${index + 1} your cover photo?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set as Cover',
          onPress: () => {
            onSetPrimary(index);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
      ]
    );
  };

  // Handle remove all photos
  const handleRemoveAll = () => {
    if (!onRemoveAll) return;
    
    Alert.alert(
      'Remove All Photos',
      'Are you sure you want to remove all selected photos?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove All',
          style: 'destructive',
          onPress: () => {
            onRemoveAll();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          },
        },
      ]
    );
  };

  // Render individual photo item
  const renderPhotoItem = (photo: PhotoItem, index: number) => {
    const isPrimary = index === 0;
    const isUploaded = !!photo.uploadUrl;
    const hasProgress = typeof photo.uploadProgress === 'number';

    return (
      <View key={photo.id} style={styles.photoItemContainer}>
        {/* Photo Image */}
        <TouchableOpacity
          style={[styles.photoItem, isPrimary && styles.primaryPhoto]}
          onPress={() => onEdit?.(index)}
          onLongPress={() => handleSetPrimary(index)}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: photo.thumbnailUri || photo.uri }}
            style={styles.photoImage}
          />

          {/* Upload Progress */}
          {isUploading && hasProgress && (
            <View style={styles.progressOverlay}>
              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${photo.uploadProgress || 0}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{Math.round(photo.uploadProgress || 0)}%</Text>
            </View>
          )}

          {/* Upload Success Indicator */}
          {isUploaded && (
            <View style={styles.successIndicator}>
              <MaterialIcons name="check-circle" size={16} color={colors.success} />
            </View>
          )}

          {/* Primary Photo Badge */}
          {isPrimary && (
            <View style={styles.primaryBadge}>
              <MaterialIcons name="star" size={12} color={colors.warning} />
            </View>
          )}

          {/* Edited Indicator */}
          {photo.isEdited && (
            <View style={styles.editedIndicator}>
              <MaterialIcons name="edit" size={12} color={colors.primary} />
            </View>
          )}
        </TouchableOpacity>

        {/* Photo Controls */}
        <View style={styles.photoControls}>
          {/* Photo Index */}
          <Text style={styles.photoIndex}>{index + 1}</Text>

          {/* Action Buttons */}
          <View style={styles.photoActions}>
            {/* Edit Button */}
            {onEdit && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onEdit(index)}
                disabled={isUploading}
              >
                <MaterialIcons 
                  name="edit" 
                  size={16} 
                  color={isUploading ? colors.textMuted : colors.primary} 
                />
              </TouchableOpacity>
            )}

            {/* Set Primary Button */}
            {!isPrimary && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleSetPrimary(index)}
                disabled={isUploading}
              >
                <MaterialIcons 
                  name="star-outline" 
                  size={16} 
                  color={isUploading ? colors.textMuted : colors.warning} 
                />
              </TouchableOpacity>
            )}

            {/* Remove Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleRemovePhoto(index)}
              disabled={isUploading}
            >
              <MaterialIcons 
                name="close" 
                size={16} 
                color={isUploading ? colors.textMuted : colors.error} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Drag Handle (placeholder for future drag implementation) */}
        <TouchableOpacity style={styles.dragHandle} disabled>
          <MaterialIcons name="drag-handle" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    );
  };

  if (photos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="photo-library" size={48} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No Photos Selected</Text>
        <Text style={styles.emptyText}>
          Select photos to create your post
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {photos.length} Photo{photos.length !== 1 ? 's' : ''} Selected
          </Text>
          <Text style={styles.headerSubtitle}>
            First photo is your cover image
          </Text>
        </View>

        {/* Batch Actions */}
        {photos.length > 1 && onRemoveAll && (
          <TouchableOpacity
            style={styles.removeAllButton}
            onPress={handleRemoveAll}
            disabled={isUploading}
          >
            <MaterialIcons 
              name="delete" 
              size={20} 
              color={isUploading ? colors.textMuted : colors.error} 
            />
            <Text style={[
              styles.removeAllText,
              isUploading && styles.disabledText
            ]}>
              Remove All
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Upload Progress (Global) */}
      {isUploading && (
        <View style={styles.globalProgressContainer}>
          <View style={styles.globalProgressBar}>
            <View
              style={[
                styles.globalProgressFill,
                { width: `${uploadProgress}%` },
              ]}
            />
          </View>
          <Text style={styles.globalProgressText}>
            Uploading photos... {Math.round(uploadProgress)}%
          </Text>
        </View>
      )}

      {/* Photos List */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photosContainer}
        scrollEnabled={!isUploading}
      >
        {photos.map((photo, index) => renderPhotoItem(photo, index))}
      </ScrollView>

      {/* Help Text */}
      <View style={styles.helpContainer}>
        <Text style={styles.helpText}>
          • Tap to edit • Long press to set as cover • Drag to reorder (coming soon)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },

  headerTitle: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },

  headerSubtitle: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    marginTop: spacing(0.25),
  },

  removeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },

  removeAllText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.error,
  },

  disabledText: {
    color: colors.textMuted,
  },

  globalProgressContainer: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: colors.surfaceVariant,
  },

  globalProgressBar: {
    height: 4,
    backgroundColor: colors.outline,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing(1),
  },

  globalProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  globalProgressText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.text,
    textAlign: 'center',
  },

  photosContainer: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(3),
    gap: spacing(3),
  },

  photoItemContainer: {
    alignItems: 'center',
    width: PHOTO_WIDTH,
  },

  photoItem: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },

  primaryPhoto: {
    borderColor: colors.primary,
    borderWidth: 3,
  },

  photoImage: {
    width: '100%',
    height: '100%',
  },

  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressContainer: {
    width: '60%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing(1),
  },

  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  progressText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.bold,
    color: colors.white,
  },

  successIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 2,
  },

  primaryBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: colors.black,
    borderRadius: 8,
    padding: 2,
  },

  editedIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 2,
  },

  photoControls: {
    alignItems: 'center',
    marginTop: spacing(1),
    gap: spacing(1),
  },

  photoIndex: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },

  photoActions: {
    flexDirection: 'row',
    gap: spacing(1),
  },

  actionButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: colors.surfaceVariant,
  },

  dragHandle: {
    marginTop: spacing(0.5),
    padding: spacing(0.5),
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(8),
    paddingHorizontal: spacing(4),
  },

  emptyTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginTop: spacing(2),
    marginBottom: spacing(1),
  },

  emptyText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  helpContainer: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: colors.surfaceVariant,
  },

  helpText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.xs * 1.4,
  },
});