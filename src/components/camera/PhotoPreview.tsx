/**
 * PhotoPreview Component
 * Photo preview and basic editing interface for captured photos
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  ScrollView,
  Animated,
  PanResponder,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts } from '../../theme/uiTheme';
import Button from '../ui/Button';
import { rotateImage, cropImage, processImageForUpload } from '../../lib/imageUtils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PhotoPreviewProps {
  photoUri: string;
  onEdit?: (editedUri: string) => void;
  onRetake: () => void;
  onContinue: (finalUri: string) => void;
  onCancel: () => void;
}

interface EditingState {
  rotation: number;
  brightness: number;
  contrast: number;
  saturation: number;
}

export default function PhotoPreview({
  photoUri,
  onEdit,
  onRetake,
  onContinue,
  onCancel,
}: PhotoPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState(photoUri);
  const [editingState, setEditingState] = useState<EditingState>({
    rotation: 0,
    brightness: 0,
    contrast: 0,
    saturation: 0,
  });

  // Pan and zoom state
  const [scale] = useState(new Animated.Value(1));
  const [panX] = useState(new Animated.Value(0));
  const [panY] = useState(new Animated.Value(0));
  const [lastScale, setLastScale] = useState(1);
  const [lastPanX, setLastPanX] = useState(0);
  const [lastPanY, setLastPanY] = useState(0);

  // Pan responder for zoom and pan functionality
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        scale.setOffset(lastScale);
        panX.setOffset(lastPanX);
        panY.setOffset(lastPanY);
        scale.setValue(1);
        panX.setValue(0);
        panY.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        // Handle pinch to zoom (simplified)
        if (evt.nativeEvent.touches?.length === 2) {
          // This would require more complex gesture handling for real pinch-to-zoom
          return;
        }
        
        // Handle pan
        panX.setValue(gestureState.dx);
        panY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const newLastPanX = lastPanX + gestureState.dx;
        const newLastPanY = lastPanY + gestureState.dy;
        
        setLastPanX(newLastPanX);
        setLastPanY(newLastPanY);
        
        panX.flattenOffset();
        panY.flattenOffset();
        scale.flattenOffset();
      },
    })
  ).current;

  // Reset zoom and pan
  const resetZoomPan = () => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(panX, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(panY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setLastScale(1);
      setLastPanX(0);
      setLastPanY(0);
    });
  };

  // Handle rotation
  const handleRotate = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const newRotation = (editingState.rotation + 90) % 360;
      const result = await rotateImage(currentImageUri, 90);
      
      if (result.success && result.uri) {
        setCurrentImageUri(result.uri);
        setEditingState(prev => ({ ...prev, rotation: newRotation }));
        onEdit?.(result.uri);
      } else {
        Alert.alert('Error', 'Failed to rotate image');
      }
    } catch (error) {
      console.error('Error rotating image:', error);
      Alert.alert('Error', 'Failed to rotate image');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle continue (process image for upload)
  const handleContinue = async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      console.log('Processing image for upload...');
      
      // Process image for optimal upload
      const result = await processImageForUpload(currentImageUri, {
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1080,
      });

      if (result.success && result.uri) {
        onContinue(result.uri);
      } else {
        throw new Error(result.error || 'Failed to process image');
      }

    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert(
        'Processing Error',
        'Failed to prepare image for upload. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle editing mode
  const toggleEditing = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      resetZoomPan();
    }
  };

  // Render editing controls
  const renderEditingControls = () => (
    <View style={styles.editingControls}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.editingScrollContent}
      >
        {/* Rotate Button */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleRotate}
          disabled={isProcessing}
        >
          <MaterialIcons name="rotate-right" size={24} color={colors.white} />
          <Text style={styles.editButtonText}>Rotate</Text>
        </TouchableOpacity>

        {/* Reset Button */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={resetZoomPan}
        >
          <MaterialIcons name="center-focus-strong" size={24} color={colors.white} />
          <Text style={styles.editButtonText}>Reset</Text>
        </TouchableOpacity>

        {/* Placeholder for more editing tools */}
        <TouchableOpacity
          style={[styles.editButton, styles.disabledButton]}
          disabled
        >
          <MaterialIcons name="tune" size={24} color={colors.textMuted} />
          <Text style={[styles.editButtonText, styles.disabledText]}>Filters</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.editButton, styles.disabledButton]}
          disabled
        >
          <MaterialIcons name="crop" size={24} color={colors.textMuted} />
          <Text style={[styles.editButtonText, styles.disabledText]}>Crop</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Photo Display Area */}
      <View style={styles.photoContainer}>
        <Animated.View
          style={[
            styles.imageWrapper,
            {
              transform: [
                { scale },
                { translateX: panX },
                { translateY: panY },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Image
            source={{ uri: currentImageUri }}
            style={styles.image}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Top Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity
            style={styles.topButton}
            onPress={onCancel}
          >
            <MaterialIcons name="close" size={24} color={colors.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topButton, isEditing && styles.activeButton]}
            onPress={toggleEditing}
          >
            <MaterialIcons 
              name="edit" 
              size={24} 
              color={isEditing ? colors.primary : colors.white} 
            />
          </TouchableOpacity>
        </View>

        {/* Processing Indicator */}
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <View style={styles.processingIndicator}>
              <Text style={styles.processingText}>Processing...</Text>
            </View>
          </View>
        )}
      </View>

      {/* Editing Controls */}
      {isEditing && renderEditingControls()}

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Button
          variant="outline"
          size="medium"
          onPress={onRetake}
          style={styles.actionButton}
          disabled={isProcessing}
        >
          Retake
        </Button>

        <Button
          variant="primary"
          size="medium"
          onPress={handleContinue}
          style={styles.actionButton}
          loading={isProcessing}
          disabled={isProcessing}
        >
          Continue
        </Button>
      </View>

      {/* Help Text */}
      {!isEditing && (
        <Text style={styles.helpText}>
          Pinch to zoom • Tap edit for more options
        </Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },

  photoContainer: {
    flex: 1,
    position: 'relative',
  },

  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
    maxWidth: '100%',
    maxHeight: '100%',
  },

  topControls: {
    position: 'absolute',
    top: spacing(2),
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
  },

  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.8)', // primary color with opacity
  },

  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  processingIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    borderRadius: 20,
  },

  processingText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.white,
  },

  editingControls: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingVertical: spacing(2),
  },

  editingScrollContent: {
    paddingHorizontal: spacing(3),
    gap: spacing(3),
  },

  editButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 70,
  },

  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },

  editButtonText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.medium,
    color: colors.white,
    marginTop: spacing(0.5),
  },

  disabledText: {
    color: colors.textMuted,
  },

  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    gap: spacing(3),
  },

  actionButton: {
    flex: 1,
    minHeight: 50,
  },

  helpText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
});