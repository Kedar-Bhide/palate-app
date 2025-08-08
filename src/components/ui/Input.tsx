import React, { forwardRef, useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  KeyboardTypeOptions,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../../theme';
import uiTheme, { colors, spacing, radii, fonts, layout } from '../../theme/uiTheme';

export type InputVariant = 'default' | 'outlined' | 'filled';
export type InputSize = 'small' | 'medium' | 'large';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  variant?: InputVariant;
  size?: InputSize;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  showCharacterCount?: boolean;
  maxLength?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      variant = 'default',
      size = 'medium',
      label,
      helperText,
      errorMessage,
      showCharacterCount = false,
      maxLength,
      leftIcon,
      rightIcon,
      onRightIconPress,
      disabled = false,
      style,
      inputStyle,
      labelStyle,
      value = '',
      onFocus,
      onBlur,
      accessibilityLabel,
      accessibilityHint,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasError = Boolean(errorMessage);

    const handleFocus = (e: any) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const getContainerStyle = (): ViewStyle => {
      const baseStyle: ViewStyle = {
        ...styles.container,
        ...styles.sizes[size],
      };

      let variantStyle: ViewStyle = {};
      
      if (hasError) {
        variantStyle = styles.containerError;
      } else if (isFocused) {
        variantStyle = styles.containerFocused;
      } else if (disabled) {
        variantStyle = styles.containerDisabled;
      } else {
        variantStyle = styles.variants[variant];
      }

      return {
        ...baseStyle,
        ...variantStyle,
      };
    };

    const getInputStyle = (): TextStyle => {
      const baseStyle: TextStyle = {
        ...styles.input,
        ...styles.inputSizes[size],
      };

      if (disabled) {
        return {
          ...baseStyle,
          color: theme.colors.textDisabled,
        };
      }

      return baseStyle;
    };

    const characterCount = typeof value === 'string' ? value.length : 0;
    const showCount = showCharacterCount && maxLength;

    return (
      <View style={[styles.wrapper, style]}>
        {label && (
          <Text
            style={[
              styles.label,
              hasError && styles.labelError,
              disabled && styles.labelDisabled,
              labelStyle,
            ]}
          >
            {label}
          </Text>
        )}
        
        <View style={getContainerStyle()}>
          {leftIcon && (
            <View style={styles.leftIconContainer}>
              {leftIcon}
            </View>
          )}
          
          <TextInput
            ref={ref}
            style={[getInputStyle(), inputStyle]}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={!disabled}
            maxLength={maxLength}
            placeholderTextColor={theme.colors.textSecondary}
            accessibilityLabel={accessibilityLabel || label || 'Text input'}
            accessibilityHint={accessibilityHint || helperText || undefined}
            accessibilityState={{
              disabled,
              ...(hasError && { invalid: true }),
            }}
            {...props}
          />
          
          {rightIcon && (
            <TouchableOpacity
              style={styles.rightIconContainer}
              onPress={onRightIconPress}
              disabled={!onRightIconPress}
              accessibilityRole={onRightIconPress ? 'button' : undefined}
            >
              {rightIcon}
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.bottomContainer}>
          <View style={styles.messageContainer}>
            {hasError && (
              <Text
                style={styles.errorText}
                accessibilityRole="alert"
              >
                {errorMessage}
              </Text>
            )}
            {!hasError && helperText && (
              <Text style={styles.helperText}>{helperText}</Text>
            )}
          </View>
          
          {showCount && (
            <Text style={[
              styles.characterCount,
              characterCount > maxLength && styles.characterCountError,
            ]}>
              {characterCount}/{maxLength}
            </Text>
          )}
        </View>
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  labelError: {
    color: theme.colors.error,
  },
  labelDisabled: {
    color: theme.colors.textDisabled,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.input,
    overflow: 'hidden',
  },
  sizes: {
    small: {
      minHeight: Math.max(36, theme.touchTarget.minHeight * 0.8),
    },
    medium: {
      minHeight: layout.touchTarget,
    },
    large: {
      minHeight: Math.max(48, theme.touchTarget.minHeight),
    },
  },
  variants: {
    default: {
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    outlined: {
      borderWidth: 1.5,
      borderColor: theme.colors.outline,
      backgroundColor: theme.colors.white,
      ...theme.shadows.xs,
    },
    filled: {
      backgroundColor: theme.colors.gray[50],
      borderWidth: 0,
    },
  },
  containerFocused: {
    borderColor: theme.colors.primary,
    borderBottomColor: theme.colors.primary,
    backgroundColor: theme.colors.white,
    ...theme.shadows.sm,
  },
  containerError: {
    borderColor: theme.colors.error,
    borderBottomColor: theme.colors.error,
    backgroundColor: theme.colors.white,
  },
  containerDisabled: {
    backgroundColor: theme.colors.gray[100],
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.lg,
    fontWeight: theme.typography.fontWeight.normal,
  },
  inputSizes: {
    small: {
      fontSize: theme.typography.fontSize.sm,
      paddingHorizontal: theme.spacing.md,
    },
    medium: {
      fontSize: theme.typography.fontSize.base,
      paddingHorizontal: theme.spacing.lg,
    },
    large: {
      fontSize: theme.typography.fontSize.lg,
      paddingHorizontal: theme.spacing.lg,
    },
  },
  leftIconContainer: {
    paddingLeft: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIconContainer: {
    paddingRight: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: theme.touchTarget.minWidth,
    minHeight: theme.touchTarget.minHeight,
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: theme.spacing.sm,
    minHeight: 18,
  },
  messageContainer: {
    flex: 1,
  },
  errorText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
    lineHeight: theme.typography.fontSize.xs * theme.typography.lineHeight.normal,
    fontWeight: theme.typography.fontWeight.medium,
  },
  helperText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.xs * theme.typography.lineHeight.normal,
  },
  characterCount: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  characterCountError: {
    color: theme.colors.error,
  },
});

export default Input;