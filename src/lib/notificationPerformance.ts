import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import { NotificationEvent, NotificationBatch } from '../types/notifications';

export interface PerformanceConfig {
  maxNotificationsPerBatch: number;
  batchDelay: number; // milliseconds
  maxCacheSize: number; // number of notifications to cache
  imageCompressionQuality: number; // 0-1
  enableOfflineMode: boolean;
  preloadImages: boolean;
  lazyLoadContent: boolean;
  backgroundSyncInterval: number; // minutes
  memoryOptimization: boolean;
}

export interface DeviceCapabilities {
  ram: 'low' | 'medium' | 'high';
  storage: 'limited' | 'adequate' | 'plenty';
  network: 'slow' | 'medium' | 'fast';
  battery: 'critical' | 'low' | 'normal' | 'high';
  performance: 'low' | 'medium' | 'high';
}

export interface NotificationCache {
  notifications: Map<string, NotificationEvent>;
  images: Map<string, string>; // url -> base64
  lastUpdate: Date;
  size: number;
  maxSize: number;
}

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  batteryImpact: number;
  networkUsage: number;
  cacheHitRate: number;
  errorRate: number;
}

const PERFORMANCE_CONFIG_KEY = 'notification_performance_config';
const CACHE_KEY = 'notification_cache';
const METRICS_KEY = 'notification_performance_metrics';

export class NotificationPerformanceManager {
  private static instance: NotificationPerformanceManager;
  private config: PerformanceConfig;
  private cache: NotificationCache;
  private deviceCapabilities: DeviceCapabilities | null = null;
  private metrics: PerformanceMetrics;
  private backgroundSyncTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.cache = this.initializeCache();
    this.metrics = this.getDefaultMetrics();
  }

  static getInstance(): NotificationPerformanceManager {
    if (!NotificationPerformanceManager.instance) {
      NotificationPerformanceManager.instance = new NotificationPerformanceManager();
    }
    return NotificationPerformanceManager.instance;
  }

  /**
   * Initialize the performance manager
   */
  async initialize(): Promise<void> {
    try {
      // Load saved config
      await this.loadConfig();
      
      // Analyze device capabilities
      this.deviceCapabilities = await this.analyzeDeviceCapabilities();
      
      // Adapt config based on device capabilities
      this.adaptConfigToDevice();
      
      // Initialize cache
      await this.loadCache();
      
      // Start background sync if enabled
      this.startBackgroundSync();
      
      console.log('NotificationPerformanceManager initialized');
    } catch (error) {
      console.error('Failed to initialize performance manager:', error);
    }
  }

  /**
   * Analyze device capabilities
   */
  private async analyzeDeviceCapabilities(): Promise<DeviceCapabilities> {
    try {
      const [batteryInfo, networkState] = await Promise.all([
        this.getBatteryInfo(),
        NetInfo.fetch(),
      ]);

      // Analyze RAM (simplified heuristic based on device type)
      let ram: DeviceCapabilities['ram'] = 'medium';
      if (Platform.OS === 'ios') {
        // iOS devices generally have better RAM management
        ram = Device.deviceYearClass && Device.deviceYearClass >= 2018 ? 'high' : 'medium';
      } else {
        // Android - estimate based on device year class
        if (Device.deviceYearClass && Device.deviceYearClass >= 2020) ram = 'high';
        else if (Device.deviceYearClass && Device.deviceYearClass >= 2017) ram = 'medium';
        else ram = 'low';
      }

      // Analyze storage (placeholder - would need native module for real implementation)
      const storage: DeviceCapabilities['storage'] = 'adequate';

      // Analyze network
      let network: DeviceCapabilities['network'] = 'medium';
      if (networkState.type === 'wifi' || networkState.type === 'ethernet') {
        network = 'fast';
      } else if (networkState.type === 'cellular') {
        const effectiveType = (networkState.details as any)?.effectiveType;
        if (effectiveType === '4g' || effectiveType === '5g') network = 'fast';
        else if (effectiveType === '3g') network = 'medium';
        else network = 'slow';
      }

      // Analyze battery
      let battery: DeviceCapabilities['battery'] = 'normal';
      if (batteryInfo.level < 0.15) battery = 'critical';
      else if (batteryInfo.level < 0.3) battery = 'low';
      else if (batteryInfo.level > 0.8) battery = 'high';

      // Overall performance rating
      let performance: DeviceCapabilities['performance'] = 'medium';
      if (ram === 'high' && (network === 'fast' || network === 'medium')) {
        performance = 'high';
      } else if (ram === 'low' || network === 'slow' || battery === 'critical') {
        performance = 'low';
      }

      return { ram, storage, network, battery, performance };
    } catch (error) {
      console.error('Error analyzing device capabilities:', error);
      return {
        ram: 'medium',
        storage: 'adequate',
        network: 'medium',
        battery: 'normal',
        performance: 'medium',
      };
    }
  }

  /**
   * Adapt configuration based on device capabilities
   */
  private adaptConfigToDevice(): void {
    if (!this.deviceCapabilities) return;

    const { ram, network, battery, performance } = this.deviceCapabilities;

    // Adjust based on performance level
    if (performance === 'low') {
      this.config.maxNotificationsPerBatch = Math.min(this.config.maxNotificationsPerBatch, 5);
      this.config.batchDelay = Math.max(this.config.batchDelay, 1000);
      this.config.maxCacheSize = Math.min(this.config.maxCacheSize, 50);
      this.config.imageCompressionQuality = 0.6;
      this.config.preloadImages = false;
      this.config.lazyLoadContent = true;
      this.config.memoryOptimization = true;
    } else if (performance === 'high') {
      this.config.maxNotificationsPerBatch = Math.max(this.config.maxNotificationsPerBatch, 15);
      this.config.batchDelay = Math.min(this.config.batchDelay, 300);
      this.config.maxCacheSize = Math.max(this.config.maxCacheSize, 200);
      this.config.imageCompressionQuality = 0.9;
      this.config.preloadImages = true;
      this.config.lazyLoadContent = false;
      this.config.memoryOptimization = false;
    }

    // Adjust for network conditions
    if (network === 'slow') {
      this.config.preloadImages = false;
      this.config.imageCompressionQuality = Math.min(this.config.imageCompressionQuality, 0.7);
      this.config.backgroundSyncInterval = Math.max(this.config.backgroundSyncInterval, 15);
    }

    // Adjust for battery level
    if (battery === 'critical' || battery === 'low') {
      this.config.backgroundSyncInterval = Math.max(this.config.backgroundSyncInterval, 30);
      this.config.preloadImages = false;
      this.config.enableOfflineMode = true;
    }

    // Adjust for RAM
    if (ram === 'low') {
      this.config.maxCacheSize = Math.min(this.config.maxCacheSize, 25);
      this.config.memoryOptimization = true;
    }
  }

  /**
   * Optimize notification loading
   */
  async optimizeNotificationLoading(notifications: NotificationEvent[]): Promise<NotificationEvent[]> {
    const startTime = performance.now();

    try {
      let optimizedNotifications = [...notifications];

      // Apply lazy loading if enabled
      if (this.config.lazyLoadContent) {
        optimizedNotifications = optimizedNotifications.map(notification => ({
          ...notification,
          // Remove heavy content for initial load
          data: {
            ...notification.data,
            fullContent: undefined, // Load on demand
            images: notification.data?.images?.slice(0, 1), // Only first image initially
          },
        }));
      }

      // Preload critical images if enabled and network is good
      if (this.config.preloadImages && this.deviceCapabilities?.network !== 'slow') {
        await this.preloadImages(optimizedNotifications);
      }

      // Cache optimized notifications
      optimizedNotifications.forEach(notification => {
        this.cache.notifications.set(notification.id, notification);
      });

      // Update metrics
      this.metrics.loadTime = performance.now() - startTime;
      await this.updateCacheHitRate();

      return optimizedNotifications;
    } catch (error) {
      console.error('Error optimizing notification loading:', error);
      this.metrics.errorRate += 0.01;
      return notifications;
    }
  }

  /**
   * Batch process notifications for better performance
   */
  async batchProcessNotifications(
    notifications: NotificationEvent[],
    processor: (batch: NotificationEvent[]) => Promise<void>
  ): Promise<void> {
    const batches = this.createBatches(notifications, this.config.maxNotificationsPerBatch);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        await processor(batch);
        
        // Add delay between batches to prevent overwhelming the system
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.config.batchDelay));
        }
      } catch (error) {
        console.error('Error processing notification batch:', error);
        this.metrics.errorRate += 0.01;
      }
    }
  }

  /**
   * Preload images for better user experience
   */
  private async preloadImages(notifications: NotificationEvent[]): Promise<void> {
    const imageUrls = new Set<string>();
    
    notifications.forEach(notification => {
      if (notification.data?.images) {
        notification.data.images.forEach((url: string) => imageUrls.add(url));
      }
      if (notification.data?.postImage) {
        imageUrls.add(notification.data.postImage);
      }
    });

    const uncachedUrls = Array.from(imageUrls).filter(url => !this.cache.images.has(url));
    
    if (uncachedUrls.length === 0) return;

    // Limit concurrent image loads to prevent memory issues
    const concurrentLimit = this.deviceCapabilities?.performance === 'high' ? 5 : 2;
    const chunks = this.createChunks(uncachedUrls, concurrentLimit);
    
    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map(url => this.preloadImage(url))
      );
    }
  }

  /**
   * Preload a single image
   */
  private async preloadImage(url: string): Promise<void> {
    try {
      // In a real implementation, you would use a library like react-native-fast-image
      // For now, we'll simulate caching
      const response = await fetch(url);
      if (response.ok) {
        // In production, you might convert to base64 or use native image caching
        this.cache.images.set(url, url); // Placeholder for cached image
      }
    } catch (error) {
      console.error('Failed to preload image:', url, error);
    }
  }

  /**
   * Optimize memory usage
   */
  optimizeMemory(): void {
    if (!this.config.memoryOptimization) return;

    // Clear old cache entries if cache is too large
    if (this.cache.notifications.size > this.config.maxCacheSize) {
      const entries = Array.from(this.cache.notifications.entries());
      const sortedEntries = entries.sort((a, b) => {
        const aTime = a[1].sentAt?.getTime() || 0;
        const bTime = b[1].sentAt?.getTime() || 0;
        return aTime - bTime; // Oldest first
      });

      // Remove oldest entries
      const toRemove = sortedEntries.slice(0, entries.length - this.config.maxCacheSize);
      toRemove.forEach(([id]) => {
        this.cache.notifications.delete(id);
      });
    }

    // Clear old image cache
    if (this.cache.images.size > 100) {
      const imagesToRemove = Math.floor(this.cache.images.size * 0.3); // Remove 30%
      const imageEntries = Array.from(this.cache.images.keys());
      imageEntries.slice(0, imagesToRemove).forEach(url => {
        this.cache.images.delete(url);
      });
    }
  }

  /**
   * Start background sync
   */
  private startBackgroundSync(): void {
    if (!this.config.enableOfflineMode) return;

    this.backgroundSyncTimer = setInterval(() => {
      this.syncOfflineNotifications();
    }, this.config.backgroundSyncInterval * 60 * 1000);
  }

  /**
   * Sync offline notifications
   */
  private async syncOfflineNotifications(): Promise<void> {
    try {
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) return;

      // Get offline actions from storage
      const offlineActions = await this.getOfflineActions();
      if (offlineActions.length === 0) return;

      // Process offline actions
      for (const action of offlineActions) {
        try {
          await this.processOfflineAction(action);
        } catch (error) {
          console.error('Failed to process offline action:', action, error);
        }
      }

      // Clear processed actions
      await this.clearOfflineActions();
    } catch (error) {
      console.error('Error syncing offline notifications:', error);
    }
  }

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];

    if (!this.deviceCapabilities) return recommendations;

    const { ram, network, battery, performance } = this.deviceCapabilities;

    if (performance === 'low') {
      recommendations.push('Consider reducing notification frequency to improve performance');
    }

    if (ram === 'low') {
      recommendations.push('Enable memory optimization for better app stability');
    }

    if (network === 'slow') {
      recommendations.push('Enable offline mode to reduce network usage');
      recommendations.push('Disable image preloading to save bandwidth');
    }

    if (battery === 'critical' || battery === 'low') {
      recommendations.push('Reduce background sync frequency to save battery');
      recommendations.push('Disable real-time features when battery is low');
    }

    if (this.metrics.cacheHitRate < 0.5) {
      recommendations.push('Increase cache size for better performance');
    }

    if (this.metrics.errorRate > 0.1) {
      recommendations.push('Check network connectivity and app permissions');
    }

    return recommendations;
  }

  // Helper methods
  private getDefaultConfig(): PerformanceConfig {
    return {
      maxNotificationsPerBatch: 10,
      batchDelay: 500,
      maxCacheSize: 100,
      imageCompressionQuality: 0.8,
      enableOfflineMode: true,
      preloadImages: true,
      lazyLoadContent: false,
      backgroundSyncInterval: 5,
      memoryOptimization: false,
    };
  }

  private initializeCache(): NotificationCache {
    return {
      notifications: new Map(),
      images: new Map(),
      lastUpdate: new Date(),
      size: 0,
      maxSize: 100,
    };
  }

  private getDefaultMetrics(): PerformanceMetrics {
    return {
      loadTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      batteryImpact: 0,
      networkUsage: 0,
      cacheHitRate: 0,
      errorRate: 0,
    };
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private createChunks<T>(items: T[], chunkSize: number): T[][] {
    return this.createBatches(items, chunkSize);
  }

  private async getBatteryInfo() {
    try {
      const batteryLevel = await Battery.getBatteryLevelAsync();
      const batteryState = await Battery.getBatteryStateAsync();
      return {
        level: batteryLevel,
        state: batteryState,
      };
    } catch (error) {
      return { level: 1, state: Battery.BatteryState.UNKNOWN };
    }
  }

  private async updateCacheHitRate(): Promise<void> {
    // Simplified cache hit rate calculation
    const totalRequests = this.cache.notifications.size + this.cache.images.size;
    const cacheHits = totalRequests * 0.7; // Placeholder
    this.metrics.cacheHitRate = totalRequests > 0 ? cacheHits / totalRequests : 0;
  }

  private async loadConfig(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(PERFORMANCE_CONFIG_KEY);
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Failed to load performance config:', error);
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem(PERFORMANCE_CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save performance config:', error);
    }
  }

  private async loadCache(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(CACHE_KEY);
      if (saved) {
        const cachedData = JSON.parse(saved);
        // Restore cache with proper Map objects
        this.cache = {
          ...cachedData,
          notifications: new Map(cachedData.notifications || []),
          images: new Map(cachedData.images || []),
          lastUpdate: new Date(cachedData.lastUpdate),
        };
      }
    } catch (error) {
      console.error('Failed to load cache:', error);
    }
  }

  private async saveCache(): Promise<void> {
    try {
      const cacheData = {
        ...this.cache,
        notifications: Array.from(this.cache.notifications.entries()),
        images: Array.from(this.cache.images.entries()),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }

  private async getOfflineActions(): Promise<any[]> {
    try {
      const saved = await AsyncStorage.getItem('offline_notification_actions');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      return [];
    }
  }

  private async processOfflineAction(action: any): Promise<void> {
    // Process offline action (mark as read, delete, etc.)
    switch (action.type) {
      case 'mark_read':
        await supabase
          .from('notification_history')
          .update({ read_at: action.timestamp })
          .eq('id', action.notificationId);
        break;
      case 'delete':
        await supabase
          .from('notification_history')
          .delete()
          .eq('id', action.notificationId);
        break;
      // Add more action types as needed
    }
  }

  private async clearOfflineActions(): Promise<void> {
    try {
      await AsyncStorage.removeItem('offline_notification_actions');
    } catch (error) {
      console.error('Failed to clear offline actions:', error);
    }
  }

  // Public API
  getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getDeviceCapabilities(): DeviceCapabilities | null {
    return this.deviceCapabilities;
  }

  clearCache(): void {
    this.cache.notifications.clear();
    this.cache.images.clear();
    this.saveCache();
  }

  dispose(): void {
    if (this.backgroundSyncTimer) {
      clearInterval(this.backgroundSyncTimer);
      this.backgroundSyncTimer = null;
    }
    this.saveCache();
    this.saveConfig();
  }
}

// Export singleton instance and convenience functions
export const performanceManager = NotificationPerformanceManager.getInstance();

export const initializePerformanceManager = () => performanceManager.initialize();

export const optimizeNotificationLoading = (notifications: NotificationEvent[]) =>
  performanceManager.optimizeNotificationLoading(notifications);

export const batchProcessNotifications = (
  notifications: NotificationEvent[],
  processor: (batch: NotificationEvent[]) => Promise<void>
) => performanceManager.batchProcessNotifications(notifications, processor);

export const getPerformanceRecommendations = () => 
  performanceManager.getPerformanceRecommendations();