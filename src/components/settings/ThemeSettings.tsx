import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ColorSchemeName } from 'react-native';
import { ThemePreferences } from '../../types/profile';
import { theme } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import {
  SettingsSection,
  ToggleRow,
  SelectionRow,
  SettingsRow,
} from './SettingsSection';
import Card from '../ui/Card';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface ThemeSettingsProps {
  onThemeChange?: (preferences: ThemePreferences) => void;
}

interface ThemePreviewProps {
  themeName: string;
  isSelected: boolean;
  isDark: boolean;
  isHighContrast?: boolean;
  onSelect: () => void;
}

const ThemePreview: React.FC<ThemePreviewProps> = ({
  themeName,
  isSelected,
  isDark,
  isHighContrast = false,
  onSelect,
}) => {
  const backgroundColor = isDark 
    ? (isHighContrast ? '#000000' : '#1A1A1A')
    : (isHighContrast ? '#FFFFFF' : '#FFFFFF');
  
  const surfaceColor = isDark
    ? (isHighContrast ? '#2A2A2A' : '#262626')
    : (isHighContrast ? '#F0F0F0' : '#F8FAFC');
  
  const textColor = isDark
    ? (isHighContrast ? '#FFFFFF' : '#FFFFFF')
    : (isHighContrast ? '#000000' : '#0F172A');
  
  const accentColor = theme.colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.themePreview,
        { backgroundColor },
        isSelected && styles.selectedPreview,
      ]}
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityLabel={`Select ${themeName} theme`}
    >
      {/* Preview content */}
      <View style={[styles.previewHeader, { backgroundColor: surfaceColor }]}>
        <View style={[styles.previewDot, { backgroundColor: accentColor }]} />
        <View style={styles.previewLines}>
          <View style={[styles.previewLine, styles.previewLineShort, { backgroundColor: textColor }]} />
          <View style={[styles.previewLine, styles.previewLineMedium, { backgroundColor: textColor, opacity: 0.7 }]} />
        </View>
      </View>
      
      <View style={styles.previewBody}>
        <View style={[styles.previewCard, { backgroundColor: surfaceColor }]}>
          <View style={[styles.previewLine, styles.previewLineLong, { backgroundColor: textColor }]} />
          <View style={[styles.previewLine, styles.previewLineShort, { backgroundColor: textColor, opacity: 0.5 }]} />
        </View>
      </View>

      {/* Selection indicator */}
      {isSelected && (
        <View style={styles.selectedIndicator}>
          <MaterialIcons
            name="check-circle"
            size={20}
            color={theme.colors.primary}
          />
        </View>
      )}

      {/* Theme name */}
      <Text style={[styles.themeName, { color: textColor }]}>
        {themeName}
      </Text>
    </TouchableOpacity>
  );
};

export const ThemeSettings: React.FC<ThemeSettingsProps> = ({ onThemeChange }) => {
  const {
    themePreferences,
    isDarkMode,
    systemPreference,
    setTheme,
    updateThemePreferences,
    resetToDefault,
    loading,
  } = useTheme();

  const [previewAnimation] = useState(new Animated.Value(0));

  const handleThemeSelect = async (mode: ThemePreferences['mode']) => {
    // Animate preview change
    Animated.sequence([
      Animated.timing(previewAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(previewAnimation, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    await setTheme(mode);
    onThemeChange?.(themePreferences);
  };

  const handlePreferenceChange = async (key: keyof ThemePreferences, value: any) => {
    const updatedPreferences = { ...themePreferences, [key]: value };
    await updateThemePreferences({ [key]: value });
    onThemeChange?.(updatedPreferences);
  };

  const handleResetTheme = async () => {
    await resetToDefault();
    onThemeChange?.(themePreferences);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading theme settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Theme Selection */}
      <SettingsSection
        title="Appearance"
        description="Choose how the app looks"
        icon="palette"
      >
        <View style={styles.themePreviewContainer}>
          <ThemePreview
            themeName="Light"
            isSelected={themePreferences.mode === 'light'}
            isDark={false}
            onSelect={() => handleThemeSelect('light')}
          />
          
          <ThemePreview
            themeName="Dark"
            isSelected={themePreferences.mode === 'dark'}
            isDark={true}
            onSelect={() => handleThemeSelect('dark')}
          />
          
          <ThemePreview
            themeName="Auto"
            isSelected={themePreferences.mode === 'auto'}
            isDark={systemPreference === 'dark'}
            onSelect={() => handleThemeSelect('auto')}
          />
          
          <ThemePreview
            themeName="High Contrast"
            isSelected={themePreferences.mode === 'high-contrast'}
            isDark={systemPreference === 'dark'}
            isHighContrast={true}
            onSelect={() => handleThemeSelect('high-contrast')}
          />
        </View>

        {/* Auto theme explanation */}
        {themePreferences.mode === 'auto' && (
          <View style={styles.autoThemeNote}>
            <MaterialIcons
              name="info"
              size={16}
              color={theme.colors.primary}
            />
            <Text style={styles.autoThemeText}>
              Auto theme follows your system preference. Currently: {systemPreference || 'light'}
            </Text>
          </View>
        )}
      </SettingsSection>

      {/* Accessibility Options */}
      <SettingsSection
        title="Accessibility"
        description="Make the app easier to use"
        icon="accessibility"
      >
        <ToggleRow
          title="Reduce Motion"
          description="Reduce animations and motion effects"
          icon="motion-photos-off"
          value={themePreferences.reduceMotion}
          onValueChange={(value) => handlePreferenceChange('reduceMotion', value)}
        />

        <ToggleRow
          title="Increased Contrast"
          description="Increase text and UI contrast for better readability"
          icon="contrast"
          value={themePreferences.increasedContrast}
          onValueChange={(value) => handlePreferenceChange('increasedContrast', value)}
        />
      </SettingsSection>

      {/* Theme Information */}
      <SettingsSection
        title="Theme Information"
        description="Current theme details"
        icon="info"
      >
        <SettingsRow
          title="Current Theme"
          description={`${themePreferences.mode.charAt(0).toUpperCase() + themePreferences.mode.slice(1)} ${isDarkMode ? '(Dark)' : '(Light)'}`}
          icon="color-lens"
          showChevron={false}
        />

        <SettingsRow
          title="System Preference"
          description={systemPreference ? `${systemPreference.charAt(0).toUpperCase() + systemPreference.slice(1)}` : 'Unknown'}
          icon="smartphone"
          showChevron={false}
        />

        <SettingsRow
          title="Reset to Default"
          description="Reset all theme settings to default"
          icon="refresh"
          onPress={handleResetTheme}
        />
      </SettingsSection>

      {/* Theme Preview Card */}
      <Card variant="elevated" padding="large" style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <MaterialIcons
            name="preview"
            size={24}
            color={theme.colors.primary}
          />
          <Text style={styles.previewTitle}>Live Preview</Text>
        </View>
        
        <Animated.View
          style={[
            styles.livePreview,
            {
              opacity: previewAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.5],
              }),
            },
          ]}
        >
          <View style={styles.previewContent}>
            <View style={styles.previewPost}>
              <View style={styles.previewAvatar} />
              <View style={styles.previewPostContent}>
                <View style={[styles.previewLine, styles.previewPostTitle]} />
                <View style={[styles.previewLine, styles.previewPostSubtitle]} />
              </View>
            </View>
            
            <View style={[styles.previewImagePlaceholder, { backgroundColor: theme.colors.gray[200] }]}>
              <MaterialIcons
                name="restaurant"
                size={32}
                color={theme.colors.gray[400]}
              />
            </View>
            
            <View style={styles.previewActions}>
              <View style={[styles.previewActionButton, { backgroundColor: theme.colors.primary }]} />
              <View style={[styles.previewActionButton, { backgroundColor: theme.colors.gray[300] }]} />
              <View style={[styles.previewActionButton, { backgroundColor: theme.colors.gray[300] }]} />
            </View>
          </View>
        </Animated.View>

        <Text style={styles.previewDescription}>
          This preview shows how the current theme affects the app's appearance. 
          Changes apply instantly throughout the app.
        </Text>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  themePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  themePreview: {
    width: (SCREEN_WIDTH - theme.spacing.lg * 2 - theme.spacing.sm) / 2,
    height: 120,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  selectedPreview: {
    borderColor: theme.colors.primary,
    ...theme.shadows.md,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.xs,
  },
  previewLines: {
    flex: 1,
  },
  previewLine: {
    height: 2,
    borderRadius: 1,
    marginBottom: 2,
  },
  previewLineShort: {
    width: '30%',
  },
  previewLineMedium: {
    width: '60%',
  },
  previewLineLong: {
    width: '90%',
  },
  previewBody: {
    flex: 1,
    justifyContent: 'center',
  },
  previewCard: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  selectedIndicator: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
  },
  themeName: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    left: theme.spacing.sm,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  autoThemeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.primary}10`,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  autoThemeText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  previewCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  previewTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  livePreview: {
    marginVertical: theme.spacing.md,
  },
  previewContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  previewPost: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  previewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  previewPostContent: {
    flex: 1,
  },
  previewPostTitle: {
    width: '60%',
    height: 3,
    backgroundColor: theme.colors.text,
    borderRadius: 1.5,
    marginBottom: theme.spacing.xs,
  },
  previewPostSubtitle: {
    width: '40%',
    height: 2,
    backgroundColor: theme.colors.textSecondary,
    borderRadius: 1,
  },
  previewImagePlaceholder: {
    height: 80,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  previewActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  previewActionButton: {
    width: 24,
    height: 6,
    borderRadius: 3,
  },
  previewDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
  },
});

export default ThemeSettings;