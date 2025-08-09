/**
 * Permissions Screen - Onboarding Screen 2/5
 * Request camera and location permissions for enhanced app experience
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import OnboardingSlide from '../../components/onboarding/OnboardingSlide';
import { colors, spacing, fonts } from '../../theme/uiTheme';
import { useOnboarding } from '../../hooks/useOnboarding';

interface PermissionsScreenProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  canProceed: boolean;
}

export default function PermissionsScreen({ 
  onNext, 
  onPrevious, 
  onSkip 
}: PermissionsScreenProps) {
  const { currentStep, totalSteps, onboardingData, updateOnboardingData } = useOnboarding();
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);

  // Check initial permission status
  useEffect(() => {
    checkInitialPermissions();
  }, []);

  const checkInitialPermissions = async () => {
    try {
      const [cameraStatus, locationStatus] = await Promise.all([
        Camera.getCameraPermissionsAsync(),
        Location.getForegroundPermissionsAsync(),
      ]);

      await updateOnboardingData({
        cameraPermissionGranted: cameraStatus.status === 'granted',
        locationPermissionGranted: locationStatus.status === 'granted',
      });
    } catch (error) {
      console.error('Error checking initial permissions:', error);
    }
  };

  // Request camera permission
  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      const granted = status === 'granted';
      
      await updateOnboardingData({
        cameraPermissionGranted: granted,
      });

      if (!granted) {
        Alert.alert(
          'Camera Access',
          'Camera permission is needed to capture and share your food experiences. You can enable it later in Settings.',
          [{ text: 'OK', style: 'default' }]
        );
      }

      return granted;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  };

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';

      await updateOnboardingData({
        locationPermissionGranted: granted,
      });

      if (!granted) {
        Alert.alert(
          'Location Access',
          'Location permission helps you discover nearby restaurants and tag your dining experiences. You can enable it later in Settings.',
          [{ text: 'OK', style: 'default' }]
        );
      }

      return granted;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  // Request both permissions
  const requestAllPermissions = async () => {
    setIsRequestingPermissions(true);
    
    try {
      await Promise.all([
        requestCameraPermission(),
        requestLocationPermission(),
      ]);
    } catch (error) {
      console.error('Error requesting permissions:', error);
    } finally {
      setIsRequestingPermissions(false);
    }
  };

  // Permission illustration component
  const PermissionIllustration = () => (
    <View style={styles.illustrationContainer}>
      <View style={styles.permissionIconsContainer}>
        <View style={[styles.permissionIcon, styles.cameraIconContainer]}>
          <MaterialIcons 
            name="camera-alt" 
            size={32} 
            color={onboardingData.cameraPermissionGranted ? colors.success : colors.primary} 
          />
          {onboardingData.cameraPermissionGranted && (
            <View style={styles.checkmarkOverlay}>
              <MaterialIcons name="check-circle" size={16} color={colors.success} />
            </View>
          )}
        </View>
        
        <View style={[styles.permissionIcon, styles.locationIconContainer]}>
          <MaterialIcons 
            name="location-on" 
            size={32} 
            color={onboardingData.locationPermissionGranted ? colors.success : colors.primary} 
          />
          {onboardingData.locationPermissionGranted && (
            <View style={styles.checkmarkOverlay}>
              <MaterialIcons name="check-circle" size={16} color={colors.success} />
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.connectionLine} />
    </View>
  );

  // Permission details content
  const PermissionContent = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.description}>
        To give you the best experience, Palate would like access to:
      </Text>
      
      <View style={styles.permissionsListContainer}>
        <View style={styles.permissionItem}>
          <View style={styles.permissionItemIcon}>
            <MaterialIcons 
              name="camera-alt" 
              size={24} 
              color={onboardingData.cameraPermissionGranted ? colors.success : colors.primary} 
            />
          </View>
          <View style={styles.permissionItemText}>
            <Text style={styles.permissionTitle}>Camera</Text>
            <Text style={styles.permissionDescription}>
              Capture photos of your meals and dining experiences
            </Text>
          </View>
          {onboardingData.cameraPermissionGranted && (
            <MaterialIcons name="check" size={20} color={colors.success} />
          )}
        </View>
        
        <View style={styles.permissionItem}>
          <View style={styles.permissionItemIcon}>
            <MaterialIcons 
              name="location-on" 
              size={24} 
              color={onboardingData.locationPermissionGranted ? colors.success : colors.primary} 
            />
          </View>
          <View style={styles.permissionItemText}>
            <Text style={styles.permissionTitle}>Location</Text>
            <Text style={styles.permissionDescription}>
              Discover nearby restaurants and tag your dining locations
            </Text>
          </View>
          {onboardingData.locationPermissionGranted && (
            <MaterialIcons name="check" size={20} color={colors.success} />
          )}
        </View>
      </View>

      <Text style={styles.disclaimerText}>
        Your privacy is important to us. This information stays on your device and is only used to enhance your experience.
      </Text>
    </View>
  );

  const bothPermissionsGranted = onboardingData.cameraPermissionGranted && onboardingData.locationPermissionGranted;

  return (
    <OnboardingSlide
      title="Let's set up your experience"
      subtitle="Grant permissions to unlock Palate's full potential"
      illustration={<PermissionIllustration />}
      content={<PermissionContent />}
      primaryButton={{
        title: bothPermissionsGranted ? "Continue" : "Grant Permissions",
        onPress: bothPermissionsGranted ? onNext : requestAllPermissions,
        loading: isRequestingPermissions,
      }}
      secondaryButton={{
        title: "Skip for now",
        onPress: onSkip,
      }}
      currentStep={currentStep}
      totalSteps={totalSteps}
    />
  );
}

const styles = StyleSheet.create({
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 200,
    position: 'relative',
  },
  
  permissionIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(6),
  },
  
  permissionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  
  cameraIconContainer: {
    backgroundColor: colors.primaryLight + '20',
  },
  
  locationIconContainer: {
    backgroundColor: colors.secondary + '20',
  },
  
  checkmarkOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 2,
  },
  
  connectionLine: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -1 }],
    width: 60,
    height: 2,
    backgroundColor: colors.outline,
  },
  
  contentContainer: {
    paddingVertical: spacing(2),
  },
  
  description: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.5,
    marginBottom: spacing(4),
    paddingHorizontal: spacing(2),
  },
  
  permissionsListContainer: {
    gap: spacing(3),
    marginBottom: spacing(4),
  },
  
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    gap: spacing(3),
  },
  
  permissionItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  permissionItemText: {
    flex: 1,
  },
  
  permissionTitle: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  
  permissionDescription: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    lineHeight: fonts.sm * 1.4,
  },
  
  disclaimerText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: fonts.sm * 1.4,
    paddingHorizontal: spacing(2),
  },
});