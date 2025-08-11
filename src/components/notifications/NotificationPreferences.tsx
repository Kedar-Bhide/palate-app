import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { NotificationSettings, NotificationType } from '../../types/notifications';
import { 
  createFriendRequestNotification, 
  createFriendPostNotification,
  createLikeNotification,
  createAchievementNotification 
} from '../../lib/notificationTypes';
import { sendPushNotification } from '../../lib/notifications';

interface NotificationPreferencesProps {
  settings: NotificationSettings;
  onSettingsChange: (settings: NotificationSettings) => void;
  onPreviewNotification: (type: NotificationType) => void;
  currentUserId?: string;
  pushToken?: string;
}

interface NotificationTypeConfig {
  key: keyof NotificationSettings;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  category: 'social' | 'progress' | 'system';
  previewable: boolean;
}

const NOTIFICATION_TYPES: NotificationTypeConfig[] = [
  {
    key: 'friendRequests',
    title: 'Friend Requests',
    description: 'New friend requests and acceptances',
    icon: 'person-add',
    color: '#4A90E2',
    category: 'social',
    previewable: true,
  },
  {
    key: 'friendPosts',
    title: 'Friend Posts',
    description: 'When friends share new meals and experiences',
    icon: 'restaurant',
    color: '#7ED321',
    category: 'social',
    previewable: true,
  },
  {
    key: 'likesAndComments',
    title: 'Likes & Comments',
    description: 'Interactions on your posts',
    icon: 'heart',
    color: '#E24A4A',
    category: 'social',
    previewable: true,
  },
  {
    key: 'newCuisines',
    title: 'New Cuisines',
    description: 'When friends discover new types of food',
    icon: 'globe',
    color: '#F5A623',
    category: 'progress',
    previewable: false,
  },
  {
    key: 'weeklyProgress',
    title: 'Weekly Progress',
    description: 'Your weekly food journey summary',
    icon: 'stats-chart',
    color: '#9013FE',
    category: 'progress',
    previewable: false,
  },
];

const DELIVERY_SETTINGS = [
  {
    key: 'soundEnabled' as keyof NotificationSettings,
    title: 'Sound',
    description: 'Play sound for notifications',
    icon: 'volume-high' as keyof typeof Ionicons.glyphMap,
  },
  {
    key: 'vibrationEnabled' as keyof NotificationSettings,
    title: 'Vibration',
    description: 'Vibrate for notifications',
    icon: 'phone-portrait' as keyof typeof Ionicons.glyphMap,
  },
];

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  settings,
  onSettingsChange,
  onPreviewNotification,
  currentUserId,
  pushToken,
}) => {
  const [showQuietStartPicker, setShowQuietStartPicker] = useState(false);
  const [showQuietEndPicker, setShowQuietEndPicker] = useState(false);
  const [previewLoading, setPreviewLoading] = useState<NotificationType | null>(null);

  // Parse time string to Date object
  const parseTime = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // Format Date to time string
  const formatTime = (date: Date): string => {
    return date.toTimeString().slice(0, 5);
  };

  // Toggle notification type
  const toggleNotificationType = useCallback((key: keyof NotificationSettings) => {
    onSettingsChange({
      ...settings,
      [key]: !settings[key],
    });
  }, [settings, onSettingsChange]);

  // Update quiet hours
  const updateQuietHours = useCallback((type: 'start' | 'end', time: Date) => {
    const timeString = formatTime(time);
    onSettingsChange({
      ...settings,
      [type === 'start' ? 'quietHoursStart' : 'quietHoursEnd']: timeString,
    });
  }, [settings, onSettingsChange]);

  // Preview notification
  const handlePreviewNotification = useCallback(async (type: NotificationType) => {
    if (!currentUserId || !pushToken || previewLoading) return;

    setPreviewLoading(type);

    try {
      let notification;
      const mockUser = {
        id: currentUserId,
        email: 'preview@example.com',
        profile: {
          full_name: 'Preview User',
          username: 'preview_user',
          avatar_url: null,
        },
      };

      switch (type) {
        case 'friend_request':
          notification = await createFriendRequestNotification(
            { ...mockUser, id: 'friend_id', profile: { ...mockUser.profile, full_name: 'John Doe' } },
            mockUser
          );
          break;
        case 'friend_post':
          const mockPost = {
            id: 'preview_post',
            user_id: 'friend_id',
            cuisine_name: 'Italian',
            restaurant_name: 'Mario\'s Pizzeria',
            created_at: new Date().toISOString(),
            user: { ...mockUser, id: 'friend_id', profile: { ...mockUser.profile, full_name: 'Sarah' } },
          };
          const notifications = await createFriendPostNotification(mockPost, [mockUser]);
          notification = notifications[0];
          break;
        case 'post_like':
          const mockLikePost = {
            id: 'preview_post',
            user_id: currentUserId,
            cuisine_name: 'Thai',
            restaurant_name: 'Spice Garden',
            created_at: new Date().toISOString(),
            user: mockUser,
          };
          notification = await createLikeNotification(
            mockLikePost,
            { ...mockUser, id: 'liker_id', profile: { ...mockUser.profile, full_name: 'Mike' } },
            mockUser
          );
          break;
        case 'achievement_unlocked':
          const mockAchievement = {
            id: 'preview_achievement',
            name: 'Italian Explorer',
            description: 'You\'ve tried 5 different Italian dishes!',
            icon: '🍝',
            category: 'cuisine',
          };
          notification = await createAchievementNotification(mockAchievement, mockUser);
          break;
        default:
          throw new Error(`Preview not supported for ${type}`);
      }

      // Modify notification to indicate it's a preview
      notification.title = `[PREVIEW] ${notification.title}`;
      notification.data = {
        ...notification.data,
        preview: true,
      };

      const success = await sendPushNotification(notification.to, notification);
      
      if (success) {
        Alert.alert('Preview Sent', 'Check your notifications to see the preview!');
      } else {
        Alert.alert('Preview Failed', 'Unable to send preview notification');
      }
    } catch (error) {
      console.error('Preview notification failed:', error);
      Alert.alert('Preview Error', 'Failed to generate preview notification');
    } finally {
      setPreviewLoading(null);
    }
  }, [currentUserId, pushToken, previewLoading]);

  // Group notifications by category
  const groupedNotifications = NOTIFICATION_TYPES.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, NotificationTypeConfig[]>);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Notification Preferences</Text>
        <Text style={styles.subtitle}>
          Customize when and how you receive notifications
        </Text>
      </View>

      {/* Social Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Social Notifications</Text>
        <Text style={styles.sectionDescription}>
          Stay connected with your food community
        </Text>
        
        {groupedNotifications.social?.map((type) => (
          <View key={type.key} style={styles.notificationItem}>
            <View style={styles.notificationContent}>
              <View style={[styles.iconContainer, { backgroundColor: `${type.color}20` }]}>
                <Ionicons name={type.icon} size={20} color={type.color} />
              </View>
              
              <View style={styles.textContainer}>
                <Text style={styles.notificationTitle}>{type.title}</Text>
                <Text style={styles.notificationDescription}>{type.description}</Text>
              </View>
            </View>
            
            <View style={styles.controls}>
              {type.previewable && (
                <TouchableOpacity
                  style={styles.previewButton}
                  onPress={() => handlePreviewNotification(type.key as NotificationType)}
                  disabled={previewLoading !== null}
                >
                  {previewLoading === type.key ? (
                    <Text style={styles.previewButtonText}>...</Text>
                  ) : (
                    <Ionicons name="eye" size={16} color="#666666" />
                  )}
                </TouchableOpacity>
              )}
              
              <Switch
                value={settings[type.key] as boolean}
                onValueChange={() => toggleNotificationType(type.key)}
                trackColor={{ false: '#E0E0E0', true: `${type.color}40` }}
                thumbColor={settings[type.key] ? type.color : '#FFFFFF'}
                ios_backgroundColor="#E0E0E0"
              />
            </View>
          </View>
        ))}
      </View>

      {/* Progress Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress & Achievements</Text>
        <Text style={styles.sectionDescription}>
          Celebrate your culinary journey milestones
        </Text>
        
        {groupedNotifications.progress?.map((type) => (
          <View key={type.key} style={styles.notificationItem}>
            <View style={styles.notificationContent}>
              <View style={[styles.iconContainer, { backgroundColor: `${type.color}20` }]}>
                <Ionicons name={type.icon} size={20} color={type.color} />
              </View>
              
              <View style={styles.textContainer}>
                <Text style={styles.notificationTitle}>{type.title}</Text>
                <Text style={styles.notificationDescription}>{type.description}</Text>
              </View>
            </View>
            
            <Switch
              value={settings[type.key] as boolean}
              onValueChange={() => toggleNotificationType(type.key)}
              trackColor={{ false: '#E0E0E0', true: `${type.color}40` }}
              thumbColor={settings[type.key] ? type.color : '#FFFFFF'}
              ios_backgroundColor="#E0E0E0"
            />
          </View>
        ))}
      </View>

      {/* Delivery Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Settings</Text>
        <Text style={styles.sectionDescription}>
          How notifications are presented
        </Text>
        
        {DELIVERY_SETTINGS.map((setting) => (
          <View key={setting.key} style={styles.notificationItem}>
            <View style={styles.notificationContent}>
              <View style={[styles.iconContainer, { backgroundColor: '#66666620' }]}>
                <Ionicons name={setting.icon} size={20} color="#666666" />
              </View>
              
              <View style={styles.textContainer}>
                <Text style={styles.notificationTitle}>{setting.title}</Text>
                <Text style={styles.notificationDescription}>{setting.description}</Text>
              </View>
            </View>
            
            <Switch
              value={settings[setting.key] as boolean}
              onValueChange={() => toggleNotificationType(setting.key)}
              trackColor={{ false: '#E0E0E0', true: '#4A90E240' }}
              thumbColor={settings[setting.key] ? '#4A90E2' : '#FFFFFF'}
              ios_backgroundColor="#E0E0E0"
            />
          </View>
        ))}
      </View>

      {/* Quiet Hours */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quiet Hours</Text>
        <Text style={styles.sectionDescription}>
          Set times when you don't want to receive notifications
        </Text>
        
        <View style={styles.quietHoursContainer}>
          <TouchableOpacity
            style={styles.timePickerButton}
            onPress={() => setShowQuietStartPicker(true)}
          >
            <Ionicons name="moon" size={20} color="#666666" />
            <View style={styles.timePickerContent}>
              <Text style={styles.timePickerLabel}>Start</Text>
              <Text style={styles.timePickerValue}>
                {settings.quietHoursStart || '22:00'}
              </Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.timeSeparator}>
            <Text style={styles.timeSeparatorText}>to</Text>
          </View>
          
          <TouchableOpacity
            style={styles.timePickerButton}
            onPress={() => setShowQuietEndPicker(true)}
          >
            <Ionicons name="sunny" size={20} color="#666666" />
            <View style={styles.timePickerContent}>
              <Text style={styles.timePickerLabel}>End</Text>
              <Text style={styles.timePickerValue}>
                {settings.quietHoursEnd || '08:00'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tips */}
      <View style={styles.section}>
        <View style={styles.tipContainer}>
          <Ionicons name="bulb" size={20} color="#F5A623" />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Pro Tips</Text>
            <Text style={styles.tipText}>
              • Use preview to test how notifications look{'\n'}
              • Quiet hours respect your local timezone{'\n'}
              • Friend posts are batched to reduce interruptions{'\n'}
              • Achievement notifications are never silenced
            </Text>
          </View>
        </View>
      </View>

      {/* Time Pickers */}
      {showQuietStartPicker && (
        <DateTimePicker
          value={parseTime(settings.quietHoursStart || '22:00')}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowQuietStartPicker(false);
            if (selectedDate) {
              updateQuietHours('start', selectedDate);
            }
          }}
        />
      )}

      {showQuietEndPicker && (
        <DateTimePicker
          value={parseTime(settings.quietHoursEnd || '08:00')}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowQuietEndPicker(false);
            if (selectedDate) {
              updateQuietHours('end', selectedDate);
            }
          }}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 18,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewButton: {
    padding: 4,
  },
  previewButtonText: {
    fontSize: 12,
    color: '#666666',
  },
  quietHoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
  },
  timePickerContent: {
    marginLeft: 12,
    flex: 1,
  },
  timePickerLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  timePickerValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  timeSeparator: {
    paddingHorizontal: 16,
  },
  timeSeparatorText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  tipContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5A62310',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F5A623',
  },
  tipContent: {
    marginLeft: 12,
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
});