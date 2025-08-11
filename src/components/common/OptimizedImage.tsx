import React, { useState, useRef, useEffect, memo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface OptimizedImageProps {
  source: string | { uri: string };
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  placeholder?: string;
  fallback?: string;
  lazy?: boolean;
  quality?: number;
  resize?: { width: number; height: number };
  blur?: number;
  priority?: 'low' | 'normal' | 'high';
  cachePolicy?: 'memory' | 'disk' | 'memory-disk' | 'none';
  onLoad?: () => void;
  onError?: (error: Error) => void;
  onPress?: () => void;
  children?: React.ReactNode;
  showRetry?: boolean;
  accessible?: boolean;
  accessibilityLabel?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = memo(({
  source,
  style,
  containerStyle,
  placeholder,
  fallback,
  lazy = true,
  quality = 0.8,
  resize,
  blur,
  priority = 'normal',
  cachePolicy = 'memory-disk',
  onLoad,
  onError,
  onPress,
  children,
  showRetry = true,
  accessible = true,
  accessibilityLabel,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(!lazy);
  const [retryCount, setRetryCount] = useState(0);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const viewRef = useRef<View>(null);
  const maxRetries = 3;

  // Get image URI
  const getImageUri = (): string => {
    if (typeof source === 'string') return source;
    return source.uri;
  };

  // Create optimized source object
  const createOptimizedSource = () => {
    const uri = getImageUri();
    
    if (!uri) return null;

    return {
      uri,
      ...(resize && { width: resize.width, height: resize.height }),
      ...(blur && { blur }),
    };
  };

  // Handle intersection observer for lazy loading
  useEffect(() => {
    if (!lazy) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    const currentRef = viewRef.current;
    if (currentRef) {
      // Note: IntersectionObserver doesn't work directly in React Native
      // This is a placeholder for the concept. In RN, we'd use onLayout or scroll events
      setIsVisible(true);
    }

    return () => {
      observer.disconnect();
    };
  }, [lazy]);

  // Handle image load success
  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    onLoad?.();
  };

  // Handle image load error
  const handleError = (error: any) => {
    console.warn('Image load error:', error);
    setHasError(true);
    setIsLoaded(false);
    
    const errorObj = new Error(`Failed to load image: ${getImageUri()}`);
    onError?.(errorObj);
  };

  // Retry loading image
  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setHasError(false);
      setIsLoaded(false);
      fadeAnim.setValue(0);
    }
  };

  // Render loading placeholder
  const renderPlaceholder = () => {
    if (placeholder) {
      return (
        <Image
          source={{ uri: placeholder }}
          style={[styles.placeholder, style]}
          contentFit="cover"
        />
      );
    }

    return (
      <View style={[styles.placeholderDefault, style]}>
        <View style={styles.placeholderContent}>
          <MaterialIcons
            name="image"
            size={24}
            color={theme.colors.gray[400]}
          />
        </View>
      </View>
    );
  };

  // Render error state
  const renderError = () => {
    const errorUri = fallback || placeholder;
    
    if (errorUri) {
      return (
        <Image
          source={{ uri: errorUri }}
          style={[styles.fallback, style]}
          contentFit="cover"
        />
      );
    }

    return (
      <View style={[styles.errorContainer, style]}>
        <View style={styles.errorContent}>
          <MaterialIcons
            name="broken-image"
            size={32}
            color={theme.colors.error}
          />
          {showRetry && retryCount < maxRetries && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              accessible={true}
              accessibilityLabel="Retry loading image"
            >
              <MaterialIcons
                name="refresh"
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Render main image
  const renderImage = () => {
    const optimizedSource = createOptimizedSource();
    
    if (!optimizedSource) {
      return renderError();
    }

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <Image
          source={optimizedSource}
          style={style}
          contentFit="cover"
          priority={priority}
          cachePolicy={cachePolicy}
          onLoad={handleLoad}
          onError={handleError}
          accessible={accessible}
          accessibilityLabel={accessibilityLabel}
        />
      </Animated.View>
    );
  };

  // Main render
  const content = (
    <View ref={viewRef} style={[styles.container, containerStyle]}>
      {/* Always show placeholder first */}
      {!isLoaded && !hasError && renderPlaceholder()}
      
      {/* Show error state if image failed to load */}
      {hasError && renderError()}
      
      {/* Show optimized image when visible and not errored */}
      {isVisible && !hasError && renderImage()}
      
      {/* Overlay children */}
      {children && (
        <View style={styles.overlay}>
          {children}
        </View>
      )}
    </View>
  );

  // Wrap in TouchableOpacity if onPress is provided
  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={containerStyle}
        accessible={accessible}
        accessibilityLabel={accessibilityLabel || 'Image'}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: theme.colors.gray[100],
  },
  placeholder: {
    backgroundColor: theme.colors.gray[100],
  },
  placeholderDefault: {
    backgroundColor: theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContent: {
    padding: theme.spacing.md,
  },
  fallback: {
    backgroundColor: theme.colors.gray[50],
  },
  errorContainer: {
    backgroundColor: theme.colors.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    borderStyle: 'dashed',
  },
  errorContent: {
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  retryButton: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: `${theme.colors.primary}20`,
    borderRadius: theme.borderRadius.full,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;