import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import Card from '../ui/Card';

export interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: keyof typeof MaterialIcons.glyphMap;
  style?: any;
}

export interface SettingsRowProps {
  title: string;
  description?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  onPress?: () => void;
  rightComponent?: React.ReactNode;
  showChevron?: boolean;
  disabled?: boolean;
  style?: any;
}

export interface ToggleRowProps {
  title: string;
  description?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export interface SelectionRowProps {
  title: string;
  description?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  selectedValue: string;
  options: Array<{ label: string; value: string }>;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export interface TextInputRowProps {
  title: string;
  description?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  maxLength?: number;
  disabled?: boolean;
  onEndEditing?: () => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  children,
  icon,
  style,
}) => {
  return (
    <View style={[styles.sectionContainer, style]}>
      <View style={styles.sectionHeader}>
        {icon && (
          <MaterialIcons
            name={icon}
            size={20}
            color={theme.colors.primary}
            style={styles.sectionIcon}
          />
        )}
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {description && (
            <Text style={styles.sectionDescription}>{description}</Text>
          )}
        </View>
      </View>
      
      <Card variant="flat" padding="none" style={styles.settingsCard}>
        {children}
      </Card>
    </View>
  );
};

export const SettingsRow: React.FC<SettingsRowProps> = ({
  title,
  description,
  icon,
  onPress,
  rightComponent,
  showChevron = true,
  disabled = false,
  style,
}) => {
  const content = (
    <View style={[
      styles.settingsRow,
      disabled && styles.disabledRow,
      style,
    ]}>
      <View style={styles.leftContent}>
        {icon && (
          <MaterialIcons
            name={icon}
            size={20}
            color={disabled ? theme.colors.textDisabled : theme.colors.textSecondary}
            style={styles.rowIcon}
          />
        )}
        <View style={styles.textContent}>
          <Text style={[
            styles.rowTitle,
            disabled && styles.disabledText,
          ]}>
            {title}
          </Text>
          {description && (
            <Text style={[
              styles.rowDescription,
              disabled && styles.disabledText,
            ]}>
              {description}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.rightContent}>
        {rightComponent}
        {showChevron && onPress && (
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={disabled ? theme.colors.textDisabled : theme.colors.textSecondary}
            style={styles.chevron}
          />
        )}
      </View>
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export const ToggleRow: React.FC<ToggleRowProps> = ({
  title,
  description,
  icon,
  value,
  onValueChange,
  disabled = false,
}) => {
  return (
    <SettingsRow
      title={title}
      description={description}
      icon={icon}
      disabled={disabled}
      showChevron={false}
      rightComponent={
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          thumbColor={value ? theme.colors.primary : theme.colors.gray[300]}
          trackColor={{
            false: theme.colors.gray[200],
            true: `${theme.colors.primary}40`,
          }}
        />
      }
    />
  );
};

export const SelectionRow: React.FC<SelectionRowProps> = ({
  title,
  description,
  icon,
  selectedValue,
  options,
  onValueChange,
  disabled = false,
}) => {
  const selectedOption = options.find(opt => opt.value === selectedValue);

  const handlePress = () => {
    if (disabled) return;

    Alert.alert(
      title,
      description || 'Select an option',
      [
        ...options.map(option => ({
          text: option.label,
          onPress: () => onValueChange(option.value),
          style: option.value === selectedValue ? 'default' as const : 'default' as const,
        })),
        {
          text: 'Cancel',
          style: 'cancel' as const,
        },
      ]
    );
  };

  return (
    <SettingsRow
      title={title}
      description={description}
      icon={icon}
      onPress={handlePress}
      disabled={disabled}
      rightComponent={
        <Text style={[
          styles.selectionValue,
          disabled && styles.disabledText,
        ]}>
          {selectedOption?.label || 'Select'}
        </Text>
      }
    />
  );
};

export const TextInputRow: React.FC<TextInputRowProps> = ({
  title,
  description,
  icon,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  maxLength,
  disabled = false,
  onEndEditing,
}) => {
  return (
    <View style={[
      styles.textInputRow,
      disabled && styles.disabledRow,
    ]}>
      <View style={styles.leftContent}>
        {icon && (
          <MaterialIcons
            name={icon}
            size={20}
            color={disabled ? theme.colors.textDisabled : theme.colors.textSecondary}
            style={styles.rowIcon}
          />
        )}
        <View style={styles.textContent}>
          <Text style={[
            styles.rowTitle,
            disabled && styles.disabledText,
          ]}>
            {title}
          </Text>
          {description && (
            <Text style={[
              styles.rowDescription,
              disabled && styles.disabledText,
            ]}>
              {description}
            </Text>
          )}
        </View>
      </View>

      <TextInput
        style={[
          styles.textInput,
          disabled && styles.disabledInput,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textDisabled}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        maxLength={maxLength}
        editable={!disabled}
        onEndEditing={onEndEditing}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        autoCorrect={keyboardType !== 'email-address'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionIcon: {
    marginRight: theme.spacing.sm,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  sectionDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
  },
  settingsCard: {
    marginHorizontal: theme.spacing.lg,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.outline,
    minHeight: theme.touchTarget.minHeight,
  },
  disabledRow: {
    opacity: 0.6,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIcon: {
    marginRight: theme.spacing.md,
    width: 24,
  },
  textContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  rowDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
  },
  disabledText: {
    color: theme.colors.textDisabled,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevron: {
    marginLeft: theme.spacing.sm,
  },
  selectionValue: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.outline,
    minHeight: theme.touchTarget.minHeight + theme.spacing.md,
  },
  textInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    textAlign: 'right',
    minWidth: 120,
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  disabledInput: {
    color: theme.colors.textDisabled,
    backgroundColor: 'transparent',
  },
});

export default SettingsSection;