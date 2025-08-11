import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Cuisine, UserCuisineProgress, CuisineSuggestion } from '../../types/cuisine';
import { colors, spacing, radii, fonts, shadows } from '../../theme/uiTheme';

interface CuisineSuggestionsProps {
  userProgress: UserCuisineProgress[];
  location?: { latitude: number; longitude: number };
  onSuggestionPress: (cuisine: Cuisine) => void;
  maxSuggestions?: number;
}

// Mock data - in a real app, this would come from your cuisine database
const ALL_CUISINES: Cuisine[] = [
  { id: 1, name: 'Thai', category: 'Asian', emoji: '🇹🇭', origin_country: 'Thailand' },
  { id: 2, name: 'Vietnamese', category: 'Asian', emoji: '🇻🇳', origin_country: 'Vietnam' },
  { id: 3, name: 'Korean', category: 'Asian', emoji: '🇰🇷', origin_country: 'South Korea' },
  { id: 4, name: 'Ethiopian', category: 'African', emoji: '🇪🇹', origin_country: 'Ethiopia' },
  { id: 5, name: 'Moroccan', category: 'African', emoji: '🇲🇦', origin_country: 'Morocco' },
  { id: 6, name: 'Peruvian', category: 'South American', emoji: '🇵🇪', origin_country: 'Peru' },
  { id: 7, name: 'Turkish', category: 'Mediterranean', emoji: '🇹🇷', origin_country: 'Turkey' },
  { id: 8, name: 'Lebanese', category: 'Mediterranean', emoji: '🇱🇧', origin_country: 'Lebanon' },
  { id: 9, name: 'Japanese', category: 'Asian', emoji: '🇯🇵', origin_country: 'Japan' },
  { id: 10, name: 'Italian', category: 'European', emoji: '🇮🇹', origin_country: 'Italy' },
  { id: 11, name: 'Mexican', category: 'Latin American', emoji: '🇲🇽', origin_country: 'Mexico' },
  { id: 12, name: 'Indian', category: 'Asian', emoji: '🇮🇳', origin_country: 'India' },
  { id: 13, name: 'Greek', category: 'Mediterranean', emoji: '🇬🇷', origin_country: 'Greece' },
  { id: 14, name: 'French', category: 'European', emoji: '🇫🇷', origin_country: 'France' },
  { id: 15, name: 'Chinese', category: 'Asian', emoji: '🇨🇳', origin_country: 'China' },
];

const SEASONAL_CUISINES = {
  spring: [1, 7, 8], // Thai, Turkish, Lebanese
  summer: [6, 13, 14], // Peruvian, Greek, French
  autumn: [4, 5, 12], // Ethiopian, Moroccan, Indian
  winter: [2, 3, 9], // Vietnamese, Korean, Japanese
};

const TRENDING_CUISINES = [1, 3, 6, 7]; // Thai, Korean, Peruvian, Turkish

export default function CuisineSuggestions({
  userProgress,
  location,
  onSuggestionPress,
  maxSuggestions = 8,
}: CuisineSuggestionsProps) {
  const suggestions = useMemo(() => {
    const triedCuisineIds = new Set(userProgress.map(p => p.cuisine_id));
    const untriedCuisines = ALL_CUISINES.filter(c => !triedCuisineIds.has(c.id));
    
    if (untriedCuisines.length === 0) {
      return [];
    }

    const suggestionList: CuisineSuggestion[] = [];

    // 1. Preference-based suggestions (similar to what user has tried)
    const userCategories = new Set(
      userProgress
        .map(p => p.cuisine?.category)
        .filter(Boolean)
    );

    const preferenceBasedSuggestions = untriedCuisines
      .filter(cuisine => userCategories.has(cuisine.category))
      .slice(0, 3)
      .map(cuisine => ({
        cuisine,
        reason: 'preference' as const,
        confidence: 0.9,
        description: `Since you enjoy ${cuisine.category} cuisine, you might love this!`,
      }));

    suggestionList.push(...preferenceBasedSuggestions);

    // 2. Trending suggestions
    const trendingSuggestions = untriedCuisines
      .filter(cuisine => TRENDING_CUISINES.includes(cuisine.id))
      .slice(0, 2)
      .map(cuisine => ({
        cuisine,
        reason: 'trending' as const,
        confidence: 0.8,
        description: 'This cuisine is trending among food lovers!',
      }));

    suggestionList.push(...trendingSuggestions);

    // 3. Seasonal suggestions
    const currentMonth = new Date().getMonth();
    const season = Math.floor(currentMonth / 3); // 0=winter, 1=spring, 2=summer, 3=fall
    const seasonNames = ['winter', 'spring', 'summer', 'autumn'];
    const seasonalCuisineIds = SEASONAL_CUISINES[seasonNames[season] as keyof typeof SEASONAL_CUISINES];
    
    const seasonalSuggestions = untriedCuisines
      .filter(cuisine => seasonalCuisineIds.includes(cuisine.id))
      .slice(0, 2)
      .map(cuisine => ({
        cuisine,
        reason: 'seasonal' as const,
        confidence: 0.7,
        description: `Perfect for ${seasonNames[season]} season!`,
      }));

    suggestionList.push(...seasonalSuggestions);

    // 4. Challenge suggestions (cuisines from unexplored categories)
    const unexploredCategories = new Set(
      untriedCuisines.map(c => c.category)
    );
    userCategories.forEach(cat => unexploredCategories.delete(cat));

    const challengeSuggestions = untriedCuisines
      .filter(cuisine => unexploredCategories.has(cuisine.category))
      .slice(0, 2)
      .map(cuisine => ({
        cuisine,
        reason: 'challenge' as const,
        confidence: 0.6,
        description: `Explore ${cuisine.category} cuisine for the first time!`,
      }));

    suggestionList.push(...challengeSuggestions);

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestionList.filter((suggestion, index, self) => 
      index === self.findIndex(s => s.cuisine.id === suggestion.cuisine.id)
    );

    return uniqueSuggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxSuggestions);
  }, [userProgress, maxSuggestions]);

  const groupedSuggestions = useMemo(() => {
    const groups: Record<string, CuisineSuggestion[]> = {
      preference: [],
      trending: [],
      seasonal: [],
      challenge: [],
      friends: [],
    };

    suggestions.forEach(suggestion => {
      groups[suggestion.reason].push(suggestion);
    });

    return Object.entries(groups).filter(([_, suggestions]) => suggestions.length > 0);
  }, [suggestions]);

  const getSectionTitle = (reason: string): string => {
    switch (reason) {
      case 'preference': return 'Based on Your Taste';
      case 'trending': return 'Trending Now';
      case 'seasonal': return 'Perfect for This Season';
      case 'challenge': return 'Challenge Yourself';
      case 'friends': return 'Friends Are Loving';
      default: return 'Suggestions';
    }
  };

  const getSectionIcon = (reason: string): string => {
    switch (reason) {
      case 'preference': return 'heart';
      case 'trending': return 'trending-up';
      case 'seasonal': return 'leaf';
      case 'challenge': return 'flash';
      case 'friends': return 'people';
      default: return 'restaurant';
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return colors.success;
    if (confidence >= 0.6) return colors.warning;
    return colors.info;
  };

  if (suggestions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🎉</Text>
        <Text style={styles.emptyTitle}>Amazing Progress!</Text>
        <Text style={styles.emptyMessage}>
          You've tried all available cuisines in your area. Check back for new additions!
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Cuisine Suggestions</Text>
        <Text style={styles.subtitle}>
          Discover new flavors tailored for you
        </Text>
      </View>

      {groupedSuggestions.map(([reason, suggestions]) => (
        <View key={reason} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons 
                name={getSectionIcon(reason) as any} 
                size={20} 
                color={colors.primary} 
              />
              <Text style={styles.sectionTitle}>
                {getSectionTitle(reason)}
              </Text>
            </View>
            <Text style={styles.sectionCount}>
              {suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.suggestionsGrid}>
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={`${reason}-${suggestion.cuisine.id}`}
                style={styles.suggestionCard}
                onPress={() => onSuggestionPress(suggestion.cuisine)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cuisineEmoji}>
                    {suggestion.cuisine.emoji}
                  </Text>
                  <View 
                    style={[
                      styles.confidenceBadge,
                      { backgroundColor: getConfidenceColor(suggestion.confidence) }
                    ]}
                  >
                    <Text style={styles.confidenceText}>
                      {Math.round(suggestion.confidence * 100)}%
                    </Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <Text style={styles.cuisineName} numberOfLines={1}>
                    {suggestion.cuisine.name}
                  </Text>
                  <Text style={styles.cuisineCategory} numberOfLines={1}>
                    {suggestion.cuisine.category}
                  </Text>
                  <Text style={styles.suggestionDescription} numberOfLines={2}>
                    {suggestion.description}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.reasonBadge}>
                    <Text style={styles.reasonText}>
                      {reason.charAt(0).toUpperCase() + reason.slice(1)}
                    </Text>
                  </View>
                  <Ionicons 
                    name="chevron-forward" 
                    size={16} 
                    color={colors.textSecondary} 
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Suggestions are updated based on your progress and preferences
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  title: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    marginBottom: spacing(0.5),
  },

  subtitle: {
    fontSize: fonts.base,
    color: colors.textSecondary,
  },

  section: {
    marginBottom: spacing(2),
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },

  sectionTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },

  sectionCount: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
  },

  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing(1),
    backgroundColor: colors.white,
  },

  suggestionCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    margin: spacing(1),
    padding: spacing(1.5),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outline,
    ...shadows.small,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing(1),
  },

  cuisineEmoji: {
    fontSize: 32,
  },

  confidenceBadge: {
    paddingHorizontal: spacing(0.5),
    paddingVertical: spacing(0.25),
    borderRadius: radii.sm,
  },

  confidenceText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.bold,
    color: colors.white,
  },

  cardContent: {
    flex: 1,
    marginBottom: spacing(1),
  },

  cuisineName: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(0.25),
  },

  cuisineCategory: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    marginBottom: spacing(0.75),
  },

  suggestionDescription: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    lineHeight: fonts.sm * 1.3,
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  reasonBadge: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing(0.75),
    paddingVertical: spacing(0.25),
    borderRadius: radii.sm,
  },

  reasonText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },

  footer: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
    backgroundColor: colors.surfaceVariant,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outline,
  },

  footerText: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(2),
    backgroundColor: colors.white,
  },

  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing(2),
  },

  emptyTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(1),
    textAlign: 'center',
  },

  emptyMessage: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
  },
});