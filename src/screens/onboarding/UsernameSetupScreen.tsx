/**
 * Username Setup Screen - Onboarding Screen 3/5
 * Profile creation with display name, username validation, and optional photo upload
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import OnboardingSlide from '../../components/onboarding/OnboardingSlide';
import { colors, spacing, fonts, radii } from '../../theme/uiTheme';
import { useOnboarding } from '../../hooks/useOnboarding';

interface UsernameSetupScreenProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  canProceed: boolean;
}

export default function UsernameSetupScreen({ 
  onNext, 
  onPrevious, 
  onSkip,
  canProceed 
}: UsernameSetupScreenProps) {
  const { 
    currentStep, 
    totalSteps, 
    onboardingData, 
    updateOnboardingData,
    isDisplayNameValid,
    isUsernameValid
  } = useOnboarding();

  const [displayName, setDisplayName] = useState(onboardingData.displayName);
  const [username, setUsername] = useState(onboardingData.username);
  const [profilePhoto, setProfilePhoto] = useState(onboardingData.profilePhoto);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string>('');
  const [displayNameError, setDisplayNameError] = useState<string>('');

  // Update onboarding data when form values change
  useEffect(() => {
    updateOnboardingData({
      displayName: displayName.trim(),
      username: username.toLowerCase().trim(),
      profilePhoto,
    });
  }, [displayName, username, profilePhoto]);

  // Validate display name in real-time
  useEffect(() => {
    if (displayName.length > 0) {
      if (!isDisplayNameValid(displayName)) {
        setDisplayNameError('Display name must be 2-50 characters');
      } else {
        setDisplayNameError('');
      }
    } else {
      setDisplayNameError('');
    }
  }, [displayName, isDisplayNameValid]);

  // Validate username in real-time with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (username.length > 0) {
        validateUsername(username);
      } else {
        setUsernameError('');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username]);

  const validateUsername = async (usernameToCheck: string) => {
    if (!isUsernameValid(usernameToCheck)) {
      setUsernameError('Username must be 3-20 characters (letters, numbers, underscore only)');
      return;
    }

    setIsCheckingUsername(true);
    try {
      // Simulate username availability check (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Simulate some unavailable usernames
      const unavailableUsernames = ['admin', 'palate', 'user', 'test', 'food', 'restaurant'];
      if (unavailableUsernames.includes(usernameToCheck.toLowerCase())) {
        setUsernameError('This username is already taken');
      } else {
        setUsernameError('');
      }
    } catch (error) {
      console.error('Error checking username availability:', error);
      setUsernameError('Unable to check username availability');
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Please grant access to your photo library to upload a profile picture.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  // Profile setup illustration
  const ProfileIllustration = () => (
    <View style={styles.illustrationContainer}>
      <TouchableOpacity style={styles.profilePhotoContainer} onPress={handleImagePicker}>
        {profilePhoto ? (
          <View style={styles.profilePhotoWrapper}>
            <View style={styles.profilePhotoPlaceholder}>
              <MaterialIcons name="person" size={40} color={colors.primary} />
            </View>
            <View style={styles.editIconOverlay}>
              <MaterialIcons name="edit" size={16} color={colors.background} />
            </View>
          </View>
        ) : (
          <View style={styles.profilePhotoPlaceholder}>
            <MaterialIcons name="add-a-photo" size={32} color={colors.textSecondary} />
            <Text style={styles.addPhotoText}>Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  // Profile setup form content
  const ProfileContent = () => (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingView}
    >
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.contentContainer}>
          <Text style={styles.description}>
            Create your profile to connect with friends and share your culinary journey
          </Text>
          
          <View style={styles.formContainer}>
            {/* Display Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Display Name</Text>
              <TextInput
                style={[
                  styles.textInput,
                  displayNameError ? styles.textInputError : {},
                ]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your full name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                returnKeyType="next"
                maxLength={50}
              />
              {displayNameError ? (
                <Text style={styles.errorText}>{displayNameError}</Text>
              ) : null}
            </View>

            {/* Username Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Username</Text>
              <View style={styles.usernameInputWrapper}>
                <Text style={styles.usernamePrefix}>@</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.usernameInput,
                    usernameError ? styles.textInputError : {},
                  ]}
                  value={username}
                  onChangeText={(text) => setUsername(text.toLowerCase())}
                  placeholder="your_username"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  maxLength={20}
                />
                {isCheckingUsername ? (
                  <View style={styles.usernameStatus}>
                    <MaterialIcons name="hourglass-empty" size={16} color={colors.textSecondary} />
                  </View>
                ) : username && !usernameError ? (
                  <View style={styles.usernameStatus}>
                    <MaterialIcons name="check-circle" size={16} color={colors.success} />
                  </View>
                ) : null}
              </View>
              {usernameError ? (
                <Text style={styles.errorText}>{usernameError}</Text>
              ) : username && !usernameError && !isCheckingUsername ? (
                <Text style={styles.successText}>Username is available!</Text>
              ) : null}
            </View>
          </View>

          <Text style={styles.helpText}>
            Your username is how friends will find you on Palate. Choose something memorable!
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <OnboardingSlide
      title="Create your profile"
      subtitle="Let others know who's sharing the great food"
      illustration={<ProfileIllustration />}
      content={<ProfileContent />}
      primaryButton={{
        title: "Continue",
        onPress: onNext,
        disabled: !canProceed || !!usernameError || !!displayNameError || isCheckingUsername,
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
    paddingVertical: spacing(2),
  },
  
  profilePhotoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  
  profilePhotoWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  
  profilePhotoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 2,
    borderColor: colors.outline,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  addPhotoText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
    marginTop: spacing(1),
  },
  
  editIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  
  keyboardAvoidingView: {
    flex: 1,
  },
  
  scrollView: {
    flex: 1,
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
  
  formContainer: {
    gap: spacing(3),
    marginBottom: spacing(3),
  },
  
  inputContainer: {
    gap: spacing(1),
  },
  
  inputLabel: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginLeft: spacing(0.5),
  },
  
  textInput: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radii.input,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
    fontSize: fonts.base,
    fontWeight: fonts.weights.normal,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 48,
  },
  
  textInputError: {
    borderColor: colors.error,
    backgroundColor: colors.error + '08',
  },
  
  usernameInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radii.input,
    backgroundColor: colors.background,
    minHeight: 48,
    paddingRight: spacing(2),
  },
  
  usernamePrefix: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.textSecondary,
    paddingLeft: spacing(2),
    paddingRight: spacing(0.5),
  },
  
  usernameInput: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 0,
    backgroundColor: 'transparent',
    minHeight: 'auto',
  },
  
  usernameStatus: {
    paddingLeft: spacing(1),
  },
  
  errorText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.error,
    marginLeft: spacing(0.5),
  },
  
  successText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.success,
    marginLeft: spacing(0.5),
  },
  
  helpText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: fonts.sm * 1.4,
    paddingHorizontal: spacing(3),
  },
});