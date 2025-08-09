/**
 * PrivacySelector Component
 * Privacy setting component for post visibility control
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useRef,
  useEffect,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts } from '../../theme/uiTheme';

interface PrivacyOption {
  value: 'public' | 'private';
  label: string;
  icon: string;
  description: string;
  color: string;
}

interface PrivacySelectorProps {
  isPrivate: boolean;
  onPrivacyChange: (isPrivate: boolean) => void;
  defaultPrivacy?: 'public' | 'private';
  disabled?: boolean;
  showDescriptions?: boolean;
  layout?: 'toggle' | 'buttons' | 'cards';
}

const PRIVACY_OPTIONS: PrivacyOption[] = [
  {
    value: 'public',
    label: 'Public',
    icon: 'public',
    description: 'Anyone can see this post',
    color: colors.success,
  },
  {
    value: 'private',
    label: 'Friends Only',
    icon: 'group',
    description: 'Only your friends can see this post',
    color: colors.primary,
  },
];

export default function PrivacySelector({
  isPrivate,
  onPrivacyChange,
  defaultPrivacy = 'public',
  disabled = false,
  showDescriptions = true,
  layout = 'toggle',
}: PrivacySelectorProps) {
  const toggleAnim = useRef(new Animated.Value(isPrivate ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Animate toggle when privacy changes
  useEffect(() => {
    Animated.timing(toggleAnim, {
      toValue: isPrivate ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isPrivate, toggleAnim]);

  // Handle privacy change
  const handlePrivacyChange = useCallback(async (newIsPrivate: boolean) => {
    if (disabled) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animation feedback
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPrivacyChange(newIsPrivate);
  }, [disabled, onPrivacyChange, scaleAnim]);

  // Handle toggle tap
  const handleToggle = useCallback(() => {
    handlePrivacyChange(!isPrivate);
  }, [handlePrivacyChange, isPrivate]);

  // Get current option
  const currentOption = PRIVACY_OPTIONS.find(
    option => (option.value === 'private') === isPrivate
  ) || PRIVACY_OPTIONS[0];

  // Toggle Layout
  if (layout === 'toggle') {
    return (
      <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          style={[
            styles.toggleContainer,
            disabled && styles.toggleContainerDisabled,
          ]}
          onPress={handleToggle}
          disabled={disabled}
          activeOpacity={0.8}
        >
          {/* Left Content */}
          <View style={styles.toggleContent}>
            <View style={styles.iconWrapper}>
              <MaterialIcons
                name={currentOption.icon as any}
                size={20}
                color={currentOption.color}
              />
            </View>
            
            <View style={styles.toggleText}>
              <Text style={[
                styles.toggleLabel,
                disabled && styles.toggleLabelDisabled,
              ]}>
                {currentOption.label}
              </Text>
              
              {showDescriptions && (
                <Text style={[
                  styles.toggleDescription,
                  disabled && styles.toggleDescriptionDisabled,
                ]}>
                  {currentOption.description}
                </Text>
              )}
            </View>
          </View>

          {/* Toggle Switch */}
          <View style={[
            styles.switch,
            isPrivate && styles.switchActive,
            disabled && styles.switchDisabled,
          ]}>
            <Animated.View
              style={[
                styles.switchThumb,
                {
                  transform: [
                    {
                      translateX: toggleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [2, 22],
                      }),
                    },
                  ],
                },
                isPrivate && styles.switchThumbActive,
              ]}
            />
          </View>
        </TouchableOpacity>

        {/* Privacy Indicator */}
        <View style={styles.privacyIndicator}>
          <MaterialIcons
            name={isPrivate ? 'lock' : 'lock-open'}
            size={14}
            color={isPrivate ? colors.warning : colors.success}
          />
          <Text style={[
            styles.privacyIndicatorText,
            { color: isPrivate ? colors.warning : colors.success },
          ]}>
            {isPrivate ? 'Private Post' : 'Public Post'}
          </Text>
        </View>
      </Animated.View>
    );
  }

  // Button Layout
  if (layout === 'buttons') {
    return (
      <View style={styles.container}>
        <View style={styles.buttonGroup}>
          {PRIVACY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.button,
                (option.value === 'private') === isPrivate && styles.buttonActive,
                (option.value === 'private') === isPrivate && { backgroundColor: option.color + '20', borderColor: option.color },
                disabled && styles.buttonDisabled,
              ]}
              onPress={() => handlePrivacyChange(option.value === 'private')}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={option.icon as any}
                size={18}
                color={(option.value === 'private') === isPrivate ? option.color : colors.textSecondary}
              />
              <Text style={[
                styles.buttonText,
                (option.value === 'private') === isPrivate && styles.buttonTextActive,
                (option.value === 'private') === isPrivate && { color: option.color },
                disabled && styles.buttonTextDisabled,
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {showDescriptions && (
          <Text style={styles.buttonDescription}>
            {currentOption.description}
          </Text>
        )}
      </View>
    );
  }

  // Cards Layout
  return (
    <View style={styles.container}>
      <View style={styles.cardsContainer}>
        {PRIVACY_OPTIONS.map((option) => {
          const isSelected = (option.value === 'private') === isPrivate;
          
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.card,
                isSelected && styles.cardSelected,
                isSelected && { borderColor: option.color },
                disabled && styles.cardDisabled,
              ]}
              onPress={() => handlePrivacyChange(option.value === 'private')}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <View style={[
                styles.cardIconContainer,
                isSelected && styles.cardIconContainerSelected,
                isSelected && { backgroundColor: option.color + '20' },
              ]}>
                <MaterialIcons
                  name={option.icon as any}
                  size={24}
                  color={isSelected ? option.color : colors.textSecondary}
                />
              </View>

              <Text style={[
                styles.cardTitle,
                isSelected && styles.cardTitleSelected,
                disabled && styles.cardTitleDisabled,
              ]}>
                {option.label}
              </Text>

              {showDescriptions && (
                <Text style={[
                  styles.cardDescription,
                  isSelected && styles.cardDescriptionSelected,
                  disabled && styles.cardDescriptionDisabled,
                ]}>
                  {option.description}
                </Text>
              )}

              {/* Selection Indicator */}
              {isSelected && (
                <View style={[styles.selectionBadge, { backgroundColor: option.color }]}>
                  <MaterialIcons name="check" size={12} color={colors.white} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  // Toggle Layout
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 12,
    padding: spacing(3),
  },

  toggleContainerDisabled: {
    backgroundColor: colors.surfaceDisabled,
    borderColor: colors.outlineVariant,
  },

  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(3),
  },

  toggleText: {
    flex: 1,
  },

  toggleLabel: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(0.5),
  },

  toggleLabelDisabled: {
    color: colors.textDisabled,
  },

  toggleDescription: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    lineHeight: fonts.sm * 1.3,
  },

  toggleDescriptionDisabled: {
    color: colors.textDisabled,
  },

  switch: {
    width: 44,
    height: 24,
    backgroundColor: colors.outline,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },

  switchActive: {
    backgroundColor: colors.primary,
  },

  switchDisabled: {
    backgroundColor: colors.outlineVariant,
  },

  switchThumb: {
    width: 20,
    height: 20,
    backgroundColor: colors.white,
    borderRadius: 10,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },

  switchThumbActive: {
    backgroundColor: colors.white,
  },

  privacyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing(2),
    gap: spacing(1),
  },

  privacyIndicatorText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
  },

  // Button Layout
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing(2),
  },

  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.outline,
    borderRadius: 12,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(2),
    gap: spacing(2),
  },

  buttonActive: {
    borderWidth: 2,
  },

  buttonDisabled: {
    backgroundColor: colors.surfaceDisabled,
    borderColor: colors.outlineVariant,
  },

  buttonText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.textSecondary,
  },

  buttonTextActive: {
    fontWeight: fonts.weights.bold,
  },

  buttonTextDisabled: {
    color: colors.textDisabled,
  },

  buttonDescription: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing(2),
    paddingHorizontal: spacing(2),
    lineHeight: fonts.sm * 1.4,
  },

  // Cards Layout
  cardsContainer: {
    gap: spacing(3),
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.outline,
    borderRadius: 12,
    padding: spacing(4),
    alignItems: 'center',
    position: 'relative',
  },

  cardSelected: {
    borderWidth: 2,
    backgroundColor: colors.primaryContainer,
  },

  cardDisabled: {
    backgroundColor: colors.surfaceDisabled,
    borderColor: colors.outlineVariant,
  },

  cardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(3),
  },

  cardIconContainerSelected: {
    backgroundColor: colors.primaryContainer,
  },

  cardTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(1),
  },

  cardTitleSelected: {
    color: colors.primary,
  },

  cardTitleDisabled: {
    color: colors.textDisabled,
  },

  cardDescription: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
  },

  cardDescriptionSelected: {
    color: colors.primary,
  },

  cardDescriptionDisabled: {
    color: colors.textDisabled,
  },

  selectionBadge: {
    position: 'absolute',
    top: spacing(2),
    right: spacing(2),
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});