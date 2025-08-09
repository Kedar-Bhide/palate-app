/**
 * DiningTypeSelector Component
 * Visual dining type selection with icons and descriptions
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts } from '../../theme/uiTheme';

export type DiningType = 'fine-dining' | 'casual' | 'fast-food' | 'street-food' | 'home-cooking';

interface DiningTypeOption {
  value: DiningType;
  label: string;
  emoji: string;
  icon: string;
  description: string;
  color: string;
}

interface DiningTypeSelectorProps {
  selectedType?: DiningType | null;
  onTypeSelect: (type: DiningType) => void;
  showDescriptions?: boolean;
  disabled?: boolean;
  layout?: 'grid' | 'list';
}

const DINING_TYPES: DiningTypeOption[] = [
  {
    value: 'fine-dining',
    label: 'Fine Dining',
    emoji: '🍽️',
    icon: 'local-dining',
    description: 'Upscale restaurant experience',
    color: colors.purple,
  },
  {
    value: 'casual',
    label: 'Casual',
    emoji: '🍴',
    icon: 'restaurant',
    description: 'Relaxed dining atmosphere',
    color: colors.primary,
  },
  {
    value: 'fast-food',
    label: 'Fast Food',
    emoji: '🍟',
    icon: 'fastfood',
    description: 'Quick service restaurant',
    color: colors.warning,
  },
  {
    value: 'street-food',
    label: 'Street Food',
    emoji: '🌮',
    icon: 'local-cafe',
    description: 'Street vendors and food trucks',
    color: colors.success,
  },
  {
    value: 'home-cooking',
    label: 'Home Cooking',
    emoji: '🏠',
    icon: 'home',
    description: 'Homemade meals',
    color: colors.info,
  },
];

export default function DiningTypeSelector({
  selectedType,
  onTypeSelect,
  showDescriptions = true,
  disabled = false,
  layout = 'grid',
}: DiningTypeSelectorProps) {
  
  // Handle type selection
  const handleTypeSelect = useCallback(async (type: DiningType) => {
    if (disabled) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTypeSelect(type);
  }, [disabled, onTypeSelect]);

  // Render dining type option
  const renderDiningType = useCallback((option: DiningTypeOption) => {
    const isSelected = selectedType === option.value;
    
    return (
      <TouchableOpacity
        key={option.value}
        style={[
          layout === 'grid' ? styles.gridOption : styles.listOption,
          isSelected && styles.optionSelected,
          isSelected && { borderColor: option.color },
          disabled && styles.optionDisabled,
        ]}
        onPress={() => handleTypeSelect(option.value)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {/* Icon and Emoji */}
        <View style={[
          styles.iconContainer,
          isSelected && styles.iconContainerSelected,
          isSelected && { backgroundColor: option.color + '20' },
        ]}>
          <Text style={styles.emoji}>{option.emoji}</Text>
          <MaterialIcons
            name={option.icon as any}
            size={layout === 'grid' ? 18 : 16}
            color={isSelected ? option.color : colors.textSecondary}
            style={styles.icon}
          />
        </View>

        {/* Content */}
        <View style={layout === 'grid' ? styles.gridContent : styles.listContent}>
          <Text style={[
            styles.label,
            isSelected && styles.labelSelected,
            disabled && styles.labelDisabled,
          ]}>
            {option.label}
          </Text>
          
          {showDescriptions && (
            <Text style={[
              styles.description,
              isSelected && styles.descriptionSelected,
              disabled && styles.descriptionDisabled,
            ]}>
              {option.description}
            </Text>
          )}
        </View>

        {/* Selection Indicator */}
        {isSelected && (
          <View style={[styles.selectionIndicator, { backgroundColor: option.color }]}>
            <MaterialIcons name="check" size={12} color={colors.white} />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [selectedType, showDescriptions, disabled, layout, handleTypeSelect]);

  // Render clear selection button
  const renderClearButton = () => {
    if (!selectedType || disabled) return null;

    return (
      <TouchableOpacity
        style={styles.clearButton}
        onPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          // Clear selection by calling onTypeSelect with a "cleared" state
          // Since the parent handles the state, we'll use a special value
          onTypeSelect(null as any); // Parent should handle null case
        }}
        activeOpacity={0.7}
      >
        <MaterialIcons name="clear" size={16} color={colors.textSecondary} />
        <Text style={styles.clearButtonText}>Clear Selection</Text>
      </TouchableOpacity>
    );
  };

  if (layout === 'list') {
    return (
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        >
          {DINING_TYPES.map(renderDiningType)}
          {renderClearButton()}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Grid Layout */}
      <View style={styles.gridContainer}>
        {DINING_TYPES.map(renderDiningType)}
      </View>
      
      {/* Clear Button */}
      {renderClearButton()}

      {/* Selected Type Summary */}
      {selectedType && showDescriptions && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>Selected:</Text>
            <View style={styles.summaryType}>
              <Text style={styles.summaryEmoji}>
                {DINING_TYPES.find(t => t.value === selectedType)?.emoji}
              </Text>
              <Text style={styles.summaryText}>
                {DINING_TYPES.find(t => t.value === selectedType)?.label}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Help Text */}
      {!selectedType && !disabled && (
        <Text style={styles.helpText}>
          Select the dining experience that best describes your meal
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  // Grid Layout
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
    justifyContent: 'space-between',
  },

  gridOption: {
    width: '48%',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.outline,
    borderRadius: 12,
    padding: spacing(3),
    alignItems: 'center',
    minHeight: 100,
    position: 'relative',
  },

  gridContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },

  // List Layout
  listContainer: {
    gap: spacing(2),
  },

  listOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.outline,
    borderRadius: 12,
    padding: spacing(3),
    position: 'relative',
  },

  listContent: {
    flex: 1,
    marginLeft: spacing(3),
  },

  // Common Option Styles
  optionSelected: {
    borderWidth: 2,
    backgroundColor: colors.primaryContainer,
  },

  optionDisabled: {
    backgroundColor: colors.surfaceDisabled,
    borderColor: colors.outlineVariant,
  },

  // Icon Container
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
    position: 'relative',
  },

  iconContainerSelected: {
    backgroundColor: colors.primaryContainer,
  },

  emoji: {
    fontSize: 20,
    position: 'absolute',
    zIndex: 1,
  },

  icon: {
    position: 'absolute',
    opacity: 0.6,
  },

  // Text Styles
  label: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(0.5),
  },

  labelSelected: {
    color: colors.primary,
  },

  labelDisabled: {
    color: colors.textDisabled,
  },

  description: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.sm * 1.3,
  },

  descriptionSelected: {
    color: colors.primary,
  },

  descriptionDisabled: {
    color: colors.textDisabled,
  },

  // Selection Indicator
  selectionIndicator: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Clear Button
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    marginTop: spacing(2),
    gap: spacing(1),
  },

  clearButtonText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
  },

  // Summary Container
  summaryContainer: {
    backgroundColor: colors.primaryContainer,
    borderRadius: 8,
    padding: spacing(2.5),
    marginTop: spacing(3),
  },

  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
  },

  summaryLabel: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.primary,
  },

  summaryType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },

  summaryEmoji: {
    fontSize: 16,
  },

  summaryText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.primary,
  },

  // Help Text
  helpText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing(2),
    paddingHorizontal: spacing(2),
    lineHeight: fonts.sm * 1.4,
  },
});