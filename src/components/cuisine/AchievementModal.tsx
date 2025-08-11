import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Share,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Achievement } from '../../types/cuisine';
import { colors, spacing, radii, fonts, shadows } from '../../theme/uiTheme';

interface AchievementModalProps {
  achievement: Achievement;
  userProgress?: number;
  visible: boolean;
  onClose: () => void;
  onShare: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export default function AchievementModal({
  achievement,
  userProgress = 0,
  visible,
  onClose,
  onShare,
}: AchievementModalProps) {
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const isUnlocked = userProgress >= achievement.threshold;
  const progressPercentage = Math.min((userProgress / achievement.threshold) * 100, 100);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: screenWidth,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleShare = async () => {
    try {
      const message = isUnlocked 
        ? `🎉 I just unlocked the "${achievement.name}" achievement in Palate! ${achievement.description}`
        : `🎯 Working towards the "${achievement.name}" achievement in Palate! ${Math.round(progressPercentage)}% complete.`;

      await Share.share({
        message,
        title: 'My Cuisine Achievement',
      });
      onShare();
    } catch (error) {
      console.error('Error sharing achievement:', error);
      Alert.alert('Error', 'Failed to share achievement. Please try again.');
    }
  };

  const getTierInfo = () => {
    switch (achievement.tier) {
      case 'bronze': return { color: '#CD7F32', label: 'Bronze' };
      case 'silver': return { color: '#C0C0C0', label: 'Silver' };
      case 'gold': return { color: '#FFD700', label: 'Gold' };
      case 'platinum': return { color: '#E5E4E2', label: 'Platinum' };
      default: return { color: colors.primary, label: 'Standard' };
    }
  };

  const getRarityInfo = () => {
    switch (achievement.rarity) {
      case 'rare': return { color: '#0099FF', label: 'Rare', symbol: '★' };
      case 'epic': return { color: '#9966CC', label: 'Epic', symbol: '♦' };
      case 'legendary': return { color: '#FF8000', label: 'Legendary', symbol: '♛' };
      default: return { color: colors.primary, label: 'Common', symbol: '' };
    }
  };

  const getCategoryIcon = () => {
    switch (achievement.category) {
      case 'exploration': return '🗺️';
      case 'diversity': return '🌍';
      case 'social': return '👥';
      case 'streak': return '🔥';
      case 'specialist': return '🎯';
      default: return '🏆';
    }
  };

  const tierInfo = getTierInfo();
  const rarityInfo = getRarityInfo();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: overlayAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.modalContainer,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Achievement Hero */}
          <View style={[styles.heroSection, { borderColor: tierInfo.color }]}>
            <View style={[styles.iconContainer, { backgroundColor: tierInfo.color }]}>
              <Text style={styles.achievementIcon}>
                {isUnlocked ? achievement.icon : '🔒'}
              </Text>
            </View>

            <Text style={styles.achievementName}>{achievement.name}</Text>
            
            <View style={styles.badgeRow}>
              <View style={[styles.tierBadge, { backgroundColor: tierInfo.color }]}>
                <Text style={styles.tierText}>{tierInfo.label}</Text>
              </View>
              
              {achievement.rarity && achievement.rarity !== 'common' && (
                <View style={[styles.rarityBadge, { backgroundColor: rarityInfo.color }]}>
                  <Text style={styles.raritySymbol}>{rarityInfo.symbol}</Text>
                  <Text style={styles.rarityText}>{rarityInfo.label}</Text>
                </View>
              )}

              <View style={styles.categoryBadge}>
                <Text style={styles.categoryIcon}>{getCategoryIcon()}</Text>
                <Text style={styles.categoryText}>
                  {achievement.category.charAt(0).toUpperCase() + achievement.category.slice(1)}
                </Text>
              </View>
            </View>

            {isUnlocked && achievement.unlockedAt && (
              <Text style={styles.unlockedDate}>
                Unlocked on {new Date(achievement.unlockedAt).toLocaleDateString()}
              </Text>
            )}
          </View>

          {/* Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Progress</Text>
              <Text style={styles.progressValue}>
                {userProgress} / {achievement.threshold}
              </Text>
            </View>

            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View 
                  style={[
                    styles.progressBarFill,
                    { 
                      width: `${progressPercentage}%`,
                      backgroundColor: tierInfo.color,
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressPercentage}>
                {Math.round(progressPercentage)}%
              </Text>
            </View>

            {!isUnlocked && (
              <Text style={styles.remainingText}>
                {achievement.threshold - userProgress} more to unlock!
              </Text>
            )}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{achievement.description}</Text>
          </View>

          {/* Tips Section */}
          {achievement.tips && achievement.tips.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {isUnlocked ? 'How You Did It' : 'Tips to Unlock'}
              </Text>
              {achievement.tips.map((tip, index) => (
                <View key={index} style={styles.tipItem}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Achievement Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievement Details</Text>
            <View style={styles.statGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{achievement.threshold}</Text>
                <Text style={styles.statLabel}>Required</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {achievement.rarity?.charAt(0).toUpperCase()}
                </Text>
                <Text style={styles.statLabel}>Rarity</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{getCategoryIcon()}</Text>
                <Text style={styles.statLabel}>Category</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {isUnlocked ? (
              <TouchableOpacity 
                style={[styles.actionButton, styles.shareActionButton]}
                onPress={handleShare}
              >
                <Ionicons name="share-social" size={20} color={colors.white} />
                <Text style={styles.shareButtonText}>Share Achievement</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.actionButton, styles.motivateButton]}
                onPress={onClose}
              >
                <Ionicons name="trending-up" size={20} color={colors.white} />
                <Text style={styles.motivateButtonText}>Keep Going!</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },

  overlayTouchable: {
    flex: 1,
  },

  modalContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: screenWidth * 0.85,
    height: '100%',
    backgroundColor: colors.white,
    zIndex: 2,
    ...shadows.large,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: spacing(4),
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  closeButton: {
    padding: spacing(0.5),
  },

  shareButton: {
    padding: spacing(0.5),
  },

  heroSection: {
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(3),
    borderBottomWidth: 3,
    marginHorizontal: spacing(2),
    marginTop: spacing(2),
  },

  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
    ...shadows.medium,
  },

  achievementIcon: {
    fontSize: 48,
  },

  achievementName: {
    fontSize: fonts.xxl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(1),
  },

  badgeRow: {
    flexDirection: 'row',
    gap: spacing(0.75),
    marginBottom: spacing(1),
  },

  tierBadge: {
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
  },

  tierText: {
    color: colors.white,
    fontSize: fonts.xs,
    fontWeight: fonts.weights.bold,
  },

  rarityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(0.75),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
    gap: spacing(0.25),
  },

  raritySymbol: {
    color: colors.white,
    fontSize: fonts.sm,
    fontWeight: fonts.weights.bold,
  },

  rarityText: {
    color: colors.white,
    fontSize: fonts.xs,
    fontWeight: fonts.weights.bold,
  },

  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing(0.75),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
    gap: spacing(0.25),
  },

  categoryIcon: {
    fontSize: fonts.sm,
  },

  categoryText: {
    color: colors.textSecondary,
    fontSize: fonts.xs,
    fontWeight: fonts.weights.medium,
  },

  unlockedDate: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  progressSection: {
    margin: spacing(2),
    padding: spacing(2),
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.lg,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(1),
  },

  progressTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },

  progressValue: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.bold,
    color: colors.primary,
  },

  progressBarContainer: {
    marginBottom: spacing(0.5),
  },

  progressBarBackground: {
    height: 12,
    backgroundColor: colors.white,
    borderRadius: radii.full,
    overflow: 'hidden',
    marginBottom: spacing(0.5),
  },

  progressBarFill: {
    height: '100%',
    borderRadius: radii.full,
  },

  progressPercentage: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  remainingText: {
    fontSize: fonts.sm,
    color: colors.accent,
    textAlign: 'center',
    fontWeight: fonts.weights.medium,
    marginTop: spacing(0.5),
  },

  section: {
    marginHorizontal: spacing(2),
    marginBottom: spacing(2),
  },

  sectionTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(1),
  },

  description: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    lineHeight: fonts.base * 1.4,
  },

  tipItem: {
    flexDirection: 'row',
    marginBottom: spacing(0.75),
  },

  tipBullet: {
    fontSize: fonts.base,
    color: colors.primary,
    fontWeight: fonts.weights.bold,
    marginRight: spacing(0.75),
    marginTop: spacing(0.1),
  },

  tipText: {
    flex: 1,
    fontSize: fonts.base,
    color: colors.textSecondary,
    lineHeight: fonts.base * 1.3,
  },

  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  statItem: {
    alignItems: 'center',
  },

  statValue: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.bold,
    color: colors.primary,
    marginBottom: spacing(0.25),
  },

  statLabel: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
  },

  actionButtons: {
    paddingHorizontal: spacing(2),
    marginTop: spacing(2),
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    borderRadius: radii.lg,
    gap: spacing(0.75),
  },

  shareActionButton: {
    backgroundColor: colors.primary,
  },

  shareButtonText: {
    color: colors.white,
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
  },

  motivateButton: {
    backgroundColor: colors.accent,
  },

  motivateButtonText: {
    color: colors.white,
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
  },
});