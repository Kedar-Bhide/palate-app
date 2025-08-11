import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { User } from '../../types';
import { EditProfileFormData, FormValidationError } from '../../types/profile';
import { theme } from '../../theme';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Card from '../ui/Card';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface EditProfileFormProps {
  initialData: User;
  onSave: (data: EditProfileFormData) => Promise<boolean>;
  onCancel: () => void;
  loading?: boolean;
  onUsernameValidation?: (username: string) => Promise<{ isValid: boolean; error?: string }>;
}

export const EditProfileForm: React.FC<EditProfileFormProps> = ({
  initialData,
  onSave,
  onCancel,
  loading = false,
  onUsernameValidation,
}) => {
  const [formData, setFormData] = useState<EditProfileFormData>({
    display_name: initialData.display_name || '',
    username: initialData.username,
    bio: initialData.bio || '',
    location: '', // We'll need to add location field to User type
    avatar_url: initialData.avatar_url,
    isPrivate: false, // We'll need to get this from privacy settings
  });

  const [errors, setErrors] = useState<FormValidationError[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [usernameValidating, setUsernameValidating] = useState(false);
  const [usernameValid, setUsernameValid] = useState(true);
  const [imageUploading, setImageUploading] = useState(false);

  const usernameTimeoutRef = useRef<NodeJS.Timeout>();

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges = (
      formData.display_name !== (initialData.display_name || '') ||
      formData.username !== initialData.username ||
      formData.bio !== (initialData.bio || '') ||
      formData.location !== '' ||
      formData.avatar_url !== initialData.avatar_url
    );
    setHasUnsavedChanges(hasChanges);
  }, [formData, initialData]);

  // Validate username with debouncing
  useEffect(() => {
    if (usernameTimeoutRef.current) {
      clearTimeout(usernameTimeoutRef.current);
    }

    if (formData.username !== initialData.username && onUsernameValidation) {
      setUsernameValidating(true);
      
      usernameTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await onUsernameValidation(formData.username);
          setUsernameValid(result.isValid);
          
          if (!result.isValid && result.error) {
            setErrors(prev => [
              ...prev.filter(err => err.field !== 'username'),
              { field: 'username', message: result.error! }
            ]);
          } else {
            setErrors(prev => prev.filter(err => err.field !== 'username'));
          }
        } catch (error) {
          setUsernameValid(false);
        } finally {
          setUsernameValidating(false);
        }
      }, 500);
    } else {
      setUsernameValidating(false);
      setUsernameValid(true);
      setErrors(prev => prev.filter(err => err.field !== 'username'));
    }

    return () => {
      if (usernameTimeoutRef.current) {
        clearTimeout(usernameTimeoutRef.current);
      }
    };
  }, [formData.username, initialData.username, onUsernameValidation]);

  const handleInputChange = (field: keyof EditProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific errors
    setErrors(prev => prev.filter(err => err.field !== field));
  };

  const handlePhotoChange = async () => {
    Alert.alert(
      'Profile Photo',
      'Choose how you\'d like to update your profile photo',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Camera',
          onPress: () => openImagePicker('camera'),
        },
        {
          text: 'Photo Library',
          onPress: () => openImagePicker('library'),
        },
        ...(formData.avatar_url ? [{
          text: 'Remove Photo',
          style: 'destructive' as const,
          onPress: () => handleRemovePhoto(),
        }] : []),
      ]
    );
  };

  const openImagePicker = async (type: 'camera' | 'library') => {
    try {
      const permissionResult = type === 'camera' 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          `Camera access is required to ${type === 'camera' ? 'take photos' : 'select photos from your library'}.`,
        );
        return;
      }

      setImageUploading(true);

      const result = type === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ ...prev, avatar_url: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error opening image picker:', error);
      Alert.alert(
        'Error',
        'Failed to open image picker. Please try again.',
      );
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, avatar_url: undefined }));
  };

  const validateForm = (): boolean => {
    const validationErrors: FormValidationError[] = [];

    // Display name validation
    if (!formData.display_name.trim()) {
      validationErrors.push({ field: 'display_name', message: 'Display name is required' });
    } else if (formData.display_name.length > 50) {
      validationErrors.push({ field: 'display_name', message: 'Display name must be 50 characters or less' });
    }

    // Username validation
    if (!formData.username.trim()) {
      validationErrors.push({ field: 'username', message: 'Username is required' });
    } else if (formData.username.length < 3) {
      validationErrors.push({ field: 'username', message: 'Username must be at least 3 characters' });
    } else if (formData.username.length > 20) {
      validationErrors.push({ field: 'username', message: 'Username must be 20 characters or less' });
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      validationErrors.push({ field: 'username', message: 'Username can only contain letters, numbers, and underscores' });
    } else if (!usernameValid) {
      validationErrors.push({ field: 'username', message: 'Username is not available' });
    }

    // Bio validation
    if (formData.bio.length > 150) {
      validationErrors.push({ field: 'bio', message: 'Bio must be 150 characters or less' });
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || usernameValidating) {
      return;
    }

    try {
      const success = await onSave(formData);
      if (success) {
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          {
            text: 'Keep Editing',
            style: 'cancel',
          },
          {
            text: 'Discard Changes',
            style: 'destructive',
            onPress: onCancel,
          },
        ]
      );
    } else {
      onCancel();
    }
  };

  const getFieldError = (field: string): string | undefined => {
    return errors.find(err => err.field === field)?.message;
  };

  const renderFieldError = (field: string) => {
    const error = getFieldError(field);
    if (!error) return null;

    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={16} color={theme.colors.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Photo Section */}
      <Card variant="elevated" padding="large" style={styles.photoCard}>
        <View style={styles.photoSection}>
          <TouchableOpacity
            onPress={handlePhotoChange}
            disabled={loading || imageUploading}
            style={styles.avatarContainer}
          >
            <Avatar
              source={formData.avatar_url ? { uri: formData.avatar_url } : undefined}
              name={formData.display_name || formData.username}
              size="xxl"
              style={styles.avatar}
            />
            
            <View style={styles.photoOverlay}>
              {imageUploading ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <MaterialIcons
                  name="camera-alt"
                  size={20}
                  color={theme.colors.white}
                />
              )}
            </View>
          </TouchableOpacity>
          
          <Text style={styles.photoHint}>
            Tap to change your profile photo
          </Text>
        </View>
      </Card>

      {/* Form Fields */}
      <Card variant="flat" padding="large" style={styles.formCard}>
        {/* Display Name */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Display Name *</Text>
          <TextInput
            style={[
              styles.textInput,
              getFieldError('display_name') && styles.inputError,
            ]}
            value={formData.display_name}
            onChangeText={(text) => handleInputChange('display_name', text)}
            placeholder="Your display name"
            placeholderTextColor={theme.colors.textDisabled}
            maxLength={50}
            editable={!loading}
            autoCapitalize="words"
            autoCorrect={true}
          />
          <Text style={styles.characterCount}>
            {formData.display_name.length}/50
          </Text>
          {renderFieldError('display_name')}
        </View>

        {/* Username */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Username *</Text>
          <View style={styles.usernameContainer}>
            <Text style={styles.usernamePrefix}>@</Text>
            <TextInput
              style={[
                styles.textInput,
                styles.usernameInput,
                getFieldError('username') && styles.inputError,
              ]}
              value={formData.username}
              onChangeText={(text) => handleInputChange('username', text.toLowerCase())}
              placeholder="username"
              placeholderTextColor={theme.colors.textDisabled}
              maxLength={20}
              editable={!loading}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
            />
            
            {usernameValidating && (
              <ActivityIndicator
                size="small"
                color={theme.colors.primary}
                style={styles.usernameIndicator}
              />
            )}
            
            {!usernameValidating && formData.username !== initialData.username && (
              <MaterialIcons
                name={usernameValid ? "check-circle" : "error"}
                size={20}
                color={usernameValid ? theme.colors.success : theme.colors.error}
                style={styles.usernameIndicator}
              />
            )}
          </View>
          <Text style={styles.characterCount}>
            {formData.username.length}/20
          </Text>
          {renderFieldError('username')}
        </View>

        {/* Bio */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Bio</Text>
          <TextInput
            style={[
              styles.textArea,
              getFieldError('bio') && styles.inputError,
            ]}
            value={formData.bio}
            onChangeText={(text) => handleInputChange('bio', text)}
            placeholder="Tell people a bit about yourself..."
            placeholderTextColor={theme.colors.textDisabled}
            maxLength={150}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!loading}
            autoCapitalize="sentences"
            autoCorrect={true}
          />
          <Text style={styles.characterCount}>
            {formData.bio.length}/150
          </Text>
          {renderFieldError('bio')}
        </View>

        {/* Location */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Location</Text>
          <TextInput
            style={styles.textInput}
            value={formData.location}
            onChangeText={(text) => handleInputChange('location', text)}
            placeholder="Where are you located?"
            placeholderTextColor={theme.colors.textDisabled}
            maxLength={100}
            editable={!loading}
            autoCapitalize="words"
            autoCorrect={true}
          />
          <Text style={styles.locationNote}>
            Your location helps friends discover local food recommendations
          </Text>
        </View>

        {/* Privacy Toggle */}
        <View style={styles.fieldContainer}>
          <TouchableOpacity
            style={styles.privacyToggle}
            onPress={() => setFormData(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
            disabled={loading}
          >
            <View style={styles.toggleLeft}>
              <MaterialIcons
                name={formData.isPrivate ? "lock" : "public"}
                size={20}
                color={theme.colors.textSecondary}
              />
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>
                  {formData.isPrivate ? 'Private Account' : 'Public Account'}
                </Text>
                <Text style={styles.toggleDescription}>
                  {formData.isPrivate 
                    ? 'Only approved followers can see your posts'
                    : 'Anyone can see your posts'
                  }
                </Text>
              </View>
            </View>
            
            <MaterialIcons
              name={formData.isPrivate ? "toggle-on" : "toggle-off"}
              size={32}
              color={formData.isPrivate ? theme.colors.primary : theme.colors.gray[300]}
            />
          </TouchableOpacity>
        </View>
      </Card>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          title="Cancel"
          variant="secondary"
          onPress={handleCancel}
          disabled={loading}
          style={styles.cancelButton}
        />
        
        <Button
          title="Save Profile"
          variant="primary"
          onPress={handleSave}
          loading={loading}
          disabled={!hasUnsavedChanges || usernameValidating}
          style={styles.saveButton}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing['3xl'],
  },
  photoCard: {
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
  },
  photoSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 120,
    height: 120,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.colors.background,
    ...theme.shadows.md,
  },
  photoHint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  formCard: {
    marginBottom: theme.spacing.lg,
  },
  fieldContainer: {
    marginBottom: theme.spacing.xl,
  },
  fieldLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  textInput: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    backgroundColor: theme.colors.gray[50],
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    minHeight: theme.touchTarget.minHeight,
  },
  inputError: {
    borderColor: theme.colors.error,
    backgroundColor: `${theme.colors.error}05`,
  },
  textArea: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    backgroundColor: theme.colors.gray[50],
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    minHeight: 100,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.gray[50],
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.borderRadius.md,
    paddingLeft: theme.spacing.md,
  },
  usernamePrefix: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  usernameInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingLeft: theme.spacing.xs,
    minHeight: theme.touchTarget.minHeight,
  },
  usernameIndicator: {
    marginRight: theme.spacing.md,
  },
  characterCount: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
  locationNote: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleText: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  toggleTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  toggleDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
});

export default EditProfileForm;