import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { DataExportOptions } from '../types/profile';
import { theme } from '../theme';
import { useDataExport } from '../hooks/useDataExport';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  SettingsSection,
  ToggleRow,
  SettingsRow,
} from '../components/settings/SettingsSection';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DataExportScreenProps {
  navigation: any;
}

interface DataTypeInfo {
  key: keyof DataExportOptions;
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  estimatedItems?: string;
}

export const DataExportScreen: React.FC<DataExportScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
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
    includeActivity: false, // Off by default due to privacy
    format: 'json',
  });

  const [estimatedSize, setEstimatedSize] = useState<number>(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const dataTypes: DataTypeInfo[] = [
    {
      key: 'includeProfile',
      title: 'Profile Information',
      description: 'Basic profile data, display name, bio, and account settings',
      icon: 'person',
      estimatedItems: 'Personal info',
    },
    {
      key: 'includePosts',
      title: 'Posts & Photos',
      description: 'All your food posts, photos, reviews, and ratings',
      icon: 'restaurant',
      estimatedItems: 'All posts',
    },
    {
      key: 'includeFriends',
      title: 'Social Connections',
      description: 'Your friend list and social connections',
      icon: 'people',
      estimatedItems: 'Friend list',
    },
    {
      key: 'includeCuisines',
      title: 'Cuisine Progress',
      description: 'Cuisine exploration history and progress tracking',
      icon: 'explore',
      estimatedItems: 'Progress data',
    },
    {
      key: 'includeAchievements',
      title: 'Achievements',
      description: 'Unlocked achievements and milestones',
      icon: 'emoji-events',
      estimatedItems: 'Badge collection',
    },
    {
      key: 'includeActivity',
      title: 'Activity Log',
      description: 'App usage history and activity records (last 1000 events)',
      icon: 'history',
      estimatedItems: 'Recent activity',
    },
  ];

  // Update size estimate when options change
  useEffect(() => {
    const updateEstimate = async () => {
      const size = await estimateExportSize(exportOptions);
      setEstimatedSize(size);
    };

    updateEstimate();
  }, [exportOptions, estimateExportSize]);

  const handleToggleOption = (key: keyof DataExportOptions, value: boolean | string) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleStartExport = async () => {
    // Check if at least one data type is selected
    const hasSelectedData = Object.entries(exportOptions)
      .slice(0, -1) // Exclude format
      .some(([_, value]) => value === true);

    if (!hasSelectedData) {
      Alert.alert(
        'No Data Selected',
        'Please select at least one type of data to export.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Show confirmation with details
    const selectedTypes = Object.entries(exportOptions)
      .slice(0, -1)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => {
        const dataType = dataTypes.find(dt => dt.key === key);
        return dataType?.title || key;
      });

    Alert.alert(
      'Export Your Data',
      `This will export the following data in ${exportOptions.format.toUpperCase()} format:\n\n${selectedTypes.join('\n')}\n\nEstimated size: ~${estimatedSize} KB\n\nThe export file will be saved to your device and can be shared.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Start Export',
          onPress: performExport,
        },
      ]
    );
  };

  const performExport = async () => {
    try {
      const filePath = await exportUserData(exportOptions);
      
      if (filePath) {
        Alert.alert(
          'Export Complete! 🎉',
          'Your data has been successfully exported. What would you like to do with it?',
          [
            {
              text: 'Keep Private',
              style: 'cancel',
            },
            {
              text: 'Share File',
              onPress: () => shareExportedData(filePath),
            },
            {
              text: 'View Details',
              onPress: () => showExportDetails(filePath),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Export Failed',
        'There was an error exporting your data. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const showExportDetails = (filePath: string) => {
    const fileName = filePath.split('/').pop() || 'export';
    
    Alert.alert(
      'Export Details',
      `File: ${fileName}\nFormat: ${exportOptions.format.toUpperCase()}\nSize: ~${estimatedSize} KB\n\nThe file is saved to your device and can be accessed through the Files app.`,
      [
        {
          text: 'Share',
          onPress: () => shareExportedData(filePath),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteExportedFile(filePath);
            Alert.alert('Deleted', 'Export file has been deleted from your device.');
          },
        },
        {
          text: 'OK',
          style: 'cancel',
        },
      ]
    );
  };

  const getFormatDescription = (format: string): string => {
    switch (format) {
      case 'json':
        return 'Machine-readable format, best for technical users and data portability';
      case 'csv':
        return 'Spreadsheet format, can be opened in Excel or Google Sheets';
      case 'pdf':
        return 'Human-readable document format (coming soon)';
      default:
        return '';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Export My Data</Text>
          <Text style={styles.headerSubtitle}>Download a copy of your personal data</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Export Progress */}
        {exporting && (
          <Card variant="elevated" padding="large" style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <LoadingSpinner size="medium" />
              <View style={styles.progressText}>
                <Text style={styles.progressTitle}>Exporting Your Data</Text>
                <Text style={styles.progressSubtitle}>
                  This may take a few moments...
                </Text>
              </View>
            </View>
            
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${exportProgress}%` },
                ]}
              />
            </View>
            
            <Text style={styles.progressPercentage}>
              {exportProgress}% Complete
            </Text>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card variant="flat" padding="medium" style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <MaterialIcons name="error" size={24} color={theme.colors.error} />
              <Text style={styles.errorTitle}>Export Failed</Text>
              <TouchableOpacity onPress={clearError}>
                <MaterialIcons name="close" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
            <Text style={styles.errorMessage}>{error}</Text>
          </Card>
        )}

        {/* Data Selection */}
        <SettingsSection
          title="Select Data to Export"
          description="Choose which types of data to include in your export"
          icon="checklist"
        >
          {dataTypes.map((dataType) => (
            <ToggleRow
              key={dataType.key}
              title={dataType.title}
              description={dataType.description}
              icon={dataType.icon}
              value={exportOptions[dataType.key] as boolean}
              onValueChange={(value) => handleToggleOption(dataType.key, value)}
              disabled={exporting}
            />
          ))}
        </SettingsSection>

        {/* Format Selection */}
        <SettingsSection
          title="Export Format"
          description="Choose the format for your exported data"
          icon="description"
        >
          <Card variant="flat" padding="medium" style={styles.formatCard}>
            <View style={styles.formatOptions}>
              {[
                { value: 'json', label: 'JSON', available: true },
                { value: 'csv', label: 'CSV', available: true },
                { value: 'pdf', label: 'PDF', available: false },
              ].map((format) => (
                <TouchableOpacity
                  key={format.value}
                  style={[
                    styles.formatOption,
                    exportOptions.format === format.value && styles.selectedFormat,
                    !format.available && styles.disabledFormat,
                  ]}
                  onPress={() => format.available && handleToggleOption('format', format.value)}
                  disabled={!format.available || exporting}
                >
                  <Text style={[
                    styles.formatLabel,
                    exportOptions.format === format.value && styles.selectedFormatLabel,
                    !format.available && styles.disabledFormatLabel,
                  ]}>
                    {format.label}
                  </Text>
                  {!format.available && (
                    <Text style={styles.comingSoon}>Coming Soon</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.formatDescription}>
              {getFormatDescription(exportOptions.format)}
            </Text>
          </Card>
        </SettingsSection>

        {/* Export Summary */}
        <Card variant="elevated" padding="large" style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialIcons name="info" size={24} color={theme.colors.primary} />
            <Text style={styles.summaryTitle}>Export Summary</Text>
          </View>
          
          <View style={styles.summaryDetails}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Selected Data Types:</Text>
              <Text style={styles.summaryValue}>
                {Object.values(exportOptions).slice(0, -1).filter(Boolean).length} of {dataTypes.length}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Export Format:</Text>
              <Text style={styles.summaryValue}>{exportOptions.format.toUpperCase()}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Estimated Size:</Text>
              <Text style={styles.summaryValue}>~{estimatedSize} KB</Text>
            </View>
          </View>

          <Button
            title={exporting ? 'Exporting...' : 'Export My Data'}
            variant="primary"
            onPress={handleStartExport}
            disabled={exporting}
            style={styles.exportButton}
            leftIcon={
              <MaterialIcons
                name="download"
                size={20}
                color={theme.colors.white}
              />
            }
          />
        </Card>

        {/* Privacy Notice */}
        <Card variant="flat" padding="large" style={styles.privacyCard}>
          <View style={styles.privacyHeader}>
            <MaterialIcons name="privacy-tip" size={20} color={theme.colors.primary} />
            <Text style={styles.privacyTitle}>Privacy & Security</Text>
          </View>
          
          <Text style={styles.privacyText}>
            Your exported data contains personal information. Keep it secure and only share it with trusted parties. 
            The export file is saved locally on your device and is not sent to any external servers.
          </Text>
          
          <Text style={styles.privacyText}>
            This export includes only data associated with your account. It does not include private data 
            from other users or system data.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.outline,
  },
  backButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing['3xl'],
  },
  progressCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  progressText: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  progressTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  progressSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.gray[200],
    borderRadius: 4,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    textAlign: 'center',
    fontWeight: theme.typography.fontWeight.medium,
  },
  errorCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    backgroundColor: `${theme.colors.error}10`,
    borderWidth: 1,
    borderColor: `${theme.colors.error}30`,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  errorTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.error,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  errorMessage: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
  },
  formatCard: {
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
  },
  formatOptions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  formatOption: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.outline,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  selectedFormat: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  disabledFormat: {
    opacity: 0.5,
  },
  formatLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  selectedFormatLabel: {
    color: theme.colors.primary,
  },
  disabledFormatLabel: {
    color: theme.colors.textDisabled,
  },
  comingSoon: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textDisabled,
    marginTop: theme.spacing.xs,
  },
  formatDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
  },
  summaryCard: {
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  summaryTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  summaryDetails: {
    marginBottom: theme.spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  summaryLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
  },
  exportButton: {
    alignSelf: 'stretch',
  },
  privacyCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}08`,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}20`,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  privacyTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  privacyText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
    marginBottom: theme.spacing.md,
  },
});

export default DataExportScreen;