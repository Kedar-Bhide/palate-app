import { useState, useEffect, useCallback } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemePreferences } from '../types/profile';
import { lightTheme, darkTheme, Theme } from '../theme';

interface UseThemeReturn {
  theme: Theme;
  themePreferences: ThemePreferences;
  isDarkMode: boolean;
  systemPreference: ColorSchemeName;
  setTheme: (mode: ThemePreferences['mode']) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  updateThemePreferences: (preferences: Partial<ThemePreferences>) => Promise<void>;
  resetToDefault: () => Promise<void>;
  loading: boolean;
}

const STORAGE_KEY = 'theme_preferences';

const defaultPreferences: ThemePreferences = {
  mode: 'auto',
  reduceMotion: false,
  increasedContrast: false,
};

// High contrast theme variants
const createHighContrastTheme = (baseTheme: Theme): Theme => ({
  ...baseTheme,
  colors: {
    ...baseTheme.colors,
    // Increase contrast for accessibility
    text: baseTheme === lightTheme ? '#000000' : '#FFFFFF',
    background: baseTheme === lightTheme ? '#FFFFFF' : '#000000',
    outline: baseTheme === lightTheme ? '#000000' : '#FFFFFF',
    gray: {
      ...baseTheme.colors.gray,
      50: baseTheme === lightTheme ? '#F0F0F0' : '#2A2A2A',
      100: baseTheme === lightTheme ? '#E0E0E0' : '#3A3A3A',
      200: baseTheme === lightTheme ? '#C0C0C0' : '#4A4A4A',
      300: baseTheme === lightTheme ? '#A0A0A0' : '#5A5A5A',
      400: baseTheme === lightTheme ? '#808080' : '#6A6A6A',
      500: baseTheme === lightTheme ? '#606060' : '#8A8A8A',
      600: baseTheme === lightTheme ? '#404040' : '#AAAAAA',
      700: baseTheme === lightTheme ? '#303030' : '#CACACA',
      800: baseTheme === lightTheme ? '#202020' : '#EAEAEA',
      900: baseTheme === lightTheme ? '#101010' : '#FAFAFA',
    },
  },
});

export const useTheme = (): UseThemeReturn => {
  const [themePreferences, setThemePreferences] = useState<ThemePreferences>(defaultPreferences);
  const [systemPreference, setSystemPreference] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );
  const [loading, setLoading] = useState(true);

  // Calculate current theme based on preferences and system settings
  const getCurrentTheme = useCallback((): Theme => {
    let baseTheme: Theme;

    switch (themePreferences.mode) {
      case 'light':
        baseTheme = lightTheme;
        break;
      case 'dark':
        baseTheme = darkTheme;
        break;
      case 'auto':
        baseTheme = systemPreference === 'dark' ? darkTheme : lightTheme;
        break;
      case 'high-contrast':
        const systemBaseTheme = systemPreference === 'dark' ? darkTheme : lightTheme;
        baseTheme = createHighContrastTheme(systemBaseTheme);
        break;
      default:
        baseTheme = lightTheme;
    }

    // Apply theme customizations if any
    if (themePreferences.primaryColor || themePreferences.accentColor) {
      return {
        ...baseTheme,
        colors: {
          ...baseTheme.colors,
          ...(themePreferences.primaryColor && { primary: themePreferences.primaryColor }),
          ...(themePreferences.accentColor && { secondary: themePreferences.accentColor }),
        },
      };
    }

    return baseTheme;
  }, [themePreferences, systemPreference]);

  const theme = getCurrentTheme();
  const isDarkMode = theme === darkTheme || 
    (themePreferences.mode === 'auto' && systemPreference === 'dark') ||
    (themePreferences.mode === 'high-contrast' && systemPreference === 'dark');

  // Load theme preferences from storage
  const loadThemePreferences = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setThemePreferences({ ...defaultPreferences, ...parsed });
      }
    } catch (error) {
      console.error('Error loading theme preferences:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save theme preferences to storage
  const saveThemePreferences = useCallback(async (preferences: ThemePreferences) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      setThemePreferences(preferences);
    } catch (error) {
      console.error('Error saving theme preferences:', error);
    }
  }, []);

  // Set theme mode
  const setTheme = useCallback(async (mode: ThemePreferences['mode']) => {
    const updatedPreferences = { ...themePreferences, mode };
    await saveThemePreferences(updatedPreferences);
  }, [themePreferences, saveThemePreferences]);

  // Toggle between light and dark mode
  const toggleDarkMode = useCallback(async () => {
    const newMode = isDarkMode ? 'light' : 'dark';
    await setTheme(newMode);
  }, [isDarkMode, setTheme]);

  // Update theme preferences
  const updateThemePreferences = useCallback(async (updates: Partial<ThemePreferences>) => {
    const updatedPreferences = { ...themePreferences, ...updates };
    await saveThemePreferences(updatedPreferences);
  }, [themePreferences, saveThemePreferences]);

  // Reset to default theme
  const resetToDefault = useCallback(async () => {
    await saveThemePreferences(defaultPreferences);
  }, [saveThemePreferences]);

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemPreference(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  // Load preferences on mount
  useEffect(() => {
    loadThemePreferences();
  }, [loadThemePreferences]);

  return {
    theme,
    themePreferences,
    isDarkMode,
    systemPreference,
    setTheme,
    toggleDarkMode,
    updateThemePreferences,
    resetToDefault,
    loading,
  };
};