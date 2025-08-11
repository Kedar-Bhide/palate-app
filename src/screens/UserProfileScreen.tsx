import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, getCurrentUser } from '../lib/supabase';
import { useFriends } from '../hooks/useFriends';
import FriendButton from '../components/friends/FriendButton';
import FriendActivityFeed from '../components/friends/FriendActivityFeed';
import { 
  User, 
  FriendshipStatus, 
  FriendAction,
  UserProfile,
  PrivacySettings,
  FriendActivity,
  FriendshipEvent,
  FriendStats 
} from '../types/friends';
import { 
  canViewUserProfile, 
  canViewUserPosts, 
  formatMutualFriendsCount,
  getMutualFriends 
} from '../lib/friendsUtils';
import { colors, spacing, radii, fonts, shadows } from '../theme/uiTheme';

type UserProfileScreenRouteProp = RouteProp<{
  UserProfile: {
    userId: string;
    fromScreen?: 'search' | 'friends' | 'feed';
  };
}, 'UserProfile'>;

export default function UserProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute<UserProfileScreenRouteProp>();
  const { userId, fromScreen = 'search' } = route.params;

  const {
    getFriendshipStatus,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    blockUser,
  } = useFriends();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'posts' | 'activity' | 'timeline'>('posts');
  const [friendActivities, setFriendActivities] = useState<FriendActivity[]>([]);
  const [friendshipHistory, setFriendshipHistory] = useState<FriendshipEvent[]>([]);
  const [friendStats, setFriendStats] = useState<FriendStats | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const loadUserProfile = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      setCurrentUserId(currentUser.id);

      // Load user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        throw new Error('User not found');
      }

      // Get friendship status
      const friendshipStatus = getFriendshipStatus(userId);

      // Check if we can view this profile
      if (!canViewUserProfile(userData, currentUser.id, friendshipStatus)) {
        throw new Error('This profile is private');
      }

      // Get mutual friends
      const mutualFriends = await getMutualFriends(currentUser.id, userId, 6);
      const mutualFriendsCount = mutualFriends.length;

      // Get privacy settings (if available)
      const { data: privacyData } = await supabase
        .from('user_privacy_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      const privacySettings: PrivacySettings = privacyData || {
        profile_visibility: userData.is_private ? 'friends' : 'public',
        post_visibility: userData.is_private ? 'friends' : 'public',
        friend_list_visibility: userData.is_private ? 'friends' : 'public',
        search_visibility: true,
        allow_friend_requests: true,
      };

      // Load recent posts if allowed
      let recentPosts = [];
      if (canViewUserPosts(userData, currentUser.id, friendshipStatus, privacySettings)) {
        const { data: postsData } = await supabase
          .from('posts')
          .select(`
            id,
            photo_urls,
            restaurant_name,
            cuisine_type,
            location,
            rating,
            description,
            created_at,
            likes_count,
            comments_count
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(12);

        recentPosts = postsData || [];
      }

      // Load friend activities if they are friends
      if (friendshipStatus === 'friends') {
        const { data: activitiesData } = await supabase
          .from('friend_activities')
          .select(`
            *,
            user:user_id(
              id,
              display_name,
              username,
              avatar_url
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);

        setFriendActivities(activitiesData || []);

        // Load friendship history
        const { data: historyData } = await supabase
          .from('friendship_events')
          .select('*')
          .eq('friend_id', userId)
          .order('event_date', { ascending: false })
          .limit(50);

        setFriendshipHistory(historyData || []);

        // Calculate friend stats
        const friendSince = await supabase
          .from('friendships')
          .select('created_at')
          .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`)
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
          .eq('status', 'accepted')
          .single();

        const sharedRestaurants = await supabase
          .from('posts')
          .select('restaurant_name, user_id')
          .in('user_id', [currentUser.id, userId])
          .then(({ data }) => {
            if (!data) return 0;
            const userRestaurants = new Set(
              data.filter(p => p.user_id === userId).map(p => p.restaurant_name)
            );
            const currentUserRestaurants = new Set(
              data.filter(p => p.user_id === currentUser.id).map(p => p.restaurant_name)
            );
            return Array.from(userRestaurants).filter(r => currentUserRestaurants.has(r)).length;
          });

        const commonCuisines = await supabase
          .from('posts')
          .select('cuisine_type, user_id')
          .in('user_id', [currentUser.id, userId])
          .then(({ data }) => {
            if (!data) return 0;
            const userCuisines = new Set(
              data.filter(p => p.user_id === userId).map(p => p.cuisine_type)
            );
            const currentUserCuisines = new Set(
              data.filter(p => p.user_id === currentUser.id).map(p => p.cuisine_type)
            );
            return Array.from(userCuisines).filter(c => currentUserCuisines.has(c)).length;
          });

        const stats: FriendStats = {
          total_friends: userData.friend_count,
          mutual_friends: mutualFriendsCount,
          friend_since: friendSince?.data?.created_at || '',
          interactions_count: historyData?.length || 0,
          shared_restaurants: sharedRestaurants || 0,
          common_cuisines: commonCuisines || 0,
          last_interaction: historyData?.[0]?.event_date || '',
        };

        setFriendStats(stats);
      }

      const profile: UserProfile = {
        user: userData,
        friendship_status: friendshipStatus,
        mutual_friends_count: mutualFriendsCount,
        mutual_friends: mutualFriends,
        can_view_posts: canViewUserPosts(userData, currentUser.id, friendshipStatus, privacySettings),
        can_view_friends: privacySettings.friend_list_visibility !== 'private' || friendshipStatus === 'friends',
        can_send_message: friendshipStatus === 'friends',
        recent_posts: recentPosts,
        privacy_settings: privacySettings,
      };

      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load profile');
      navigation.goBack();
    }
  }, [userId, getFriendshipStatus, navigation]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadUserProfile();
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadUserProfile]);

  const handleFriendAction = useCallback(async (action: FriendAction) => {
    if (!userProfile || actionLoading) return;

    try {
      setActionLoading(true);

      switch (action) {
        case 'add_friend':
          await sendFriendRequest(userId);
          Alert.alert('Success', 'Friend request sent!');
          break;
        case 'accept_request':
          await acceptFriendRequest(userId);
          Alert.alert('Success', 'Friend request accepted!');
          break;
        case 'decline_request':
          await declineFriendRequest(userId);
          break;
        case 'remove_friend':
          await removeFriend(userId);
          Alert.alert('Success', 'Friend removed.');
          break;
        case 'block_user':
          await blockUser(userId);
          Alert.alert('Success', 'User blocked.');
          navigation.goBack();
          return;
      }

      // Refresh profile after action
      await loadUserProfile();
    } catch (error) {
      console.error('Friend action error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }, [userProfile, actionLoading, sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend, blockUser, userId, loadUserProfile, navigation]);

  const handleReportUser = useCallback(() => {
    Alert.alert(
      'Report User',
      'Why are you reporting this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Inappropriate Content', onPress: () => submitReport('inappropriate_content') },
        { text: 'Spam', onPress: () => submitReport('spam') },
        { text: 'Harassment', onPress: () => submitReport('harassment') },
        { text: 'Other', onPress: () => submitReport('other') },
      ]
    );
  }, []);

  const submitReport = useCallback(async (reason: string) => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      const { error } = await supabase
        .from('user_reports')
        .insert({
          reporter_id: currentUser.id,
          reported_id: userId,
          reason,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      Alert.alert('Thank you', 'Your report has been submitted and will be reviewed.');
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  }, [userId]);

  const handlePostPress = useCallback((post: any) => {
    setSelectedPost(post);
    setShowPostModal(true);
  }, []);

  const handleActivityPress = useCallback((activity: FriendActivity) => {
    if (activity.metadata?.post_id) {
      navigation.navigate('PostDetail' as never, { postId: activity.metadata.post_id } as never);
    }
  }, [navigation]);

  const handlePrivacyPress = useCallback(() => {
    setShowPrivacyModal(true);
  }, []);

  const formatFriendshipDuration = useCallback((friendSince: string) => {
    if (!friendSince) return 'Recently';
    
    const date = new Date(friendSince);
    const now = new Date();
    const diffInMonths = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    
    if (diffInMonths < 1) {
      const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''}`;
    } else if (diffInMonths < 12) {
      return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffInMonths / 12);
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
  }, []);

  const handleMutualFriendsPress = useCallback(() => {
    if (userProfile && userProfile.mutual_friends.length > 0) {
      // Navigate to mutual friends list
      navigation.navigate('MutualFriends' as never, {
        userId,
        userName: userProfile.user.display_name,
      } as never);
    }
  }, [userProfile, userId, navigation]);

  useEffect(() => {
    setLoading(true);
    loadUserProfile().finally(() => setLoading(false));
  }, [loadUserProfile]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Profile not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { user, friendship_status, mutual_friends_count, can_view_posts, recent_posts } = userProfile;

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
        
        <Text style={styles.headerTitle}>{user.display_name}</Text>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => {
            Alert.alert(
              'Options',
              'What would you like to do?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Report User', onPress: handleReportUser },
                { text: 'Block User', style: 'destructive', onPress: () => handleFriendAction('block_user') },
              ]
            );
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
        </TouchableOpacity>
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
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={styles.avatar}
                defaultSource={require('../../assets/default-avatar.png')}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>
                  {user.display_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            {user.is_private && (
              <View style={styles.privacyIndicator}>
                <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
              </View>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{user.display_name}</Text>
            <Text style={styles.username}>@{user.username}</Text>

            {user.bio && (
              <Text style={styles.bio}>{user.bio}</Text>
            )}

            {mutual_friends_count > 0 && (
              <TouchableOpacity 
                style={styles.mutualFriendsButton}
                onPress={handleMutualFriendsPress}
              >
                <Text style={styles.mutualFriendsText}>
                  {formatMutualFriendsCount(mutual_friends_count)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.post_count}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.friend_count}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.cuisine_count}</Text>
            <Text style={styles.statLabel}>Cuisines</Text>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <FriendButton
            userId={userId}
            friendshipStatus={friendship_status}
            onAddFriend={() => handleFriendAction('add_friend')}
            onAcceptRequest={() => handleFriendAction('accept_request')}
            onDeclineRequest={() => handleFriendAction('decline_request')}
            onRemoveFriend={() => handleFriendAction('remove_friend')}
            onBlockUser={() => handleFriendAction('block_user')}
            loading={actionLoading}
            size="large"
            style={styles.friendButton}
          />
        </View>

        {/* Friend Stats - Only show if friends */}
        {friendship_status === 'friends' && friendStats && (
          <View style={styles.friendStatsSection}>
            <Text style={styles.sectionTitle}>Friendship Stats</Text>
            <View style={styles.friendStatsGrid}>
              <View style={styles.friendStatItem}>
                <Text style={styles.friendStatNumber}>{formatFriendshipDuration(friendStats.friend_since)}</Text>
                <Text style={styles.friendStatLabel}>Friends</Text>
              </View>
              <View style={styles.friendStatItem}>
                <Text style={styles.friendStatNumber}>{friendStats.shared_restaurants}</Text>
                <Text style={styles.friendStatLabel}>Shared Places</Text>
              </View>
              <View style={styles.friendStatItem}>
                <Text style={styles.friendStatNumber}>{friendStats.common_cuisines}</Text>
                <Text style={styles.friendStatLabel}>Common Cuisines</Text>
              </View>
              <View style={styles.friendStatItem}>
                <Text style={styles.friendStatNumber}>{friendStats.interactions_count}</Text>
                <Text style={styles.friendStatLabel}>Interactions</Text>
              </View>
            </View>
          </View>
        )}

        {/* Content Tabs */}
        {can_view_posts && (
          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
                onPress={() => setActiveTab('posts')}
              >
                <Ionicons 
                  name="grid" 
                  size={20} 
                  color={activeTab === 'posts' ? colors.primary : colors.textSecondary} 
                />
                <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
                  Posts ({recent_posts?.length || 0})
                </Text>
              </TouchableOpacity>
              
              {friendship_status === 'friends' && (
                <>
                  <TouchableOpacity
                    style={[styles.tab, activeTab === 'activity' && styles.activeTab]}
                    onPress={() => setActiveTab('activity')}
                  >
                    <Ionicons 
                      name="pulse" 
                      size={20} 
                      color={activeTab === 'activity' ? colors.primary : colors.textSecondary} 
                    />
                    <Text style={[styles.tabText, activeTab === 'activity' && styles.activeTabText]}>
                      Activity
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.tab, activeTab === 'timeline' && styles.activeTab]}
                    onPress={() => setActiveTab('timeline')}
                  >
                    <Ionicons 
                      name="time" 
                      size={20} 
                      color={activeTab === 'timeline' ? colors.primary : colors.textSecondary} 
                    />
                    <Text style={[styles.tabText, activeTab === 'timeline' && styles.activeTabText]}>
                      Timeline
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        )}

        {/* Tab Content */}
        {can_view_posts && (
          <View style={styles.tabContent}>
            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <View style={styles.postsSection}>
                {recent_posts && recent_posts.length > 0 ? (
                  <View style={styles.postsGrid}>
                    {recent_posts.map((post: any) => (
                      <TouchableOpacity
                        key={post.id}
                        style={styles.postItem}
                        onPress={() => handlePostPress(post)}
                      >
                        {post.photo_urls && post.photo_urls.length > 0 && (
                          <Image
                            source={{ uri: post.photo_urls[0] }}
                            style={styles.postImage}
                            resizeMode="cover"
                          />
                        )}
                        <View style={styles.postOverlay}>
                          <Text style={styles.postRestaurant} numberOfLines={1}>
                            {post.restaurant_name}
                          </Text>
                          <Text style={styles.postCuisine} numberOfLines={1}>
                            {post.cuisine_type}
                          </Text>
                          {post.rating && (
                            <View style={styles.postRating}>
                              <Ionicons name="star" size={12} color={colors.accent} />
                              <Text style={styles.postRatingText}>{post.rating}</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyTabContent}>
                    <Ionicons name="camera" size={48} color={colors.textSecondary} />
                    <Text style={styles.emptyTabTitle}>No posts yet</Text>
                    <Text style={styles.emptyTabMessage}>
                      {user.display_name} hasn't shared any food experiences.
                    </Text>
                  </View>
                )}
              </View>
            )}
            
            {/* Activity Tab */}
            {activeTab === 'activity' && friendship_status === 'friends' && (
              <View style={styles.activitySection}>
                {friendActivities.length > 0 ? (
                  <FriendActivityFeed
                    activities={friendActivities}
                    onActivityPress={handleActivityPress}
                    onUserPress={handleUserPress}
                    showTimestamp
                    compact={false}
                  />
                ) : (
                  <View style={styles.emptyTabContent}>
                    <Ionicons name="pulse" size={48} color={colors.textSecondary} />
                    <Text style={styles.emptyTabTitle}>No recent activity</Text>
                    <Text style={styles.emptyTabMessage}>
                      {user.display_name} hasn't been active recently.
                    </Text>
                  </View>
                )}
              </View>
            )}
            
            {/* Timeline Tab */}
            {activeTab === 'timeline' && friendship_status === 'friends' && (
              <View style={styles.timelineSection}>
                {friendshipHistory.length > 0 ? (
                  <View>
                    {friendshipHistory.map((event, index) => (
                      <View key={event.id} style={styles.timelineItem}>
                        <View style={styles.timelineIconContainer}>
                          <Ionicons 
                            name={getTimelineIcon(event.event_type)} 
                            size={16} 
                            color={colors.primary} 
                          />
                        </View>
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineTitle}>
                            {getTimelineTitle(event.event_type, user.display_name)}
                          </Text>
                          <Text style={styles.timelineDate}>
                            {new Date(event.event_date).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyTabContent}>
                    <Ionicons name="time" size={48} color={colors.textSecondary} />
                    <Text style={styles.emptyTabTitle}>No timeline events</Text>
                    <Text style={styles.emptyTabMessage}>
                      Your friendship timeline will show shared experiences.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Private Account Message */}
        {!can_view_posts && user.is_private && friendship_status !== 'friends' && (
          <View style={styles.privateMessage}>
            <Ionicons name="lock-closed" size={48} color={colors.textSecondary} />
            <Text style={styles.privateTitle}>This account is private</Text>
            <Text style={styles.privateDescription}>
              Follow this account to see their posts and activity.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Post Detail Modal */}
      <Modal
        visible={showPostModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPostModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Post Details</Text>
            <TouchableOpacity onPress={() => setShowPostModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          {selectedPost && (
            <ScrollView style={styles.modalContent}>
              {selectedPost.photo_urls && selectedPost.photo_urls.length > 0 && (
                <Image
                  source={{ uri: selectedPost.photo_urls[0] }}
                  style={styles.modalPostImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.modalPostInfo}>
                <Text style={styles.modalPostTitle}>{selectedPost.restaurant_name}</Text>
                <Text style={styles.modalPostSubtitle}>{selectedPost.cuisine_type}</Text>
                {selectedPost.location && (
                  <Text style={styles.modalPostLocation}>
                    📍 {selectedPost.location}
                  </Text>
                )}
                {selectedPost.rating && (
                  <View style={styles.modalPostRating}>
                    <Ionicons name="star" size={16} color={colors.accent} />
                    <Text style={styles.modalPostRatingText}>{selectedPost.rating}/5</Text>
                  </View>
                )}
                {selectedPost.description && (
                  <Text style={styles.modalPostDescription}>{selectedPost.description}</Text>
                )}
                <View style={styles.modalPostStats}>
                  <View style={styles.modalPostStat}>
                    <Ionicons name="heart" size={16} color={colors.error} />
                    <Text style={styles.modalPostStatText}>{selectedPost.likes_count || 0}</Text>
                  </View>
                  <View style={styles.modalPostStat}>
                    <Ionicons name="chatbubble" size={16} color={colors.info} />
                    <Text style={styles.modalPostStatText}>{selectedPost.comments_count || 0}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Privacy Settings Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Privacy Settings</Text>
            <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.privacySection}>
              <Text style={styles.privacySectionTitle}>Profile Visibility</Text>
              <Text style={styles.privacySectionDescription}>
                Control who can see your profile information
              </Text>
              <View style={styles.privacyOption}>
                <Text style={styles.privacyOptionText}>Public Profile</Text>
                <TouchableOpacity style={styles.privacyToggle}>
                  <Ionicons name="toggle" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.privacyOption}>
                <Text style={styles.privacyOptionText}>Show Posts to Public</Text>
                <TouchableOpacity style={styles.privacyToggle}>
                  <Ionicons name="toggle-outline" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const { width: screenWidth } = Dimensions.get('window');

const getTimelineIcon = (eventType: string) => {
  switch (eventType) {
    case 'became_friends':
      return 'people';
    case 'interaction':
      return 'chatbubble';
    case 'shared_post':
      return 'share';
    case 'restaurant_visit':
      return 'restaurant';
    default:
      return 'time';
  }
};

const getTimelineTitle = (eventType: string, userName: string) => {
  switch (eventType) {
    case 'became_friends':
      return `You became friends with ${userName}`;
    case 'interaction':
      return `You interacted with ${userName}`;
    case 'shared_post':
      return `${userName} shared a post`;
    case 'restaurant_visit':
      return `${userName} visited a restaurant`;
    default:
      return `Event with ${userName}`;
  }
};

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

  headerTitle: {
    flex: 1,
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },

  menuButton: {
    padding: spacing(0.5),
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: spacing(4),
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    fontSize: fonts.base,
    color: colors.textSecondary,
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorText: {
    fontSize: fonts.base,
    color: colors.error,
  },

  profileHeader: {
    backgroundColor: colors.white,
    padding: spacing(2),
    alignItems: 'center',
  },

  avatarContainer: {
    position: 'relative',
    marginBottom: spacing(2),
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceVariant,
  },

  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  avatarInitial: {
    fontSize: 36,
    fontWeight: fonts.weights.bold,
    color: colors.white,
  },

  privacyIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },

  profileInfo: {
    alignItems: 'center',
  },

  displayName: {
    fontSize: fonts.xxl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    marginBottom: spacing(0.25),
    textAlign: 'center',
  },

  username: {
    fontSize: fonts.lg,
    color: colors.textSecondary,
    marginBottom: spacing(1),
  },

  bio: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
    marginBottom: spacing(1.5),
    paddingHorizontal: spacing(2),
  },

  mutualFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },

  mutualFriendsText: {
    fontSize: fonts.base,
    color: colors.primary,
    fontWeight: fonts.weights.medium,
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.white,
    paddingVertical: spacing(2),
    marginTop: spacing(1),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outline,
  },

  statItem: {
    alignItems: 'center',
  },

  statNumber: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    marginBottom: spacing(0.25),
  },

  statLabel: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
  },

  actionContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
  },

  friendButton: {
    width: '100%',
  },

  postsSection: {
    marginTop: spacing(2),
    backgroundColor: colors.white,
    padding: spacing(2),
  },

  sectionTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(1.5),
  },

  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing(0.5),
  },

  postItem: {
    width: '33.33%',
    aspectRatio: 1,
    paddingHorizontal: spacing(0.5),
    marginBottom: spacing(1),
  },

  postImage: {
    width: '100%',
    height: '100%',
    borderRadius: radii.sm,
  },

  postOverlay: {
    position: 'absolute',
    bottom: 0,
    left: spacing(0.5),
    right: spacing(0.5),
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderBottomLeftRadius: radii.sm,
    borderBottomRightRadius: radii.sm,
    padding: spacing(0.75),
  },

  postRestaurant: {
    color: colors.white,
    fontSize: fonts.xs,
    fontWeight: fonts.weights.semibold,
    marginBottom: spacing(0.25),
  },

  postCuisine: {
    color: colors.white,
    fontSize: fonts.xs,
    opacity: 0.8,
  },

  privateMessage: {
    alignItems: 'center',
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(2),
    backgroundColor: colors.white,
    marginTop: spacing(2),
  },

  privateTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginTop: spacing(2),
    marginBottom: spacing(1),
    textAlign: 'center',
  },

  privateDescription: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
  },

  // New styles for enhanced features
  friendStatsSection: {
    backgroundColor: colors.white,
    marginTop: spacing(1),
    padding: spacing(2),
  },

  friendStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing(1),
  },

  friendStatItem: {
    alignItems: 'center',
  },

  friendStatNumber: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.bold,
    color: colors.primary,
    marginBottom: spacing(0.25),
  },

  friendStatLabel: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  tabsContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
    paddingHorizontal: spacing(2),
  },

  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    marginRight: spacing(2),
    gap: spacing(0.5),
  },

  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },

  tabText: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    fontWeight: fonts.weights.medium,
  },

  activeTabText: {
    color: colors.primary,
  },

  tabContent: {
    backgroundColor: colors.white,
  },

  activitySection: {
    backgroundColor: colors.white,
  },

  timelineSection: {
    backgroundColor: colors.white,
    padding: spacing(2),
  },

  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing(2),
  },

  timelineIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(1.5),
  },

  timelineContent: {
    flex: 1,
  },

  timelineTitle: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.text,
    marginBottom: spacing(0.25),
  },

  timelineDate: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
  },

  emptyTabContent: {
    alignItems: 'center',
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(2),
  },

  emptyTabTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginTop: spacing(2),
    marginBottom: spacing(1),
    textAlign: 'center',
  },

  emptyTabMessage: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
  },

  postRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing(0.25),
    gap: spacing(0.25),
  },

  postRatingText: {
    color: colors.white,
    fontSize: fonts.xs,
    fontWeight: fonts.weights.medium,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  modalTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },

  modalContent: {
    flex: 1,
  },

  modalPostImage: {
    width: screenWidth,
    height: screenWidth,
    backgroundColor: colors.surfaceVariant,
  },

  modalPostInfo: {
    padding: spacing(2),
    backgroundColor: colors.white,
  },

  modalPostTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    marginBottom: spacing(0.5),
  },

  modalPostSubtitle: {
    fontSize: fonts.lg,
    color: colors.textSecondary,
    marginBottom: spacing(1),
  },

  modalPostLocation: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    marginBottom: spacing(1),
  },

  modalPostRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(1.5),
    gap: spacing(0.5),
  },

  modalPostRatingText: {
    fontSize: fonts.base,
    color: colors.accent,
    fontWeight: fonts.weights.medium,
  },

  modalPostDescription: {
    fontSize: fonts.base,
    color: colors.text,
    lineHeight: fonts.base * 1.4,
    marginBottom: spacing(2),
  },

  modalPostStats: {
    flexDirection: 'row',
    gap: spacing(2),
  },

  modalPostStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },

  modalPostStatText: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    fontWeight: fonts.weights.medium,
  },

  // Privacy modal styles
  privacySection: {
    padding: spacing(2),
    backgroundColor: colors.white,
  },

  privacySectionTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(0.5),
  },

  privacySectionDescription: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    marginBottom: spacing(2),
  },

  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(1.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  privacyOptionText: {
    fontSize: fonts.base,
    color: colors.text,
  },

  privacyToggle: {
    padding: spacing(0.5),
  },
});