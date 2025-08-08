import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// Conditional import for BlurView
let BlurView: any = View;
try {
  BlurView = require('expo-blur').BlurView;
} catch (error) {
  console.log('BlurView not available, using regular View');
}

import { theme } from '../../theme';
import uiTheme, { bottomNavHeight, colors, spacing, layout } from '../../theme/uiTheme';
import { useTabNavigation } from '../../hooks/useTabNavigation';
import { TabParamList } from '../../navigation/types';

// Use centralized theme constants
const TAB_BAR_HEIGHT = bottomNavHeight;
const CAMERA_BUTTON_SIZE = layout.touchTarget;
const REGULAR_ICON_SIZE = 22;
const CAMERA_ICON_SIZE = 24;

interface TabIconProps {
  name: keyof typeof MaterialIcons.glyphMap;
  size: number;
  color: string;
  focused: boolean;
}

interface TabBadgeProps {
  count: number;
  visible: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ name, size, color, focused }) => {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.1 : 1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.1 : 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [focused, scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <MaterialIcons name={name} size={size} color={color} />
    </Animated.View>
  );
};

const TabBadge: React.FC<TabBadgeProps> = ({ count, visible }) => {
  const opacityAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: visible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: visible ? 1 : 0,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
    ]).start();
  }, [visible, opacityAnim, scaleAnim]);

  if (count === 0) return null;

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Text style={styles.badgeText}>
        {count > 99 ? '99+' : count.toString()}
      </Text>
    </Animated.View>
  );
};

interface CameraTabProps {
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

const CameraTab: React.FC<CameraTabProps> = ({ focused, onPress, onLongPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Subtle pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, [pulseAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.cameraTabContainer}
      accessibilityRole="button"
      accessibilityLabel="Take photo"
      accessibilityHint="Double tap to quick capture"
    >
      <Animated.View
        style={[
          styles.cameraTab,
          focused && styles.cameraTabFocused,
          {
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
            ],
          },
        ]}
      >
        <MaterialIcons
          name="camera-alt"
          size={CAMERA_ICON_SIZE}
          color={theme.colors.white}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

interface RegularTabProps {
  route: any;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  badgeCount: number;
}

const RegularTab: React.FC<RegularTabProps> = ({
  route,
  focused,
  onPress,
  onLongPress,
  badgeCount,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const getIconName = (): keyof typeof MaterialIcons.glyphMap => {
    switch (route.name) {
      case 'Home':
        return 'home';
      case 'MyPosts':
        return 'book';
      case 'Discover':
        return 'search';
      case 'Profile':
        return 'person';
      default:
        return 'home';
    }
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const iconColor = focused ? theme.colors.primary : theme.colors.gray[500];

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.regularTab}
      accessibilityRole="button"
      accessibilityLabel={`${route.name} tab`}
      accessibilityState={{ selected: focused }}
    >
      <Animated.View
        style={[
          styles.tabContent,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <TabIcon
          name={getIconName()}
          size={REGULAR_ICON_SIZE}
          color={iconColor}
          focused={focused}
        />
        <TabBadge count={badgeCount} visible={badgeCount > 0} />
      </Animated.View>
    </TouchableOpacity>
  );
};

export const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const tabNavigation = useTabNavigation({ navigation });

  const handleTabPress = (route: any, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      tabNavigation.navigateToTab(route.name as keyof TabParamList);
    } else if (isFocused) {
      tabNavigation.handleTabDoublePress(route.name as keyof TabParamList);
    }
  };

  const handleTabLongPress = (route: any) => {
    navigation.emit({
      type: 'tabLongPress',
      target: route.key,
    });
  };

  const tabBarStyle = [
    styles.tabBar,
    {
      paddingBottom: Math.max(insets.bottom, spacing(0.5)),
      height: TAB_BAR_HEIGHT + Math.max(insets.bottom, spacing(0.5)),
    },
  ];

  const TabBarBackground = Platform.OS === 'ios' && BlurView !== View ? BlurView : View;
  const blurProps = Platform.OS === 'ios' && BlurView !== View ? { intensity: 95, tint: 'light' as const } : {};

  return (
    <TabBarBackground {...blurProps} style={tabBarStyle}>
      <View style={styles.tabBarContent}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const badgeCount = tabNavigation.getBadgeCount(route.name as keyof TabParamList);

          if (route.name === 'Camera') {
            return (
              <CameraTab
                key={route.key}
                focused={isFocused}
                onPress={() => handleTabPress(route, isFocused)}
                onLongPress={() => handleTabLongPress(route)}
              />
            );
          }

          return (
            <RegularTab
              key={route.key}
              route={route}
              focused={isFocused}
              onPress={() => handleTabPress(route, isFocused)}
              onLongPress={() => handleTabLongPress(route)}
              badgeCount={badgeCount}
            />
          );
        })}
      </View>
    </TabBarBackground>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.surface,
    borderTopWidth: 0,
    marginHorizontal: 0, // Full width - no margins
    marginBottom: 0, // Sits at very bottom
    borderRadius: 0, // No rounded corners for full-width
    overflow: 'hidden',
    ...uiTheme.shadows.small,
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing(0.5),
    paddingHorizontal: spacing(1),
    backgroundColor: Platform.OS === 'ios' ? colors.surface : colors.surface,
    height: TAB_BAR_HEIGHT,
  },
  regularTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xs,
    minHeight: layout.touchTarget * 0.8,
    borderRadius: theme.borderRadius.md,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: theme.touchTarget.minWidth,
    height: theme.touchTarget.minHeight * 0.8,
  },
  cameraTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xs,
  },
  cameraTab: {
    width: CAMERA_BUTTON_SIZE,
    height: CAMERA_BUTTON_SIZE,
    borderRadius: CAMERA_BUTTON_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...uiTheme.shadows.small,
    borderWidth: 2,
    borderColor: colors.white,
  },
  cameraTabFocused: {
    backgroundColor: theme.colors.primaryDark,
    transform: [{ scale: 1.05 }],
    ...Platform.select({
      ios: theme.shadows.lg,
      android: { elevation: 16 },
    }),
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
    ...theme.shadows.sm,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 10, // Smaller font for better fit
    fontWeight: theme.typography.fontWeight.bold,
    textAlign: 'center',
    lineHeight: 12,
  },
});

export default CustomTabBar;