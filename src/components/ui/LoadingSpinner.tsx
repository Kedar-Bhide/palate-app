import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Modal,
} from 'react-native';
import { theme } from '../../theme';

export type LoadingSpinnerSize = 'small' | 'medium' | 'large';
export type LoadingSpinnerColor = 'primary' | 'secondary' | 'white';

export interface LoadingSpinnerProps {
  size?: LoadingSpinnerSize;
  color?: LoadingSpinnerColor | string;
  text?: string;
  fullScreen?: boolean;
  visible?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  text,
  fullScreen = false,
  visible = true,
  style,
  textStyle,
}) => {
  const getSpinnerSize = () => {
    switch (size) {
      case 'small':
        return 'small' as const;
      case 'large':
        return 'large' as const;
      case 'medium':
      default:
        return 'small' as const;
    }
  };

  const getSpinnerColor = (): string => {
    if (typeof color === 'string' && !['primary', 'secondary', 'white'].includes(color)) {
      return color;
    }

    switch (color) {
      case 'primary':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.secondary;
      case 'white':
        return theme.colors.white;
      default:
        return theme.colors.primary;
    }
  };

  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.container,
    };

    if (fullScreen) {
      return {
        ...baseStyle,
        ...styles.fullScreenContainer,
      };
    }

    return baseStyle;
  };

  const getTextStyleForSize = (): TextStyle => {
    const baseStyle: TextStyle = {
      ...styles.text,
      color: fullScreen ? theme.colors.white : theme.colors.text,
    };

    switch (size) {
      case 'small':
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.sm,
          marginTop: theme.spacing.xs,
        };
      case 'large':
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.lg,
          marginTop: theme.spacing.md,
        };
      case 'medium':
      default:
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.base,
          marginTop: theme.spacing.sm,
        };
    }
  };

  const renderSpinner = () => (
    <View
      style={[getContainerStyle(), style]}
      accessibilityRole="progressbar"
      accessibilityLabel={text || 'Loading'}
      accessibilityState={{ busy: true }}
    >
      <ActivityIndicator
        size={getSpinnerSize()}
        color={getSpinnerColor()}
        style={styles.spinner}
      />
      {text && (
        <Text
          style={[getTextStyleForSize(), textStyle]}
        >
          {text}
        </Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          {renderSpinner()}
        </View>
      </Modal>
    );
  }

  if (!visible) {
    return null;
  }

  return renderSpinner();
};

export interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
  size?: LoadingSpinnerSize;
  onRequestClose?: () => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  text = 'Loading...',
  size = 'large',
  onRequestClose,
}) => {
  return (
    <LoadingSpinner
      fullScreen
      visible={visible}
      text={text}
      size={size}
      color="white"
    />
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    transform: [{ scale: 1.2 }],
  },
  text: {
    textAlign: 'center',
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.normal * theme.typography.fontSize.base,
  },
});

export default LoadingSpinner;