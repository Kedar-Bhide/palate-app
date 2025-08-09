/**
 * LocationPicker Component
 * Interactive location selection with GPS detection, address search, and manual entry
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, spacing, fonts } from '../../theme/uiTheme';
import {
  getCurrentLocation,
  getCoordinatesFromAddress,
  isLocationAvailable,
  getLocationPermissionStatus,
  requestLocationPermission,
  LocationResult,
  LocationCoordinates,
} from '../../lib/location';

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  accuracy?: number;
}

interface LocationPickerProps {
  selectedLocation?: LocationData | null;
  onLocationSelect: (location: LocationData) => void;
  onLocationClear: () => void;
  showMap?: boolean;
  disabled?: boolean;
}

interface RecentLocation {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface AddressSuggestion {
  id: string;
  address: string;
  subtitle?: string;
}

const RECENT_LOCATIONS_KEY = 'recent_locations';
const MAX_RECENT_LOCATIONS = 5;

export default function LocationPicker({
  selectedLocation,
  onLocationSelect,
  onLocationClear,
  showMap = false,
  disabled = false,
}: LocationPickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [recentLocations, setRecentLocations] = useState<RecentLocation[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [locationAccuracy, setLocationAccuracy] = useState<'high' | 'medium' | 'low' | null>(null);

  const expandAnim = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Check location permission status on mount
  useEffect(() => {
    const checkPermission = async () => {
      const status = await getLocationPermissionStatus();
      setPermissionStatus(status);
    };
    checkPermission();
  }, []);

  // Load recent locations on mount
  useEffect(() => {
    loadRecentLocations();
  }, []);

  // Animate expansion
  const animateExpansion = useCallback((expand: boolean) => {
    Animated.timing(expandAnim, {
      toValue: expand ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [expandAnim]);

  // Toggle expanded state
  const toggleExpanded = useCallback(() => {
    if (disabled) return;
    
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    animateExpansion(newExpanded);
    
    if (newExpanded) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
      setAddressSuggestions([]);
    }
  }, [isExpanded, disabled, animateExpansion]);

  // Load recent locations from storage
  const loadRecentLocations = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_LOCATIONS_KEY);
      if (stored) {
        const locations: RecentLocation[] = JSON.parse(stored);
        setRecentLocations(locations);
      }
    } catch (error) {
      console.error('Error loading recent locations:', error);
    }
  }, []);

  // Save location to recent list
  const saveToRecentLocations = useCallback(async (location: LocationData) => {
    try {
      const newLocation: RecentLocation = {
        id: `${Date.now()}_${Math.random()}`,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString(),
      };

      // Remove duplicate if exists
      const filtered = recentLocations.filter(
        loc => loc.address !== location.address
      );

      // Add new location at the beginning and limit to MAX_RECENT_LOCATIONS
      const updated = [newLocation, ...filtered].slice(0, MAX_RECENT_LOCATIONS);
      
      await AsyncStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(updated));
      setRecentLocations(updated);
    } catch (error) {
      console.error('Error saving recent location:', error);
    }
  }, [recentLocations]);

  // Handle current location detection
  const handleUseCurrentLocation = useCallback(async () => {
    if (disabled) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoadingCurrent(true);

    try {
      // Check if location services are available
      const isAvailable = await isLocationAvailable();
      if (!isAvailable) {
        Alert.alert(
          'Location Not Available',
          'Please enable location services and grant permission to use current location.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => requestLocationPermission() },
          ]
        );
        return;
      }

      // Get current location
      const location = await getCurrentLocation();
      
      // Determine accuracy based on GPS accuracy
      let accuracy: 'high' | 'medium' | 'low' = 'medium';
      if (location.accuracy) {
        if (location.accuracy <= 10) accuracy = 'high';
        else if (location.accuracy <= 50) accuracy = 'medium';
        else accuracy = 'low';
      }
      
      setLocationAccuracy(accuracy);

      const locationData: LocationData = {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
        accuracy: location.accuracy,
      };

      onLocationSelect(locationData);
      await saveToRecentLocations(locationData);
      
      // Collapse picker after selection
      setIsExpanded(false);
      animateExpansion(false);
      
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please check your location settings and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoadingCurrent(false);
    }
  }, [disabled, onLocationSelect, saveToRecentLocations, animateExpansion]);

  // Handle address search
  const handleAddressSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    // Debounce search
    debounceTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Mock address suggestions (in real app, use Google Places API or similar)
        const mockSuggestions: AddressSuggestion[] = [
          {
            id: '1',
            address: `${query} Street, City, State`,
            subtitle: 'Street address',
          },
          {
            id: '2',
            address: `${query} Avenue, Downtown`,
            subtitle: 'Avenue address',
          },
          {
            id: '3',
            address: `${query} Restaurant & Bar`,
            subtitle: 'Restaurant',
          },
        ];

        setAddressSuggestions(mockSuggestions);
      } catch (error) {
        console.error('Error searching addresses:', error);
        setAddressSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, []);

  // Handle address selection
  const handleAddressSelect = useCallback(async (address: string) => {
    if (disabled) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSearching(true);

    try {
      // Get coordinates for the address
      const coordinates = await getCoordinatesFromAddress(address);
      
      const locationData: LocationData = {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        address,
      };

      onLocationSelect(locationData);
      await saveToRecentLocations(locationData);
      
      // Clear search and collapse
      setSearchQuery('');
      setAddressSuggestions([]);
      setIsExpanded(false);
      animateExpansion(false);
      
    } catch (error) {
      console.error('Error selecting address:', error);
      Alert.alert(
        'Address Error',
        'Unable to find coordinates for this address. Please try a different address.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSearching(false);
    }
  }, [disabled, onLocationSelect, saveToRecentLocations, animateExpansion]);

  // Handle recent location selection
  const handleRecentLocationSelect = useCallback(async (location: RecentLocation) => {
    if (disabled) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const locationData: LocationData = {
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
    };

    onLocationSelect(locationData);
    
    // Move to top of recent list
    await saveToRecentLocations(locationData);
    
    setIsExpanded(false);
    animateExpansion(false);
  }, [disabled, onLocationSelect, saveToRecentLocations, animateExpansion]);

  // Handle clear location
  const handleClearLocation = useCallback(async () => {
    if (disabled) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLocationClear();
    setLocationAccuracy(null);
  }, [disabled, onLocationClear]);

  // Get accuracy icon and color
  const getAccuracyDisplay = () => {
    if (!locationAccuracy) return null;
    
    const displays = {
      high: { icon: 'gps-fixed', color: colors.success, text: 'High accuracy' },
      medium: { icon: 'gps-not-fixed', color: colors.warning, text: 'Medium accuracy' },
      low: { icon: 'gps-off', color: colors.error, text: 'Low accuracy' },
    };
    
    return displays[locationAccuracy];
  };

  const accuracyDisplay = getAccuracyDisplay();

  return (
    <View style={styles.container}>
      {/* Selected Location Display */}
      {selectedLocation ? (
        <View style={[
          styles.selectedContainer,
          disabled && styles.selectedContainerDisabled,
        ]}>
          <View style={styles.selectedContent}>
            <MaterialIcons
              name="location-on"
              size={20}
              color={colors.primary}
              style={styles.selectedIcon}
            />
            <View style={styles.selectedText}>
              <Text style={[
                styles.selectedAddress,
                disabled && styles.selectedAddressDisabled,
              ]}>
                {selectedLocation.address}
              </Text>
              {accuracyDisplay && (
                <View style={styles.accuracyContainer}>
                  <MaterialIcons
                    name={accuracyDisplay.icon}
                    size={14}
                    color={accuracyDisplay.color}
                  />
                  <Text style={[styles.accuracyText, { color: accuracyDisplay.color }]}>
                    {accuracyDisplay.text}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          {!disabled && (
            <View style={styles.selectedActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={toggleExpanded}
                activeOpacity={0.7}
              >
                <MaterialIcons name="edit" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleClearLocation}
                activeOpacity={0.7}
              >
                <MaterialIcons name="clear" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        /* Add Location Button */
        <TouchableOpacity
          style={[
            styles.addButton,
            disabled && styles.addButtonDisabled,
          ]}
          onPress={toggleExpanded}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="add-location"
            size={20}
            color={disabled ? colors.textDisabled : colors.textSecondary}
          />
          <Text style={[
            styles.addButtonText,
            disabled && styles.addButtonTextDisabled,
          ]}>
            Add Location (Optional)
          </Text>
          <MaterialIcons
            name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={20}
            color={disabled ? colors.textDisabled : colors.textSecondary}
          />
        </TouchableOpacity>
      )}

      {/* Expanded Location Picker */}
      <Animated.View
        style={[
          styles.expandedContainer,
          {
            height: expandAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 300],
            }),
            opacity: expandAnim,
          },
        ]}
      >
        <View style={styles.expandedContent}>
          {/* Current Location Button */}
          <TouchableOpacity
            style={styles.currentLocationButton}
            onPress={handleUseCurrentLocation}
            disabled={isLoadingCurrent}
            activeOpacity={0.7}
          >
            <View style={styles.currentLocationContent}>
              <MaterialIcons
                name="my-location"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.currentLocationText}>Use Current Location</Text>
            </View>
            
            {isLoadingCurrent ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialIcons
                name="arrow-forward"
                size={16}
                color={colors.textSecondary}
              />
            )}
          </TouchableOpacity>

          {/* Address Search */}
          <View style={styles.searchContainer}>
            <MaterialIcons
              name="search"
              size={20}
              color={colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleAddressSearch}
              placeholder="Search for address or restaurant"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              returnKeyType="search"
            />
            {isSearching && (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.searchLoader}
              />
            )}
          </View>

          {/* Results Container */}
          <ScrollView
            style={styles.resultsContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Address Suggestions */}
            {addressSuggestions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Search Results</Text>
                {addressSuggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.id}
                    style={styles.suggestionItem}
                    onPress={() => handleAddressSelect(suggestion.address)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="location-on"
                      size={18}
                      color={colors.textSecondary}
                      style={styles.suggestionIcon}
                    />
                    <View style={styles.suggestionContent}>
                      <Text style={styles.suggestionAddress}>{suggestion.address}</Text>
                      {suggestion.subtitle && (
                        <Text style={styles.suggestionSubtitle}>{suggestion.subtitle}</Text>
                      )}
                    </View>
                    <MaterialIcons
                      name="arrow-outward"
                      size={14}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Recent Locations */}
            {recentLocations.length > 0 && searchQuery.length === 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Locations</Text>
                {recentLocations.map((location) => (
                  <TouchableOpacity
                    key={location.id}
                    style={styles.suggestionItem}
                    onPress={() => handleRecentLocationSelect(location)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="history"
                      size={18}
                      color={colors.textSecondary}
                      style={styles.suggestionIcon}
                    />
                    <View style={styles.suggestionContent}>
                      <Text style={styles.suggestionAddress}>{location.address}</Text>
                      <Text style={styles.suggestionSubtitle}>
                        {new Date(location.timestamp).toLocaleDateString()}
                      </Text>
                    </View>
                    <MaterialIcons
                      name="arrow-outward"
                      size={14}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Empty State */}
            {addressSuggestions.length === 0 && recentLocations.length === 0 && searchQuery.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons
                  name="location-searching"
                  size={32}
                  color={colors.textMuted}
                />
                <Text style={styles.emptyStateText}>
                  Use current location or search for an address
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: spacing(3),
  },

  selectedContainerDisabled: {
    backgroundColor: colors.surfaceDisabled,
    borderColor: colors.outlineVariant,
  },

  selectedContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },

  selectedIcon: {
    marginTop: 2,
  },

  selectedText: {
    flex: 1,
    marginLeft: spacing(2),
  },

  selectedAddress: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.text,
    lineHeight: fonts.base * 1.3,
  },

  selectedAddressDisabled: {
    color: colors.textDisabled,
  },

  accuracyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing(0.5),
    gap: spacing(0.5),
  },

  accuracyText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.normal,
  },

  selectedActions: {
    flexDirection: 'row',
    gap: spacing(1),
  },

  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 12,
    padding: spacing(3),
    gap: spacing(2),
  },

  addButtonDisabled: {
    backgroundColor: colors.surfaceDisabled,
    borderColor: colors.outlineVariant,
  },

  addButtonText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    flex: 1,
  },

  addButtonTextDisabled: {
    color: colors.textDisabled,
  },

  expandedContainer: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 12,
    marginTop: spacing(1),
  },

  expandedContent: {
    flex: 1,
    padding: spacing(2),
  },

  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryContainer,
    borderRadius: 8,
    padding: spacing(3),
    marginBottom: spacing(3),
  },

  currentLocationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },

  currentLocationText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.primary,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    paddingHorizontal: spacing(2),
    marginBottom: spacing(2),
  },

  searchIcon: {
    marginRight: spacing(2),
  },

  searchInput: {
    flex: 1,
    fontSize: fonts.base,
    fontWeight: fonts.weights.normal,
    color: colors.text,
    paddingVertical: spacing(2),
  },

  searchLoader: {
    marginLeft: spacing(2),
  },

  resultsContainer: {
    flex: 1,
    maxHeight: 200,
  },

  section: {
    marginBottom: spacing(3),
  },

  sectionTitle: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(2),
    paddingHorizontal: spacing(1),
  },

  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing(2),
    borderRadius: 8,
    marginBottom: spacing(1),
  },

  suggestionIcon: {
    marginRight: spacing(2),
  },

  suggestionContent: {
    flex: 1,
  },

  suggestionAddress: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.normal,
    color: colors.text,
    marginBottom: spacing(0.5),
  },

  suggestionSubtitle: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing(4),
    gap: spacing(2),
  },

  emptyStateText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textMuted,
    textAlign: 'center',
  },
});