/**
 * PhotoCarousel Component
 * Swipeable photo carousel for multiple post images with Instagram-style features
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts } from '../../theme/uiTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_HEIGHT = SCREEN_WIDTH; // Square aspect ratio by default

interface PhotoCarouselProps {
  images: string[];
  aspectRatio?: number;
  showIndicators?: boolean;
  enableZoom?: boolean;
  onImagePress?: (imageIndex: number) => void;
  style?: any;
}

const PhotoCarousel: React.FC<PhotoCarouselProps> = ({
  images,
  aspectRatio = 1,
  showIndicators = true,
  enableZoom = true,
  onImagePress,
  style,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoadStates, setImageLoadStates] = useState<{[key: number]: 'loading' | 'loaded' | 'error'}>({});
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation values for zoom
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const lastTap = useRef(0);

  const carouselHeight = SCREEN_WIDTH / aspectRatio;

  const handleImageLoadStart = useCallback((index: number) => {
    setImageLoadStates(prev => ({ ...prev, [index]: 'loading' }));
  }, []);

  const handleImageLoadEnd = useCallback((index: number) => {
    setImageLoadStates(prev => ({ ...prev, [index]: 'loaded' }));
  }, []);

  const handleImageError = useCallback((index: number) => {
    setImageLoadStates(prev => ({ ...prev, [index]: 'error' }));
  }, []);

  const handleScroll = useCallback((event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / SCREEN_WIDTH);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < images.length) {
      setCurrentIndex(newIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [currentIndex, images.length]);

  const resetZoom = useCallback(() => {
    'worklet';
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  }, []);

  const handleDoubleTap = useCallback(() => {
    'worklet';
    if (scale.value > 1) {
      resetZoom();
    } else {
      scale.value = withSpring(2);
    }
  }, [resetZoom]);

  // Double tap gesture for zoom
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (enableZoom) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        handleDoubleTap();
      }
    });

  // Single tap gesture
  const singleTapGesture = Gesture.Tap()
    .onEnd(() => {
      if (onImagePress) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        runOnJS(onImagePress)(currentIndex);
      }
    });

  // Pan gesture for zoom and pan
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (enableZoom && scale.value > 1) {
        translateX.value = event.translationX;
        translateY.value = event.translationY;
      }
    })
    .onEnd(() => {
      if (enableZoom) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const composedGestures = Gesture.Exclusive(
    doubleTapGesture,
    Gesture.Simultaneous(singleTapGesture, panGesture)
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  const renderImage = (imageUrl: string, index: number) => {
    const loadState = imageLoadStates[index] || 'loading';
    
    return (
      <View key={index} style={styles.imageContainer}>
        {loadState === 'loading' && (
          <View style={styles.imageLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        
        {loadState === 'error' && (
          <View style={styles.imageError}>
            <Text style={styles.errorText}>Failed to load image</Text>
          </View>
        )}
        
        <GestureDetector gesture={composedGestures}>
          <Animated.View style={animatedStyle}>
            <Image
              source={{ uri: imageUrl }}
              style={[
                styles.image,
                { height: carouselHeight },
                loadState === 'loaded' ? styles.imageVisible : styles.imageHidden,
              ]}
              contentFit="cover"
              priority="high"
              recyclingKey={`post-image-${index}`}
              onLoadStart={() => handleImageLoadStart(index)}
              onLoad={() => handleImageLoadEnd(index)}
              onError={() => handleImageError(index)}
            />
          </Animated.View>
        </GestureDetector>
      </View>
    );
  };

  const renderIndicators = () => {
    if (!showIndicators || images.length <= 1) return null;

    return (
      <View style={styles.indicatorContainer}>
        {images.length <= 5 ? (
          // Dots for 5 or fewer images
          <View style={styles.dotsContainer}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            ))}
          </View>
        ) : (
          // Counter for more than 5 images
          <View style={styles.counterContainer}>
            <Text style={styles.counterText}>
              {currentIndex + 1}/{images.length}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (images.length === 0) {
    return (
      <View style={[styles.container, { height: carouselHeight }, style]}>
        <View style={styles.noImageContainer}>
          <Text style={styles.noImageText}>No images available</Text>
        </View>
      </View>
    );
  }

  if (images.length === 1) {
    // Single image - no carousel needed
    return (
      <View style={[styles.container, { height: carouselHeight }, style]}>
        {renderImage(images[0], 0)}
        {renderIndicators()}
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: carouselHeight }, style]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={SCREEN_WIDTH}
        snapToAlignment="start"
        bounces={false}
        style={styles.scrollView}
      >
        {images.map((imageUrl, index) => renderImage(imageUrl, index))}
      </ScrollView>
      
      {renderIndicators()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    backgroundColor: colors.outline,
    position: 'relative',
  },

  scrollView: {
    flex: 1,
  },

  imageContainer: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  image: {
    width: SCREEN_WIDTH,
    backgroundColor: colors.outline,
  },

  imageVisible: {
    opacity: 1,
  },

  imageHidden: {
    opacity: 0,
  },

  imageLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.outline,
    zIndex: 1,
  },

  imageError: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.outline,
    zIndex: 1,
  },

  errorText: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    fontWeight: fonts.weights.medium,
  },

  noImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.outline,
  },

  noImageText: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    fontWeight: fonts.weights.medium,
  },

  // Indicators
  indicatorContainer: {
    position: 'absolute',
    top: spacing(2),
    right: spacing(2),
    zIndex: 2,
  },

  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: 20,
    gap: spacing(1),
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  activeDot: {
    backgroundColor: colors.white,
  },

  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },

  counterContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: 20,
  },

  counterText: {
    color: colors.white,
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
  },
});

export default PhotoCarousel;