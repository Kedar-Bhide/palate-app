import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useFriends } from '../hooks/useFriends';
import UserCard from '../components/friends/UserCard';
import { FriendAction, FriendRequest } from '../types/friends';
import { colors, spacing, radii, fonts, shadows } from '../theme/uiTheme';

type TabType = 'received' | 'sent';

export default function FriendRequestsScreen() {
  const navigation = useNavigation();
  const {
    friendRequests,
    sentRequests,
    loading,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    refreshData,
  } = useFriends();

  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      console.error('Error refreshing requests:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

  const handleUserPress = useCallback((userId: string) => {
    navigation.navigate('UserProfile' as never, { userId } as never);
  }, [navigation]);

  const handleAcceptRequest = useCallback(async (requestId: string) => {
    try {
      setActionLoading(requestId);
      await acceptFriendRequest(requestId);
      Alert.alert('Success', 'Friend request accepted! 🎉');
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept request. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }, [acceptFriendRequest]);

  const handleDeclineRequest = useCallback(async (requestId: string, userName: string) => {
    Alert.alert(
      'Decline Request',
      `Are you sure you want to decline the friend request from ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(requestId);
              await declineFriendRequest(requestId);
            } catch (error) {
              console.error('Error declining request:', error);
              Alert.alert('Error', 'Failed to decline request. Please try again.');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  }, [declineFriendRequest]);

  const handleCancelRequest = useCallback(async (requestId: string, userName: string) => {
    Alert.alert(
      'Cancel Request',
      `Are you sure you want to cancel your friend request to ${userName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(requestId);
              await cancelFriendRequest(requestId);
            } catch (error) {
              console.error('Error canceling request:', error);
              Alert.alert('Error', 'Failed to cancel request. Please try again.');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  }, [cancelFriendRequest]);

  const handleFriendAction = useCallback(async (userId: string, action: FriendAction) => {
    // This is handled by the specific action handlers above
    // but required by UserCard interface
  }, []);

  const handleBulkAccept = useCallback(async () => {
    if (friendRequests.length === 0) return;

    Alert.alert(
      'Accept All Requests',
      `Are you sure you want to accept all ${friendRequests.length} friend requests?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept All',
          onPress: async () => {
            try {
              for (const request of friendRequests) {
                await acceptFriendRequest(request.id);
              }
              Alert.alert('Success', 'All friend requests accepted! 🎉');
            } catch (error) {
              console.error('Error accepting all requests:', error);
              Alert.alert('Error', 'Some requests failed to accept. Please try again.');
            }
          }
        }
      ]
    );
  }, [friendRequests, acceptFriendRequest]);

  const handleBulkDecline = useCallback(async () => {
    if (friendRequests.length === 0) return;

    Alert.alert(
      'Decline All Requests',
      `Are you sure you want to decline all ${friendRequests.length} friend requests?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline All',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const request of friendRequests) {
                await declineFriendRequest(request.id);
              }
              Alert.alert('Done', 'All friend requests declined.');
            } catch (error) {
              console.error('Error declining all requests:', error);
              Alert.alert('Error', 'Some requests failed to decline. Please try again.');
            }
          }
        }
      ]
    );
  }, [friendRequests, declineFriendRequest]);

  const formatRequestTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `${minutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const renderTabButton = (tab: TabType, label: string, count: number) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === tab && styles.activeTab,
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Text
        style={[
          styles.tabText,
          activeTab === tab && styles.activeTabText,
        ]}
      >
        {label}
      </Text>
      {count > 0 && (
        <View style={[
          styles.badge,
          activeTab === tab && styles.activeBadge
        ]}>
          <Text style={[
            styles.badgeText,
            activeTab === tab && styles.activeBadgeText
          ]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderReceivedRequests = () => {
    if (loading && friendRequests.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      );
    }

    if (friendRequests.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>👋</Text>
          <Text style={styles.emptyStateTitle}>No friend requests</Text>
          <Text style={styles.emptyStateMessage}>
            When people send you friend requests, they'll appear here.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.requestsContainer}>
        {/* Bulk Actions */}
        <View style={styles.bulkActions}>
          <TouchableOpacity
            style={styles.bulkButton}
            onPress={handleBulkAccept}
          >
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.bulkButtonText, { color: colors.success }]}>
              Accept All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.bulkButton}
            onPress={handleBulkDecline}
          >
            <Ionicons name="close-circle" size={16} color={colors.error} />
            <Text style={[styles.bulkButtonText, { color: colors.error }]}>
              Decline All
            </Text>
          </TouchableOpacity>
        </View>

        {/* Request List */}
        {friendRequests.map((request: FriendRequest) => (
          <View key={request.id} style={styles.requestItem}>
            <View style={styles.requestHeader}>
              <Text style={styles.requestTime}>
                {formatRequestTime(request.created_at)}
              </Text>
            </View>
            
            <UserCard
              user={request.requester}
              currentUserId="" // Filled by hook
              friendshipStatus="pending_received"
              onPress={handleUserPress}
              onFriendAction={handleFriendAction}
              size="medium"
            />

            <View style={styles.requestActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.acceptButton,
                  actionLoading === request.id && styles.disabledButton
                ]}
                onPress={() => handleAcceptRequest(request.id)}
                disabled={actionLoading === request.id}
              >
                <Ionicons name="checkmark" size={20} color={colors.white} />
                <Text style={styles.acceptButtonText}>
                  {actionLoading === request.id ? 'Accepting...' : 'Accept'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.declineButton,
                  actionLoading === request.id && styles.disabledButton
                ]}
                onPress={() => handleDeclineRequest(request.id, request.requester.display_name)}
                disabled={actionLoading === request.id}
              >
                <Ionicons name="close" size={20} color={colors.white} />
                <Text style={styles.declineButtonText}>
                  {actionLoading === request.id ? 'Declining...' : 'Decline'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderSentRequests = () => {
    if (loading && sentRequests.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading sent requests...</Text>
        </View>
      );
    }

    if (sentRequests.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>📤</Text>
          <Text style={styles.emptyStateTitle}>No sent requests</Text>
          <Text style={styles.emptyStateMessage}>
            Friend requests you send will appear here until they're accepted or declined.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.requestsContainer}>
        {sentRequests.map((request: FriendRequest) => (
          <View key={request.id} style={styles.requestItem}>
            <View style={styles.requestHeader}>
              <Text style={styles.requestTime}>
                Sent {formatRequestTime(request.created_at)}
              </Text>
            </View>
            
            <UserCard
              user={request.addressee}
              currentUserId="" // Filled by hook
              friendshipStatus="pending_sent"
              onPress={handleUserPress}
              onFriendAction={handleFriendAction}
              size="medium"
            />

            <View style={styles.requestActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.cancelButton,
                  actionLoading === request.id && styles.disabledButton
                ]}
                onPress={() => handleCancelRequest(request.id, request.addressee.display_name)}
                disabled={actionLoading === request.id}
              >
                <Ionicons name="close" size={20} color={colors.error} />
                <Text style={styles.cancelButtonText}>
                  {actionLoading === request.id ? 'Canceling...' : 'Cancel Request'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

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
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Friend Requests</Text>
          <Text style={styles.headerSubtitle}>
            Manage your friend connections
          </Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {renderTabButton('received', 'Received', friendRequests.length)}
        {renderTabButton('sent', 'Sent', sentRequests.length)}
      </View>

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
        {activeTab === 'received' ? renderReceivedRequests() : renderSentRequests()}
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  backButton: {
    marginRight: spacing(1.5),
    padding: spacing(0.5),
  },

  headerTitleContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
  },

  headerSubtitle: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    marginTop: spacing(0.25),
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.5),
    gap: spacing(0.75),
  },

  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },

  tabText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
  },

  activeTabText: {
    color: colors.primary,
  },

  badge: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(0.5),
  },

  activeBadge: {
    backgroundColor: colors.primary,
  },

  badgeText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.bold,
    color: colors.textSecondary,
  },

  activeBadgeText: {
    color: colors.white,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: spacing(4),
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

  requestsContainer: {
    backgroundColor: colors.white,
  },

  bulkActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    gap: spacing(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    borderRadius: radii.md,
    backgroundColor: colors.surfaceVariant,
    gap: spacing(0.5),
  },

  bulkButtonText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
  },

  requestItem: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  requestHeader: {
    alignItems: 'flex-end',
    marginBottom: spacing(1),
  },

  requestTime: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  requestActions: {
    flexDirection: 'row',
    marginTop: spacing(1.5),
    gap: spacing(1),
  },

  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.25),
    borderRadius: radii.md,
    gap: spacing(0.75),
  },

  acceptButton: {
    backgroundColor: colors.success,
  },

  acceptButtonText: {
    color: colors.white,
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
  },

  declineButton: {
    backgroundColor: colors.error,
  },

  declineButtonText: {
    color: colors.white,
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
  },

  cancelButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.error,
  },

  cancelButtonText: {
    color: colors.error,
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
  },

  disabledButton: {
    opacity: 0.6,
  },
});