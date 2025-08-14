/**
 * CuisineFilters Component
 * Tab-based filter system for cuisine display with count indicators
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts, radii } from '../../theme/uiTheme';

export type FilterOption = 'all' | 'tried' | 'untried';

interface FilterCounts {
  all: number;
  tried: number;
  untried: number;
}

interface CuisineFiltersProps {
  activeFilter: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
  counts: FilterCounts;
  disabled?: boolean;
  showIcons?: boolean;
  compact?: boolean;
}

interface FilterTab {
  key: FilterOption;
  label: string;
  icon: string;
  description: string;
}

const FILTER_TABS: FilterTab[] = [
  {
    key: 'all',
    label: 'All',
    icon: 'restaurant',
    description: 'Show all cuisines',
  },
  {
    key: 'tried',
    label: 'Tried',
    icon: 'check-circle',
    description: 'Show tried cuisines',
  },
  {
    key: 'untried',
    label: 'Untried',
    icon: 'radio-button-unchecked',
    description: 'Show untried cuisines',
  },
];

export default function CuisineFilters({
  activeFilter,
  onFilterChange,
  counts,
  disabled = false,
  showIcons = true,
  compact = false,
}: CuisineFiltersProps) {
  const slideAnimations = useRef(
    FILTER_TABS.reduce((acc, tab) => {
      acc[tab.key] = new Animated.Value(activeFilter === tab.key ? 1 : 0);
      return acc;
    }, {} as Record<FilterOption, Animated.Value>)
  ).current;

  // Animate active filter changes
  useEffect(() => {
    FILTER_TABS.forEach(tab => {
      Animated.timing(slideAnimations[tab.key], {
        toValue: activeFilter === tab.key ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
  }, [activeFilter, slideAnimations]);

  const handleFilterPress = async (filter: FilterOption) => {
    if (disabled || filter === activeFilter) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onFilterChange(filter);
  };

  const getFilterCount = (filter: FilterOption): number => {
    return counts[filter] || 0;
  };

  const getFilterColor = (filter: FilterOption): string => {
    switch (filter) {
      case 'tried':
        return colors.success;
      case 'untried':
        return colors.warning;
      default:
        return colors.primary;
    }
  };

  const renderFilterTab = (tab: FilterTab) => {
    const isActive = activeFilter === tab.key;
    const count = getFilterCount(tab.key);
    const filterColor = getFilterColor(tab.key);

    const animatedBackgroundColor = slideAnimations[tab.key].interpolate({
      inputRange: [0, 1],
      outputRange: [colors.background, filterColor],
    });

    const animatedTextColor = slideAnimations[tab.key].interpolate({
      inputRange: [0, 1],
      outputRange: [colors.textSecondary, colors.white],
    });

    const animatedScale = slideAnimations[tab.key].interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.02],
    });

    return (
      <TouchableOpacity
        key={tab.key}
        style={[
          styles.filterTab,
          compact && styles.filterTabCompact,
          disabled && styles.filterTabDisabled,
        ]}
        onPress={() => handleFilterPress(tab.key)}
        activeOpacity={0.8}
        disabled={disabled}
        accessibilityLabel={`${tab.label} filter`}
        accessibilityHint={`${tab.description}. ${count} items available.`}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
      >
        <Animated.View
          style={[
            styles.filterTabContent,
            compact && styles.filterTabContentCompact,
            {
              backgroundColor: animatedBackgroundColor,
              transform: [{ scale: animatedScale }],
            },
          ]}
        >
          {/* Tab Icon */}
          {showIcons && (
            <Animated.View style={styles.filterIconContainer}>
              <MaterialIcons
                name={tab.icon as any}
                size={compact ? 16 : 18}
                color={isActive ? colors.white : colors.textSecondary}
              />
            </Animated.View>
          )}

          {/* Tab Content */}
          <View style={styles.filterTextContainer}>
            <Animated.Text
              style={[
                styles.filterLabel,
                compact && styles.filterLabelCompact,
                { color: animatedTextColor },
              ]}
            >
              {tab.label}
            </Animated.Text>

            {/* Count Badge */}
            <View
              style={[
                styles.countBadge,
                compact && styles.countBadgeCompact,
                isActive && styles.countBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.countText,
                  compact && styles.countTextCompact,
                  isActive && styles.countTextActive,
                ]}
              >
                {count}
              </Text>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        <View style={styles.filtersContainer}>
          {FILTER_TABS.map(renderFilterTab)}
        </View>
      </ScrollView>

      {/* Active Filter Indicator Line */}
      <View style={styles.indicatorContainer}>
        <Animated.View
          style={[
            styles.activeIndicator,
            {
              backgroundColor: getFilterColor(activeFilter),
              transform: [
                {
                  translateX: slideAnimations[activeFilter].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0], // Will be calculated dynamically
                  }),
                },
              ],
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },

  containerDisabled: {
    opacity: 0.6,
  },

  scrollContent: {
    paddingHorizontal: spacing(0.5),
  },

  filtersContainer: {
    flexDirection: 'row',
    paddingVertical: spacing(0.5),
  },

  filterTab: {
    marginHorizontal: spacing(0.5),
  },

  filterTabCompact: {
    marginHorizontal: spacing(0.25),
  },

  filterTabDisabled: {
    opacity: 0.5,
  },

  filterTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderRadius: radii.md,
    minHeight: 44,
  },

  filterTabContentCompact: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    minHeight: 36,
  },

  filterIconContainer: {
    marginRight: spacing(1),
  },

  filterTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  filterLabel: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    marginRight: spacing(1),
  },

  filterLabelCompact: {
    fontSize: fonts.sm,
  },

  countBadge: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.full,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.25),
    minWidth: 24,
    alignItems: 'center',
  },

  countBadgeCompact: {
    paddingHorizontal: spacing(0.75),
    paddingVertical: spacing(0.125),
    minWidth: 20,
  },

  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  countText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.textSecondary,
  },

  countTextCompact: {
    fontSize: fonts.xs,
  },

  countTextActive: {
    color: colors.white,
  },

  indicatorContainer: {
    height: 2,
    backgroundColor: colors.outline,
  },

  activeIndicator: {
    height: '100%',
    width: '33.33%', // Assuming 3 tabs
    borderRadius: 1,
  },
});