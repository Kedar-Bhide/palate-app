/**
 * RestaurantInput Component
 * Restaurant name input with autocomplete suggestions based on user history and location
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  LayoutChangeEvent,
  Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts } from '../../theme/uiTheme';
import { usePosts } from '../../hooks/usePosts';
import { getCurrentLocation, LocationResult } from '../../lib/location';

interface RestaurantInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'next' | 'search' | 'go';
  maxLength?: number;
  error?: string;
  disabled?: boolean;
}

interface RestaurantSuggestion {
  id: string;
  name: string;
  type: 'recent' | 'nearby' | 'popular';
  distance?: string;
  address?: string;
}

export default function RestaurantInput({
  value,
  onChangeText,
  placeholder = 'Enter restaurant name',
  autoFocus = false,
  onSubmitEditing,
  returnKeyType = 'next',
  maxLength = 100,
  error,
  disabled = false,
}: RestaurantInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<RestaurantSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;
  const debounceTimer = useRef<NodeJS.Timeout>();

  const { getRecentRestaurants } = usePosts();

  // Animation for suggestions dropdown
  const animateSuggestions = useCallback((show: boolean) => {
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

  // Get user location for nearby suggestions
  useEffect(() => {
    const getLocation = async () => {
      try {
        const location = await getCurrentLocation();
        setUserLocation(location);
      } catch (error) {
        console.warn('Could not get user location:', error);
      }
    };

    if (isFocused) {
      getLocation();
    }
  }, [isFocused]);

  // Load suggestions based on search query
  const loadSuggestions = useCallback(async (query: string) => {
    setIsLoadingSuggestions(true);
    try {
      const suggestions: RestaurantSuggestion[] = [];

      // Get recent restaurants from user history
      if (query.length === 0) {
        const recent = await getRecentRestaurants(5);
        recent.forEach((restaurant, index) => {
          suggestions.push({
            id: `recent_${index}`,
            name: restaurant,
            type: 'recent',
          });
        });
      } else {
        // Filter recent restaurants by query
        const recent = await getRecentRestaurants(20);
        const filtered = recent
          .filter(restaurant => 
            restaurant.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 5);
          
        filtered.forEach((restaurant, index) => {
          suggestions.push({
            id: `recent_${index}`,
            name: restaurant,
            type: 'recent',
          });
        });
      }

      // Add popular restaurant suggestions (mock data for now)
      if (query.length >= 2) {
        const popularRestaurants = [
          'McDonald\'s',
          'Starbucks',
          'Subway',
          'Pizza Hut',
          'KFC',
          'Burger King',
          'Domino\'s Pizza',
          'Taco Bell',
          'Wendy\'s',
          'Chipotle',
        ];

        const popularFiltered = popularRestaurants
          .filter(restaurant => 
            restaurant.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 3);

        popularFiltered.forEach((restaurant, index) => {
          // Avoid duplicates
          if (!suggestions.some(s => s.name.toLowerCase() === restaurant.toLowerCase())) {
            suggestions.push({
              id: `popular_${index}`,
              name: restaurant,
              type: 'popular',
            });
          }
        });
      }

      setSuggestions(suggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [getRecentRestaurants]);

  // Handle text change with debounced suggestions loading
  const handleTextChange = useCallback((text: string) => {
    onChangeText(text);
    setSearchQuery(text);

    // Clear existing debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new debounce timer
    debounceTimer.current = setTimeout(() => {
      if (isFocused) {
        loadSuggestions(text);
      }
    }, 300);
  }, [onChangeText, isFocused, loadSuggestions]);

  // Handle input focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setShowSuggestions(true);
    animateSuggestions(true);
    
    // Load initial suggestions
    loadSuggestions(value);
  }, [value, loadSuggestions, animateSuggestions]);

  // Handle input blur
  const handleBlur = useCallback(() => {
    // Delay hiding suggestions to allow for selection
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
      animateSuggestions(false);
    }, 150);
  }, [animateSuggestions]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(async (suggestion: RestaurantSuggestion) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    onChangeText(suggestion.name);
    setSearchQuery(suggestion.name);
    setShowSuggestions(false);
    animateSuggestions(false);
    
    // Dismiss keyboard and blur input
    Keyboard.dismiss();
    inputRef.current?.blur();
  }, [onChangeText, animateSuggestions]);

  // Handle clear button
  const handleClear = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangeText('');
    setSearchQuery('');
    inputRef.current?.focus();
  }, [onChangeText]);

  // Get suggestion icon
  const getSuggestionIcon = (type: RestaurantSuggestion['type']) => {
    switch (type) {
      case 'recent':
        return 'history';
      case 'nearby':
        return 'location-on';
      case 'popular':
        return 'trending-up';
      default:
        return 'restaurant';
    }
  };

  // Get suggestion subtitle
  const getSuggestionSubtitle = (suggestion: RestaurantSuggestion) => {
    switch (suggestion.type) {
      case 'recent':
        return 'Recently visited';
      case 'nearby':
        return suggestion.distance ? `${suggestion.distance} away` : 'Nearby';
      case 'popular':
        return 'Popular choice';
      default:
        return '';
    }
  };

  // Render suggestion item
  const renderSuggestion = (suggestion: RestaurantSuggestion) => (
    <TouchableOpacity
      key={suggestion.id}
      style={styles.suggestionItem}
      onPress={() => handleSuggestionSelect(suggestion)}
      activeOpacity={0.7}
    >
      <View style={styles.suggestionIcon}>
        <MaterialIcons
          name={getSuggestionIcon(suggestion.type)}
          size={20}
          color={colors.textSecondary}
        />
      </View>
      
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionName}>{suggestion.name}</Text>
        <Text style={styles.suggestionSubtitle}>
          {getSuggestionSubtitle(suggestion)}
        </Text>
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
      {/* Input Container */}
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        error && styles.inputContainerError,
        disabled && styles.inputContainerDisabled,
      ]}>
        <MaterialIcons
          name="restaurant"
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
          value={value}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          returnKeyType={returnKeyType}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect={false}
          maxLength={maxLength}
          editable={!disabled}
          selectTextOnFocus
        />
        
        {/* Clear Button */}
        {value.length > 0 && !disabled && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            activeOpacity={0.7}
          >
            <MaterialIcons name="clear" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Character Count */}
      <View style={styles.inputFooter}>
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        <Text style={styles.characterCount}>
          {value.length}/{maxLength}
        </Text>
      </View>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <Animated.View
          style={[
            styles.suggestionsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <ScrollView
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {isLoadingSuggestions ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading suggestions...</Text>
              </View>
            ) : suggestions.length > 0 ? (
              <>
                {suggestions.map(renderSuggestion)}
                
                {/* No more suggestions footer */}
                {suggestions.length >= 5 && (
                  <View style={styles.suggestionsFooter}>
                    <Text style={styles.suggestionsFooterText}>
                      Keep typing for more suggestions
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.noSuggestionsContainer}>
                <MaterialIcons
                  name="search-off"
                  size={24}
                  color={colors.textMuted}
                />
                <Text style={styles.noSuggestionsText}>
                  {searchQuery ? 'No restaurants found' : 'Start typing to see suggestions'}
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
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

  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing(1),
    paddingHorizontal: spacing(1),
  },

  errorText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.error,
    flex: 1,
  },

  characterCount: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.normal,
    color: colors.textMuted,
  },

  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outline,
    maxHeight: 250,
    zIndex: 1000,
    marginTop: spacing(1),
    ...colors.shadow.medium,
  },

  suggestionsList: {
    flex: 1,
  },

  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },

  suggestionIcon: {
    width: 32,
    alignItems: 'center',
    marginRight: spacing(2),
  },

  suggestionContent: {
    flex: 1,
  },

  suggestionName: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.text,
    marginBottom: spacing(0.5),
  },

  suggestionSubtitle: {
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

  noSuggestionsContainer: {
    alignItems: 'center',
    paddingVertical: spacing(4),
    gap: spacing(2),
  },

  noSuggestionsText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textMuted,
    textAlign: 'center',
  },

  suggestionsFooter: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    alignItems: 'center',
  },

  suggestionsFooterText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.normal,
    color: colors.textMuted,
  },
});