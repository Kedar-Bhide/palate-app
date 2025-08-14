/**
 * CuisineProgressExample
 * Example implementation showing how to use the new modular cuisine components
 * This demonstrates the integration of CuisineSearch, CuisineFilters, and CuisineGrid
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, fonts } from '../../theme/uiTheme';
import { useCuisineProgress } from '../../hooks/useCuisineProgress';
import { searchCuisines, filterCuisines } from '../../lib/cuisineUtils';
import { Cuisine, UserCuisineProgress } from '../../types/cuisine';

// Import the new modular components
import CuisineSearch from './CuisineSearch';
import CuisineFilters, { FilterOption } from './CuisineFilters';
import CuisineGrid from './CuisineGrid';
import ProgressStats from './ProgressStats';

interface CuisineProgressExampleProps {
  onCuisinePress?: (cuisine: Cuisine) => void;
}

export default function CuisineProgressExample({
  onCuisinePress,
}: CuisineProgressExampleProps) {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Cuisine progress hook
  const {
    cuisines,
    userProgress,
    stats,
    achievements,
    loading,
    error,
    refreshData,
  } = useCuisineProgress();

  // Filter and search cuisines
  const filteredCuisines = useMemo(() => {
    let result = filterCuisines(cuisines, userProgress, activeFilter);
    
    if (searchQuery.trim()) {
      result = searchCuisines(result, searchQuery);
    }
    
    return result;
  }, [cuisines, userProgress, activeFilter, searchQuery]);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const tried = filterCuisines(cuisines, userProgress, 'tried').length;
    const untried = filterCuisines(cuisines, userProgress, 'untried').length;
    
    return {
      all: cuisines.length,
      tried,
      untried,
    };
  }, [cuisines, userProgress]);

  // Event handlers
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleFilterChange = useCallback((filter: FilterOption) => {
    setActiveFilter(filter);
  }, []);

  const handleCuisinePress = useCallback((cuisine: Cuisine) => {
    console.log('Cuisine pressed:', cuisine.name);
    onCuisinePress?.(cuisine);
  }, [onCuisinePress]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      console.error('Error refreshing cuisine data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

  const handleAchievementPress = useCallback((achievement: any) => {
    console.log('Achievement pressed:', achievement.name);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Cuisine Explorer</Text>
          <Text style={styles.subtitle}>Discover and track your culinary journey</Text>
        </View>

        {/* Progress Stats */}
        <View style={styles.progressSection}>
          <ProgressStats
            stats={stats}
            achievements={achievements}
            onAchievementPress={handleAchievementPress}
          />
        </View>

        {/* Search Component */}
        <View style={styles.searchSection}>
          <CuisineSearch
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onClearSearch={handleClearSearch}
            placeholder="Search cuisines by name, category, or country..."
          />
        </View>

        {/* Filter Component */}
        <View style={styles.filtersSection}>
          <CuisineFilters
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            counts={filterCounts}
            showIcons={true}
          />
        </View>

        {/* Results Info */}
        <View style={styles.resultsSection}>
          <Text style={styles.resultsText}>
            {filteredCuisines.length} cuisine{filteredCuisines.length !== 1 ? 's' : ''}
            {searchQuery ? ` matching "${searchQuery}"` : ''}
            {activeFilter !== 'all' ? ` (${activeFilter})` : ''}
          </Text>
        </View>

        {/* Cuisine Grid */}
        <View style={styles.gridSection}>
          <CuisineGrid
            cuisines={filteredCuisines}
            userProgress={userProgress}
            searchQuery={searchQuery}
            filter={activeFilter}
            onCuisinePress={handleCuisinePress}
            loading={loading}
            showCategories={!searchQuery && activeFilter === 'all'}
          />
        </View>

        {/* Error State */}
        {error && (
          <View style={styles.errorSection}>
            <Text style={styles.errorText}>Error: {error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollView: {
    flex: 1,
  },

  header: {
    padding: spacing(3),
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },

  title: {
    fontSize: fonts.xxl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    marginBottom: spacing(0.5),
  },

  subtitle: {
    fontSize: fonts.base,
    color: colors.textSecondary,
  },

  progressSection: {
    padding: spacing(3),
  },

  searchSection: {
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(2),
  },

  filtersSection: {
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(2),
  },

  resultsSection: {
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(2),
  },

  resultsText: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    fontWeight: fonts.weights.medium,
  },

  gridSection: {
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(4),
  },

  errorSection: {
    padding: spacing(3),
    backgroundColor: colors.error + '10',
    margin: spacing(3),
    borderRadius: 8,
  },

  errorText: {
    color: colors.error,
    fontSize: fonts.sm,
    textAlign: 'center',
  },
});