/**
 * ReviewInput Component
 * Multi-line text input for meal reviews with character count and formatting
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  Platform,
  Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts } from '../../theme/uiTheme';

interface ReviewInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  minHeight?: number;
  maxHeight?: number;
  autoFocus?: boolean;
  error?: string;
  disabled?: boolean;
  showFormatting?: boolean;
  onSubmitEditing?: () => void;
}

const DEFAULT_MIN_HEIGHT = 100;
const DEFAULT_MAX_HEIGHT = 200;
const DEFAULT_MAX_LENGTH = 500;

export default function ReviewInput({
  value,
  onChangeText,
  placeholder = 'Write your review...',
  maxLength = DEFAULT_MAX_LENGTH,
  minHeight = DEFAULT_MIN_HEIGHT,
  maxHeight = DEFAULT_MAX_HEIGHT,
  autoFocus = false,
  error,
  disabled = false,
  showFormatting = false,
  onSubmitEditing,
}: ReviewInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [inputHeight, setInputHeight] = useState(minHeight);
  const [showFormattingBar, setShowFormattingBar] = useState(false);
  const [selectionRange, setSelectionRange] = useState({ start: 0, end: 0 });

  const inputRef = useRef<TextInput>(null);
  const formatBarAnim = useRef(new Animated.Value(0)).current;

  // Character count stats
  const characterCount = value.length;
  const remainingCount = maxLength - characterCount;
  const isNearLimit = remainingCount <= 50;
  const isOverLimit = remainingCount < 0;

  // Word count
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  // Animate formatting bar
  const animateFormatBar = useCallback((show: boolean) => {
    Animated.timing(formatBarAnim, {
      toValue: show ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [formatBarAnim]);

  // Handle input focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (showFormatting) {
      setShowFormattingBar(true);
      animateFormatBar(true);
    }
  }, [showFormatting, animateFormatBar]);

  // Handle input blur
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setShowFormattingBar(false);
    animateFormatBar(false);
  }, [animateFormatBar]);

  // Handle content size change for auto-expanding height
  const handleContentSizeChange = useCallback((event: any) => {
    const { height } = event.nativeEvent.contentSize;
    const newHeight = Math.max(minHeight, Math.min(maxHeight, height + 20));
    setInputHeight(newHeight);
  }, [minHeight, maxHeight]);

  // Handle selection change for formatting
  const handleSelectionChange = useCallback((event: any) => {
    setSelectionRange(event.nativeEvent.selection);
  }, []);

  // Handle clear button
  const handleClear = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangeText('');
    inputRef.current?.focus();
  }, [onChangeText]);

  // Handle text formatting (bold, italic, etc.)
  const handleFormat = useCallback(async (formatType: 'bold' | 'italic' | 'highlight') => {
    if (!inputRef.current || disabled) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { start, end } = selectionRange;
    const selectedText = value.substring(start, end);
    
    if (!selectedText) {
      // No text selected, just insert format markers at cursor
      let markers = '';
      switch (formatType) {
        case 'bold':
          markers = '**';
          break;
        case 'italic':
          markers = '*';
          break;
        case 'highlight':
          markers = '==';
          break;
      }
      
      const newText = value.substring(0, start) + markers + value.substring(start);
      onChangeText(newText);
      
      // Move cursor between markers
      setTimeout(() => {
        inputRef.current?.setNativeProps({
          selection: { start: start + markers.length / 2, end: start + markers.length / 2 }
        });
      }, 0);
    } else {
      // Format selected text
      let formattedText = selectedText;
      switch (formatType) {
        case 'bold':
          formattedText = `**${selectedText}**`;
          break;
        case 'italic':
          formattedText = `*${selectedText}*`;
          break;
        case 'highlight':
          formattedText = `==${selectedText}==`;
          break;
      }
      
      const newText = value.substring(0, start) + formattedText + value.substring(end);
      onChangeText(newText);
    }
  }, [selectionRange, value, onChangeText, disabled]);

  // Get character count color
  const getCountColor = () => {
    if (isOverLimit) return colors.error;
    if (isNearLimit) return colors.warning;
    return colors.textSecondary;
  };

  // Render formatting button
  const renderFormatButton = (
    icon: string,
    formatType: 'bold' | 'italic' | 'highlight',
    label: string
  ) => (
    <TouchableOpacity
      style={styles.formatButton}
      onPress={() => handleFormat(formatType)}
      activeOpacity={0.7}
    >
      <MaterialIcons name={icon} size={20} color={colors.textSecondary} />
      <Text style={styles.formatLabel}>{label}</Text>
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
        {/* Header with Icon and Actions */}
        <View style={styles.inputHeader}>
          <View style={styles.headerLeft}>
            <MaterialIcons
              name="rate-review"
              size={20}
              color={isFocused ? colors.primary : colors.textSecondary}
              style={styles.inputIcon}
            />
            <Text style={styles.inputLabel}>Review</Text>
          </View>
          
          {value.length > 0 && !disabled && (
            <TouchableOpacity
              style={styles.clearIconButton}
              onPress={handleClear}
              activeOpacity={0.7}
            >
              <MaterialIcons name="clear" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Text Input */}
        <TextInput
          ref={inputRef}
          style={[
            styles.textInput,
            { height: inputHeight },
            disabled && styles.textInputDisabled,
          ]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onContentSizeChange={handleContentSizeChange}
          onSelectionChange={handleSelectionChange}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          multiline
          scrollEnabled={inputHeight >= maxHeight}
          textAlignVertical="top"
          autoFocus={autoFocus}
          maxLength={isOverLimit ? undefined : maxLength}
          editable={!disabled}
          selectTextOnFocus
          blurOnSubmit={false}
          returnKeyType={Platform.OS === 'ios' ? 'default' : 'none'}
        />
      </View>

      {/* Formatting Bar */}
      {showFormatting && showFormattingBar && (
        <Animated.View
          style={[
            styles.formatBar,
            {
              opacity: formatBarAnim,
              transform: [
                {
                  translateY: formatBarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.formatBarContent}
          >
            {renderFormatButton('format-bold', 'bold', 'Bold')}
            {renderFormatButton('format-italic', 'italic', 'Italic')}
            {renderFormatButton('highlight', 'highlight', 'Highlight')}
          </ScrollView>
        </Animated.View>
      )}

      {/* Footer with Stats and Error */}
      <View style={styles.inputFooter}>
        <View style={styles.footerLeft}>
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>
        
        <View style={styles.footerRight}>
          {/* Word Count */}
          <Text style={styles.wordCount}>
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </Text>
          
          {/* Character Count */}
          <Text style={[styles.characterCount, { color: getCountColor() }]}>
            {characterCount}/{maxLength}
          </Text>
        </View>
      </View>

      {/* Writing Tips */}
      {isFocused && value.length === 0 && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Writing Tips</Text>
          <Text style={styles.tipsText}>
            • Describe the taste, texture, and presentation{'\n'}
            • Mention standout dishes or ingredients{'\n'}
            • Share the atmosphere and service experience{'\n'}
            • Be honest and constructive in your feedback
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  inputContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 12,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
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

  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(2),
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  inputIcon: {
    marginRight: spacing(1),
  },

  inputLabel: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
  },

  clearIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textInput: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.normal,
    color: colors.text,
    lineHeight: fonts.base * 1.4,
    padding: 0,
    margin: 0,
  },

  textInputDisabled: {
    color: colors.textDisabled,
  },

  formatBar: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    marginTop: spacing(2),
    paddingVertical: spacing(1),
  },

  formatBarContent: {
    paddingHorizontal: spacing(2),
    gap: spacing(2),
  },

  formatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: 6,
    backgroundColor: colors.surface,
    gap: spacing(1),
  },

  formatLabel: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
  },

  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing(1),
    paddingHorizontal: spacing(1),
  },

  footerLeft: {
    flex: 1,
  },

  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },

  errorText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.error,
  },

  wordCount: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.normal,
    color: colors.textMuted,
  },

  characterCount: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.medium,
  },

  tipsContainer: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    padding: spacing(3),
    marginTop: spacing(2),
  },

  tipsTitle: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(1),
  },

  tipsText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    lineHeight: fonts.sm * 1.4,
  },
});