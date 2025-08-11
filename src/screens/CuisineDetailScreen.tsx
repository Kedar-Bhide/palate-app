import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Share,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Cuisine, UserCuisineProgress } from '../types/cuisine';
import { useCuisineProgress } from '../hooks/useCuisineProgress';
import { colors, spacing, radii, fonts, shadows } from '../theme/uiTheme';

type CuisineDetailScreenRouteProp = RouteProp<{
  CuisineDetail: {
    cuisineId: number;
    fromScreen?: 'progress' | 'feed' | 'search';
  };
}, 'CuisineDetail'>;

export default function CuisineDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<CuisineDetailScreenRouteProp>();
  const { cuisineId, fromScreen = 'progress' } = route.params;

  const {
    cuisines,
    userProgress,
    markCuisineTried,
    updateFavoriteRestaurant,
    loading,
  } = useCuisineProgress();

  const [cuisine, setCuisine] = useState<Cuisine | null>(null);
  const [progress, setProgress] = useState<UserCuisineProgress | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const foundCuisine = cuisines.find(c => c.id === cuisineId);
    const foundProgress = userProgress.find(p => p.cuisine_id === cuisineId);
    
    setCuisine(foundCuisine || null);
    setProgress(foundProgress || null);
  }, [cuisines, userProgress, cuisineId]);

  const handleMarkAsTried = useCallback(async () => {
    if (!cuisine) return;

    Alert.prompt(
      'Restaurant Name',
      'Where did you try this cuisine? (Optional)',
      async (restaurantName) => {
        try {
          await markCuisineTried(cuisine.id, restaurantName || '');
          Alert.alert(
            'Success!',
            `${cuisine.name} has been added to your culinary journey! 🎉`
          );
        } catch (err) {
          console.error('Error marking cuisine as tried:', err);
          Alert.alert('Error', 'Failed to mark cuisine as tried. Please try again.');
        }
      },
      'plain-text',
      '',
      'default'
    );
  }, [cuisine, markCuisineTried]);

  const handleUpdateFavorite = useCallback(async () => {
    if (!cuisine || !progress) return;

    Alert.prompt(
      'Favorite Restaurant',
      'What\'s your favorite restaurant for this cuisine?',
      async (restaurantName) => {
        if (restaurantName) {
          try {
            await updateFavoriteRestaurant(cuisine.id, restaurantName);
            Alert.alert('Updated!', 'Favorite restaurant updated successfully.');
          } catch (err) {
            console.error('Error updating favorite restaurant:', err);
            Alert.alert('Error', 'Failed to update favorite restaurant.');
          }
        }
      },
      'plain-text',
      progress.favorite_restaurant || '',
      'default'
    );
  }, [cuisine, progress, updateFavoriteRestaurant]);

  const handleShare = useCallback(async () => {
    if (!cuisine) return;

    try {
      const message = progress 
        ? `I've tried ${cuisine.name} cuisine! ${progress.favorite_restaurant ? `My favorite spot is ${progress.favorite_restaurant}.` : ''} Check out Palate to track your culinary journey!`
        : `I'm interested in trying ${cuisine.name} cuisine! Check out Palate to discover new flavors!`;

      await Share.share({
        message,
        title: `${cuisine.name} Cuisine`,
      });
    } catch (error) {
      console.error('Error sharing cuisine:', error);
    }
  }, [cuisine, progress]);

  const getSimilarCuisines = useCallback((): Cuisine[] => {
    if (!cuisine) return [];

    return cuisines
      .filter(c => 
        c.id !== cuisine.id && 
        (c.category === cuisine.category || c.origin_country === cuisine.origin_country)
      )
      .slice(0, 4);
  }, [cuisine, cuisines]);

  const getCuisineStats = useCallback(() => {
    if (!progress) return null;

    const firstTryDate = new Date(progress.first_tried_at);
    const daysSinceFirst = Math.floor(
      (new Date().getTime() - firstTryDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      firstTryDate: firstTryDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      daysSinceFirst,
      timesTried: progress.times_tried,
    };
  }, [progress]);

  if (loading || !cuisine) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = getCuisineStats();
  const similarCuisines = getSimilarCuisines();
  const isTriedCuisine = !!progress;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerAction} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.cuisineIconContainer}>
            <Text style={styles.cuisineIcon}>{cuisine.emoji}</Text>
            {isTriedCuisine && (
              <View style={styles.triedBadge}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              </View>
            )}
          </View>
          
          <Text style={styles.cuisineName}>{cuisine.name}</Text>
          
          <View style={styles.cuisineMetadata}>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Category</Text>
              <Text style={styles.metadataValue}>{cuisine.category}</Text>
            </View>
            
            {cuisine.origin_country && (
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Origin</Text>
                <Text style={styles.metadataValue}>{cuisine.origin_country}</Text>
              </View>
            )}
          </View>

          {cuisine.description && (
            <Text style={styles.cuisineDescription}>{cuisine.description}</Text>
          )}
        </View>

        {/* User Journey Section */}
        {isTriedCuisine && stats ? (
          <View style={styles.journeySection}>
            <Text style={styles.sectionTitle}>Your Journey</Text>
            
            <View style={styles.journeyStats}>
              <View style={styles.journeyStat}>
                <Text style={styles.journeyStatValue}>{stats.timesTried}</Text>
                <Text style={styles.journeyStatLabel}>
                  Time{stats.timesTried > 1 ? 's' : ''} Tried
                </Text>
              </View>
              
              <View style={styles.journeyStat}>
                <Text style={styles.journeyStatValue}>{stats.daysSinceFirst}</Text>
                <Text style={styles.journeyStatLabel}>Days Since First</Text>
              </View>
            </View>

            <View style={styles.journeyDetails}>
              <View style={styles.journeyItem}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <View style={styles.journeyItemContent}>
                  <Text style={styles.journeyItemTitle}>First Tried</Text>
                  <Text style={styles.journeyItemValue}>{stats.firstTryDate}</Text>
                </View>
              </View>

              {progress.favorite_restaurant && (
                <View style={styles.journeyItem}>
                  <Ionicons name="restaurant-outline" size={20} color={colors.primary} />
                  <View style={styles.journeyItemContent}>
                    <Text style={styles.journeyItemTitle}>Favorite Restaurant</Text>
                    <Text style={styles.journeyItemValue}>{progress.favorite_restaurant}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={handleUpdateFavorite}
                  >
                    <Ionicons name="pencil" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {!progress.favorite_restaurant && (
              <TouchableOpacity 
                style={styles.addFavoriteButton}
                onPress={handleUpdateFavorite}
              >
                <Ionicons name="add" size={20} color={colors.primary} />
                <Text style={styles.addFavoriteText}>Add Favorite Restaurant</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.untriedSection}>
            <Text style={styles.sectionTitle}>Ready to Try?</Text>
            <Text style={styles.untriedDescription}>
              This cuisine is waiting to be discovered! Mark it as tried once you experience it.
            </Text>
          </View>
        )}

        {/* Similar Cuisines */}
        {similarCuisines.length > 0 && (
          <View style={styles.similarSection}>
            <Text style={styles.sectionTitle}>Similar Cuisines</Text>
            <Text style={styles.sectionSubtitle}>
              You might also enjoy these related cuisines
            </Text>
            
            <View style={styles.similarGrid}>
              {similarCuisines.map((similarCuisine) => {
                const similarProgress = userProgress.find(p => p.cuisine_id === similarCuisine.id);
                const isTried = !!similarProgress;
                
                return (
                  <TouchableOpacity
                    key={similarCuisine.id}
                    style={[styles.similarCard, isTried && styles.similarCardTried]}
                    onPress={() => navigation.navigate('CuisineDetail' as never, {
                      cuisineId: similarCuisine.id,
                      fromScreen: 'detail',
                    } as never)}
                  >
                    <Text style={styles.similarEmoji}>{similarCuisine.emoji}</Text>
                    <Text style={styles.similarName} numberOfLines={1}>
                      {similarCuisine.name}
                    </Text>
                    {isTried && (
                      <View style={styles.similarTriedBadge}>
                        <Ionicons name="checkmark" size={12} color={colors.success} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isTriedCuisine ? (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={handleMarkAsTried}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.secondaryButtonText}>Try Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.primaryButton]}
                onPress={handleShare}
              >
                <Ionicons name="share-social-outline" size={20} color={colors.white} />
                <Text style={styles.primaryButtonText}>Share Experience</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton, styles.fullWidth]}
              onPress={handleMarkAsTried}
            >
              <Ionicons name="restaurant-outline" size={20} color={colors.white} />
              <Text style={styles.primaryButtonText}>Mark as Tried</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    fontSize: fonts.lg,
    color: colors.textSecondary,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  backButton: {
    padding: spacing(0.5),
  },

  headerActions: {
    flexDirection: 'row',
    gap: spacing(1),
  },

  headerAction: {
    padding: spacing(0.5),
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: spacing(4),
  },

  heroSection: {
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(3),
    backgroundColor: colors.white,
    marginBottom: spacing(2),
  },

  cuisineIconContainer: {
    position: 'relative',
    marginBottom: spacing(2),
  },

  cuisineIcon: {
    fontSize: 80,
  },

  triedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing(0.25),
    ...shadows.small,
  },

  cuisineName: {
    fontSize: fonts.xxxl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(1.5),
  },

  cuisineMetadata: {
    flexDirection: 'row',
    gap: spacing(3),
    marginBottom: spacing(2),
  },

  metadataItem: {
    alignItems: 'center',
  },

  metadataLabel: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    marginBottom: spacing(0.25),
  },

  metadataValue: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },

  cuisineDescription: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
  },

  journeySection: {
    backgroundColor: colors.white,
    padding: spacing(2),
    marginBottom: spacing(2),
  },

  sectionTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    marginBottom: spacing(1),
  },

  journeyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing(2),
    paddingVertical: spacing(1.5),
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.lg,
  },

  journeyStat: {
    alignItems: 'center',
  },

  journeyStatValue: {
    fontSize: fonts.xxl,
    fontWeight: fonts.weights.bold,
    color: colors.primary,
    marginBottom: spacing(0.25),
  },

  journeyStatLabel: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  journeyDetails: {
    gap: spacing(1.5),
  },

  journeyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },

  journeyItemContent: {
    flex: 1,
  },

  journeyItemTitle: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    marginBottom: spacing(0.25),
  },

  journeyItemValue: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.text,
  },

  editButton: {
    padding: spacing(0.5),
  },

  addFavoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.5),
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    marginTop: spacing(1),
    gap: spacing(0.75),
  },

  addFavoriteText: {
    fontSize: fonts.base,
    color: colors.primary,
    fontWeight: fonts.weights.medium,
  },

  untriedSection: {
    backgroundColor: colors.white,
    padding: spacing(2),
    marginBottom: spacing(2),
    alignItems: 'center',
  },

  untriedDescription: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
  },

  similarSection: {
    backgroundColor: colors.white,
    padding: spacing(2),
    marginBottom: spacing(2),
  },

  sectionSubtitle: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    marginBottom: spacing(2),
  },

  similarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
  },

  similarCard: {
    width: '48%',
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.lg,
    padding: spacing(1.5),
    alignItems: 'center',
    position: 'relative',
  },

  similarCardTried: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },

  similarEmoji: {
    fontSize: 24,
    marginBottom: spacing(0.75),
  },

  similarName: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.text,
    textAlign: 'center',
  },

  similarTriedBadge: {
    position: 'absolute',
    top: spacing(0.5),
    right: spacing(0.5),
    backgroundColor: colors.success,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: spacing(2),
    gap: spacing(1.5),
  },

  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.5),
    borderRadius: radii.lg,
    gap: spacing(0.75),
  },

  fullWidth: {
    flex: 1,
  },

  primaryButton: {
    backgroundColor: colors.primary,
  },

  primaryButtonText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.white,
  },

  secondaryButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },

  secondaryButtonText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.primary,
  },
});