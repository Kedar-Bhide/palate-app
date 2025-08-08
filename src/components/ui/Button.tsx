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
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  sizes: {
    small: {
      height: 32,
      paddingHorizontal: theme.spacing.md,
    },
    medium: {
      height: theme.touchTarget.minHeight,
      paddingHorizontal: theme.spacing.lg,
    },
    large: {
      height: 56,
      paddingHorizontal: theme.spacing.xl,
    },
  },
  variants: {
    primary: {
      backgroundColor: theme.colors.primary,
    },
    secondary: {
      backgroundColor: theme.colors.secondary,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    text: {
      backgroundColor: 'transparent',
    },
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    textAlign: 'center',
    fontWeight: theme.typography.fontWeight.medium,
  },
  textSizes: {
    small: {
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
    },
    medium: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
    },
    large: {
      fontSize: theme.typography.fontSize.lg,
      lineHeight: theme.typography.fontSize.lg * theme.typography.lineHeight.normal,
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
    },
    ghost: {
      color: theme.colors.primary,
    },
    text: {
      color: theme.colors.primary,
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