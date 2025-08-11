import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  ListRenderItem,
} from 'react-native';
import { Cuisine, UserCuisineProgress } from '../../types/cuisine';
import { 
  getCuisinesByCategory, 
  searchCuisines, 
  filterCuisines 
} from '../../lib/cuisineUtils';
import CuisineCard from './CuisineCard';
import { colors, spacing, fonts } from '../../theme/uiTheme';

interface CuisineGridProps {
  cuisines: Cuisine[];
  userProgress: UserCuisineProgress[];
  searchQuery?: string;
  filter?: 'all' | 'tried' | 'untried';
  category?: string;
  onCuisinePress: (cuisine: Cuisine) => void;
  showCategories?: boolean;
  loading?: boolean;
}

interface GridItem {
  type: 'header' | 'cuisine';
  data: Cuisine | { categoryName: string; count: number };
  key: string;
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_MARGIN = spacing(0.5) * 2; // margin on each side
const GRID_PADDING = spacing(2) * 2; // padding on each side
const MIN_CARD_WIDTH = 150;

function getNumColumns() {
  const availableWidth = screenWidth - GRID_PADDING;
  const columns = Math.floor(availableWidth / (MIN_CARD_WIDTH + CARD_MARGIN));
  return Math.max(2, Math.min(3, columns));
}

export default function CuisineGrid({
  cuisines,
  userProgress,
  searchQuery,
  filter = 'all',
  category,
  onCuisinePress,
  showCategories = true,
  loading = false,
}: CuisineGridProps) {
  const numColumns = getNumColumns();

  const filteredAndSearchedCuisines = useMemo(() => {
    let result = cuisines;

    // Apply search filter
    if (searchQuery) {
      result = searchCuisines(result, searchQuery);
    }

    // Apply status filter (tried/untried)
    result = filterCuisines(result, userProgress, filter);

    // Apply category filter
    if (category) {
      result = result.filter(cuisine => cuisine.category === category);
    }

    return result;
  }, [cuisines, userProgress, searchQuery, filter, category]);

  const gridData = useMemo(() => {
    if (!showCategories) {
      return filteredAndSearchedCuisines.map(cuisine => ({
        type: 'cuisine' as const,
        data: cuisine,
        key: `cuisine-${cuisine.id}`,
      }));
    }

    const categorizedCuisines = getCuisinesByCategory(
      filteredAndSearchedCuisines, 
      userProgress
    );

    const items: GridItem[] = [];

    categorizedCuisines.forEach(categoryData => {
      // Add category header
      items.push({
        type: 'header',
        data: {
          categoryName: categoryData.name,
          count: categoryData.cuisines.length,
        },
        key: `header-${categoryData.name}`,
      });

      // Add cuisines in this category
      categoryData.cuisines.forEach(cuisine => {
        items.push({
          type: 'cuisine',
          data: cuisine,
          key: `cuisine-${cuisine.id}`,
        });
      });
    });

    return items;
  }, [filteredAndSearchedCuisines, userProgress, showCategories]);

  const renderItem: ListRenderItem<GridItem> = ({ item }) => {
    if (item.type === 'header') {
      const headerData = item.data as { categoryName: string; count: number };
      return (
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>
            {headerData.categoryName}
          </Text>
          <Text style={styles.categoryCount}>
            {headerData.count} cuisine{headerData.count !== 1 ? 's' : ''}
          </Text>
        </View>
      );
    }

    const cuisine = item.data as Cuisine;
    const progress = userProgress.find(p => p.cuisine_id === cuisine.id);

    return (
      <View style={[styles.cuisineItemContainer, { width: `${100 / numColumns}%` }]}>
        <CuisineCard
          cuisine={cuisine}
          userProgress={progress}
          onPress={onCuisinePress}
          size="medium"
        />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateEmoji}>🔍</Text>
      <Text style={styles.emptyStateTitle}>No cuisines found</Text>
      <Text style={styles.emptyStateMessage}>
        {searchQuery 
          ? `No cuisines match "${searchQuery}"`
          : filter === 'tried' 
            ? "You haven't tried any cuisines yet"
            : filter === 'untried'
              ? "You've tried all available cuisines!"
              : "No cuisines available"
        }
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      {Array.from({ length: 6 }).map((_, index) => (
        <View 
          key={index} 
          style={[
            styles.loadingSkeleton, 
            { width: `${100 / numColumns}%` }
          ]} 
        />
      ))}
    </View>
  );

  if (loading) {
    return renderLoadingState();
  }

  if (gridData.length === 0) {
    return renderEmptyState();
  }

  return (
    <FlatList
      data={gridData}
      renderItem={renderItem}
      numColumns={numColumns}
      key={`grid-${numColumns}`} // Force re-render when columns change
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      getItemLayout={(_, index) => ({
        length: showCategories && gridData[index]?.type === 'header' ? 60 : 170,
        offset: 0, // We'll let FlatList calculate this
        index,
      })}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing(1),
    paddingBottom: spacing(4),
  },

  categoryHeader: {
    width: '100%',
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(1.5),
    marginTop: spacing(1),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  categoryTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },

  categoryCount: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    fontWeight: fonts.weights.medium,
  },

  cuisineItemContainer: {
    paddingHorizontal: spacing(0.5),
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(2),
  },

  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: spacing(2),
  },

  emptyStateTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(1),
    textAlign: 'center',
  },

  emptyStateMessage: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
  },

  loadingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing(1),
  },

  loadingSkeleton: {
    height: 150,
    backgroundColor: colors.surfaceVariant,
    borderRadius: spacing(1),
    marginVertical: spacing(0.5),
    marginHorizontal: spacing(0.5),
    opacity: 0.6,
  },
});