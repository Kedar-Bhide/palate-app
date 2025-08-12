/**
 * CreatePostScreen Component (Enhanced)
 * Main posting interface with location picking, dining types, privacy settings, and draft management
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { CreatePostScreenProps } from '../navigation/types';
import { colors, spacing, fonts } from '../theme/uiTheme';
import { PostData, usePosts } from '../hooks/usePosts';
import { usePhotoSelection } from '../hooks/usePhotoSelection';
import { useDrafts, DraftPostData } from '../hooks/useDrafts';
import { getCurrentLocation } from '../lib/location';

// Import enhanced form components
import RatingInput from '../components/posts/RatingInput';
import RestaurantInput from '../components/posts/RestaurantInput';
import CuisineSelector from '../components/posts/CuisineSelector';
import ReviewInput from '../components/posts/ReviewInput';
import PhotoManager from '../components/camera/PhotoManager';
import LocationPicker, { LocationData } from '../components/posts/LocationPicker';
import DiningTypeSelector, { DiningType } from '../components/posts/DiningTypeSelector';
import PrivacySelector from '../components/posts/PrivacySelector';

interface FormData {
  restaurantName: string;
  cuisine: string;
  rating: number;
  review: string;
  location?: LocationData | null;
  diningType?: DiningType | null;
  isPrivate: boolean;
}

interface FormErrors {
  restaurantName?: string;
  cuisine?: string;
  photos?: string;
  rating?: string;
  review?: string;
  location?: string;
}

export default function CreatePostScreen({ navigation, route }: CreatePostScreenProps) {
  const insets = useSafeAreaInsets();
  
  // Get initial data from route params
  const initialPhotos = route.params?.photos || [];
  const draftData = route.params?.draftData;
  
  const [formData, setFormData] = useState<FormData>({
    restaurantName: draftData?.restaurantName || '',
    cuisine: draftData?.cuisine || '',
    rating: draftData?.rating || 0,
    review: draftData?.review || '',
    location: draftData?.location || null,
    diningType: (draftData?.diningType as DiningType) || null,
    isPrivate: draftData?.isPrivate || false,
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formWarnings, setFormWarnings] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftData?.id || null);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const photoSelection = usePhotoSelection(5);
  const autoSaveTimer = useRef<NodeJS.Timeout>();
  
  const {
    createPost,
    validatePost,
    isLoading,
    uploadProgress,
    error: postError,
    clearError,
    submitPostWithNavigation,
  } = usePosts();

  const {
    saveDraft,
    autoSaveDraft,
    deleteDraft,
    isSavingDraft,
    lastSaveTimeFormatted,
    error: draftError,
  } = useDrafts();

  // Initialize photos from route params or draft
  useEffect(() => {
    const initializePhotos = async () => {
      const photosToLoad = initialPhotos.length > 0 ? initialPhotos : (draftData?.photos || []);
      if (photosToLoad.length > 0) {
        await photoSelection.actions.addMultiplePhotos(photosToLoad);
      }
      setIsInitialized(true);
    };

    initializePhotos();
  }, [initialPhotos, draftData, photoSelection.actions]);

  // Auto-save draft when form data changes
  useEffect(() => {
    if (!isInitialized) return;

    // Clear existing timer
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    // Only auto-save if there's meaningful content
    const hasContent = (
      formData.restaurantName.trim() ||
      formData.cuisine.trim() ||
      formData.review.trim() ||
      photoSelection.photoCount > 0 ||
      formData.rating > 0 ||
      formData.location
    );

    if (hasContent) {
      autoSaveTimer.current = setTimeout(() => {
        const postData: PostData = {
          photos: photoSelection.photos.map(p => p.uri),
          restaurantName: formData.restaurantName,
          cuisine: formData.cuisine,
          rating: formData.rating || undefined,
          review: formData.review || undefined,
          location: formData.location || undefined,
          diningType: formData.diningType || undefined,
          isPrivate: formData.isPrivate,
        };

        autoSaveDraft(postData, currentDraftId);
      }, 3000); // Auto-save after 3 seconds of inactivity
    }

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [formData, photoSelection.photos, photoSelection.photoCount, isInitialized, currentDraftId, autoSaveDraft]);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      handleBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  // Clear errors when user starts making changes
  useEffect(() => {
    if (postError) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [postError, clearError]);

  // Handle form field changes
  const handleFieldChange = useCallback(<K extends keyof FormData>(
    field: K, 
    value: FormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts changing the field
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [formErrors]);

  // Validate form with enhanced validation
  const validateForm = useCallback((): { isValid: boolean; hasWarnings: boolean } => {
    const postData: PostData = {
      photos: photoSelection.photos.map(p => p.uri),
      restaurantName: formData.restaurantName,
      cuisine: formData.cuisine,
      rating: formData.rating || undefined,
      review: formData.review || undefined,
      location: formData.location || undefined,
      diningType: formData.diningType || undefined,
      isPrivate: formData.isPrivate,
    };

    const validation = validatePost(postData);
    
    // Map validation errors to form errors
    const errors: FormErrors = {};
    validation.errors.forEach(error => {
      if (error.includes('photo')) errors.photos = error;
      else if (error.includes('restaurant')) errors.restaurantName = error;
      else if (error.includes('cuisine')) errors.cuisine = error;
      else if (error.includes('rating')) errors.rating = error;
      else if (error.includes('review')) errors.review = error;
    });

    setFormErrors(errors);
    setFormWarnings(validation.warnings || []);

    return {
      isValid: validation.isValid,
      hasWarnings: (validation.warnings?.length || 0) > 0,
    };
  }, [formData, photoSelection.photos, validatePost]);

  // Handle manual draft save
  const handleSaveDraft = useCallback(async () => {
    try {
      const postData: PostData = {
        photos: photoSelection.photos.map(p => p.uri),
        restaurantName: formData.restaurantName,
        cuisine: formData.cuisine,
        rating: formData.rating || undefined,
        review: formData.review || undefined,
        location: formData.location || undefined,
        diningType: formData.diningType || undefined,
        isPrivate: formData.isPrivate,
      };

      const draftId = await saveDraft(postData, currentDraftId);
      setCurrentDraftId(draftId);
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        'Draft Saved',
        'Your post has been saved as a draft.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving draft:', error);
      Alert.alert(
        'Save Failed',
        'Failed to save draft. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [formData, photoSelection.photos, saveDraft, currentDraftId]);

  // Handle post submission
  const handleSubmit = useCallback(async () => {
    const validation = validateForm();
    
    if (!validation.isValid) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Scroll to first error
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      
      Alert.alert(
        'Please Fix Errors',
        'Please correct the highlighted fields before submitting.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Show warnings if any
    if (validation.hasWarnings && formWarnings.length > 0) {
      Alert.alert(
        'Suggestions',
        `Consider the following:\n\n• ${formWarnings.join('\n• ')}`,
        [
          { text: 'Fix Issues', style: 'cancel' },
          { text: 'Post Anyway', onPress: () => performSubmission() },
        ]
      );
    } else {
      await performSubmission();
    }
  }, [validateForm, formWarnings]);

  // Perform the actual submission
  const performSubmission = useCallback(async () => {
    const postData: PostData = {
      photos: photoSelection.photos.map(p => p.uri),
      restaurantName: formData.restaurantName.trim(),
      cuisine: formData.cuisine.trim(),
      rating: formData.rating || undefined,
      review: formData.review.trim() || undefined,
      location: formData.location || undefined,
      diningType: formData.diningType || undefined,
      isPrivate: formData.isPrivate,
    };

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await submitPostWithNavigation(postData, (result) => {
      // Success callback - clear draft and navigate
      if (currentDraftId) {
        deleteDraft(currentDraftId).catch(console.error);
      }
      photoSelection.actions.clearAll();
    });
    
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        'Post Created! 🎉',
        'Your meal post has been shared successfully.',
        [
          {
            text: 'View in Feed',
            onPress: () => {
              navigation.navigate('Main');
            },
          },
          {
            text: 'Create Another',
            style: 'cancel',
            onPress: () => {
              // Reset form for new post
              setFormData({
                restaurantName: '',
                cuisine: '',
                rating: 0,
                review: '',
                location: null,
                diningType: null,
                isPrivate: false,
              });
              setFormErrors({});
              setFormWarnings([]);
              setCurrentDraftId(null);
              photoSelection.actions.clearAll();
            },
          },
        ]
      );
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Post Failed',
        result.error || 'Failed to create post. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [formData, photoSelection, submitPostWithNavigation, currentDraftId, deleteDraft, navigation]);

  // Handle back navigation with draft management
  const handleBack = useCallback(async () => {
    const hasContent = (
      formData.restaurantName.trim() ||
      formData.cuisine.trim() ||
      formData.review.trim() ||
      photoSelection.photoCount > 0 ||
      formData.rating > 0 ||
      formData.location
    );

    if (hasContent) {
      Alert.alert(
        'Save Draft?',
        'You have unsaved changes. Would you like to save them as a draft before leaving?',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: async () => {
              if (currentDraftId) {
                await deleteDraft(currentDraftId).catch(console.error);
              }
              navigation.goBack();
            },
          },
          {
            text: 'Save Draft',
            onPress: async () => {
              try {
                await handleSaveDraft();
                navigation.goBack();
              } catch (error) {
                navigation.goBack();
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [formData, photoSelection.photoCount, currentDraftId, handleSaveDraft, deleteDraft, navigation]);

  // Handle location selection
  const handleLocationSelect = useCallback((location: LocationData) => {
    handleFieldChange('location', location);
  }, [handleFieldChange]);

  // Handle location clear
  const handleLocationClear = useCallback(() => {
    handleFieldChange('location', null);
  }, [handleFieldChange]);

  // Handle dining type selection
  const handleDiningTypeSelect = useCallback((type: DiningType) => {
    handleFieldChange('diningType', type);
  }, [handleFieldChange]);

  // Handle privacy change
  const handlePrivacyChange = useCallback((isPrivate: boolean) => {
    handleFieldChange('isPrivate', isPrivate);
  }, [handleFieldChange]);

  // Check if form can be submitted
  const canSubmit = formData.restaurantName.trim() && formData.cuisine.trim() && photoSelection.photoCount > 0;

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing(2) }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <MaterialIcons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {draftData ? 'Edit Draft' : 'Create Post'}
          </Text>
          {lastSaveTimeFormatted && (
            <Text style={styles.headerSubtitle}>{lastSaveTimeFormatted}</Text>
          )}
        </View>
        
        <View style={styles.headerActions}>
          {/* Save Draft Button */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleSaveDraft}
            disabled={isSavingDraft}
            activeOpacity={0.7}
          >
            {isSavingDraft ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <MaterialIcons name="save" size={20} color={colors.textSecondary} />
            )}
          </TouchableOpacity>

          {/* Post Button */}
          <TouchableOpacity
            style={[
              styles.postButton,
              (!canSubmit || isLoading) && styles.postButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Bar */}
      {isLoading && uploadProgress > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Uploading... {Math.round(uploadProgress)}%
          </Text>
        </View>
      )}

      {/* Error Message */}
      {(postError || draftError) && (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={20} color={colors.error} />
          <Text style={styles.errorMessage}>{postError || draftError}</Text>
        </View>
      )}

      {/* Form Content */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo Manager */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Photos {photoSelection.photoCount > 0 && `(${photoSelection.photoCount}/5)`}
            </Text>
            <PhotoManager
              photos={photoSelection.photos}
              onPhotosChange={photoSelection.actions.setPhotos}
              onAddPhotos={() => navigation.navigate('Camera')}
              maxPhotos={5}
            />
            {formErrors.photos && (
              <Text style={styles.fieldError}>{formErrors.photos}</Text>
            )}
          </View>

          {/* Restaurant Name */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Restaurant Name *</Text>
            <RestaurantInput
              value={formData.restaurantName}
              onChangeText={(text) => handleFieldChange('restaurantName', text)}
              placeholder="Enter restaurant name"
              error={formErrors.restaurantName}
              maxLength={100}
              returnKeyType="next"
            />
          </View>

          {/* Cuisine Type */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Cuisine Type *</Text>
            <CuisineSelector
              value={formData.cuisine}
              onValueChange={(cuisine) => handleFieldChange('cuisine', cuisine)}
              placeholder="Select cuisine type"
              error={formErrors.cuisine}
            />
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Location</Text>
            <LocationPicker
              selectedLocation={formData.location}
              onLocationSelect={handleLocationSelect}
              onLocationClear={handleLocationClear}
              showMap={false}
            />
            {formErrors.location && (
              <Text style={styles.fieldError}>{formErrors.location}</Text>
            )}
          </View>

          {/* Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Rating</Text>
            <RatingInput
              rating={formData.rating}
              onRatingChange={(rating) => handleFieldChange('rating', rating)}
              maxRating={5}
              showLabels
              size="large"
            />
          </View>

          {/* Dining Type */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Dining Experience</Text>
            <DiningTypeSelector
              selectedType={formData.diningType}
              onTypeSelect={handleDiningTypeSelect}
              showDescriptions
              layout="grid"
            />
          </View>

          {/* Review */}
          <View style={styles.section}>
            <ReviewInput
              value={formData.review}
              onChangeText={(text) => handleFieldChange('review', text)}
              placeholder="Share your experience... How was the food, service, and atmosphere?"
              maxLength={500}
              minHeight={100}
              maxHeight={200}
              error={formErrors.review}
              showFormatting
            />
          </View>

          {/* Privacy Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Privacy</Text>
            <PrivacySelector
              isPrivate={formData.isPrivate}
              onPrivacyChange={handlePrivacyChange}
              showDescriptions
              layout="toggle"
            />
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: spacing(4) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: spacing(2),
  },

  loadingText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(2),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },

  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },

  headerSubtitle: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    marginTop: spacing(0.5),
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },

  postButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },

  postButtonDisabled: {
    backgroundColor: colors.outline,
  },

  postButtonText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.white,
  },

  progressContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },

  progressBar: {
    height: 4,
    backgroundColor: colors.outline,
    borderRadius: 2,
    marginBottom: spacing(1),
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  progressText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorContainer,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    gap: spacing(2),
  },

  errorMessage: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.error,
    flex: 1,
  },

  keyboardAvoid: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: spacing(3),
    paddingTop: spacing(3),
  },

  section: {
    marginBottom: spacing(4),
  },

  sectionLabel: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(2),
  },

  fieldError: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.error,
    marginTop: spacing(1),
  },
});