import React, { useRef, useEffect, memo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LoadingSkeletonProps {
  type?: 'post' | 'user' | 'cuisine' | 'profile' | 'feed' | 'custom';
  count?: number;
  animated?: boolean;
  style?: ViewStyle;
  children?: React.ReactNode;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = memo(({
  type = 'custom',
  count = 1,
  animated = true,
  style,
  children,
  width,
  height,
  borderRadius = theme.borderRadius.md,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      const shimmerAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      );

      shimmerAnimation.start();

      return () => {
        shimmerAnimation.stop();
      };
    }
  }, [animated, shimmerAnim]);

  const getShimmerGradient = () => {
    if (!animated) return undefined;

    const translateX = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
    });

    return (
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255, 255, 255, 0.6)',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    );
  };

  const SkeletonBox: React.FC<{
    width: number | string;
    height: number | string;
    style?: ViewStyle;
    borderRadius?: number;
  }> = ({ width, height, style: boxStyle, borderRadius: boxBorderRadius }) => (
    <View
      style={[
        styles.skeletonBox,
        {
          width,
          height,
          borderRadius: boxBorderRadius ?? borderRadius,
        },
        boxStyle,
      ]}
    >
      {getShimmerGradient()}
    </View>
  );

  const renderPostSkeleton = () => (
    <View style={styles.postContainer}>
      {/* Post header */}
      <View style={styles.postHeader}>
        <SkeletonBox width={40} height={40} borderRadius={20} />
        <View style={styles.postHeaderText}>
          <SkeletonBox width="60%" height={16} />
          <SkeletonBox width="40%" height={12} style={{ marginTop: 4 }} />
        </View>
      </View>

      {/* Post image */}
      <SkeletonBox
        width="100%"
        height={250}
        style={{ marginVertical: theme.spacing.sm }}
      />

      {/* Post actions */}
      <View style={styles.postActions}>
        <SkeletonBox width={24} height={24} borderRadius={12} />
        <SkeletonBox width={24} height={24} borderRadius={12} style={{ marginLeft: theme.spacing.md }} />
        <SkeletonBox width={24} height={24} borderRadius={12} style={{ marginLeft: theme.spacing.md }} />
      </View>

      {/* Post content */}
      <View style={styles.postContent}>
        <SkeletonBox width="80%" height={14} />
        <SkeletonBox width="60%" height={14} style={{ marginTop: 4 }} />
        <SkeletonBox width="40%" height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
  );

  const renderUserSkeleton = () => (
    <View style={styles.userContainer}>
      <SkeletonBox width={48} height={48} borderRadius={24} />
      <View style={styles.userText}>
        <SkeletonBox width="70%" height={16} />
        <SkeletonBox width="50%" height={12} style={{ marginTop: 4 }} />
      </View>
    </View>
  );

  const renderCuisineSkeleton = () => (
    <View style={styles.cuisineContainer}>
      <SkeletonBox width="100%" height={120} />
      <View style={styles.cuisineContent}>
        <SkeletonBox width="80%" height={16} style={{ marginTop: theme.spacing.sm }} />
        <SkeletonBox width="60%" height={12} style={{ marginTop: 4 }} />
      </View>
    </View>
  );

  const renderProfileSkeleton = () => (
    <View style={styles.profileContainer}>
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <SkeletonBox width={80} height={80} borderRadius={40} />
        <View style={styles.profileStats}>
          <View style={styles.profileStat}>
            <SkeletonBox width={32} height={20} />
            <SkeletonBox width={48} height={12} style={{ marginTop: 4 }} />
          </View>
          <View style={styles.profileStat}>
            <SkeletonBox width={32} height={20} />
            <SkeletonBox width={48} height={12} style={{ marginTop: 4 }} />
          </View>
          <View style={styles.profileStat}>
            <SkeletonBox width={32} height={20} />
            <SkeletonBox width={48} height={12} style={{ marginTop: 4 }} />
          </View>
        </View>
      </View>

      {/* Profile info */}
      <View style={styles.profileInfo}>
        <SkeletonBox width="40%" height={18} />
        <SkeletonBox width="80%" height={14} style={{ marginTop: 4 }} />
        <SkeletonBox width="60%" height={14} style={{ marginTop: 2 }} />
      </View>

      {/* Profile actions */}
      <View style={styles.profileActions}>
        <SkeletonBox width="45%" height={36} />
        <SkeletonBox width="45%" height={36} />
      </View>
    </View>
  );

  const renderFeedSkeleton = () => (
    <View style={styles.feedContainer}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.feedItem}>
          {renderPostSkeleton()}
        </View>
      ))}
    </View>
  );

  const renderCustomSkeleton = () => {
    if (children) {
      return (
        <View style={[styles.customContainer, style]}>
          {children}
          {getShimmerGradient()}
        </View>
      );
    }

    return (
      <SkeletonBox
        width={width || '100%'}
        height={height || 20}
        style={style}
      />
    );
  };

  const renderSkeletonContent = () => {
    switch (type) {
      case 'post':
        return renderPostSkeleton();
      case 'user':
        return renderUserSkeleton();
      case 'cuisine':
        return renderCuisineSkeleton();
      case 'profile':
        return renderProfileSkeleton();
      case 'feed':
        return renderFeedSkeleton();
      case 'custom':
      default:
        return renderCustomSkeleton();
    }
  };

  if (type === 'feed' || count === 1) {
    return <View style={style}>{renderSkeletonContent()}</View>;
  }

  return (
    <View style={style}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={index > 0 && styles.skeletonSpacing}>
          {renderSkeletonContent()}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  skeletonBox: {
    backgroundColor: theme.colors.gray[200],
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmerGradient: {
    flex: 1,
    width: SCREEN_WIDTH,
  },
  customContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  skeletonSpacing: {
    marginTop: theme.spacing.md,
  },
  
  // Post skeleton styles
  postContainer: {
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  postHeaderText: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  postActions: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
  },
  postContent: {
    paddingHorizontal: theme.spacing.md,
  },

  // User skeleton styles
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  userText: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },

  // Cuisine skeleton styles
  cuisineContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  cuisineContent: {
    padding: theme.spacing.md,
  },

  // Profile skeleton styles
  profileContainer: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  profileStats: {
    flexDirection: 'row',
    marginLeft: theme.spacing.xl,
    flex: 1,
    justifyContent: 'space-around',
  },
  profileStat: {
    alignItems: 'center',
  },
  profileInfo: {
    marginBottom: theme.spacing.lg,
  },
  profileActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // Feed skeleton styles
  feedContainer: {
    flex: 1,
  },
  feedItem: {
    marginBottom: theme.spacing.md,
  },
});

LoadingSkeleton.displayName = 'LoadingSkeleton';

export default LoadingSkeleton;