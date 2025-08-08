import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { theme } from '../../theme';
import uiTheme, { colors, spacing, radii, fonts, shadows, layout } from '../../theme/uiTheme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'text';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  children,
  style,
  textStyle,
  accessibilityLabel,
  ...props
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.base,
      ...styles.sizes[size],
      ...(fullWidth && styles.fullWidth),
    };

    if (disabled || loading) {
      return {
        ...baseStyle,
        ...styles.variants[variant],
        ...styles.disabled,
      };
    }

    return {
      ...baseStyle,
      ...styles.variants[variant],
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      ...styles.text,
      ...styles.textSizes[size],
    };

    if (disabled || loading) {
      return {
        ...baseTextStyle,
        ...styles.textVariants[variant],
        ...styles.textDisabled,
      };
    }

    return {
      ...baseTextStyle,
      ...styles.textVariants[variant],
    };
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="small"
            color={variant === 'primary' || variant === 'secondary' ? theme.colors.white : theme.colors.primary}
          />
          <Text style={[getTextStyle(), { marginLeft: theme.spacing.sm }]}>
            {children}
          </Text>
        </View>
      );
    }

    if (icon) {
      return (
        <View style={styles.contentContainer}>
          {iconPosition === 'left' && (
            <View style={[styles.iconContainer, { marginRight: theme.spacing.sm }]}>
              {icon}
            </View>
          )}
          <Text style={getTextStyle()}>{children}</Text>
          {iconPosition === 'right' && (
            <View style={[styles.iconContainer, { marginLeft: theme.spacing.sm }]}>
              {icon}
            </View>
          )}
        </View>
      );
    }

    return <Text style={getTextStyle()}>{children}</Text>;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : 'Button')}
      accessibilityState={{ disabled: disabled || loading }}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...shadows.small,
    minHeight: layout.touchTarget,
  },
  fullWidth: {
    width: '100%',
  },
  sizes: {
    small: {
      height: Math.max(32, theme.touchTarget.minHeight * 0.7),
      paddingHorizontal: theme.spacing.md,
      minWidth: theme.touchTarget.minWidth * 1.5,
    },
    medium: {
      height: layout.touchTarget,
      paddingHorizontal: spacing(2),
      minWidth: layout.touchTarget * 2,
    },
    large: {
      height: Math.max(48, theme.touchTarget.minHeight),
      paddingHorizontal: theme.spacing.xl,
      minWidth: theme.touchTarget.minWidth * 2.5,
    },
  },
  variants: {
    primary: {
      backgroundColor: colors.primary,
      ...shadows.small,
    },
    secondary: {
      backgroundColor: theme.colors.secondary,
      ...theme.shadows.xs,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    ghost: {
      backgroundColor: theme.colors.gray[50],
    },
    text: {
      backgroundColor: 'transparent',
      ...theme.shadows.none,
    },
  },
  disabled: {
    opacity: 0.5,
    ...theme.shadows.none,
  },
  text: {
    textAlign: 'center',
    fontWeight: theme.typography.fontWeight.semibold,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  textSizes: {
    small: {
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.tight,
    },
    medium: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.tight,
    },
    large: {
      fontSize: theme.typography.fontSize.lg,
      lineHeight: theme.typography.fontSize.lg * theme.typography.lineHeight.tight,
    },
  },
  textVariants: {
    primary: {
      color: theme.colors.white,
    },
    secondary: {
      color: theme.colors.white,
    },
    outline: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    ghost: {
      color: theme.colors.text,
      fontWeight: theme.typography.fontWeight.medium,
    },
    text: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
  },
  textDisabled: {
    color: theme.colors.textDisabled,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Button;