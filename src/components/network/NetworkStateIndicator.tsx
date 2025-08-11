import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useNetworkCache } from '../../hooks/useNetworkCache';
import { useOfflineStorage } from '../../hooks/useOfflineStorage';

export interface NetworkStateIndicatorProps {
  position?: 'top' | 'bottom';
  showWhenOnline?: boolean;
  autoHideDelay?: number;
  onOfflineActionsTap?: () => void;
  compact?: boolean;
}

interface NetworkIndicatorState {
  visible: boolean;
  message: string;
  type: 'online' | 'offline' | 'poor' | 'syncing';
  actions?: number;
}

const NetworkStateIndicator: React.FC<NetworkStateIndicatorProps> = ({
  position = 'top',
  showWhenOnline = false,
  autoHideDelay = 3000,
  onOfflineActionsTap,
  compact = false,
}) => {
  const [indicatorState, setIndicatorState] = useState<NetworkIndicatorState>({
    visible: false,
    message: '',
    type: 'online',
  });
  
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(position === 'top' ? -100 : 100))[0];

  const {
    isOnline,
    connectionType,
    getNetworkQuality,
    syncOfflineActions,
    pendingActions,
  } = useNetworkCache();

  const {
    syncStatus,
    queuedActions,
    syncWhenOnline,
  } = useOfflineStorage();

  const totalPendingActions = pendingActions.length + queuedActions.length;

  // Determine network status and message
  const getNetworkStatus = useCallback(() => {
    if (!isOnline) {
      return {
        type: 'offline' as const,
        message: totalPendingActions > 0 
          ? `Offline • ${totalPendingActions} actions queued`
          : 'Offline • Changes will sync when connected',
        actions: totalPendingActions,
      };
    }

    if (syncStatus.syncInProgress) {
      return {
        type: 'syncing' as const,
        message: 'Syncing changes...',
        actions: totalPendingActions,
      };
    }

    const networkQuality = getNetworkQuality();
    
    if (networkQuality === 'poor') {
      return {
        type: 'poor' as const,
        message: `Slow connection • ${connectionType || 'Unknown'}`,
        actions: totalPendingActions,
      };
    }

    if (showWhenOnline || totalPendingActions > 0) {
      return {
        type: 'online' as const,
        message: totalPendingActions > 0
          ? `Connected • ${totalPendingActions} actions synced`
          : `Connected • ${networkQuality} connection`,
        actions: totalPendingActions,
      };
    }

    return null;
  }, [
    isOnline, 
    connectionType, 
    getNetworkQuality, 
    syncStatus.syncInProgress, 
    totalPendingActions, 
    showWhenOnline
  ]);

  // Update indicator state based on network conditions
  useEffect(() => {
    const networkStatus = getNetworkStatus();
    
    if (networkStatus) {
      setIndicatorState({
        visible: true,
        message: networkStatus.message,
        type: networkStatus.type,
        actions: networkStatus.actions,
      });

      // Show indicator
      showIndicator();

      // Auto-hide for certain types
      if (networkStatus.type === 'online' && totalPendingActions === 0 && autoHideDelay > 0) {
        const hideTimer = setTimeout(() => {
          hideIndicator();
        }, autoHideDelay);

        return () => clearTimeout(hideTimer);
      }
    } else {
      hideIndicator();
    }
  }, [
    isOnline, 
    connectionType, 
    syncStatus.syncInProgress, 
    totalPendingActions, 
    showWhenOnline, 
    autoHideDelay,
    getNetworkStatus
  ]);

  const showIndicator = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 15,
        stiffness: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const hideIndicator = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: position === 'top' ? -100 : 100,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIndicatorState(prev => ({ ...prev, visible: false }));
    });
  }, [fadeAnim, slideAnim, position]);

  const handleIndicatorPress = useCallback(() => {
    if (indicatorState.type === 'offline' && totalPendingActions > 0 && onOfflineActionsTap) {
      onOfflineActionsTap();
    } else if (indicatorState.type === 'syncing') {
      // Maybe show sync progress details
    }
  }, [indicatorState.type, totalPendingActions, onOfflineActionsTap]);

  const getIndicatorColor = useCallback(() => {
    switch (indicatorState.type) {
      case 'offline':
        return theme.colors.warning;
      case 'poor':
        return theme.colors.warning;
      case 'syncing':
        return theme.colors.info;
      case 'online':
      default:
        return theme.colors.success;
    }
  }, [indicatorState.type]);

  const getIndicatorIcon = useCallback(() => {
    switch (indicatorState.type) {
      case 'offline':
        return 'wifi-off';
      case 'poor':
        return 'signal-wifi-1-bar';
      case 'syncing':
        return 'sync';
      case 'online':
      default:
        return 'wifi';
    }
  }, [indicatorState.type]);

  if (!indicatorState.visible) {
    return null;
  }

  const indicatorColor = getIndicatorColor();
  const iconName = getIndicatorIcon();
  const isPressable = indicatorState.type === 'offline' && totalPendingActions > 0 && onOfflineActionsTap;

  const indicatorContent = (
    <View style={[
      styles.indicator,
      { 
        backgroundColor: indicatorColor,
        [position]: 0,
      },
      compact && styles.compactIndicator,
    ]}>
      <View style={styles.content}>
        {indicatorState.type === 'syncing' ? (
          <ActivityIndicator 
            size="small" 
            color={theme.colors.white} 
            style={styles.icon}
          />
        ) : (
          <MaterialIcons
            name={iconName as any}
            size={compact ? 16 : 18}
            color={theme.colors.white}
            style={styles.icon}
          />
        )}
        
        <Text style={[
          styles.message,
          compact && styles.compactMessage,
        ]}>
          {indicatorState.message}
        </Text>

        {totalPendingActions > 0 && !compact && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {totalPendingActions}
            </Text>
          </View>
        )}

        {isPressable && (
          <MaterialIcons
            name="chevron-right"
            size={16}
            color={theme.colors.white}
            style={styles.chevron}
          />
        )}
      </View>
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: slideAnim,
            },
          ],
        },
        position === 'bottom' && styles.bottomContainer,
      ]}
      pointerEvents="box-none"
    >
      {isPressable ? (
        <TouchableOpacity
          onPress={handleIndicatorPress}
          activeOpacity={0.8}
          style={styles.touchable}
        >
          {indicatorContent}
        </TouchableOpacity>
      ) : (
        indicatorContent
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: theme.spacing.md,
  },
  bottomContainer: {
    bottom: 0,
  },
  touchable: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  indicator: {
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    shadowColor: theme.colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  compactIndicator: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: theme.spacing.xs,
  },
  message: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.white,
    textAlign: 'center',
  },
  compactMessage: {
    fontSize: theme.typography.fontSize.xs,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    marginLeft: theme.spacing.xs,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.white,
  },
  chevron: {
    marginLeft: theme.spacing.xs,
  },
});

NetworkStateIndicator.displayName = 'NetworkStateIndicator';

export default NetworkStateIndicator;