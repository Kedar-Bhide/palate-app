import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import Card from '../ui/Card';
import Button from '../ui/Button';
import {
  SettingsSection,
  SettingsRow,
} from './SettingsSection';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface AccountDeletionProps {
  onDeactivateAccount: () => Promise<void>;
  onDeleteAccount: (password: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

type DeletionStep = 'options' | 'explanation' | 'alternatives' | 'confirmation' | 'password' | 'final';

interface DeletionOption {
  type: 'deactivate' | 'delete_posts' | 'delete_profile' | 'delete_all';
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const AccountDeletion: React.FC<AccountDeletionProps> = ({
  onDeactivateAccount,
  onDeleteAccount,
  onCancel,
  loading = false,
}) => {
  const [currentStep, setCurrentStep] = useState<DeletionStep>('options');
  const [selectedOption, setSelectedOption] = useState<DeletionOption | null>(null);
  const [password, setPassword] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [countdown, setCountdown] = useState(10);
  const [canProceed, setCanProceed] = useState(false);
  const [hasConfirmedRisks, setHasConfirmedRisks] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const countdownIntervalRef = useRef<NodeJS.Timeout>();

  const deletionOptions: DeletionOption[] = [
    {
      type: 'deactivate',
      title: 'Deactivate Account',
      description: 'Temporarily hide your profile and posts. You can reactivate anytime by logging in.',
      icon: 'pause',
      severity: 'low',
    },
    {
      type: 'delete_posts',
      title: 'Delete Posts Only',
      description: 'Remove all your food posts and photos, but keep your account and profile.',
      icon: 'delete',
      severity: 'medium',
    },
    {
      type: 'delete_profile',
      title: 'Delete Profile',
      description: 'Remove personal information but keep your posts (anonymized).',
      icon: 'person-remove',
      severity: 'medium',
    },
    {
      type: 'delete_all',
      title: 'Delete Everything',
      description: 'Permanently delete your account, profile, posts, and all associated data.',
      icon: 'delete-forever',
      severity: 'critical',
    },
  ];

  const getSeverityColor = (severity: DeletionOption['severity']) => {
    switch (severity) {
      case 'low': return theme.colors.warning;
      case 'medium': return '#FF8A00';
      case 'high': return '#FF5722';
      case 'critical': return theme.colors.error;
    }
  };

  const getSeverityBackground = (severity: DeletionOption['severity']) => {
    const color = getSeverityColor(severity);
    return `${color}10`;
  };

  // Countdown effect for final confirmation
  useEffect(() => {
    if (currentStep === 'final' && countdown > 0) {
      countdownIntervalRef.current = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanProceed(true);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearTimeout(countdownIntervalRef.current);
      }
    };
  }, [currentStep, countdown]);

  const animateStepTransition = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleOptionSelect = (option: DeletionOption) => {
    setSelectedOption(option);
    
    if (option.type === 'deactivate') {
      setCurrentStep('confirmation');
    } else {
      setCurrentStep('explanation');
    }
    animateStepTransition();
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'explanation':
        setCurrentStep('alternatives');
        break;
      case 'alternatives':
        setCurrentStep('password');
        break;
      case 'password':
        if (password.length >= 6) {
          setCurrentStep('final');
          setCountdown(10);
          setCanProceed(false);
        }
        break;
      case 'confirmation':
        if (selectedOption?.type === 'deactivate') {
          handleDeactivate();
        }
        break;
      case 'final':
        if (canProceed && confirmationText === 'DELETE') {
          handleDelete();
        }
        break;
    }
    animateStepTransition();
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'explanation':
        setCurrentStep('options');
        break;
      case 'alternatives':
        setCurrentStep('explanation');
        break;
      case 'password':
        setCurrentStep('alternatives');
        break;
      case 'confirmation':
        setCurrentStep('options');
        break;
      case 'final':
        setCurrentStep('password');
        setCountdown(10);
        setCanProceed(false);
        break;
    }
    animateStepTransition();
  };

  const handleDeactivate = async () => {
    try {
      await onDeactivateAccount();
      Alert.alert(
        'Account Deactivated',
        'Your account has been deactivated. You can reactivate it anytime by logging in.',
        [{ text: 'OK', onPress: onCancel }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to deactivate account. Please try again.');
    }
  };

  const handleDelete = async () => {
    try {
      await onDeleteAccount(password);
      Alert.alert(
        'Account Deletion Initiated',
        'Your account has been scheduled for deletion. You have 30 days to cancel this request by logging in.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to delete account. Please verify your password.');
    }
  };

  const renderProgressIndicator = () => {
    const steps = ['options', 'explanation', 'alternatives', 'password', 'final'];
    const currentIndex = steps.indexOf(currentStep);
    
    return (
      <View style={styles.progressContainer}>
        {steps.map((step, index) => (
          <View
            key={step}
            style={[
              styles.progressDot,
              index <= currentIndex && styles.progressDotActive,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderOptionsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Account Management Options</Text>
      <Text style={styles.stepDescription}>
        Choose what you'd like to do with your account. Each option has different implications.
      </Text>

      {deletionOptions.map((option) => (
        <Card
          key={option.type}
          variant="flat"
          padding="medium"
          style={[
            styles.optionCard,
            { backgroundColor: getSeverityBackground(option.severity) },
          ]}
        >
          <TouchableOpacity
            style={styles.optionContent}
            onPress={() => handleOptionSelect(option)}
          >
            <View style={[
              styles.optionIcon,
              { backgroundColor: getSeverityColor(option.severity) },
            ]}>
              <MaterialIcons
                name={option.icon}
                size={24}
                color={theme.colors.white}
              />
            </View>
            
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={getSeverityColor(option.severity)}
            />
          </TouchableOpacity>
        </Card>
      ))}
    </View>
  );

  const renderExplanationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What Will Be Deleted</Text>
      <Text style={styles.stepDescription}>
        Here's exactly what will happen when you delete your account:
      </Text>

      <Card variant="flat" padding="medium" style={styles.explanationCard}>
        <View style={styles.explanationSection}>
          <MaterialIcons name="delete-forever" size={24} color={theme.colors.error} />
          <View style={styles.explanationText}>
            <Text style={styles.explanationTitle}>Permanently Removed</Text>
            <Text style={styles.explanationItem}>• All your food posts and photos</Text>
            <Text style={styles.explanationItem}>• Profile information and bio</Text>
            <Text style={styles.explanationItem}>• Friend connections</Text>
            <Text style={styles.explanationItem}>• Cuisine progress and achievements</Text>
            <Text style={styles.explanationItem}>• App settings and preferences</Text>
          </View>
        </View>

        <View style={styles.explanationSection}>
          <MaterialIcons name="schedule" size={24} color={theme.colors.warning} />
          <View style={styles.explanationText}>
            <Text style={styles.explanationTitle}>30-Day Grace Period</Text>
            <Text style={styles.explanationDetail}>
              You have 30 days to cancel deletion by logging in. After 30 days, 
              deletion is permanent and cannot be undone.
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.stepActions}>
        <Button
          title="Back to Options"
          variant="secondary"
          onPress={handleBack}
          style={styles.backButton}
        />
        <Button
          title="I Understand"
          variant="primary"
          onPress={handleNext}
          style={styles.nextButton}
        />
      </View>
    </View>
  );

  const renderAlternativesStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Consider These Alternatives</Text>
      <Text style={styles.stepDescription}>
        Before deleting your account permanently, consider these alternatives:
      </Text>

      <SettingsSection
        title="Less Drastic Options"
        description="These options give you control without losing everything"
        icon="lightbulb"
      >
        <SettingsRow
          title="Make Account Private"
          description="Hide your profile and posts from non-friends"
          icon="lock"
          onPress={() => Alert.alert('Alternative', 'You can make your account private in Privacy Settings.')}
        />

        <SettingsRow
          title="Take a Break"
          description="Temporarily deactivate instead of deleting"
          icon="pause"
          onPress={() => handleOptionSelect(deletionOptions[0])}
        />

        <SettingsRow
          title="Delete Just Posts"
          description="Keep your account but remove your posts"
          icon="delete"
          onPress={() => handleOptionSelect(deletionOptions[1])}
        />
      </SettingsSection>

      <View style={styles.stepActions}>
        <Button
          title="Go Back"
          variant="secondary"
          onPress={handleBack}
          style={styles.backButton}
        />
        <Button
          title="Still Delete Account"
          variant="error"
          onPress={handleNext}
          style={styles.nextButton}
        />
      </View>
    </View>
  );

  const renderPasswordStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Confirm Your Identity</Text>
      <Text style={styles.stepDescription}>
        Enter your password to verify this request. This ensures only you can delete your account.
      </Text>

      <Card variant="flat" padding="large" style={styles.passwordCard}>
        <Text style={styles.passwordLabel}>Current Password</Text>
        <TextInput
          style={styles.passwordInput}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        {password.length > 0 && password.length < 6 && (
          <Text style={styles.passwordError}>
            Password must be at least 6 characters
          </Text>
        )}
      </Card>

      <View style={styles.stepActions}>
        <Button
          title="Go Back"
          variant="secondary"
          onPress={handleBack}
          style={styles.backButton}
        />
        <Button
          title="Verify Password"
          variant="primary"
          onPress={handleNext}
          disabled={password.length < 6}
          style={styles.nextButton}
        />
      </View>
    </View>
  );

  const renderFinalStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Final Confirmation</Text>
      <Text style={styles.stepDescription}>
        This is your last chance. Once you confirm, your account will be scheduled for deletion.
      </Text>

      <Card variant="flat" padding="large" style={styles.finalCard}>
        <View style={styles.finalWarning}>
          <MaterialIcons name="warning" size={32} color={theme.colors.error} />
          <Text style={styles.finalWarningText}>
            This action cannot be undone after 30 days
          </Text>
        </View>

        <Text style={styles.confirmationLabel}>
          Type "DELETE" to confirm account deletion:
        </Text>
        <TextInput
          style={[
            styles.confirmationInput,
            confirmationText === 'DELETE' && styles.confirmationInputValid,
          ]}
          value={confirmationText}
          onChangeText={setConfirmationText}
          placeholder="Type DELETE here"
          autoCapitalize="characters"
          autoCorrect={false}
        />

        {countdown > 0 && (
          <Text style={styles.countdownText}>
            Please wait {countdown} seconds before proceeding...
          </Text>
        )}
      </Card>

      <View style={styles.stepActions}>
        <Button
          title="Cancel"
          variant="secondary"
          onPress={onCancel}
          style={styles.backButton}
        />
        <Button
          title="Delete My Account"
          variant="error"
          onPress={handleNext}
          disabled={!canProceed || confirmationText !== 'DELETE' || loading}
          loading={loading}
          style={styles.nextButton}
        />
      </View>
    </View>
  );

  const renderConfirmationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Confirm Deactivation</Text>
      <Text style={styles.stepDescription}>
        Your account will be temporarily hidden. You can reactivate by logging in anytime.
      </Text>

      <Card variant="flat" padding="large" style={styles.confirmationCard}>
        <View style={styles.deactivationInfo}>
          <MaterialIcons name="pause-circle" size={48} color={theme.colors.warning} />
          <Text style={styles.deactivationTitle}>Account Deactivation</Text>
          <Text style={styles.deactivationText}>
            • Your profile will be hidden from other users
            • Your posts will not appear in feeds
            • Friends won't be able to find you
            • All data is preserved for reactivation
          </Text>
        </View>
      </Card>

      <View style={styles.stepActions}>
        <Button
          title="Cancel"
          variant="secondary"
          onPress={handleBack}
          style={styles.backButton}
        />
        <Button
          title="Deactivate Account"
          variant="warning"
          onPress={handleNext}
          loading={loading}
          style={styles.nextButton}
        />
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {currentStep !== 'options' && renderProgressIndicator()}
      
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {currentStep === 'options' && renderOptionsStep()}
        {currentStep === 'explanation' && renderExplanationStep()}
        {currentStep === 'alternatives' && renderAlternativesStep()}
        {currentStep === 'confirmation' && renderConfirmationStep()}
        {currentStep === 'password' && renderPasswordStep()}
        {currentStep === 'final' && renderFinalStep()}
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.gray[300],
    marginHorizontal: theme.spacing.xs,
  },
  progressDotActive: {
    backgroundColor: theme.colors.primary,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  stepDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
    marginBottom: theme.spacing.xl,
  },
  optionCard: {
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  optionDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
  },
  explanationCard: {
    marginBottom: theme.spacing.xl,
  },
  explanationSection: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  explanationText: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  explanationTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  explanationItem: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  explanationDetail: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
  },
  passwordCard: {
    marginBottom: theme.spacing.xl,
  },
  passwordLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  passwordInput: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    backgroundColor: theme.colors.gray[50],
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    minHeight: theme.touchTarget.minHeight,
  },
  passwordError: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginTop: theme.spacing.sm,
  },
  finalCard: {
    marginBottom: theme.spacing.xl,
  },
  finalWarning: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  finalWarningText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  confirmationLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  confirmationInput: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    backgroundColor: theme.colors.gray[50],
    borderWidth: 2,
    borderColor: theme.colors.outline,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    minHeight: theme.touchTarget.minHeight,
    textAlign: 'center',
    fontWeight: theme.typography.fontWeight.bold,
  },
  confirmationInputValid: {
    borderColor: theme.colors.error,
    backgroundColor: `${theme.colors.error}05`,
  },
  countdownText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.warning,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    fontWeight: theme.typography.fontWeight.medium,
  },
  confirmationCard: {
    marginBottom: theme.spacing.xl,
  },
  deactivationInfo: {
    alignItems: 'center',
  },
  deactivationTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginVertical: theme.spacing.md,
  },
  deactivationText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
    textAlign: 'center',
  },
  stepActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});

export default AccountDeletion;