/**
 * FeedFilter Component
 * Advanced filtering and sorting options for the feed
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts } from '../../theme/uiTheme';
import { FeedFilters, FeedAlgorithm } from '../../lib/feedUtils';
import Button from '../ui/Button';

interface FeedFilterProps {
  visible: boolean;
  activeFilters: FeedFilters;
  currentAlgorithm: FeedAlgorithm;
  onFiltersChange: (filters: FeedFilters) => void;
  onAlgorithmChange: (algorithm: FeedAlgorithm) => void;
  onClose: () => void;
  onReset?: () => void;
}

type FilterSection = 'sort' | 'cuisine' | 'location' | 'time' | 'advanced';

// Common cuisine types for filtering
const CUISINE_TYPES = [
  { id: 'italian', name: 'Italian', emoji: '🇮🇹' },
  { id: 'chinese', name: 'Chinese', emoji: '🇨🇳' },
  { id: 'japanese', name: 'Japanese', emoji: '🇯🇵' },
  { id: 'mexican', name: 'Mexican', emoji: '🇲🇽' },
  { id: 'indian', name: 'Indian', emoji: '🇮🇳' },
  { id: 'french', name: 'French', emoji: '🇫🇷' },
  { id: 'thai', name: 'Thai', emoji: '🇹🇭' },
  { id: 'korean', name: 'Korean', emoji: '🇰🇷' },
  { id: 'american', name: 'American', emoji: '🇺🇸' },
  { id: 'greek', name: 'Greek', emoji: '🇬🇷' },
];

// Dining type options
const DINING_TYPES = [
  { id: 'fine_dining', name: 'Fine Dining', icon: 'restaurant' },
  { id: 'casual', name: 'Casual Dining', icon: 'local-dining' },
  { id: 'fast_food', name: 'Fast Food', icon: 'fastfood' },
  { id: 'street_food', name: 'Street Food', icon: 'food-truck' },
  { id: 'home_cooking', name: 'Home Cooking', icon: 'home' },
];

// Time range options
const TIME_RANGES = [
  { id: 'today', name: 'Today', days: 1 },
  { id: 'week', name: 'This Week', days: 7 },
  { id: 'month', name: 'This Month', days: 30 },
  { id: 'all', name: 'All Time', days: null },
];

// Rating options
const RATING_OPTIONS = [5, 4, 3, 2, 1];

const FeedFilter: React.FC<FeedFilterProps> = ({
  visible,
  activeFilters,
  currentAlgorithm,
  onFiltersChange,
  onAlgorithmChange,
  onClose,
  onReset,
}) => {
  const [tempFilters, setTempFilters] = useState<FeedFilters>(activeFilters);
  const [tempAlgorithm, setTempAlgorithm] = useState<FeedAlgorithm>(currentAlgorithm);
  const [expandedSection, setExpandedSection] = useState<FilterSection | null>('sort');

  // Update temp filters when active filters change
  useEffect(() => {
    setTempFilters(activeFilters);
    setTempAlgorithm(currentAlgorithm);
  }, [activeFilters, currentAlgorithm, visible]);

  // Handle section toggle
  const toggleSection = useCallback(async (section: FilterSection) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedSection(expandedSection === section ? null : section);
  }, [expandedSection]);

  // Handle algorithm change
  const handleAlgorithmChange = useCallback(async (algorithm: FeedAlgorithm) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTempAlgorithm(algorithm);
  }, []);

  // Handle cuisine filter toggle
  const handleCuisineToggle = useCallback(async (cuisineName: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setTempFilters(prev => {
      const currentCuisines = prev.cuisines || [];
      const isSelected = currentCuisines.includes(cuisineName);
      
      return {
        ...prev,
        cuisines: isSelected
          ? currentCuisines.filter(c => c !== cuisineName)
          : [...currentCuisines, cuisineName],
      };
    });
  }, []);

  // Handle dining type toggle
  const handleDiningTypeToggle = useCallback(async (diningType: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setTempFilters(prev => {
      const currentTypes = prev.diningTypes || [];
      const isSelected = currentTypes.includes(diningType);
      
      return {
        ...prev,
        diningTypes: isSelected
          ? currentTypes.filter(t => t !== diningType)
          : [...currentTypes, diningType],
      };
    });
  }, []);

  // Handle rating toggle
  const handleRatingToggle = useCallback(async (rating: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setTempFilters(prev => {
      const currentRatings = prev.ratings || [];
      const isSelected = currentRatings.includes(rating);
      
      return {
        ...prev,
        ratings: isSelected
          ? currentRatings.filter(r => r !== rating)
          : [...currentRatings, rating],
      };
    });
  }, []);

  // Handle time range change
  const handleTimeRangeChange = useCallback(async (rangeId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const range = TIME_RANGES.find(r => r.id === rangeId);
    if (!range) return;

    if (range.days === null) {
      // All time - remove time filter
      setTempFilters(prev => ({ ...prev, timeRange: undefined }));
    } else {
      const now = new Date();
      const start = new Date(now.getTime() - (range.days * 24 * 60 * 60 * 1000));
      
      setTempFilters(prev => ({
        ...prev,
        timeRange: { start, end: now },
      }));
    }
  }, []);

  // Handle apply filters
  const handleApply = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onFiltersChange(tempFilters);
    onAlgorithmChange(tempAlgorithm);
    onClose();
  }, [tempFilters, tempAlgorithm, onFiltersChange, onAlgorithmChange, onClose]);

  // Handle reset filters
  const handleReset = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const resetFilters: FeedFilters = {};
    setTempFilters(resetFilters);
    setTempAlgorithm('recent');
    
    if (onReset) {
      onReset();
    } else {
      onFiltersChange(resetFilters);
      onAlgorithmChange('recent');
    }
  }, [onReset, onFiltersChange, onAlgorithmChange]);

  // Handle close
  const handleClose = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  // Check if filters are applied
  const hasActiveFilters = useCallback(() => {
    return (
      (tempFilters.cuisines && tempFilters.cuisines.length > 0) ||
      (tempFilters.diningTypes && tempFilters.diningTypes.length > 0) ||
      (tempFilters.ratings && tempFilters.ratings.length > 0) ||
      tempFilters.timeRange ||
      tempAlgorithm !== 'recent'
    );
  }, [tempFilters, tempAlgorithm]);

  // Get selected time range
  const getSelectedTimeRange = useCallback(() => {
    if (!tempFilters.timeRange) return 'all';
    
    const now = new Date();
    const diffMs = now.getTime() - tempFilters.timeRange.start.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    const range = TIME_RANGES.find(r => r.days === diffDays);
    return range?.id || 'all';
  }, [tempFilters.timeRange]);

  // Render filter section
  const renderSection = (
    section: FilterSection,
    title: string,
    icon: keyof typeof MaterialIcons.glyphMap,
    children: React.ReactNode
  ) => (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection(section)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <MaterialIcons name={icon} size={20} color={colors.text} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <MaterialIcons
          name={expandedSection === section ? 'expand-less' : 'expand-more'}
          size={24}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
      
      {expandedSection === section && (
        <View style={styles.sectionContent}>
          {children}
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} />
        
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Filter & Sort</Text>
            <TouchableOpacity onPress={handleReset} style={styles.headerButton}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Sort Section */}
            {renderSection('sort', 'Sort & Algorithm', 'sort', (
              <View style={styles.algorithmContainer}>
                {(['recent', 'popular', 'friends'] as FeedAlgorithm[]).map((algorithm) => (
                  <TouchableOpacity
                    key={algorithm}
                    style={[
                      styles.algorithmOption,
                      tempAlgorithm === algorithm && styles.selectedAlgorithmOption,
                    ]}
                    onPress={() => handleAlgorithmChange(algorithm)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.algorithmText,
                      tempAlgorithm === algorithm && styles.selectedAlgorithmText,
                    ]}>
                      {algorithm.charAt(0).toUpperCase() + algorithm.slice(1)}
                    </Text>
                    {tempAlgorithm === algorithm && (
                      <MaterialIcons name="check" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            {/* Cuisine Section */}
            {renderSection('cuisine', 'Cuisine Types', 'restaurant-menu', (
              <View style={styles.filterGrid}>
                {CUISINE_TYPES.map((cuisine) => {
                  const isSelected = tempFilters.cuisines?.includes(cuisine.name) || false;
                  return (
                    <TouchableOpacity
                      key={cuisine.id}
                      style={[
                        styles.filterChip,
                        isSelected && styles.selectedFilterChip,
                      ]}
                      onPress={() => handleCuisineToggle(cuisine.name)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.filterEmoji}>{cuisine.emoji}</Text>
                      <Text style={[
                        styles.filterText,
                        isSelected && styles.selectedFilterText,
                      ]}>
                        {cuisine.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Time Range Section */}
            {renderSection('time', 'Time Range', 'schedule', (
              <View style={styles.timeRangeContainer}>
                {TIME_RANGES.map((range) => {
                  const isSelected = getSelectedTimeRange() === range.id;
                  return (
                    <TouchableOpacity
                      key={range.id}
                      style={[
                        styles.timeRangeOption,
                        isSelected && styles.selectedTimeRangeOption,
                      ]}
                      onPress={() => handleTimeRangeChange(range.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.timeRangeText,
                        isSelected && styles.selectedTimeRangeText,
                      ]}>
                        {range.name}
                      </Text>
                      {isSelected && (
                        <MaterialIcons name="check" size={20} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Advanced Section */}
            {renderSection('advanced', 'Advanced Filters', 'tune', (
              <View style={styles.advancedContainer}>
                {/* Dining Types */}
                <Text style={styles.subSectionTitle}>Dining Experience</Text>
                <View style={styles.filterGrid}>
                  {DINING_TYPES.map((type) => {
                    const isSelected = tempFilters.diningTypes?.includes(type.id) || false;
                    return (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.filterChip,
                          isSelected && styles.selectedFilterChip,
                        ]}
                        onPress={() => handleDiningTypeToggle(type.id)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name={type.icon as any} size={16} color={
                          isSelected ? colors.white : colors.textSecondary
                        } />
                        <Text style={[
                          styles.filterText,
                          isSelected && styles.selectedFilterText,
                        ]}>
                          {type.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Ratings */}
                <Text style={styles.subSectionTitle}>Minimum Rating</Text>
                <View style={styles.ratingContainer}>
                  {RATING_OPTIONS.map((rating) => {
                    const isSelected = tempFilters.ratings?.includes(rating) || false;
                    return (
                      <TouchableOpacity
                        key={rating}
                        style={[
                          styles.ratingOption,
                          isSelected && styles.selectedRatingOption,
                        ]}
                        onPress={() => handleRatingToggle(rating)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.ratingText,
                          isSelected && styles.selectedRatingText,
                        ]}>
                          {rating}⭐+
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {hasActiveFilters() && (
              <Text style={styles.filterCount}>
                {(() => {
                  let count = 0;
                  if (tempFilters.cuisines?.length) count += tempFilters.cuisines.length;
                  if (tempFilters.diningTypes?.length) count += tempFilters.diningTypes.length;
                  if (tempFilters.ratings?.length) count += tempFilters.ratings.length;
                  if (tempFilters.timeRange) count += 1;
                  if (tempAlgorithm !== 'recent') count += 1;
                  return `${count} filter${count !== 1 ? 's' : ''} applied`;
                })()}
              </Text>
            )}
            
            <Button
              title="Apply Filters"
              onPress={handleApply}
              style={styles.applyButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  backdrop: {
    flex: 1,
  },

  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '60%',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.bold,
    color: colors.text,
  },

  resetText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.primary,
  },

  content: {
    flex: 1,
  },

  section: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },

  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },

  sectionTitle: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },

  sectionContent: {
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(3),
  },

  // Algorithm Section
  algorithmContainer: {
    gap: spacing(2),
  },

  algorithmOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
    borderRadius: 12,
    backgroundColor: colors.surface,
  },

  selectedAlgorithmOption: {
    backgroundColor: colors.primaryContainer,
  },

  algorithmText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.text,
  },

  selectedAlgorithmText: {
    color: colors.primary,
    fontWeight: fonts.weights.semibold,
  },

  // Filter Grid
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },

  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },

  selectedFilterChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  filterEmoji: {
    fontSize: fonts.base,
  },

  filterText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.text,
  },

  selectedFilterText: {
    color: colors.white,
  },

  // Time Range
  timeRangeContainer: {
    gap: spacing(2),
  },

  timeRangeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
    borderRadius: 12,
    backgroundColor: colors.surface,
  },

  selectedTimeRangeOption: {
    backgroundColor: colors.primaryContainer,
  },

  timeRangeText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.text,
  },

  selectedTimeRangeText: {
    color: colors.primary,
    fontWeight: fonts.weights.semibold,
  },

  // Advanced Section
  advancedContainer: {
    gap: spacing(4),
  },

  subSectionTitle: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(2),
  },

  ratingContainer: {
    flexDirection: 'row',
    gap: spacing(2),
  },

  ratingOption: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },

  selectedRatingOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  ratingText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.text,
  },

  selectedRatingText: {
    color: colors.white,
  },

  // Footer
  footer: {
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },

  filterCount: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing(2),
  },

  applyButton: {
    width: '100%',
  },
});

export default FeedFilter;