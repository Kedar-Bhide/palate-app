import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { PushToken, DeviceInfo, NotificationError } from '../types/notifications';
import { registerForPushNotifications } from './notifications';
import { supabase } from './supabase';

const PUSH_TOKEN_KEY = '@palate_push_token';
const DEVICE_INFO_KEY = '@palate_device_info';
const TOKEN_REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export const storePushToken = async (token: string, userId: string): Promise<void> => {
  try {
    const deviceInfo = await getDeviceInfo();
    const pushToken: PushToken = {
      token,
      userId,
      deviceId: deviceInfo.deviceId,
      platform: deviceInfo.platform,
      createdAt: new Date(),
      lastUsed: new Date(),
    };

    await AsyncStorage.setItem(PUSH_TOKEN_KEY, JSON.stringify(pushToken));
    console.log('Push token stored locally');
  } catch (error) {
    console.error('Failed to store push token:', error);
    throw error;
  }
};

export const getPushToken = async (): Promise<string | null> => {
  try {
    const tokenData = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!tokenData) return null;

    const pushToken: PushToken = JSON.parse(tokenData);
    
    // Check if token needs refresh
    const now = new Date();
    const lastUsed = new Date(pushToken.lastUsed);
    const timeDiff = now.getTime() - lastUsed.getTime();

    if (timeDiff > TOKEN_REFRESH_INTERVAL) {
      console.log('Push token needs refresh');
      return await refreshPushToken();
    }

    // Update last used timestamp
    pushToken.lastUsed = now;
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, JSON.stringify(pushToken));

    return pushToken.token;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
};

export const validatePushToken = (token: string): boolean => {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // Real Expo push token format: ExponentPushToken[xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx]
  const expoTokenRegex = /^ExponentPushToken\[[a-f0-9-]{36}\]$/i;
  
  // Development mock token format: ExponentPushToken[mock-xxxxx-xxxxx] or ExponentPushToken[dev-xxxxx-xxxxx]
  const mockTokenRegex = /^ExponentPushToken\[(mock|dev)-\d+-[a-zA-Z0-9]+\]$/;
  
  // FCM token format (fallback for direct Firebase usage)
  const fcmTokenRegex = /^[a-zA-Z0-9_-]{140,}$/;

  return expoTokenRegex.test(token) || mockTokenRegex.test(token) || fcmTokenRegex.test(token);
};

export const refreshPushToken = async (): Promise<string | null> => {
  try {
    console.log('Refreshing push token...');
    const newToken = await registerForPushNotifications();
    
    if (!newToken) {
      throw new Error('Failed to get new push token');
    }

    if (!validatePushToken(newToken)) {
      throw new Error('Invalid push token format');
    }

    // Get current user ID from stored token or auth context
    const currentTokenData = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    let userId = '';

    if (currentTokenData) {
      const currentToken: PushToken = JSON.parse(currentTokenData);
      userId = currentToken.userId;
    }

    if (userId) {
      await storePushToken(newToken, userId);
      await registerTokenWithServer(newToken, userId);
    }

    console.log('Push token refreshed successfully');
    return newToken;
  } catch (error) {
    console.error('Failed to refresh push token:', error);
    return null;
  }
};

export const registerTokenWithServer = async (
  token: string,
  userId: string
): Promise<boolean> => {
  try {
    if (!validatePushToken(token)) {
      throw new Error('Invalid push token format');
    }

    const deviceInfo = await getDeviceInfo();
    
    // Prepare token data with fallbacks for missing columns
    const tokenData: any = {
      user_id: userId,
      token: token,
      device_id: deviceInfo.deviceId,
      platform: deviceInfo.platform,
      created_at: new Date().toISOString(),
      last_used: new Date().toISOString(),
    };

    // Add optional columns only if they're likely to exist
    try {
      tokenData.app_version = deviceInfo.appVersion || '1.0.0';
      tokenData.os_version = deviceInfo.osVersion || 'unknown';
      tokenData.is_active = true;
    } catch (e) {
      // Ignore if these fields cause issues
    }

    const { error } = await supabase
      .from('push_tokens')
      .upsert(tokenData, {
        onConflict: 'user_id,device_id'
      });

    if (error) {
      // Handle specific database schema errors gracefully
      if (error.code === 'PGRST204' && error.message.includes('schema cache')) {
        console.warn('⚠️ Database schema mismatch for push tokens. Please update your database schema.');
        console.warn('💡 Run the CRITICAL_DATABASE_FIX.sql file in your Supabase SQL editor.');
        return false; // Don't crash the app
      }
      throw error;
    }

    console.log('Push token registered with server');
    return true;
  } catch (error) {
    console.error('Failed to register token with server:', error);
    return false;
  }
};

export const removePushToken = async (userId: string): Promise<void> => {
  try {
    // Remove from local storage
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    
    // Remove from server
    const deviceInfo = await getDeviceInfo();
    const { error } = await supabase
      .from('push_tokens')
      .update({ is_active: false })
      .match({ 
        user_id: userId,
        device_id: deviceInfo.deviceId
      });

    if (error) {
      console.error('Failed to deactivate token on server:', error);
    } else {
      console.log('Push token removed successfully');
    }
  } catch (error) {
    console.error('Failed to remove push token:', error);
    throw error;
  }
};

export const getDeviceInfo = async (): Promise<DeviceInfo> => {
  try {
    // Try to get cached device info first
    const cachedInfo = await AsyncStorage.getItem(DEVICE_INFO_KEY);
    if (cachedInfo) {
      const deviceInfo: DeviceInfo = JSON.parse(cachedInfo);
      // Add current push token if available
      const token = await getPushToken();
      if (token) {
        deviceInfo.pushToken = token;
      }
      return deviceInfo;
    }

    // Generate new device info
    const deviceInfo: DeviceInfo = {
      platform: Platform.OS as 'ios' | 'android',
      deviceId: await generateDeviceId(),
      appVersion: '1.0.0', // Get from app.json or Constants
      osVersion: Platform.Version.toString(),
    };

    // Cache device info
    await AsyncStorage.setItem(DEVICE_INFO_KEY, JSON.stringify(deviceInfo));
    
    return deviceInfo;
  } catch (error) {
    console.error('Failed to get device info:', error);
    // Return minimal device info as fallback
    return {
      platform: Platform.OS as 'ios' | 'android',
      deviceId: 'unknown',
      appVersion: '1.0.0',
      osVersion: Platform.Version.toString(),
    };
  }
};

const generateDeviceId = async (): Promise<string> => {
  try {
    // Try to get existing device ID
    const existingId = await AsyncStorage.getItem('@palate_device_id');
    if (existingId) {
      return existingId;
    }

    // Generate new device ID using device info
    let deviceId = '';
    
    if (Device.modelName && Device.brand) {
      deviceId = `${Device.brand}-${Device.modelName}-${Platform.OS}-${Date.now()}`;
    } else {
      deviceId = `${Platform.OS}-device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Store for future use
    await AsyncStorage.setItem('@palate_device_id', deviceId);
    
    return deviceId;
  } catch (error) {
    console.error('Failed to generate device ID:', error);
    return `fallback-${Platform.OS}-${Date.now()}`;
  }
};

export const getAllUserTokens = async (userId: string): Promise<PushToken[]> => {
  try {
    const { data, error } = await supabase
      .from('push_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      throw error;
    }

    return data?.map(token => ({
      token: token.token,
      userId: token.user_id,
      deviceId: token.device_id,
      platform: token.platform,
      createdAt: new Date(token.created_at),
      lastUsed: new Date(token.last_used),
    })) || [];
  } catch (error) {
    console.error('Failed to get user tokens:', error);
    return [];
  }
};

export const cleanupInvalidTokens = async (userId: string): Promise<void> => {
  try {
    const tokens = await getAllUserTokens(userId);
    const validTokens = tokens.filter(token => validatePushToken(token.token));
    
    // Mark invalid tokens as inactive
    const invalidTokens = tokens.filter(token => !validatePushToken(token.token));
    
    if (invalidTokens.length > 0) {
      const { error } = await supabase
        .from('push_tokens')
        .update({ is_active: false })
        .in('token', invalidTokens.map(t => t.token));

      if (error) {
        console.error('Failed to cleanup invalid tokens:', error);
      } else {
        console.log(`Cleaned up ${invalidTokens.length} invalid tokens`);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup invalid tokens:', error);
  }
};

export const updateTokenUsage = async (token: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .update({ last_used: new Date().toISOString() })
      .eq('token', token);

    if (error) {
      console.error('Failed to update token usage:', error);
    }
  } catch (error) {
    console.error('Failed to update token usage:', error);
  }
};

export const getTokenStats = async (userId: string): Promise<{ active: number; total: number }> => {
  try {
    const [activeResult, totalResult] = await Promise.all([
      supabase
        .from('push_tokens')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_active', true),
      supabase
        .from('push_tokens')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
    ]);

    return {
      active: activeResult.count || 0,
      total: totalResult.count || 0,
    };
  } catch (error) {
    console.error('Failed to get token stats:', error);
    return { active: 0, total: 0 };
  }
};