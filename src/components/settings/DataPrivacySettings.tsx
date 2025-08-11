import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Linking,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { DataExportOptions } from '../../types/profile';
import { theme } from '../../theme';
import { useDataExport } from '../../hooks/useDataExport';
import {
  SettingsSection,
  SettingsRow,
  ToggleRow,
} from './SettingsSection';
import Card from '../ui/Card';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

export interface DataPrivacySettingsProps {
  onExportData?: (dataTypes: string[]) => Promise<void>;
  onDeleteData?: (dataTypes: string[]) => Promise<void>;
  onViewPrivacyPolicy?: () => void;
  exportProgress?: number;
}

export const DataPrivacySettings: React.FC<DataPrivacySettingsProps> = ({
  onExportData,
  onDeleteData,
  onViewPrivacyPolicy,
}) => {
  const {
    exporting,
    exportProgress,
    exportedFilePath,
    error,
    exportUserData,
    estimateExportSize,
    shareExportedData,
    deleteExportedFile,
    clearError,
  } = useDataExport();

  const [exportOptions, setExportOptions] = useState<DataExportOptions>({
    includeProfile: true,
    includePosts: true,
    includeFriends: true,
    includeCuisines: true,
    includeAchievements: true,
    includeActivity: true,
    format: 'json',
  });

  const [estimatedSize, setEstimatedSize] = useState<number>(0);
  const [deleteOptions, setDeleteOptions] = useState({
    deletePosts: false,
    deleteFriends: false,
    deleteCuisines: false,
    deleteActivity: false,
  });

  const handleExportOptionChange = async (key: keyof DataExportOptions, value: boolean | string) => {
    const updatedOptions = { ...exportOptions, [key]: value };
    setExportOptions(updatedOptions);
    
    // Update size estimate
    if (key !== 'format') {
      const size = await estimateExportSize(updatedOptions);
      setEstimatedSize(size);
    }
  };

  const handleStartExport = async () => {
    if (!Object.values(exportOptions).slice(0, -1).some(Boolean)) {
      Alert.alert(
        'No Data Selected',
        'Please select at least one type of data to export.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Export Your Data',
      `This will export your selected data in ${exportOptions.format.toUpperCase()} format. The file will be saved to your device and can be shared.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Start Export',
          onPress: async () => {
            const filePath = await exportUserData(exportOptions);
            if (filePath) {
              Alert.alert(
                'Export Complete',
                'Your data has been exported successfully. Would you like to share it?',
                [
                  {
                    text: 'Keep Private',
                    style: 'cancel',
                  },
                  {
                    text: 'Share',
                    onPress: () => shareExportedData(filePath),
                  },
                ]
              );
            }
          },
        },
      ]
    );
  };

  const handleDeleteSelectedData = async () => {
    const selectedTypes = Object.entries(deleteOptions)
      .filter(([_, selected]) => selected)
      .map(([key, _]) => key);

    if (selectedTypes.length === 0) {
      Alert.alert(
        'No Data Selected',
        'Please select at least one type of data to delete.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Selected Data',
      `This will permanently delete the selected data types. This action cannot be undone.\n\nSelected: ${selectedTypes.join(', ')}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDeleteData?.(selectedTypes);
              Alert.alert('Success', 'Selected data has been deleted.');
              // Reset deletion options
              setDeleteOptions({
                deletePosts: false,
                deleteFriends: false,
                deleteCuisines: false,
                deleteActivity: false,
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to delete selected data. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleViewPrivacyPolicy = () => {
    onViewPrivacyPolicy?.();
    Linking.openURL('https://palate-app.com/privacy');
  };

  const handleContactDataProtection = () => {
    Linking.openURL('mailto:privacy@palate-app.com?subject=Data Protection Request');
  };

  const getDataDescription = (key: string): string => {
    const descriptions: { [key: string]: string } = {
      includeProfile: 'Basic profile information, settings, and preferences',
      includePosts: 'All your food posts, photos, reviews, and ratings',
      includeFriends: 'Your friend connections and social interactions',
      includeCuisines: 'Cuisine exploration progress and achievements',
      includeAchievements: 'Unlocked achievements and milestones',
      includeActivity: 'App usage history and activity log',
    };
    return descriptions[key] || '';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* GDPR Rights */}
      <SettingsSection
        title="Your Data Rights"
        description="Under GDPR and privacy laws, you have control over your data"
        icon="gavel"
      >
        <SettingsRow
          title="Right to Access"
          description="Download a copy of all your personal data"
          icon="download"
          onPress={() => {/* Scroll to export section */}}
        />

        <SettingsRow
          title="Right to Portability"
          description="Export your data in a machine-readable format"
          icon="import-export"
          onPress={() => {/* Scroll to export section */}}
        />

        <SettingsRow
          title="Right to Deletion"
          description="Delete specific types of your personal data"
          icon="delete"
          onPress={() => {/* Scroll to deletion section */}}
        />

        <SettingsRow
          title="Right to Rectification"
          description="Correct inaccurate or incomplete personal data"
          icon="edit"
          onPress={() => {/* Navigate to edit profile */}}
        />
      </SettingsSection>

      {/* Data Export */}
      <SettingsSection
        title="Download Your Data"
        description="Export your personal data in various formats"
        icon="cloud-download"
      >
        <Card variant="flat" padding="medium" style={styles.exportCard}>
          <Text style={styles.exportTitle}>Select Data to Export</Text>
          
          {Object.entries(exportOptions).slice(0, -1).map(([key, value]) => (
            <ToggleRow
              key={key}
              title={key.replace('include', '').replace(/([A-Z])/g, ' $1').trim()}
              description={getDataDescription(key)}
              value={value as boolean}
              onValueChange={(newValue) => handleExportOptionChange(key as keyof DataExportOptions, newValue)}
            />
          ))}

          <View style={styles.formatSection}>
            <Text style={styles.formatTitle}>Export Format</Text>
            <View style={styles.formatOptions}>
              {['json', 'csv'].map((format) => (
                <TouchableOpacity
                  key={format}
                  style={[
                    styles.formatOption,
                    exportOptions.format === format && styles.selectedFormat,
                  ]}
                  onPress={() => handleExportOptionChange('format', format)}
                >
                  <Text style={[
                    styles.formatText,
                    exportOptions.format === format && styles.selectedFormatText,
                  ]}>
                    {format.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {estimatedSize > 0 && (
            <View style={styles.sizeEstimate}>
              <MaterialIcons name="info" size={16} color={theme.colors.primary} />
              <Text style={styles.sizeText}>
                Estimated size: ~{estimatedSize} KB
              </Text>
            </View>
          )}

          {exporting && (
            <View style={styles.exportProgress}>
              <LoadingSpinner size="small" />
              <Text style={styles.progressText}>
                Exporting... {exportProgress}%
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error" size={16} color={theme.colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={clearError}>
                <MaterialIcons name="close" size={16} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          )}

          <Button
            title={exporting ? 'Exporting...' : 'Export Data'}
            variant="primary"
            onPress={handleStartExport}
            disabled={exporting}
            style={styles.exportButton}
            leftIcon={
              <MaterialIcons
                name="download"
                size={18}
                color={theme.colors.white}
              />
            }
          />
        </Card>
      </SettingsSection>

      {/* Selective Data Deletion */}
      <SettingsSection
        title="Delete Specific Data"
        description="Remove specific types of personal data"
        icon="delete-sweep"
      >
        <Card variant="flat" padding="medium" style={styles.deleteCard}>
          <View style={styles.deleteWarning}>
            <MaterialIcons name="warning" size={20} color={theme.colors.warning} />
            <Text style={styles.deleteWarningText}>
              Deletion is permanent and cannot be undone
            </Text>
          </View>

          <ToggleRow
            title="Delete Posts"
            description="Remove all your food posts and photos"
            icon="restaurant"
            value={deleteOptions.deletePosts}
            onValueChange={(value) => setDeleteOptions(prev => ({ ...prev, deletePosts: value }))}
          />

          <ToggleRow
            title="Delete Friend Connections"
            description="Remove all friend connections and social data"
            icon="people"
            value={deleteOptions.deleteFriends}
            onValueChange={(value) => setDeleteOptions(prev => ({ ...prev, deleteFriends: value }))}
          />

          <ToggleRow
            title="Delete Cuisine Progress"
            description="Remove cuisine exploration history"
            icon="explore"
            value={deleteOptions.deleteCuisines}
            onValueChange={(value) => setDeleteOptions(prev => ({ ...prev, deleteCuisines: value }))}
          />

          <ToggleRow
            title="Delete Activity Log"
            description="Remove app usage and activity history"
            icon="history"
            value={deleteOptions.deleteActivity}
            onValueChange={(value) => setDeleteOptions(prev => ({ ...prev, deleteActivity: value }))}
          />

          <Button
            title="Delete Selected Data"
            variant="error"
            onPress={handleDeleteSelectedData}
            style={styles.deleteButton}
            leftIcon={
              <MaterialIcons
                name="delete-forever"
                size={18}
                color={theme.colors.white}
              />
            }
          />
        </Card>
      </SettingsSection>

      {/* Privacy Resources */}
      <SettingsSection
        title="Privacy Resources"
        description="Learn about how we protect your data"
        icon="shield"
      >
        <SettingsRow
          title="Privacy Policy"
          description="Read our complete privacy policy"
          icon="policy"
          onPress={handleViewPrivacyPolicy}
        />

        <SettingsRow
          title="Data Usage Report"
          description="See how your data is collected and used"
          icon="analytics"
          onPress={() => Alert.alert('Coming Soon', 'Data usage report will be available soon.')}
        />

        <SettingsRow
          title="Cookie Settings"
          description="Manage cookie preferences"
          icon="cookie"
          onPress={() => Alert.alert('Coming Soon', 'Cookie settings will be available soon.')}
        />

        <SettingsRow
          title="Contact Data Protection"
          description="Email our data protection team"
          icon="contact-support"
          onPress={handleContactDataProtection}
        />
      </SettingsSection>

      {/* Data Information */}
      <View style={styles.infoContainer}>
        <View style={styles.infoHeader}>
          <MaterialIcons
            name="info"
            size={20}
            color={theme.colors.primary}
          />
          <Text style={styles.infoTitle}>Your Data Protection</Text>
        </View>
        
        <Text style={styles.infoText}>
          We are committed to protecting your privacy and giving you control over your personal data. 
          You can export, modify, or delete your data at any time. All data processing follows GDPR 
          and other applicable privacy regulations.
        </Text>
        
        <Text style={styles.infoText}>
          Data exports are generated securely and contain only your personal information. 
          Deleted data is permanently removed from our systems within 30 days.
        </Text>

        <TouchableOpacity
          style={styles.learnMore}
          onPress={handleViewPrivacyPolicy}
        >
          <Text style={styles.learnMoreText}>
            Learn more about data protection →
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  exportCard: {
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
  },
  exportTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  formatSection: {
    marginVertical: theme.spacing.md,
  },
  formatTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  formatOptions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  formatOption: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.background,
  },
  selectedFormat: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  formatText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  selectedFormatText: {
    color: theme.colors.primary,
  },
  sizeEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
  },
  sizeText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  exportProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  progressText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.error}10`,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginVertical: theme.spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginLeft: theme.spacing.sm,
  },
  exportButton: {
    marginTop: theme.spacing.md,
  },
  deleteCard: {
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
  },
  deleteWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.warning}10`,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },
  deleteWarningText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  deleteButton: {
    marginTop: theme.spacing.md,
  },
  infoContainer: {
    backgroundColor: `${theme.colors.primary}08`,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}20`,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  infoTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
    marginBottom: theme.spacing.md,
  },
  learnMore: {
    marginTop: theme.spacing.sm,
  },
  learnMoreText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
});

export default DataPrivacySettings;