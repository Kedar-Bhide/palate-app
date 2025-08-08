import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { CameraScreenProps } from '../navigation/types';
import { theme } from '../theme';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const CameraScreen: React.FC<CameraScreenProps> = ({ navigation }) => {
  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleTakePhoto = () => {
    // Placeholder for camera functionality
    console.log('Take photo pressed');
  };

  const handleSelectFromGallery = () => {
    // Placeholder for gallery functionality
    console.log('Select from gallery pressed');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share Your Food</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Camera Placeholder */}
      <View style={styles.cameraContainer}>
        <View style={styles.cameraPlaceholder}>
          <MaterialIcons
            name="camera-alt"
            size={80}
            color={theme.colors.gray[400]}
            style={styles.cameraIcon}
          />
          <Text style={styles.cameraTitle}>Camera Coming Soon</Text>
          <Text style={styles.cameraSubtitle}>
            Capture and share your delicious moments
          </Text>
        </View>

        {/* Camera Controls Overlay */}
        <View style={styles.overlayTop}>
          <TouchableOpacity style={styles.overlayButton}>
            <MaterialIcons name="flash-off" size={24} color={theme.colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.overlayButton}>
            <MaterialIcons name="flip-camera-ios" size={24} color={theme.colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.overlayBottom}>
          {/* Gallery Button */}
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={handleSelectFromGallery}
            accessibilityRole="button"
            accessibilityLabel="Select from gallery"
          >
            <MaterialIcons name="photo-library" size={24} color={theme.colors.white} />
          </TouchableOpacity>

          {/* Capture Button */}
          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleTakePhoto}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          {/* Settings Button */}
          <TouchableOpacity
            style={styles.settingsButton}
            accessibilityRole="button"
            accessibilityLabel="Camera settings"
          >
            <MaterialIcons name="settings" size={24} color={theme.colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Card variant="elevated" padding="large" style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <Button
              variant="primary"
              size="medium"
              onPress={handleTakePhoto}
              style={styles.actionButton}
              icon={<MaterialIcons name="camera-alt" size={20} color={theme.colors.white} />}
            >
              Take Photo
            </Button>
            <Button
              variant="outline"
              size="medium"
              onPress={handleSelectFromGallery}
              style={styles.actionButton}
              icon={<MaterialIcons name="photo-library" size={20} color={theme.colors.primary} />}
            >
              From Gallery
            </Button>
          </View>
          
          <Text style={styles.comingSoonText}>
            📸 Full camera functionality coming in the next update
          </Text>
        </Card>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backButton: {
    padding: theme.spacing.sm,
    marginLeft: -theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.white,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  cameraPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.gray[900],
  },
  cameraIcon: {
    marginBottom: theme.spacing.lg,
    opacity: 0.6,
  },
  cameraTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.white,
    marginBottom: theme.spacing.sm,
  },
  cameraSubtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.gray[400],
    textAlign: 'center',
    maxWidth: 250,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
  overlayTop: {
    position: 'absolute',
    top: theme.spacing.lg,
    right: theme.spacing.lg,
    flexDirection: 'row',
  },
  overlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.sm,
  },
  overlayBottom: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing.xl,
  },
  galleryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: theme.colors.gray[300],
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.white,
    borderWidth: 2,
    borderColor: theme.colors.gray[400],
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    backgroundColor: theme.colors.background,
    paddingTop: theme.spacing.lg,
  },
  actionsCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  actionsTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  comingSoonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default CameraScreen;