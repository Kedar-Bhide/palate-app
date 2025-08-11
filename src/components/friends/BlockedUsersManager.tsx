import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFriends } from '../../hooks/useFriends';
import UserCard from './UserCard';
import { BlockedUser, FriendAction } from '../../types/friends';
import { colors, spacing, radii, fonts, shadows } from '../../theme/uiTheme';

interface BlockedUsersManagerProps {
  onUserPress: (userId: string) => void;
  onClose?: () => void;
}

export default function BlockedUsersManager({
  onUserPress,
  onClose,
}: BlockedUsersManagerProps) {
  const {
    blockedUsers,
    loading,
    unblockUser,
    refreshData,
  } = useFriends();

  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      console.error('Error refreshing blocked users:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

  const handleUnblockUser = useCallback(async (userId: string, userName: string) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${userName}? They will be able to see your profile and send you friend requests again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'default',
          onPress: async () => {
            try {
              setActionLoading(userId);
              await unblockUser(userId);
              Alert.alert('Success', `${userName} has been unblocked.`);
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert('Error', 'Failed to unblock user. Please try again.');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  }, [unblockUser]);

  const handleFriendAction = useCallback(async (userId: string, action: FriendAction) => {
    // BlockedUsersManager only handles unblock actions
    if (action === 'unblock_user') {
      const blockedUser = blockedUsers.find(bu => bu.blocked_user.id === userId);
      if (blockedUser) {
        handleUnblockUser(userId, blockedUser.blocked_user.display_name);
      }
    }
  }, [blockedUsers, handleUnblockUser]);

  const handleBulkUnblock = useCallback(async () => {
    if (blockedUsers.length === 0) return;

    Alert.alert(
      'Unblock All Users',
      `Are you sure you want to unblock all ${blockedUsers.length} users? This will allow them to see your profile and send you friend requests again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock All',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const blockedUser of blockedUsers) {
                await unblockUser(blockedUser.blocked_user.id);
              }
              Alert.alert('Success', 'All users have been unblocked.');
            } catch (error) {
              console.error('Error unblocking all users:', error);
              Alert.alert('Error', 'Some users failed to unblock. Please try again.');
            }
          }
        }
      ]
    );
  }, [blockedUsers, unblockUser]);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Ionicons name="shield-outline" size={24} color={colors.error} />
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Blocked Users</Text>
          <Text style={styles.headerSubtitle}>
            {blockedUsers.length} user{blockedUsers.length !== 1 ? 's' : ''} blocked
          </Text>
        </View>
      </View>
      
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderBlockingInfo = () => (
    <View style={styles.infoSection}>
      <View style={styles.infoHeader}>
        <Ionicons name="information-circle" size={20} color={colors.info} />
        <Text style={styles.infoTitle}>About Blocking</Text>
      </View>
      <Text style={styles.infoText}>
        When you block someone:
      </Text>
      <View style={styles.infoList}>
        <Text style={styles.infoListItem}>• They can't see your profile or posts</Text>
        <Text style={styles.infoListItem}>• They can't send you friend requests</Text>
        <Text style={styles.infoListItem}>• Existing friendships are removed</Text>
        <Text style={styles.infoListItem}>• They won't be notified you blocked them</Text>
      </View>
    </View>
  );

  const renderBulkActions = () => {
    if (blockedUsers.length === 0) return null;

    return (
      <View style={styles.bulkActions}>
        <TouchableOpacity
          style={styles.bulkUnblockButton}
          onPress={handleBulkUnblock}
        >
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.bulkUnblockText}>Unblock All ({blockedUsers.length})</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBlockedUsersList = () => {
    if (loading && blockedUsers.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading blocked users...</Text>
        </View>
      );
    }

    if (blockedUsers.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="shield-checkmark" size={64} color={colors.success} />
          <Text style={styles.emptyStateTitle}>No Blocked Users</Text>
          <Text style={styles.emptyStateMessage}>
            You haven't blocked anyone yet. Blocking helps keep your experience safe and comfortable.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.blockedUsersList}>
        {blockedUsers.map((blockedUser: BlockedUser) => (
          <View key={blockedUser.id} style={styles.blockedUserItem}>
            <View style={styles.blockedUserHeader}>
              <Text style={styles.blockedDate}>
                Blocked {new Date(blockedUser.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: new Date(blockedUser.created_at).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                })}
              </Text>
            </View>
            
            <UserCard
              user={blockedUser.blocked_user}
              currentUserId="" // Filled by hook
              friendshipStatus="blocked_by_me"
              onPress={onUserPress}
              onFriendAction={handleFriendAction}
              size="medium"
              showActivity={false}
            />

            <View style={styles.blockedUserActions}>
              <TouchableOpacity
                style={[
                  styles.unblockButton,
                  actionLoading === blockedUser.blocked_user.id && styles.disabledButton
                ]}
                onPress={() => handleUnblockUser(blockedUser.blocked_user.id, blockedUser.blocked_user.display_name)}
                disabled={actionLoading === blockedUser.blocked_user.id}
              >
                <Ionicons name="checkmark" size={20} color={colors.success} />
                <Text style={styles.unblockButtonText}>
                  {actionLoading === blockedUser.blocked_user.id ? 'Unblocking...' : 'Unblock'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderSafetyTips = () => (
    <View style={styles.safetySection}>
      <View style={styles.safetyHeader}>
        <Ionicons name="warning" size={20} color={colors.warning} />
        <Text style={styles.safetyTitle}>Safety Tips</Text>
      </View>
      <Text style={styles.safetyText}>
        • Only unblock users you trust and want to interact with again
      </Text>
      <Text style={styles.safetyText}>
        • Unblocking allows them to see your public content immediately
      </Text>
      <Text style={styles.safetyText}>
        • You can always block someone again if needed
      </Text>
      <Text style={styles.safetyText}>
        • Report serious harassment through our support channels
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderBlockingInfo()}
        {renderBulkActions()}
        {renderBlockedUsersList()}
        {renderSafetyTips()}
      </ScrollView>
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
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  headerTextContainer: {
    marginLeft: spacing(1.5),
  },

  headerTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.bold,
    color: colors.text,
  },

  headerSubtitle: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    marginTop: spacing(0.25),
  },

  closeButton: {
    padding: spacing(0.5),
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: spacing(4),
  },

  infoSection: {
    backgroundColor: colors.white,
    margin: spacing(2),
    padding: spacing(2),
    borderRadius: radii.lg,
    ...shadows.small,
  },

  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(1),
  },

  infoTitle: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginLeft: spacing(0.75),
  },

  infoText: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    marginBottom: spacing(1),
  },

  infoList: {
    marginLeft: spacing(1),
  },

  infoListItem: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    marginBottom: spacing(0.5),
    lineHeight: fonts.sm * 1.3,
  },

  bulkActions: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    alignItems: 'center',
  },

  bulkUnblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.25),
    borderRadius: radii.lg,
    gap: spacing(0.75),
  },

  bulkUnblockText: {
    color: colors.white,
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
  },

  loadingContainer: {
    paddingVertical: spacing(4),
    alignItems: 'center',
  },

  loadingText: {
    fontSize: fonts.base,
    color: colors.textSecondary,
  },

  emptyState: {
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(2),
    alignItems: 'center',
  },

  emptyStateTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginTop: spacing(2),
    marginBottom: spacing(1),
    textAlign: 'center',
  },

  emptyStateMessage: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
  },

  blockedUsersList: {
    backgroundColor: colors.white,
    marginHorizontal: spacing(2),
    borderRadius: radii.lg,
    overflow: 'hidden',
  },

  blockedUserItem: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  blockedUserHeader: {
    alignItems: 'flex-end',
    marginBottom: spacing(1),
  },

  blockedDate: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  blockedUserActions: {
    marginTop: spacing(1.5),
    alignItems: 'center',
  },

  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radii.md,
    gap: spacing(0.5),
    minWidth: 120,
    justifyContent: 'center',
  },

  unblockButtonText: {
    color: colors.white,
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
  },

  disabledButton: {
    opacity: 0.6,
  },

  safetySection: {
    backgroundColor: colors.warningLight,
    margin: spacing(2),
    padding: spacing(2),
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.warning,
  },

  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(1.5),
  },

  safetyTitle: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.warning,
    marginLeft: spacing(0.75),
  },

  safetyText: {
    fontSize: fonts.sm,
    color: colors.text,
    marginBottom: spacing(0.75),
    lineHeight: fonts.sm * 1.3,
  },
});