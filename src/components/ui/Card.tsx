import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TouchableOpacityProps,
} from 'react-native';
import { theme } from '../../theme';

export type CardVariant = 'elevated' | 'flat' | 'outlined';
export type CardPadding = 'none' | 'small' | 'medium' | 'large';

export interface CardSection {
  header?: React.ReactNode;
  body?: React.ReactNode;
  footer?: React.ReactNode;
}

export interface BaseCardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export interface StaticCardProps extends BaseCardProps {
  pressable?: false;
}

export interface PressableCardProps extends BaseCardProps, Omit<TouchableOpacityProps, 'style'> {
  pressable: true;
  onPress: () => void;
}

export type CardProps = StaticCardProps | PressableCardProps;

export const Card: React.FC<CardProps> = (props) => {
  const {
    variant = 'elevated',
    padding = 'medium',
    children,
    style,
    ...rest
  } = props;

  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.base,
      ...styles.variants[variant],
      ...styles.padding[padding],
    };

    return baseStyle;
  };

  if (props.pressable) {
    const { pressable, onPress, ...touchableProps } = props;
    return (
      <TouchableOpacity
        style={[getCardStyle(), style]}
        onPress={onPress}
        accessibilityRole="button"
        activeOpacity={0.8}
        {...touchableProps}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[getCardStyle(), style]}>
      {children}
    </View>
  );
};

export interface CardSectionProps {
  header?: React.ReactNode;
  body?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  pressable?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export const CardWithSections: React.FC<CardSectionProps> = ({
  header,
  body,
  footer,
  variant = 'elevated',
  padding = 'medium',
  pressable = false,
  onPress,
  style,
}) => {
  const cardContent = (
    <>
      {header && (
        <View style={styles.headerSection}>
          {header}
        </View>
      )}
      {body && (
        <View style={[
          styles.bodySection,
          header && styles.bodyWithHeader,
          footer && styles.bodyWithFooter,
        ]}>
          {body}
        </View>
      )}
      {footer && (
        <View style={styles.footerSection}>
          {footer}
        </View>
      )}
    </>
  );

  if (pressable && onPress) {
    return (
      <Card
        variant={variant}
        padding="none"
        pressable
        onPress={onPress}
        style={style}
      >
        <View style={styles.padding[padding]}>
          {cardContent}
        </View>
      </Card>
    );
  }

  return (
    <Card
      variant={variant}
      padding="none"
      style={style}
    >
      <View style={styles.padding[padding]}>
        {cardContent}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
  },
  variants: {
    elevated: {
      ...theme.shadows.md,
    },
    flat: {
      backgroundColor: theme.colors.surface,
    },
    outlined: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline,
    },
  },
  padding: {
    none: {
      padding: 0,
    },
    small: {
      padding: theme.spacing.sm,
    },
    medium: {
      padding: theme.spacing.md,
    },
    large: {
      padding: theme.spacing.lg,
    },
  },
  headerSection: {
    marginBottom: theme.spacing.md,
  },
  bodySection: {
    flex: 1,
  },
  bodyWithHeader: {
    marginTop: 0,
  },
  bodyWithFooter: {
    marginBottom: theme.spacing.md,
  },
  footerSection: {
    marginTop: theme.spacing.md,
  },
});

export default Card;