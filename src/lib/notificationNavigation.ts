import { NavigationProp } from '@react-navigation/native';
import { Linking } from 'react-native';
import { NotificationEvent, NotificationType } from '../types/notifications';
import { TabParamList } from '../navigation/types';

export interface NotificationNavigationData {
  screen?: keyof TabParamList | string;
  params?: Record<string, any>;
  url?: string;
  action?: 'navigate' | 'modal' | 'external';
}

export interface DeepLinkConfig {
  scheme: string;
  prefix: string;
  paths: Record<string, string>;
}

// Default deep link configuration
const DEFAULT_DEEP_LINK_CONFIG: DeepLinkConfig = {
  scheme: 'palate',
  prefix: 'palate://',
  paths: {
    'notifications': '/notifications',
    'profile': '/profile/:userId',
    'post': '/post/:postId',
    'friends': '/friends',
    'discover': '/discover',
    'achievements': '/achievements',
    'home': '/home',
  },
};

export class NotificationNavigationManager {
  private static instance: NotificationNavigationManager;
  private navigation: NavigationProp<any> | null = null;
  private deepLinkConfig: DeepLinkConfig;
  private navigationQueue: NotificationNavigationData[] = [];

  private constructor(config?: Partial<DeepLinkConfig>) {
    this.deepLinkConfig = { ...DEFAULT_DEEP_LINK_CONFIG, ...config };
    this.setupDeepLinking();
  }

  static getInstance(config?: Partial<DeepLinkConfig>): NotificationNavigationManager {
    if (!NotificationNavigationManager.instance) {
      NotificationNavigationManager.instance = new NotificationNavigationManager(config);
    }
    return NotificationNavigationManager.instance;
  }

  /**
   * Set the navigation reference for routing
   */
  setNavigation(navigation: NavigationProp<any>): void {
    this.navigation = navigation;
    
    // Process any queued navigation requests
    if (this.navigationQueue.length > 0) {
      console.log('Processing queued navigation requests:', this.navigationQueue.length);
      this.navigationQueue.forEach(navData => {
        this.executeNavigation(navData);
      });
      this.navigationQueue = [];
    }
  }

  /**
   * Setup deep linking handlers
   */
  private setupDeepLinking(): void {
    // Listen for incoming links when app is running
    Linking.addEventListener('url', this.handleDeepLink);

    // Handle initial URL when app is opened from a link
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('App opened with initial URL:', url);
        this.handleDeepLink({ url });
      }
    }).catch(error => {
      console.error('Error getting initial URL:', error);
    });
  }

  /**
   * Handle incoming deep links
   */
  private handleDeepLink = ({ url }: { url: string }): void => {
    console.log('Handling deep link:', url);

    try {
      const parsedUrl = new URL(url);
      const path = parsedUrl.pathname;
      const params = Object.fromEntries(parsedUrl.searchParams.entries());

      // Match path to navigation configuration
      const matchedRoute = this.matchPathToRoute(path);
      if (matchedRoute) {
        const navData: NotificationNavigationData = {
          screen: matchedRoute.screen,
          params: { ...matchedRoute.params, ...params },
          action: 'navigate',
        };

        this.executeNavigation(navData);
      } else {
        console.warn('No matching route found for path:', path);
      }
    } catch (error) {
      console.error('Error parsing deep link URL:', error);
    }
  };

  /**
   * Match URL path to navigation route
   */
  private matchPathToRoute(path: string): { screen: string; params: Record<string, any> } | null {
    for (const [routeName, routePath] of Object.entries(this.deepLinkConfig.paths)) {
      const pathRegex = routePath.replace(/:(\w+)/g, '(?<$1>[^/]+)');
      const match = path.match(new RegExp(`^${pathRegex}$`));
      
      if (match) {
        return {
          screen: routeName,
          params: match.groups || {},
        };
      }
    }
    return null;
  }

  /**
   * Navigate based on notification data
   */
  async navigateFromNotification(notification: NotificationEvent): Promise<boolean> {
    try {
      const navData = this.getNavigationDataForNotification(notification);
      
      if (navData) {
        return this.executeNavigation(navData);
      } else {
        console.warn('No navigation data found for notification:', notification.type);
        return false;
      }
    } catch (error) {
      console.error('Error navigating from notification:', error);
      return false;
    }
  }

  /**
   * Get navigation data for a specific notification
   */
  private getNavigationDataForNotification(notification: NotificationEvent): NotificationNavigationData | null {
    const { type, data } = notification;

    switch (type) {
      case 'friend_request':
      case 'friend_accepted':
        return {
          screen: 'Discover', // Or Friends tab if you have one
          params: { tab: 'requests' },
          action: 'navigate',
        };

      case 'friend_post':
      case 'post_like':
      case 'post_comment':
        if (data?.postId) {
          return {
            screen: 'PostDetail',
            params: { postId: data.postId },
            action: 'modal',
          };
        }
        return {
          screen: 'Home',
          action: 'navigate',
        };

      case 'achievement_unlocked':
      case 'cuisine_milestone':
        return {
          screen: 'Profile',
          params: { tab: 'achievements' },
          action: 'navigate',
        };

      case 'weekly_progress':
        return {
          screen: 'Profile',
          params: { tab: 'progress' },
          action: 'navigate',
        };

      case 'new_cuisine_available':
        return {
          screen: 'Discover',
          params: { cuisineId: data?.cuisineId },
          action: 'navigate',
        };

      case 'reminder':
        // Navigate to the specific reminder context
        if (data?.reminderType === 'post') {
          return {
            screen: 'Camera',
            action: 'navigate',
          };
        }
        return {
          screen: 'Home',
          action: 'navigate',
        };

      case 'system_announcement':
        // Could open a modal or navigate to announcements
        return {
          screen: 'Notifications',
          params: { filter: 'system' },
          action: 'navigate',
        };

      default:
        return {
          screen: 'Notifications',
          action: 'navigate',
        };
    }
  }

  /**
   * Execute navigation based on navigation data
   */
  private executeNavigation(navData: NotificationNavigationData): boolean {
    if (!this.navigation) {
      console.log('Navigation not ready, queuing request:', navData);
      this.navigationQueue.push(navData);
      return false;
    }

    try {
      switch (navData.action) {
        case 'navigate':
          if (navData.screen && this.isTabScreen(navData.screen)) {
            // Navigate to tab screen
            this.navigation.navigate(navData.screen as any, navData.params);
          } else if (navData.screen) {
            // Navigate to regular screen
            this.navigation.navigate(navData.screen as any, navData.params);
          }
          break;

        case 'modal':
          // Present as modal
          this.navigation.navigate('Modal', {
            screen: navData.screen,
            params: navData.params,
          });
          break;

        case 'external':
          if (navData.url) {
            Linking.openURL(navData.url);
          }
          break;

        default:
          console.warn('Unknown navigation action:', navData.action);
          return false;
      }

      console.log('Navigation executed successfully:', navData);
      return true;
    } catch (error) {
      console.error('Error executing navigation:', error);
      return false;
    }
  }

  /**
   * Check if screen is a tab screen
   */
  private isTabScreen(screen: string): boolean {
    const tabScreens = ['Home', 'MyPosts', 'Camera', 'Notifications', 'Discover', 'Profile'];
    return tabScreens.includes(screen);
  }

  /**
   * Generate deep link URL for notification
   */
  generateDeepLink(notification: NotificationEvent): string | null {
    const navData = this.getNavigationDataForNotification(notification);
    if (!navData || !navData.screen) return null;

    const basePath = this.deepLinkConfig.paths[navData.screen];
    if (!basePath) return null;

    let path = basePath;
    
    // Replace path parameters
    if (navData.params) {
      Object.entries(navData.params).forEach(([key, value]) => {
        path = path.replace(`:${key}`, String(value));
      });
    }

    return `${this.deepLinkConfig.prefix}${path.substring(1)}`;
  }

  /**
   * Create shareable notification link
   */
  async createShareableLink(notification: NotificationEvent): Promise<string | null> {
    try {
      const deepLink = this.generateDeepLink(notification);
      if (!deepLink) return null;

      // In a real app, you might use a URL shortener or universal links
      // For now, return the deep link
      return deepLink;
    } catch (error) {
      console.error('Error creating shareable link:', error);
      return null;
    }
  }

  /**
   * Handle notification tap when app is in foreground
   */
  async handleNotificationTap(notification: NotificationEvent): Promise<void> {
    console.log('Handling notification tap:', notification.id, notification.type);

    // Mark notification as clicked
    try {
      // Update notification click timestamp in database
      // This would be implemented based on your database schema
      console.log('Marking notification as clicked:', notification.id);
    } catch (error) {
      console.error('Error marking notification as clicked:', error);
    }

    // Navigate based on notification
    await this.navigateFromNotification(notification);
  }

  /**
   * Handle notification received when app is in background
   */
  async handleBackgroundNotification(notification: NotificationEvent): Promise<void> {
    console.log('Handling background notification:', notification.id, notification.type);

    // Store navigation intent for when app comes to foreground
    const navData = this.getNavigationDataForNotification(notification);
    if (navData) {
      // Store in AsyncStorage or similar for later retrieval
      console.log('Storing navigation intent for background notification:', navData);
    }
  }

  /**
   * Get notification badge for tab
   */
  getNotificationBadgeForTab(tabName: keyof TabParamList, notifications: NotificationEvent[]): number {
    let count = 0;

    notifications.forEach(notification => {
      if (notification.readAt) return; // Skip read notifications

      const navData = this.getNavigationDataForNotification(notification);
      if (navData && navData.screen === tabName) {
        count++;
      }
    });

    return count;
  }

  /**
   * Clear navigation queue (useful for testing)
   */
  clearNavigationQueue(): void {
    this.navigationQueue = [];
  }

  /**
   * Get current deep link configuration
   */
  getDeepLinkConfig(): DeepLinkConfig {
    return { ...this.deepLinkConfig };
  }

  /**
   * Update deep link configuration
   */
  updateDeepLinkConfig(config: Partial<DeepLinkConfig>): void {
    this.deepLinkConfig = { ...this.deepLinkConfig, ...config };
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    Linking.removeAllListeners('url');
    this.navigation = null;
    this.navigationQueue = [];
  }
}

// Export singleton instance and convenience functions
export const navigationManager = NotificationNavigationManager.getInstance();

export const setNavigationRef = (navigation: NavigationProp<any>) => 
  navigationManager.setNavigation(navigation);

export const navigateFromNotification = (notification: NotificationEvent) =>
  navigationManager.navigateFromNotification(notification);

export const handleNotificationTap = (notification: NotificationEvent) =>
  navigationManager.handleNotificationTap(notification);

export const createShareableLink = (notification: NotificationEvent) =>
  navigationManager.createShareableLink(notification);

export const generateDeepLink = (notification: NotificationEvent) =>
  navigationManager.generateDeepLink(notification);