/**
 * CuisineSearch Component
 * Search bar with debounced input and clear functionality for cuisine filtering
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts, radii } from '../../theme/uiTheme';

interface CuisineSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

const DEBOUNCE_DELAY = 300; // milliseconds

export default function CuisineSearch({
  searchQuery,
  onSearchChange,
  onClearSearch,
  placeholder = 'Search cuisines...',
  disabled = false,
  autoFocus = false,
}: CuisineSearchProps) {
  const [inputValue, setInputValue] = useState(searchQuery);
  const [isFocused, setIsFocused] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const inputRef = useRef<TextInput>(null);
  const focusAnimValue = useRef(new Animated.Value(0)).current;

  // Sync internal state with prop changes
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  // Debounced search effect
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (inputValue !== searchQuery) {
        onSearchChange(inputValue);
      }
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [inputValue, onSearchChange, searchQuery]);

  // Focus animation
  useEffect(() => {
    Animated.timing(focusAnimValue, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, focusAnimValue]);

  const handleTextChange = (text: string) => {
    setInputValue(text);
  };

  const handleClear = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputValue('');
    onClearSearch();
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const animatedBorderColor = focusAnimValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.outline, colors.primary],
  });

  const animatedBackgroundColor = focusAnimValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.background, colors.white],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          borderColor: animatedBorderColor,
          backgroundColor: animatedBackgroundColor,
        },
        disabled && styles.disabled,
      ]}
    >
      {/* Search Icon */}
      <View style={styles.searchIconContainer}>
        <MaterialIcons
          name="search"
          size={20}
          color={isFocused ? colors.primary : colors.textSecondary}
        />
      </View>

      {/* Text Input */}
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          disabled && styles.inputDisabled,
        ]}
        value={inputValue}
        onChangeText={handleTextChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never" // We'll handle this with custom button
        editable={!disabled}
        autoFocus={autoFocus}
        accessibilityLabel="Search cuisines"
        accessibilityHint="Type to search for cuisines by name, category, or country"
      />

      {/* Clear Button */}
      {inputValue.length > 0 && !disabled && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClear}
          activeOpacity={0.7}
          accessibilityLabel="Clear search"
          accessibilityRole="button"
        >
          <MaterialIcons
            name="close"
            size={18}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      )}

      {/* Loading indicator space - can be added later */}
      {/* {isSearching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )} */}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    minHeight: 48,
  },

  disabled: {
    opacity: 0.6,
    backgroundColor: colors.surfaceVariant,
  },

  searchIconContainer: {
    marginRight: spacing(1),
  },

  input: {
    flex: 1,
    fontSize: fonts.base,
    color: colors.text,
    paddingVertical: 0, // Remove default padding
    minHeight: 20,
  },

  inputDisabled: {
    color: colors.textMuted,
  },

  clearButton: {
    padding: spacing(0.5),
    marginLeft: spacing(1),
    borderRadius: radii.full,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },

  loadingContainer: {
    marginLeft: spacing(1),
    padding: spacing(0.5),
  },
});