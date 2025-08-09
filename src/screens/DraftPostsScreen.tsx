/**
 * DraftPostsScreen Component
 * Screen to manage saved draft posts with preview and editing options
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { DraftPostsScreenProps } from '../navigation/types';
import { colors, spacing, fonts } from '../theme/uiTheme';
import { useDrafts, DraftSummary } from '../hooks/useDrafts';

interface DraftItemProps {
  draft: DraftSummary;
  onContinue: (draft: DraftSummary) => void;
  onDelete: (draft: DraftSummary) => void;
}

const DraftItem: React.FC<DraftItemProps> = ({ draft, onContinue, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleContinue = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onContinue(draft);
  }, [draft, onContinue]);

  const handleDelete = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Delete Draft',
      'Are you sure you want to delete this draft? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await onDelete(draft);
            } catch (error) {
              console.error('Error deleting draft:', error);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [draft, onDelete]);

  // Format time difference
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <View style={[styles.draftItem, isDeleting && styles.draftItemDeleting]}>
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        {draft.thumbnailUri ? (
          <Image
            source={{ uri: draft.thumbnailUri }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderThumbnail}>
            <MaterialIcons
              name="photo"
              size={24}
              color={colors.textMuted}
            />
          </View>
        )}
        
        {/* Photo Count Badge */}
        {draft.photoCount > 0 && (
          <View style={styles.photoCountBadge}>
            <Text style={styles.photoCountText}>{draft.photoCount}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.draftContent}>
        <Text style={styles.draftTitle} numberOfLines={1}>
          {draft.title}
        </Text>
        
        <View style={styles.draftMeta}>
          {draft.restaurantName && (
            <Text style={styles.restaurantName} numberOfLines={1}>
              📍 {draft.restaurantName}
            </Text>
          )}
          
          {draft.cuisine && (
            <Text style={styles.cuisine} numberOfLines={1}>
              🍽️ {draft.cuisine}
            </Text>
          )}
        </View>
        
        <View style={styles.draftFooter}>
          <Text style={styles.timeAgo}>
            {getTimeAgo(draft.updatedAt)}
          </Text>
          
          <View style={styles.draftStats}>
            <View style={styles.statItem}>
              <MaterialIcons name="photo" size={12} color={colors.textMuted} />
              <Text style={styles.statText}>{draft.photoCount}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.draftActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleContinue}
          activeOpacity={0.7}
          disabled={isDeleting}
        >
          <MaterialIcons
            name="edit"
            size={18}
            color={colors.primary}
          />
          <Text style={styles.actionButtonText}>Continue</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.7}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <MaterialIcons
              name="delete"
              size={18}
              color={colors.error}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function DraftPostsScreen({ navigation }: DraftPostsScreenProps) {
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    drafts,
    isLoadingDrafts,
    error,
    loadDrafts,
    deleteDraft,
    deleteAllDrafts,
    restoreDraft,
    cleanupExpiredDrafts,
  } = useDrafts();

  // Load drafts on mount
  useEffect(() => {
    loadDrafts();
    cleanupExpiredDrafts();
  }, [loadDrafts, cleanupExpiredDrafts]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadDrafts();
      await cleanupExpiredDrafts();
    } catch (error) {
      console.error('Error refreshing drafts:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadDrafts, cleanupExpiredDrafts]);

  // Handle continue editing draft
  const handleContinueDraft = useCallback(async (draftSummary: DraftSummary) => {
    try {
      const fullDraft = restoreDraft(draftSummary.id);
      if (!fullDraft) {
        Alert.alert(
          'Draft Not Available',
          'This draft is no longer available or has expired.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Navigate to CreatePost with draft data
      navigation.navigate('CreatePost', {
        draftData: fullDraft,
        photos: fullDraft.photos || [],
      });
    } catch (error) {
      console.error('Error restoring draft:', error);
      Alert.alert(
        'Error',
        'Failed to load draft. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [restoreDraft, navigation]);

  // Handle delete draft
  const handleDeleteDraft = useCallback(async (draftSummary: DraftSummary) => {
    try {
      await deleteDraft(draftSummary.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error deleting draft:', error);
      Alert.alert(
        'Error',
        'Failed to delete draft. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [deleteDraft]);

  // Handle delete all drafts
  const handleDeleteAllDrafts = useCallback(async () => {
    Alert.alert(
      'Delete All Drafts',
      `Are you sure you want to delete all ${drafts.length} drafts? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllDrafts();
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Error deleting all drafts:', error);
              Alert.alert(
                'Error',
                'Failed to delete drafts. Please try again.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  }, [drafts.length, deleteAllDrafts]);

  // Filter drafts based on search query
  const filteredDrafts = React.useMemo(() => {
    if (!searchQuery.trim()) return drafts;
    
    const query = searchQuery.toLowerCase();
    return drafts.filter(draft =>
      draft.title.toLowerCase().includes(query) ||
      draft.restaurantName.toLowerCase().includes(query) ||
      draft.cuisine.toLowerCase().includes(query)
    );
  }, [drafts, searchQuery]);

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons
        name="drafts"
        size={64}
        color={colors.textMuted}
      />
      <Text style={styles.emptyStateTitle}>No Drafts Yet</Text>
      <Text style={styles.emptyStateText}>
        Your draft posts will appear here. Start creating a post and it will be automatically saved as a draft.
      </Text>
      <TouchableOpacity
        style={styles.createPostButton}
        onPress={() => navigation.navigate('CreatePost')}
        activeOpacity={0.7}
      >
        <MaterialIcons name="add" size={20} color={colors.white} />
        <Text style={styles.createPostButtonText}>Create New Post</Text>
      </TouchableOpacity>
    </View>
  );

  // Render search empty state
  const renderSearchEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons
        name="search-off"
        size={48}
        color={colors.textMuted}
      />
      <Text style={styles.emptyStateTitle}>No Drafts Found</Text>
      <Text style={styles.emptyStateText}>
        No drafts match your search query. Try different keywords.
      </Text>
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View style={styles.errorState}>
      <MaterialIcons
        name="error-outline"
        size={48}
        color={colors.error}
      />
      <Text style={styles.errorTitle}>Error Loading Drafts</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={handleRefresh}
        activeOpacity={0.7}
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (error && drafts.length === 0) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing(2) }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Drafts</Text>
          
          <View style={styles.headerSpace} />
        </View>
        
        {renderErrorState()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing(2) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          Drafts {drafts.length > 0 && `(${drafts.length})`}
        </Text>
        
        {drafts.length > 0 && (
          <TouchableOpacity
            style={styles.headerAction}
            onPress={handleDeleteAllDrafts}
            activeOpacity={0.7}
          >
            <MaterialIcons name="delete-sweep" size={24} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {isLoadingDrafts && drafts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading drafts...</Text>
        </View>
      ) : drafts.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredDrafts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DraftItem
              draft={item}
              onContinue={handleContinueDraft}
              onDelete={handleDeleteDraft}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={searchQuery ? renderSearchEmptyState : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(2),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },

  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerSpace: {
    width: 44,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing(2),
  },

  loadingText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
  },

  listContent: {
    padding: spacing(3),
  },

  draftItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing(3),
    marginBottom: spacing(3),
    borderWidth: 1,
    borderColor: colors.outline,
  },

  draftItemDeleting: {
    opacity: 0.6,
  },

  thumbnailContainer: {
    position: 'relative',
    marginRight: spacing(3),
  },

  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },

  placeholderThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },

  photoCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },

  photoCountText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.bold,
    color: colors.white,
  },

  draftContent: {
    flex: 1,
  },

  draftTitle: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(1),
  },

  draftMeta: {
    gap: spacing(0.5),
  },

  restaurantName: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
  },

  cuisine: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
  },

  draftFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing(2),
  },

  timeAgo: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.normal,
    color: colors.textMuted,
  },

  draftStats: {
    flexDirection: 'row',
    gap: spacing(2),
  },

  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },

  statText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.normal,
    color: colors.textMuted,
  },

  draftActions: {
    alignItems: 'center',
    gap: spacing(2),
    marginLeft: spacing(2),
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: 16,
    gap: spacing(1),
  },

  actionButtonText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.medium,
    color: colors.primary,
  },

  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing(4),
    gap: spacing(3),
  },

  emptyStateTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    textAlign: 'center',
  },

  emptyStateText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.5,
  },

  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    borderRadius: 25,
    gap: spacing(2),
  },

  createPostButtonText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.white,
  },

  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing(4),
    gap: spacing(3),
  },

  errorTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.bold,
    color: colors.error,
    textAlign: 'center',
  },

  errorText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  retryButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    borderRadius: 20,
  },

  retryButtonText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.white,
  },
});