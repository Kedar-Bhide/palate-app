import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageSourcePropType,
  Animated,
} from 'react-native';
import { theme } from '../../theme';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type StatusIndicator = 'online' | 'offline' | 'away' | 'busy';

export interface AvatarProps {
  source?: ImageSourcePropType;
  name?: string;
  size?: AvatarSize;
  showStatus?: boolean;
  status?: StatusIndicator;
  backgroundColor?: string;
  textColor?: string;
  borderWidth?: number;
  borderColor?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name = '',
  size = 'md',
  showStatus = false,
  status = 'offline',
  backgroundColor,
  textColor,
  borderWidth = 0,
  borderColor = theme.colors.outline,
  style,
  accessibilityLabel,
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (!imageLoading && !imageError) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: theme.animation.duration.fast,
        useNativeDriver: true,
      }).start();
    }
  }, [imageLoading, imageError, fadeAnim]);

  const getInitials = (fullName: string): string => {
    if (!fullName.trim()) return '';
    
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const getContainerStyle = (): ViewStyle => {
    const sizeValue = styles.sizes[size].width;
    
    return {
      ...styles.container,
      ...styles.sizes[size],
      borderWidth,
      borderColor,
      backgroundColor: backgroundColor || getDefaultBackgroundColor(),
    };
  };

  const getDefaultBackgroundColor = (): string => {
    if (!name) return theme.colors.gray[300];
    
    const colors = [
      theme.colors.primary,
      theme.colors.secondary,
      theme.colors.info,
      theme.colors.success,
      theme.colors.warning,
    ];
    
    const charCode = name.charCodeAt(0);
    return colors[charCode % colors.length];
  };

  const getTextStyle = (): TextStyle => {
    return {
      ...styles.text,
      ...styles.textSizes[size],
      color: textColor || theme.colors.white,
    };
  };

  const getStatusIndicatorStyle = (): ViewStyle => {
    const containerSize = styles.sizes[size].width;
    const indicatorSize = Math.max(containerSize * 0.25, 8);
    const position = containerSize * 0.15;
    
    return {
      ...styles.statusIndicator,
      width: indicatorSize,
      height: indicatorSize,
      backgroundColor: getStatusColor(),
      bottom: position,
      right: position,
    };
  };

  const getStatusColor = (): string => {
    switch (status) {
      case 'online':
        return theme.colors.success;
      case 'away':
        return theme.colors.warning;
      case 'busy':
        return theme.colors.error;
      case 'offline':
      default:
        return theme.colors.gray[400];
    }
  };

  const renderContent = () => {
    if (source && !imageError) {
      return (
        <>
          {imageLoading && (
            <View style={styles.loadingPlaceholder}>
              <View style={styles.skeleton} />
            </View>
          )}
          <Animated.Image
            source={source}
            style={[
              styles.image,
              { opacity: fadeAnim },
            ]}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
            accessibilityIgnoresInvertColors
          />
        </>
      );
    }

    const initials = getInitials(name);
    return (
      <Text style={getTextStyle()}>
        {initials || '?'}
      </Text>
    );
  };

  const label = accessibilityLabel || (name ? `${name}'s avatar` : 'User avatar');

  return (
    <View
      style={[getContainerStyle(), style]}
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      {renderContent()}
      
      {showStatus && (
        <View
          style={getStatusIndicatorStyle()}
          accessibilityLabel={`Status: ${status}`}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  sizes: {
    xs: {
      width: 24,
      height: 24,
    },
    sm: {
      width: 32,
      height: 32,
    },
    md: {
      width: 48,
      height: 48,
    },
    lg: {
      width: 64,
      height: 64,
    },
    xl: {
      width: 96,
      height: 96,
    },
    xxl: {
      width: 128,
      height: 128,
    },
  },
  image: {
    width: '100%',
    height: '100%',
  },
  text: {
    fontWeight: theme.typography.fontWeight.medium,
    textAlign: 'center',
  },
  textSizes: {
    xs: {
      fontSize: 10,
    },
    sm: {
      fontSize: theme.typography.fontSize.xs,
    },
    md: {
      fontSize: theme.typography.fontSize.base,
    },
    lg: {
      fontSize: theme.typography.fontSize.lg,
    },
    xl: {
      fontSize: theme.typography.fontSize['2xl'],
    },
    xxl: {
      fontSize: theme.typography.fontSize['3xl'],
    },
  },
  loadingPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  skeleton: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.gray[200],
    opacity: 0.7,
  },
  statusIndicator: {
    position: 'absolute',
    borderRadius: theme.borderRadius.full,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
});

export default Avatar;