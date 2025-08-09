/**
 * CuisineSelector Component
 * Cuisine selection with search functionality and popular cuisines
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts } from '../../theme/uiTheme';
import { usePosts } from '../../hooks/usePosts';

interface CuisineSelectorProps {
  value: string;
  onValueChange: (cuisine: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  error?: string;
  disabled?: boolean;
  maxHeight?: number;
}

interface CuisineOption {
  id: string;
  name: string;
  emoji: string;
  type: 'popular' | 'user' | 'search';
  count?: number;
}

// Comprehensive list of cuisines with emojis
const ALL_CUISINES: Omit<CuisineOption, 'id' | 'type'>[] = [
  { name: 'Italian', emoji: '🍝' },
  { name: 'Chinese', emoji: '🥢' },
  { name: 'Japanese', emoji: '🍣' },
  { name: 'Mexican', emoji: '🌮' },
  { name: 'Indian', emoji: '🍛' },
  { name: 'French', emoji: '🥐' },
  { name: 'Thai', emoji: '🍜' },
  { name: 'American', emoji: '🍔' },
  { name: 'Mediterranean', emoji: '🫒' },
  { name: 'Korean', emoji: '🍲' },
  { name: 'Vietnamese', emoji: '🍲' },
  { name: 'Greek', emoji: '🥙' },
  { name: 'Spanish', emoji: '🥘' },
  { name: 'Turkish', emoji: '🧆' },
  { name: 'Lebanese', emoji: '🧄' },
  { name: 'Brazilian', emoji: '🥩' },
  { name: 'Peruvian', emoji: '🌶️' },
  { name: 'Ethiopian', emoji: '🍛' },
  { name: 'Moroccan', emoji: '🍲' },
  { name: 'German', emoji: '🍺' },
  { name: 'Russian', emoji: '🥟' },
  { name: 'Polish', emoji: '🥟' },
  { name: 'British', emoji: '🫖' },
  { name: 'Irish', emoji: '☘️' },
  { name: 'Caribbean', emoji: '🏝️' },
  { name: 'Jamaican', emoji: '🌶️' },
  { name: 'Cuban', emoji: '🏝️' },
  { name: 'Argentinian', emoji: '🥩' },
  { name: 'Chilean', emoji: '🍷' },
  { name: 'Colombian', emoji: '☕' },
  { name: 'Venezuelan', emoji: '🫓' },
  { name: 'Ecuadorian', emoji: '🌶️' },
  { name: 'Pakistani', emoji: '🍛' },
  { name: 'Bangladeshi', emoji: '🍛' },
  { name: 'Sri Lankan', emoji: '🍛' },
  { name: 'Nepalese', emoji: '🏔️' },
  { name: 'Tibetan', emoji: '🏔️' },
  { name: 'Filipino', emoji: '🥥' },
  { name: 'Indonesian', emoji: '🌶️' },
  { name: 'Malaysian', emoji: '🥥' },
  { name: 'Singaporean', emoji: '🦐' },
  { name: 'Cambodian', emoji: '🍜' },
  { name: 'Laotian', emoji: '🍜' },
  { name: 'Burmese', emoji: '🍜' },
  { name: 'African', emoji: '🌍' },
  { name: 'Nigerian', emoji: '🌶️' },
  { name: 'Ghanaian', emoji: '🥜' },
  { name: 'Kenyan', emoji: '🌍' },
  { name: 'South African', emoji: '🥩' },
  { name: 'Middle Eastern', emoji: '🧄' },
  { name: 'Israeli', emoji: '🥙' },
  { name: 'Persian', emoji: '🌿' },
  { name: 'Afghani', emoji: '🫓' },
  { name: 'Armenian', emoji: '🧄' },
  { name: 'Georgian', emoji: '🥟' },
  { name: 'Ukrainian', emoji: '🥟' },
  { name: 'Hungarian', emoji: '🌶️' },
  { name: 'Czech', emoji: '🍺' },
  { name: 'Austrian', emoji: '🥨' },
  { name: 'Swiss', emoji: '🧀' },
  { name: 'Dutch', emoji: '🧀' },
  { name: 'Belgian', emoji: '🍟' },
  { name: 'Scandinavian', emoji: '🐟' },
  { name: 'Norwegian', emoji: '🐟' },
  { name: 'Swedish', emoji: '🐟' },
  { name: 'Danish', emoji: '🥐' },
  { name: 'Finnish', emoji: '🐟' },
  { name: 'Icelandic', emoji: '🐟' },
  { name: 'Portuguese', emoji: '🐟' },
  { name: 'Basque', emoji: '🌶️' },
  { name: 'Catalan', emoji: '🥘' },
  { name: 'Galician', emoji: '🐙' },
  { name: 'Andalusian', emoji: '🫒' },
  { name: 'Fusion', emoji: '🌟' },
  { name: 'Modern American', emoji: '🍽️' },
  { name: 'New American', emoji: '🍽️' },
  { name: 'Southern', emoji: '🍗' },
  { name: 'Tex-Mex', emoji: '🌶️' },
  { name: 'Cajun', emoji: '🦐' },
  { name: 'Creole', emoji: '🦐' },
  { name: 'BBQ', emoji: '🍖' },
  { name: 'Soul Food', emoji: '🍗' },
  { name: 'Comfort Food', emoji: '🍲' },
  { name: 'Street Food', emoji: '🌭' },
  { name: 'Fast Food', emoji: '🍔' },
  { name: 'Fast Casual', emoji: '🥗' },
  { name: 'Diner', emoji: '🥞' },
  { name: 'Pub Food', emoji: '🍺' },
  { name: 'Sports Bar', emoji: '🏈' },
  { name: 'Gastropub', emoji: '🍺' },
  { name: 'Steakhouse', emoji: '🥩' },
  { name: 'Seafood', emoji: '🦞' },
  { name: 'Sushi', emoji: '🍣' },
  { name: 'Ramen', emoji: '🍜' },
  { name: 'Noodles', emoji: '🍝' },
  { name: 'Pizza', emoji: '🍕' },
  { name: 'Burgers', emoji: '🍔' },
  { name: 'Sandwiches', emoji: '🥪' },
  { name: 'Tacos', emoji: '🌮' },
  { name: 'Burritos', emoji: '🌯' },
  { name: 'Salads', emoji: '🥗' },
  { name: 'Soup', emoji: '🍲' },
  { name: 'Bakery', emoji: '🥖' },
  { name: 'Desserts', emoji: '🍰' },
  { name: 'Ice Cream', emoji: '🍦' },
  { name: 'Coffee', emoji: '☕' },
  { name: 'Tea', emoji: '🫖' },
  { name: 'Juice Bar', emoji: '🥤' },
  { name: 'Smoothies', emoji: '🥤' },
  { name: 'Brunch', emoji: '🥞' },
  { name: 'Breakfast', emoji: '🥞' },
  { name: 'Healthy', emoji: '🥗' },
  { name: 'Organic', emoji: '🌱' },
  { name: 'Vegetarian', emoji: '🥕' },
  { name: 'Vegan', emoji: '🌱' },
  { name: 'Gluten-Free', emoji: '🌾' },
  { name: 'Raw', emoji: '🥒' },
];

export default function CuisineSelector({
  value,
  onValueChange,
  placeholder = 'Select cuisine type',
  autoFocus = false,
  error,
  disabled = false,
  maxHeight = 300,
}: CuisineSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingUserCuisines, setIsLoadingUserCuisines] = useState(false);
  const [userCuisines, setUserCuisines] = useState<string[]>([]);

  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;

  const { getPopularCuisines } = usePosts();

  // Animation for dropdown
  const animateDropdown = useCallback((show: boolean) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: show ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: show ? 0 : -10,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Load user's popular cuisines
  useEffect(() => {
    const loadUserCuisines = async () => {
      setIsLoadingUserCuisines(true);
      try {
        const popular = await getPopularCuisines(10);
        setUserCuisines(popular);
      } catch (error) {
        console.error('Error loading user cuisines:', error);
        setUserCuisines([]);
      } finally {
        setIsLoadingUserCuisines(false);
      }
    };

    if (showDropdown) {
      loadUserCuisines();
    }
  }, [showDropdown, getPopularCuisines]);

  // Filter and organize cuisines based on search query
  const cuisineOptions = useMemo(() => {
    const options: CuisineOption[] = [];

    if (searchQuery.length === 0) {
      // Show user's popular cuisines first
      userCuisines.forEach((cuisine, index) => {
        const cuisineData = ALL_CUISINES.find(c => 
          c.name.toLowerCase() === cuisine.toLowerCase()
        );
        if (cuisineData) {
          options.push({
            id: `user_${index}`,
            name: cuisineData.name,
            emoji: cuisineData.emoji,
            type: 'user',
          });
        }
      });

      // Then show popular cuisines that user hasn't used
      const popularCuisines = [
        'Italian', 'Chinese', 'Japanese', 'Mexican', 'Indian', 
        'French', 'Thai', 'American', 'Mediterranean', 'Korean'
      ];

      popularCuisines.forEach((cuisineName, index) => {
        if (!userCuisines.includes(cuisineName)) {
          const cuisineData = ALL_CUISINES.find(c => c.name === cuisineName);
          if (cuisineData) {
            options.push({
              id: `popular_${index}`,
              name: cuisineData.name,
              emoji: cuisineData.emoji,
              type: 'popular',
            });
          }
        }
      });
    } else {
      // Filter cuisines by search query
      const filtered = ALL_CUISINES.filter(cuisine =>
        cuisine.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      filtered.forEach((cuisine, index) => {
        const isUserCuisine = userCuisines.includes(cuisine.name);
        options.push({
          id: `search_${index}`,
          name: cuisine.name,
          emoji: cuisine.emoji,
          type: isUserCuisine ? 'user' : 'search',
        });
      });
    }

    return options.slice(0, 50); // Limit results
  }, [searchQuery, userCuisines]);

  // Handle input focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setShowDropdown(true);
    animateDropdown(true);
  }, [animateDropdown]);

  // Handle input blur
  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setIsFocused(false);
      setShowDropdown(false);
      animateDropdown(false);
    }, 150);
  }, [animateDropdown]);

  // Handle cuisine selection
  const handleCuisineSelect = useCallback(async (cuisine: CuisineOption) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    onValueChange(cuisine.name);
    setSearchQuery('');
    setShowDropdown(false);
    animateDropdown(false);
    
    inputRef.current?.blur();
  }, [onValueChange, animateDropdown]);

  // Handle clear selection
  const handleClear = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange('');
    setSearchQuery('');
    inputRef.current?.focus();
  }, [onValueChange]);

  // Handle search input change
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  // Get cuisine type label
  const getCuisineTypeLabel = (type: CuisineOption['type']) => {
    switch (type) {
      case 'user':
        return 'Your favorite';
      case 'popular':
        return 'Popular';
      case 'search':
        return '';
      default:
        return '';
    }
  };

  // Render cuisine option
  const renderCuisineOption = ({ item }: { item: CuisineOption }) => (
    <TouchableOpacity
      style={styles.cuisineOption}
      onPress={() => handleCuisineSelect(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.cuisineEmoji}>{item.emoji}</Text>
      <View style={styles.cuisineContent}>
        <Text style={styles.cuisineName}>{item.name}</Text>
        {item.type !== 'search' && (
          <Text style={styles.cuisineType}>
            {getCuisineTypeLabel(item.type)}
          </Text>
        )}
      </View>
      <MaterialIcons
        name="arrow-outward"
        size={16}
        color={colors.textMuted}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Selected Value Display or Search Input */}
      {value && !showDropdown ? (
        <TouchableOpacity
          style={[
            styles.selectedContainer,
            error && styles.selectedContainerError,
            disabled && styles.selectedContainerDisabled,
          ]}
          onPress={disabled ? undefined : () => {
            inputRef.current?.focus();
            setShowDropdown(true);
            animateDropdown(true);
          }}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <View style={styles.selectedContent}>
            <Text style={styles.selectedEmoji}>
              {ALL_CUISINES.find(c => c.name === value)?.emoji || '🍽️'}
            </Text>
            <Text style={[
              styles.selectedText,
              disabled && styles.selectedTextDisabled,
            ]}>
              {value}
            </Text>
          </View>
          
          {!disabled && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClear}
              activeOpacity={0.7}
            >
              <MaterialIcons name="clear" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      ) : (
        <View style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
        ]}>
          <MaterialIcons
            name="restaurant-menu"
            size={20}
            color={isFocused ? colors.primary : colors.textSecondary}
            style={styles.inputIcon}
          />
          
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput,
              disabled && styles.textInputDisabled,
            ]}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            autoFocus={autoFocus}
            autoComplete="off"
            autoCorrect={false}
            editable={!disabled}
            selectTextOnFocus
          />
          
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
              activeOpacity={0.7}
            >
              <MaterialIcons name="clear" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Error Message */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <Animated.View
          style={[
            styles.dropdownContainer,
            { maxHeight },
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {isLoadingUserCuisines ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Loading cuisines...</Text>
            </View>
          ) : cuisineOptions.length > 0 ? (
            <FlatList
              data={cuisineOptions}
              renderItem={renderCuisineOption}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            />
          ) : (
            <View style={styles.noCuisinesContainer}>
              <MaterialIcons
                name="search-off"
                size={24}
                color={colors.textMuted}
              />
              <Text style={styles.noCuisinesText}>
                {searchQuery ? 'No cuisines found' : 'Start typing to search cuisines'}
              </Text>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },

  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 12,
    paddingHorizontal: spacing(2),
    minHeight: 52,
  },

  selectedContainerError: {
    borderColor: colors.error,
  },

  selectedContainerDisabled: {
    backgroundColor: colors.surfaceDisabled,
    borderColor: colors.outlineVariant,
  },

  selectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  selectedEmoji: {
    fontSize: 20,
    marginRight: spacing(2),
  },

  selectedText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.text,
    flex: 1,
  },

  selectedTextDisabled: {
    color: colors.textDisabled,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 12,
    paddingHorizontal: spacing(2),
    minHeight: 52,
  },

  inputContainerFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },

  inputContainerError: {
    borderColor: colors.error,
  },

  inputContainerDisabled: {
    backgroundColor: colors.surfaceDisabled,
    borderColor: colors.outlineVariant,
  },

  inputIcon: {
    marginRight: spacing(2),
  },

  textInput: {
    flex: 1,
    fontSize: fonts.base,
    fontWeight: fonts.weights.normal,
    color: colors.text,
    paddingVertical: spacing(1),
  },

  textInputDisabled: {
    color: colors.textDisabled,
  },

  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing(1),
  },

  errorText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.error,
    marginTop: spacing(1),
    paddingHorizontal: spacing(1),
  },

  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outline,
    zIndex: 1000,
    marginTop: spacing(1),
    ...colors.shadow.medium,
  },

  cuisineOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },

  cuisineEmoji: {
    fontSize: 20,
    width: 32,
    textAlign: 'center',
    marginRight: spacing(2),
  },

  cuisineContent: {
    flex: 1,
  },

  cuisineName: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.text,
    marginBottom: spacing(0.5),
  },

  cuisineType: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(4),
    gap: spacing(2),
  },

  loadingText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
  },

  noCuisinesContainer: {
    alignItems: 'center',
    paddingVertical: spacing(4),
    gap: spacing(2),
  },

  noCuisinesText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textMuted,
    textAlign: 'center',
  },
});