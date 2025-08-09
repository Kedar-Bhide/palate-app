/**
 * Location Services Integration
 * Handles location permissions, geocoding, and location utilities using expo-location
 */

import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationResult extends LocationCoordinates {
  address?: string;
  accuracy?: number;
  timestamp?: number;
}

export interface LocationError {
  code: string;
  message: string;
}

// Cache for location data to avoid repeated API calls
const locationCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const GEOCODING_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Request location permissions from the user
 * @returns Promise<boolean> - true if permission granted
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    
    if (foregroundStatus !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'Palate needs location access to help you find nearby restaurants and tag your dining experiences.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
        ]
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

/**
 * Get current user location with high accuracy
 * @returns Promise<LocationResult>
 */
export const getCurrentLocation = async (): Promise<LocationResult> => {
  try {
    // Check if we have permission
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }
    }

    // Check cache first
    const cacheKey = 'current_location';
    const cached = locationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Using cached location');
      return cached.data;
    }

    console.log('Getting current location...');
    
    // Get location with high accuracy
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      maximumAge: 60000, // 1 minute
      timeInterval: 5000, // 5 seconds
    });

    const result: LocationResult = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy || undefined,
      timestamp: location.timestamp,
    };

    // Try to get address from coordinates
    try {
      const address = await getAddressFromCoordinates(
        result.latitude,
        result.longitude
      );
      result.address = address;
    } catch (error) {
      console.warn('Failed to get address from coordinates:', error);
    }

    // Cache the result
    locationCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    console.log('Location obtained:', result);
    return result;

  } catch (error) {
    console.error('Error getting current location:', error);
    
    if (error instanceof Error) {
      throw new Error(`Failed to get location: ${error.message}`);
    }
    
    throw new Error('Failed to get current location');
  }
};

/**
 * Convert coordinates to human-readable address using reverse geocoding
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Promise<string> - Formatted address string
 */
export const getAddressFromCoordinates = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  try {
    // Check cache first
    const cacheKey = `geocode_${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
    const cached = locationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < GEOCODING_CACHE_DURATION) {
      return cached.data;
    }

    console.log(`Reverse geocoding: ${latitude}, ${longitude}`);

    const results = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (results.length === 0) {
      throw new Error('No address found for coordinates');
    }

    const result = results[0];
    const address = formatLocationForDisplay(result);

    // Cache the result
    locationCache.set(cacheKey, {
      data: address,
      timestamp: Date.now(),
    });

    return address;

  } catch (error) {
    console.error('Error getting address from coordinates:', error);
    throw new Error('Failed to get address from location');
  }
};

/**
 * Convert address string to coordinates using forward geocoding
 * @param address - Address string to geocode
 * @returns Promise<LocationCoordinates>
 */
export const getCoordinatesFromAddress = async (
  address: string
): Promise<LocationCoordinates> => {
  try {
    if (!address.trim()) {
      throw new Error('Address is required');
    }

    // Check cache first
    const cacheKey = `forward_geocode_${address.toLowerCase().trim()}`;
    const cached = locationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < GEOCODING_CACHE_DURATION) {
      return cached.data;
    }

    console.log(`Forward geocoding: ${address}`);

    const results = await Location.geocodeAsync(address);

    if (results.length === 0) {
      throw new Error('No coordinates found for address');
    }

    const result: LocationCoordinates = {
      latitude: results[0].latitude,
      longitude: results[0].longitude,
    };

    // Cache the result
    locationCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return result;

  } catch (error) {
    console.error('Error getting coordinates from address:', error);
    throw new Error('Failed to get coordinates from address');
  }
};

/**
 * Format location object for user-friendly display
 * @param location - Location object from reverse geocoding
 * @returns Formatted address string
 */
export const formatLocationForDisplay = (location: any): string => {
  try {
    const parts: string[] = [];

    // Add street number and name
    if (location.streetNumber && location.street) {
      parts.push(`${location.streetNumber} ${location.street}`);
    } else if (location.street) {
      parts.push(location.street);
    } else if (location.name) {
      parts.push(location.name);
    }

    // Add city
    if (location.city) {
      parts.push(location.city);
    } else if (location.subregion) {
      parts.push(location.subregion);
    }

    // Add state/region
    if (location.region) {
      parts.push(location.region);
    }

    // Add country (optional, usually not needed for local addresses)
    // if (location.country && parts.length < 2) {
    //   parts.push(location.country);
    // }

    const formatted = parts.join(', ');
    
    // Fallback to a more basic format if we don't have much info
    if (!formatted) {
      if (location.district) {
        return location.district;
      }
      if (location.country) {
        return location.country;
      }
      return 'Unknown location';
    }

    return formatted;

  } catch (error) {
    console.error('Error formatting location:', error);
    return 'Unknown location';
  }
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 - First coordinate
 * @param coord2 - Second coordinate
 * @returns Distance in kilometers
 */
export const calculateDistance = (
  coord1: LocationCoordinates,
  coord2: LocationCoordinates
): number => {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.latitude * Math.PI) / 180) *
    Math.cos((coord2.latitude * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Format distance for display with appropriate units
 * @param distanceKm - Distance in kilometers
 * @returns Formatted distance string
 */
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km`;
  } else {
    return `${Math.round(distanceKm)}km`;
  }
};

/**
 * Check if location services are available and enabled
 * @returns Promise<boolean>
 */
export const isLocationAvailable = async (): Promise<boolean> => {
  try {
    const isEnabled = await Location.hasServicesEnabledAsync();
    if (!isEnabled) {
      return false;
    }

    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking location availability:', error);
    return false;
  }
};

/**
 * Clear location cache (useful for testing or when location permissions change)
 */
export const clearLocationCache = (): void => {
  locationCache.clear();
  console.log('Location cache cleared');
};

/**
 * Get location permission status without requesting
 * @returns Promise<'granted' | 'denied' | 'undetermined'>
 */
export const getLocationPermissionStatus = async (): Promise<
  'granted' | 'denied' | 'undetermined'
> => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status;
  } catch (error) {
    console.error('Error getting location permission status:', error);
    return 'denied';
  }
};