import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NotificationPermissionStatus } from '../types/notifications';
import { requestNotificationPermissions } from '../lib/notifications';

interface UseNotificationPermissionsReturn {
  permissionStatus: NotificationPermissionStatus;
  canAskAgain: boolean;
  isRequesting: boolean;
  checkPermissions: () => Promise<NotificationPermissionStatus>;
  requestPermissions: () => Promise<boolean>;
  openSettings: () => void;
  handlePermissionChange: (status: NotificationPermissionStatus) => void;
}

export const useNotificationPermissions = (): UseNotificationPermissionsReturn => {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>('undetermined');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  const checkPermissions = useCallback(async (): Promise<NotificationPermissionStatus> => {
    try {
      const { status, canAskAgain: canAsk } = await Notifications.getPermissionsAsync();
      
      let mappedStatus: NotificationPermissionStatus;
      switch (status) {
        case 'granted':
          mappedStatus = 'granted';
          break;
        case 'denied':
          mappedStatus = 'denied';
          break;
        default:
          mappedStatus = 'undetermined';
      }

      setPermissionStatus(mappedStatus);
      setCanAskAgain(canAsk);
      
      return mappedStatus;
    } catch (error) {
      console.error('Failed to check notification permissions:', error);
      setPermissionStatus('undetermined');
      return 'undetermined';
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (isRequesting) {
      return false;
    }

    setIsRequesting(true);

    try {
      // Check current status first
      const currentStatus = await checkPermissions();
      
      if (currentStatus === 'granted') {
        setIsRequesting(false);
        return true;
      }

      if (currentStatus === 'denied' && !canAskAgain) {
        // Permission was previously denied and we can't ask again
        showSettingsPrompt();
        setIsRequesting(false);
        return false;
      }

      // Request permissions
      const granted = await requestNotificationPermissions();
      
      // Update status after request
      await checkPermissions();
      
      setIsRequesting(false);
      return granted;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      setIsRequesting(false);
      return false;
    }
  }, [isRequesting, canAskAgain, checkPermissions]);

  const openSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }, []);

  const showSettingsPrompt = useCallback(() => {
    Alert.alert(
      'Enable Notifications',
      'Notifications are disabled. To receive updates about your friends and progress, please enable notifications in Settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: openSettings,
        },
      ]
    );
  }, [openSettings]);

  const handlePermissionChange = useCallback((status: NotificationPermissionStatus) => {
    setPermissionStatus(status);
    
    switch (status) {
      case 'granted':
        console.log('Notification permissions granted');
        break;
      case 'denied':
        console.log('Notification permissions denied');
        setCanAskAgain(false);
        break;
      case 'undetermined':
        console.log('Notification permissions undetermined');
        setCanAskAgain(true);
        break;
    }
  }, []);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Listen for permission changes (when user returns from settings)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      // User interacted with a notification, check permissions again
      checkPermissions();
    });

    return () => subscription.remove();
  }, [checkPermissions]);

  // Handle app state changes to check permissions when returning from settings
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // App became active, check permissions in case user changed them in settings
        checkPermissions();
      }
    };

    // Note: In a real app, you'd use AppState from react-native
    // For now, we'll just check permissions periodically
    const interval = setInterval(checkPermissions, 30000); // Check every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [checkPermissions]);

  return {
    permissionStatus,
    canAskAgain,
    isRequesting,
    checkPermissions,
    requestPermissions,
    openSettings,
    handlePermissionChange,
  };
};

// Helper hook for permission status checks
export const useNotificationPermissionStatus = () => {
  const { permissionStatus } = useNotificationPermissions();
  
  return {
    hasPermission: permissionStatus === 'granted',
    isPermissionDenied: permissionStatus === 'denied',
    isPermissionUndetermined: permissionStatus === 'undetermined',
    permissionStatus,
  };
};

// Helper hook for permission prompts
export const useNotificationPrompt = () => {
  const { requestPermissions, permissionStatus, canAskAgain, openSettings } = useNotificationPermissions();

  const promptForPermissions = useCallback(async (): Promise<boolean> => {
    if (permissionStatus === 'granted') {
      return true;
    }

    if (permissionStatus === 'denied' && !canAskAgain) {
      Alert.alert(
        'Notifications Disabled',
        'To receive notifications about your friends and progress, please enable notifications in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openSettings },
        ]
      );
      return false;
    }

    return await requestPermissions();
  }, [permissionStatus, canAskAgain, requestPermissions, openSettings]);

  return {
    promptForPermissions,
    hasPermission: permissionStatus === 'granted',
    canPrompt: permissionStatus === 'undetermined' || (permissionStatus === 'denied' && canAskAgain),
  };
};