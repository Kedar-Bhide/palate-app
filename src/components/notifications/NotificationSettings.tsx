import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationType, NotificationSettings as NotificationSettingsType } from '../../types/notifications';
import { performanceManager, getPerformanceRecommendations } from '../../lib/notificationPerformance';
import { SmartNotificationEngine, generatePersonalizationInsights } from '../../lib/smartNotifications';

interface NotificationSettingsProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

interface QuietHours {
  enabled: boolean;
  start: Date;
  end: Date;
}

interface NotificationTypeConfig {
  type: NotificationType;
  enabled: boolean;
  frequency: number; // max per day
  priority: 'low' | 'medium' | 'high';
  sound: boolean;
  vibration: boolean;
  showPreview: boolean;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  visible,
  onClose,
  userId,
}) => {
  const { settings, updateSettings } = useNotifications();
  
  // State management
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'types' | 'scheduling' | 'privacy' | 'performance'>('general');
  const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(null);
  const [insights, setInsights] = useState<any>(null);
  const [performanceRecommendations, setPerformanceRecommendations] = useState<string[]>([]);
  
  // Settings state
  const [generalSettings, setGeneralSettings] = useState({
    enabled: settings?.enabled ?? true,
    sound: settings?.sound ?? true,
    vibration: settings?.vibration ?? true,
    showPreviews: settings?.showPreviews ?? true,
    groupSimilar: settings?.groupSimilar ?? true,
    markReadOnView: settings?.markReadOnView ?? false,
  });

  const [quietHours, setQuietHours] = useState<QuietHours>({
    enabled: settings?.quietHours?.enabled ?? false,
    start: settings?.quietHours?.start ? new Date(settings.quietHours.start) : new Date(22, 0), // 10 PM
    end: settings?.quietHours?.end ? new Date(settings.quietHours.end) : new Date(8, 0), // 8 AM
  });

  const [typeConfigs, setTypeConfigs] = useState<NotificationTypeConfig[]>([
    {
      type: 'friend_request',
      enabled: true,
      frequency: 10,
      priority: 'high',
      sound: true,
      vibration: true,
      showPreview: true,
    },
    {
      type: 'friend_accepted',
      enabled: true,
      frequency: 10,
      priority: 'medium',
      sound: true,
      vibration: false,
      showPreview: true,
    },
    {
      type: 'friend_post',
      enabled: true,
      frequency: 20,
      priority: 'medium',
      sound: false,
      vibration: false,
      showPreview: true,
    },
    {
      type: 'post_like',
      enabled: true,
      frequency: 15,
      priority: 'low',
      sound: false,
      vibration: false,
      showPreview: false,
    },
    {
      type: 'post_comment',
      enabled: true,
      frequency: 15,
      priority: 'medium',
      sound: true,
      vibration: false,
      showPreview: true,
    },
    {
      type: 'achievement_unlocked',
      enabled: true,
      frequency: 5,
      priority: 'high',
      sound: true,
      vibration: true,
      showPreview: true,
    },
    {
      type: 'cuisine_milestone',
      enabled: true,
      frequency: 3,
      priority: 'high',
      sound: true,
      vibration: true,
      showPreview: true,
    },
    {
      type: 'weekly_progress',
      enabled: true,
      frequency: 1,
      priority: 'medium',
      sound: false,
      vibration: false,
      showPreview: true,
    },
    {
      type: 'new_cuisine_available',
      enabled: true,
      frequency: 2,
      priority: 'low',
      sound: false,
      vibration: false,
      showPreview: true,
    },
    {
      type: 'reminder',
      enabled: true,
      frequency: 5,
      priority: 'medium',
      sound: true,
      vibration: false,
      showPreview: true,
    },
    {
      type: 'system_announcement',
      enabled: true,
      frequency: 2,
      priority: 'low',
      sound: false,
      vibration: false,
      showPreview: true,
    },
  ]);

  const [privacySettings, setPrivacySettings] = useState({
    allowReadReceipts: true,
    shareActivityStatus: true,
    allowFriendNotifications: true,
    allowPublicNotifications: false,
    dataCollection: true,
    analyticsSharing: false,
  });

  // Load insights and recommendations on mount
  useEffect(() => {
    if (visible && userId) {
      loadInsights();
      loadPerformanceRecommendations();
    }
  }, [visible, userId]);

  const loadInsights = useCallback(async () => {
    try {
      const smartEngine = SmartNotificationEngine.getInstance();
      const userInsights = await generatePersonalizationInsights(userId);
      setInsights(userInsights);
    } catch (error) {
      console.error('Failed to load insights:', error);
    }
  }, [userId]);

  const loadPerformanceRecommendations = useCallback(() => {
    const recommendations = getPerformanceRecommendations();
    setPerformanceRecommendations(recommendations);
  }, []);

  // Save settings
  const saveSettings = useCallback(async () => {
    setLoading(true);
    try {
      const newSettings: NotificationSettingsType = {
        ...generalSettings,
        quietHours: {
          enabled: quietHours.enabled,
          start: quietHours.start.toISOString(),
          end: quietHours.end.toISOString(),
        },
        typeSettings: typeConfigs.reduce((acc, config) => {
          acc[config.type] = {
            enabled: config.enabled,
            frequency: config.frequency,
            priority: config.priority,
            sound: config.sound,
            vibration: config.vibration,
            showPreview: config.showPreview,
          };
          return acc;
        }, {} as any),
        privacy: privacySettings,
      };

      await updateSettings(newSettings);
      
      // Update performance manager config
      const performanceConfig = performanceManager.getConfig();
      performanceManager.updateConfig({
        ...performanceConfig,
        backgroundSyncInterval: quietHours.enabled ? 15 : 5, // Longer interval if quiet hours enabled
      });

      Alert.alert('Success', 'Notification settings saved successfully');
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [generalSettings, quietHours, typeConfigs, privacySettings, updateSettings, onClose]);

  // Update notification type config
  const updateTypeConfig = useCallback((type: NotificationType, updates: Partial<NotificationTypeConfig>) => {
    setTypeConfigs(prev => prev.map(config =>
      config.type === type ? { ...config, ...updates } : config
    ));
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all notification settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            // Reset all settings to defaults
            setGeneralSettings({
              enabled: true,
              sound: true,
              vibration: true,
              showPreviews: true,
              groupSimilar: true,
              markReadOnView: false,
            });
            
            setQuietHours({
              enabled: false,
              start: new Date(22, 0),
              end: new Date(8, 0),
            });
            
            // Reset type configs would go here
            
            setPrivacySettings({
              allowReadReceipts: true,
              shareActivityStatus: true,
              allowFriendNotifications: true,
              allowPublicNotifications: false,
              dataCollection: true,
              analyticsSharing: false,
            });
          },
        },
      ]
    );
  }, []);

  // Render time picker
  const renderTimePicker = useCallback(() => {
    if (!showTimePicker) return null;

    const currentTime = showTimePicker === 'start' ? quietHours.start : quietHours.end;

    return (
      <DateTimePicker
        value={currentTime}
        mode="time"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        onChange={(event, selectedTime) => {
          setShowTimePicker(null);
          if (selectedTime) {
            if (showTimePicker === 'start') {
              setQuietHours(prev => ({ ...prev, start: selectedTime }));
            } else {
              setQuietHours(prev => ({ ...prev, end: selectedTime }));
            }
          }
        }}
      />
    );
  }, [showTimePicker, quietHours]);

  // Format time for display
  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, []);

  // Get notification type display name
  const getTypeDisplayName = useCallback((type: NotificationType): string => {
    const names: Record<NotificationType, string> = {
      friend_request: 'Friend Requests',
      friend_accepted: 'Friend Accepted',
      friend_post: 'Friend Posts',
      post_like: 'Post Likes',
      post_comment: 'Post Comments',
      achievement_unlocked: 'Achievement Unlocked',
      cuisine_milestone: 'Cuisine Milestones',
      weekly_progress: 'Weekly Progress',
      new_cuisine_available: 'New Cuisines',
      reminder: 'Reminders',
      system_announcement: 'System Announcements',
    };
    return names[type] || type;
  }, []);

  // Render tab content
  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'general':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>General Settings</Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
              <Switch
                value={generalSettings.enabled}
                onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, enabled: value }))}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Sound</Text>
              <Switch
                value={generalSettings.sound}
                onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, sound: value }))}
                disabled={!generalSettings.enabled}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Vibration</Text>
              <Switch
                value={generalSettings.vibration}
                onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, vibration: value }))}
                disabled={!generalSettings.enabled}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Show Previews</Text>
              <Switch
                value={generalSettings.showPreviews}
                onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, showPreviews: value }))}
                disabled={!generalSettings.enabled}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Group Similar</Text>
              <Switch
                value={generalSettings.groupSimilar}
                onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, groupSimilar: value }))}
                disabled={!generalSettings.enabled}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Mark Read on View</Text>
              <Switch
                value={generalSettings.markReadOnView}
                onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, markReadOnView: value }))}
                disabled={!generalSettings.enabled}
              />
            </View>

            {insights && (
              <View style={styles.insightsContainer}>
                <Text style={styles.sectionTitle}>Personalized Insights</Text>
                <Text style={styles.insightText}>
                  Best engagement time: {insights.bestEngagementTime}
                </Text>
                <Text style={styles.insightText}>
                  Behavior pattern: {insights.behaviorPattern}
                </Text>
                {insights.recommendations.length > 0 && (
                  <View style={styles.recommendationsContainer}>
                    <Text style={styles.recommendationsTitle}>Recommendations:</Text>
                    {insights.recommendations.map((rec: string, index: number) => (
                      <Text key={index} style={styles.recommendationItem}>• {rec}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        );

      case 'types':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Notification Types</Text>
            
            {typeConfigs.map((config) => (
              <View key={config.type} style={styles.typeConfigContainer}>
                <View style={styles.typeHeader}>
                  <Text style={styles.typeTitle}>{getTypeDisplayName(config.type)}</Text>
                  <Switch
                    value={config.enabled}
                    onValueChange={(value) => updateTypeConfig(config.type, { enabled: value })}
                  />
                </View>
                
                {config.enabled && (
                  <View style={styles.typeSettings}>
                    <View style={styles.frequencyContainer}>
                      <Text style={styles.frequencyLabel}>Max per day: {config.frequency}</Text>
                      <Slider
                        style={styles.frequencySlider}
                        minimumValue={1}
                        maximumValue={50}
                        step={1}
                        value={config.frequency}
                        onValueChange={(value) => updateTypeConfig(config.type, { frequency: Math.round(value) })}
                        minimumTrackTintColor="#4A90E2"
                        maximumTrackTintColor="#E0E0E0"
                        thumbStyle={styles.sliderThumb}
                      />
                    </View>
                    
                    <View style={styles.typeOptionsRow}>
                      <View style={styles.typeOption}>
                        <Text style={styles.typeOptionLabel}>Sound</Text>
                        <Switch
                          value={config.sound}
                          onValueChange={(value) => updateTypeConfig(config.type, { sound: value })}
                        />
                      </View>
                      
                      <View style={styles.typeOption}>
                        <Text style={styles.typeOptionLabel}>Vibrate</Text>
                        <Switch
                          value={config.vibration}
                          onValueChange={(value) => updateTypeConfig(config.type, { vibration: value })}
                        />
                      </View>
                      
                      <View style={styles.typeOption}>
                        <Text style={styles.typeOptionLabel}>Preview</Text>
                        <Switch
                          value={config.showPreview}
                          onValueChange={(value) => updateTypeConfig(config.type, { showPreview: value })}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        );

      case 'scheduling':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Quiet Hours</Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Enable Quiet Hours</Text>
              <Switch
                value={quietHours.enabled}
                onValueChange={(value) => setQuietHours(prev => ({ ...prev, enabled: value }))}
              />
            </View>

            {quietHours.enabled && (
              <>
                <TouchableOpacity
                  style={styles.timePickerButton}
                  onPress={() => setShowTimePicker('start')}
                >
                  <Text style={styles.timePickerLabel}>Start Time</Text>
                  <View style={styles.timeDisplay}>
                    <Text style={styles.timeText}>{formatTime(quietHours.start)}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#999999" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.timePickerButton}
                  onPress={() => setShowTimePicker('end')}
                >
                  <Text style={styles.timePickerLabel}>End Time</Text>
                  <View style={styles.timeDisplay}>
                    <Text style={styles.timeText}>{formatTime(quietHours.end)}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#999999" />
                  </View>
                </TouchableOpacity>

                <Text style={styles.quietHoursNote}>
                  Notifications will be delayed during quiet hours unless marked as urgent.
                </Text>
              </>
            )}

            {renderTimePicker()}
          </View>
        );

      case 'privacy':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Privacy Settings</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Read Receipts</Text>
                <Text style={styles.settingDescription}>
                  Let others know when you've read their notifications
                </Text>
              </View>
              <Switch
                value={privacySettings.allowReadReceipts}
                onValueChange={(value) => setPrivacySettings(prev => ({ ...prev, allowReadReceipts: value }))}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Activity Status</Text>
                <Text style={styles.settingDescription}>
                  Share your activity status with friends
                </Text>
              </View>
              <Switch
                value={privacySettings.shareActivityStatus}
                onValueChange={(value) => setPrivacySettings(prev => ({ ...prev, shareActivityStatus: value }))}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Friend Notifications</Text>
                <Text style={styles.settingDescription}>
                  Allow friends to send you notifications
                </Text>
              </View>
              <Switch
                value={privacySettings.allowFriendNotifications}
                onValueChange={(value) => setPrivacySettings(prev => ({ ...prev, allowFriendNotifications: value }))}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Data Collection</Text>
                <Text style={styles.settingDescription}>
                  Allow collection of usage data to improve notifications
                </Text>
              </View>
              <Switch
                value={privacySettings.dataCollection}
                onValueChange={(value) => setPrivacySettings(prev => ({ ...prev, dataCollection: value }))}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Analytics Sharing</Text>
                <Text style={styles.settingDescription}>
                  Share anonymous usage analytics
                </Text>
              </View>
              <Switch
                value={privacySettings.analyticsSharing}
                onValueChange={(value) => setPrivacySettings(prev => ({ ...prev, analyticsSharing: value }))}
              />
            </View>
          </View>
        );

      case 'performance':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Performance Optimization</Text>
            
            {performanceRecommendations.length > 0 && (
              <View style={styles.recommendationsContainer}>
                <Text style={styles.recommendationsTitle}>Recommendations:</Text>
                {performanceRecommendations.map((rec, index) => (
                  <Text key={index} style={styles.recommendationItem}>• {rec}</Text>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => performanceManager.clearCache()}
            >
              <Ionicons name="refresh" size={20} color="#4A90E2" />
              <Text style={styles.actionButtonText}>Clear Cache</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => performanceManager.optimizeMemory()}
            >
              <Ionicons name="speedometer" size={20} color="#4A90E2" />
              <Text style={styles.actionButtonText}>Optimize Memory</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  }, [
    activeTab,
    generalSettings,
    quietHours,
    typeConfigs,
    privacySettings,
    insights,
    performanceRecommendations,
    showTimePicker,
    getTypeDisplayName,
    formatTime,
    updateTypeConfig,
    renderTimePicker,
  ]);

  const tabs = [
    { id: 'general', label: 'General', icon: 'settings-outline' },
    { id: 'types', label: 'Types', icon: 'list-outline' },
    { id: 'scheduling', label: 'Schedule', icon: 'time-outline' },
    { id: 'privacy', label: 'Privacy', icon: 'shield-outline' },
    { id: 'performance', label: 'Performance', icon: 'speedometer-outline' },
  ] as const;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.title}>Notification Settings</Text>
          <TouchableOpacity
            onPress={saveSettings}
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBar}
          contentContainerStyle={styles.tabBarContent}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeTab === tab.id && styles.activeTab,
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={activeTab === tab.id ? '#4A90E2' : '#666666'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab.id && styles.activeTabLabel,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderTabContent()}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetToDefaults}
          >
            <Ionicons name="refresh-outline" size={16} color="#E24A4A" />
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tabBarContent: {
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#F0F8FF',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
  },
  activeTabLabel: {
    color: '#4A90E2',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  typeConfigContainer: {
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  typeSettings: {
    marginTop: 8,
  },
  frequencyContainer: {
    marginBottom: 12,
  },
  frequencyLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  frequencySlider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#4A90E2',
  },
  typeOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeOption: {
    alignItems: 'center',
    gap: 4,
  },
  typeOptionLabel: {
    fontSize: 12,
    color: '#666666',
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
  },
  timePickerLabel: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '500',
  },
  quietHoursNote: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  insightsContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  insightText: {
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  recommendationsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  recommendationItem: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A90E2',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#E24A4A',
    fontWeight: '500',
  },
});