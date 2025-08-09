/**
 * PhotoCapture Component
 * Camera capture controls with Instagram-style interface
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { colors, spacing, fonts } from '../../theme/uiTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type FlashMode = 'auto' | 'on' | 'off';
export type CameraType = 'front' | 'back';

interface PhotoCaptureProps {
  onCapture: (photoUri: string) => void;
  cameraRef: React.RefObject<CameraView>;
  isCapturing: boolean;
  flashMode: FlashMode;
  cameraType: CameraType;
  onFlashToggle: () => void;
  onCameraFlip: () => void;
  onGridToggle?: () => void;
  showGrid?: boolean;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
}

export default function PhotoCapture({
  onCapture,
  cameraRef,
  isCapturing,
  flashMode,
  cameraType,
  onFlashToggle,
  onCameraFlip,
  onGridToggle,
  showGrid = false,
  zoomLevel = 0,
  onZoomChange,
}: PhotoCaptureProps) {
  const [captureAnimation] = useState(new Animated.Value(1));

  const handleCapture = async () => {
    if (isCapturing || !cameraRef.current) {
      return;
    }

    try {
      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Animate capture button
      Animated.sequence([
        Animated.timing(captureAnimation, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(captureAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Capture photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: false,
        skipProcessing: false,
      });

      if (photo?.uri) {
        onCapture(photo.uri);
      }

    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert(
        'Camera Error', 
        'Failed to capture photo. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const getFlashIcon = (mode: FlashMode): keyof typeof MaterialIcons.glyphMap => {
    switch (mode) {
      case 'auto':
        return 'flash-auto';
      case 'on':
        return 'flash-on';
      case 'off':
        return 'flash-off';
      default:
        return 'flash-auto';
    }
  };

  const getFlashLabel = (mode: FlashMode): string => {
    switch (mode) {
      case 'auto':
        return 'Auto';
      case 'on':
        return 'On';
      case 'off':
        return 'Off';
      default:
        return 'Auto';
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Controls */}
      <View style={styles.topControls}>
        {/* Flash Control */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={onFlashToggle}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={getFlashIcon(flashMode)}
            size={24}
            color={colors.white}
          />
          <Text style={styles.controlLabel}>{getFlashLabel(flashMode)}</Text>
        </TouchableOpacity>

        {/* Grid Toggle */}
        {onGridToggle && (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={onGridToggle}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="grid-on"
              size={24}
              color={showGrid ? colors.warning : colors.white}
            />
            <Text style={[
              styles.controlLabel,
              showGrid && { color: colors.warning }
            ]}>
              Grid
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {/* Camera Flip Button */}
        <TouchableOpacity
          style={styles.flipButton}
          onPress={onCameraFlip}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="flip-camera-ios"
            size={32}
            color={colors.white}
          />
        </TouchableOpacity>

        {/* Capture Button */}
        <View style={styles.captureButtonContainer}>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleCapture}
            activeOpacity={0.8}
            disabled={isCapturing}
          >
            <Animated.View
              style={[
                styles.captureButtonInner,
                {
                  transform: [{ scale: captureAnimation }],
                  opacity: isCapturing ? 0.5 : 1,
                },
              ]}
            />
          </TouchableOpacity>
          
          {isCapturing && (
            <View style={styles.capturingIndicator}>
              <Text style={styles.capturingText}>Processing...</Text>
            </View>
          )}
        </View>

        {/* Photo Library Button (Placeholder) */}
        <TouchableOpacity
          style={styles.libraryButton}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="photo-library"
            size={28}
            color={colors.white}
          />
        </TouchableOpacity>
      </View>

      {/* Zoom Control */}
      {onZoomChange && (
        <View style={styles.zoomContainer}>
          <View style={styles.zoomSliderContainer}>
            <Text style={styles.zoomLabel}>1x</Text>
            <View style={styles.zoomSlider}>
              <View
                style={[
                  styles.zoomProgress,
                  { width: `${zoomLevel * 100}%` }
                ]}
              />
            </View>
            <Text style={styles.zoomLabel}>3x</Text>
          </View>
        </View>
      )}

      {/* Grid Overlay */}
      {showGrid && (
        <View style={styles.gridOverlay} pointerEvents="none">
          {/* Vertical lines */}
          <View style={[styles.gridLine, styles.gridVertical, { left: '33.33%' }]} />
          <View style={[styles.gridLine, styles.gridVertical, { left: '66.66%' }]} />
          
          {/* Horizontal lines */}
          <View style={[styles.gridLine, styles.gridHorizontal, { top: '33.33%' }]} />
          <View style={[styles.gridLine, styles.gridHorizontal, { top: '66.66%' }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },

  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: spacing(6),
    paddingHorizontal: spacing(4),
  },

  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    minWidth: 60,
  },

  controlLabel: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.medium,
    color: colors.white,
    marginTop: spacing(0.5),
  },

  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing(8),
    paddingHorizontal: spacing(6),
  },

  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  captureButtonContainer: {
    alignItems: 'center',
    position: 'relative',
  },

  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.white,
  },

  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
  },

  capturingIndicator: {
    position: 'absolute',
    top: -30,
    alignItems: 'center',
  },

  capturingText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.white,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: 12,
  },

  libraryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  zoomContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  zoomSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },

  zoomLabel: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.white,
  },

  zoomSlider: {
    width: 100,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginHorizontal: spacing(2),
    overflow: 'hidden',
  },

  zoomProgress: {
    height: '100%',
    backgroundColor: colors.white,
    borderRadius: 2,
  },

  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },

  gridVertical: {
    top: 0,
    bottom: 0,
    width: 1,
  },

  gridHorizontal: {
    left: 0,
    right: 0,
    height: 1,
  },
});