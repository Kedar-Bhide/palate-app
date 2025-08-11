import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

interface NotificationPermissionModalProps {
  visible: boolean;
  onAllow: () => void;
  onDeny: () => void;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  visible,
  onAllow,
  onDeny,
  onClose,
}) => {
  const notificationBenefits = [
    {
      icon: 'people' as const,
      title: 'Friend Updates',
      description: 'Get notified when friends post new food discoveries or send friend requests',
      color: '#4A90E2',
    },
    {
      icon: 'heart' as const,
      title: 'Social Interactions',
      description: 'Never miss likes, comments, or reactions on your food posts',
      color: '#E24A4A',
    },
    {
      icon: 'trophy' as const,
      title: 'Achievements',
      description: 'Celebrate milestones and unlock new cuisine achievements',
      color: '#F5A623',
    },
    {
      icon: 'restaurant' as const,
      title: 'New Cuisines',
      description: 'Discover when new cuisines become available to explore',
      color: '#7ED321',
    },
    {
      icon: 'stats-chart' as const,
      title: 'Weekly Progress',
      description: 'Track your culinary journey with weekly progress updates',
      color: '#9013FE',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} style={styles.backdrop}>
        <View style={styles.modalContainer}>
          <ScrollView 
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.modal}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Ionicons name="notifications" size={40} color="#4A90E2" />
                </View>
                
                <Text style={styles.title}>Stay Connected</Text>
                <Text style={styles.subtitle}>
                  Enable notifications to enhance your Palate experience
                </Text>
              </View>

              {/* Benefits List */}
              <View style={styles.benefitsContainer}>
                {notificationBenefits.map((benefit, index) => (
                  <View key={index} style={styles.benefitItem}>
                    <View style={[styles.benefitIcon, { backgroundColor: `${benefit.color}20` }]}>
                      <Ionicons 
                        name={benefit.icon} 
                        size={20} 
                        color={benefit.color} 
                      />
                    </View>
                    
                    <View style={styles.benefitContent}>
                      <Text style={styles.benefitTitle}>{benefit.title}</Text>
                      <Text style={styles.benefitDescription}>
                        {benefit.description}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Visual Example */}
              <View style={styles.exampleContainer}>
                <Text style={styles.exampleTitle}>Example Notifications</Text>
                
                <View style={styles.notificationExample}>
                  <View style={styles.notificationIcon}>
                    <Ionicons name="person-add" size={16} color="#4A90E2" />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationText}>
                      <Text style={styles.notificationBold}>Sarah</Text> sent you a friend request
                    </Text>
                    <Text style={styles.notificationTime}>2 minutes ago</Text>
                  </View>
                </View>

                <View style={styles.notificationExample}>
                  <View style={[styles.notificationIcon, { backgroundColor: '#E24A4A20' }]}>
                    <Ionicons name="heart" size={16} color="#E24A4A" />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationText}>
                      <Text style={styles.notificationBold}>Mike</Text> liked your Thai cuisine post
                    </Text>
                    <Text style={styles.notificationTime}>5 minutes ago</Text>
                  </View>
                </View>

                <View style={styles.notificationExample}>
                  <View style={[styles.notificationIcon, { backgroundColor: '#F5A62320' }]}>
                    <Ionicons name="trophy" size={16} color="#F5A623" />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationText}>
                      Congratulations! You've unlocked the <Text style={styles.notificationBold}>Italian Explorer</Text> achievement
                    </Text>
                    <Text style={styles.notificationTime}>1 hour ago</Text>
                  </View>
                </View>
              </View>

              {/* Privacy Note */}
              <View style={styles.privacyNote}>
                <Ionicons name="shield-checkmark" size={16} color="#7ED321" />
                <Text style={styles.privacyText}>
                  Your privacy is protected. You can customize notification preferences anytime.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.allowButton}
                  onPress={onAllow}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.allowButtonText}>Enable Notifications</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.denyButton}
                  onPress={onDeny}
                  activeOpacity={0.8}
                >
                  <Text style={styles.denyButtonText}>Maybe Later</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: height * 0.85,
  },
  scrollContainer: {
    maxHeight: height * 0.85,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4A90E220',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  benefitsContainer: {
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  exampleContainer: {
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  notificationExample: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  notificationIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4A90E220',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 18,
  },
  notificationBold: {
    fontWeight: '600',
  },
  notificationTime: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7ED32110',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  privacyText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  buttonContainer: {
    gap: 12,
  },
  allowButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#4A90E2',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  allowButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  denyButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  denyButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '500',
  },
});