import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
  SafeAreaView,
} from 'react-native';
import { theme } from '../../theme';
import Button, { ButtonProps } from './Button';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top' | 'bottom';

export interface ToastAction extends Omit<ButtonProps, 'children' | 'size'> {
  title: string;
  onPress: () => void;
}

export interface ToastProps {
  id?: string;
  variant?: ToastVariant;
  message: string;
  description?: string;
  duration?: number;
  position?: ToastPosition;
  action?: ToastAction;
  onDismiss?: () => void;
  swipeToDismiss?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  messageStyle?: TextStyle;
  descriptionStyle?: TextStyle;
}

export const Toast: React.FC<ToastProps> = ({
  id = Math.random().toString(),
  variant = 'info',
  message,
  description,
  duration = 3000,
  position = 'top',
  action,
  onDismiss,
  swipeToDismiss = true,
  icon,
  style,
  messageStyle,
  descriptionStyle,
}) => {
  const translateY = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: theme.animation.duration.normal,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: theme.animation.duration.normal,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss timer
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    if (dismissed) return;
    
    setDismissed(true);
    
    // Slide out animation
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: position === 'top' ? -100 : 100,
        duration: theme.animation.duration.fast,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: theme.animation.duration.fast,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  // Gesture handling removed for now - can be re-added later with proper gesture library

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: theme.colors.success,
          borderColor: theme.colors.success,
        };
      case 'error':
        return {
          backgroundColor: theme.colors.error,
          borderColor: theme.colors.error,
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warning,
          borderColor: theme.colors.warning,
        };
      case 'info':
      default:
        return {
          backgroundColor: theme.colors.info,
          borderColor: theme.colors.info,
        };
    }
  };

  const getDefaultIcon = () => {
    // Return null for now since we don't know which icon library is being used
    // This would typically return appropriate icons based on variant
    return null;
  };

  const containerStyle = [
    styles.container,
    getVariantStyles(),
    position === 'top' ? styles.topContainer : styles.bottomContainer,
    style,
  ];

  const animatedStyle = {
    opacity,
    transform: [
      { translateY: Animated.add(translateY, panY) },
    ],
  };

  const content = (
    <Animated.View style={[containerStyle, animatedStyle]}>
      <View style={styles.content}>
        {(icon || getDefaultIcon()) && (
          <View style={styles.iconContainer}>
            {icon || getDefaultIcon()}
          </View>
        )}
        
        <View style={styles.textContainer}>
          <Text
            style={[styles.message, messageStyle]}
            accessibilityRole="alert"
          >
            {message}
          </Text>
          
          {description && (
            <Text style={[styles.description, descriptionStyle]}>
              {description}
            </Text>
          )}
        </View>

        {action && (
          <View style={styles.actionContainer}>
            <Button
              variant="ghost"
              size="small"
              onPress={() => {
                action.onPress();
                handleDismiss();
              }}
              textStyle={styles.actionText}
              style={styles.actionButton}
              {...action}
            >
              {action.title}
            </Button>
          </View>
        )}

        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // Simplified without gesture handling for now
  return content;
};

export interface ToastContainerProps {
  toasts: ToastProps[];
  position?: ToastPosition;
  maxToasts?: number;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  position = 'top',
  maxToasts = 3,
}) => {
  const visibleToasts = toasts.slice(-maxToasts);

  return (
    <SafeAreaView
      style={[
        styles.toastContainer,
        position === 'top' ? styles.topToastContainer : styles.bottomToastContainer,
      ]}
      pointerEvents="box-none"
    >
      {visibleToasts.map((toast, index) => (
        <View
          key={toast.id || index}
          style={[
            styles.toastWrapper,
            { zIndex: visibleToasts.length - index },
          ]}
        >
          <Toast {...toast} position={position} />
        </View>
      ))}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.lg,
    margin: theme.spacing.md,
    ...theme.shadows.md,
  },
  topContainer: {
    marginTop: theme.spacing.lg,
  },
  bottomContainer: {
    marginBottom: theme.spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.md,
    minHeight: 56,
  },
  iconContainer: {
    marginRight: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  message: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.white,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
  },
  description: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.normal,
    color: theme.colors.white,
    opacity: 0.9,
    marginTop: theme.spacing.xs,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
  },
  actionContainer: {
    marginLeft: theme.spacing.sm,
  },
  actionButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  actionText: {
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    marginLeft: theme.spacing.xs,
  },
  closeText: {
    fontSize: 18,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.white,
    lineHeight: 20,
  },
  toastContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  topToastContainer: {
    top: 0,
  },
  bottomToastContainer: {
    bottom: 0,
  },
  toastWrapper: {
    position: 'relative',
  },
});

export default Toast;