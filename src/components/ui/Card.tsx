import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TouchableOpacityProps,
} from 'react-native';
import { theme } from '../../theme';
import uiTheme, { colors, spacing, radii, shadows } from '../../theme/uiTheme';

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
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  variants: {
    elevated: {
      ...shadows.small,
      backgroundColor: colors.white,
      borderWidth: 0,
    },
    flat: {
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.outline,
    },
    outlined: {
      backgroundColor: colors.white,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.outline,
    },
  },
  padding: {
    none: {
      padding: 0,
    },
    small: {
      padding: spacing(1),
    },
    medium: {
      padding: spacing(1.5),
    },
    large: {
      padding: spacing(2),
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.outline,
    paddingTop: theme.spacing.md,
  },
});

export default Card;