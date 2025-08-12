/**
 * ReportModal Component
 * Content moderation and user reporting functionality
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts } from '../../theme/uiTheme';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ReportModalProps {
  postId: string;
  userId: string;
  visible: boolean;
  onClose: () => void;
  onReportSubmitted: () => void;
}

type ReportReason = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  severity: 'low' | 'medium' | 'high';
};

const REPORT_REASONS: ReportReason[] = [
  {
    id: 'inappropriate',
    title: 'Inappropriate Content',
    description: 'Contains adult content, nudity, or inappropriate material',
    icon: 'warning',
    severity: 'high',
  },
  {
    id: 'spam',
    title: 'Spam or Misleading',
    description: 'Promotional content, fake reviews, or misleading information',
    icon: 'block',
    severity: 'medium',
  },
  {
    id: 'harassment',
    title: 'Harassment or Bullying',
    description: 'Targets someone with harmful or abusive behavior',
    icon: 'person-off',
    severity: 'high',
  },
  {
    id: 'false-info',
    title: 'False Information',
    description: 'Contains false or misleading information about the restaurant',
    icon: 'fact-check',
    severity: 'medium',
  },
  {
    id: 'violence',
    title: 'Violent Content',
    description: 'Contains or promotes violence or harmful activities',
    icon: 'dangerous',
    severity: 'high',
  },
  {
    id: 'intellectual-property',
    title: 'Copyright Violation',
    description: 'Uses copyrighted images or content without permission',
    icon: 'copyright',
    severity: 'medium',
  },
  {
    id: 'other',
    title: 'Other',
    description: 'Something else that violates our community guidelines',
    icon: 'more-horiz',
    severity: 'low',
  },
];

const ReportModal: React.FC<ReportModalProps> = ({
  postId,
  userId,
  visible,
  onClose,
  onReportSubmitted,
}) => {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [blockUser, setBlockUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'reason' | 'details' | 'confirmation'>('reason');

  // Handle reason selection
  const handleReasonSelect = useCallback(async (reasonId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedReason(reasonId);
  }, []);

  // Handle continue to details
  const handleContinue = useCallback(async () => {
    if (!selectedReason) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep('details');
  }, [selectedReason]);

  // Handle report submission
  const handleSubmitReport = useCallback(async () => {
    if (!selectedReason) return;

    try {
      setSubmitting(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const selectedReasonData = REPORT_REASONS.find(r => r.id === selectedReason);
      
      // Simulate API call to submit report
      const reportData = {
        postId,
        userId,
        reason: selectedReason,
        reasonTitle: selectedReasonData?.title,
        additionalDetails: additionalDetails.trim(),
        blockUser,
        severity: selectedReasonData?.severity,
        timestamp: new Date().toISOString(),
      };

      console.log('Submitting report:', reportData);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // TODO: Integrate with actual reporting API
      // await reportPost(reportData);

      setStep('confirmation');
      
      // Auto-close after showing confirmation
      setTimeout(() => {
        onReportSubmitted();
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert(
        'Error',
        'Failed to submit report. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSubmitting(false);
    }
  }, [selectedReason, additionalDetails, blockUser, postId, userId, onReportSubmitted]);

  // Handle close modal
  const handleClose = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Reset state
    setSelectedReason(null);
    setAdditionalDetails('');
    setBlockUser(false);
    setStep('reason');
    setSubmitting(false);
    
    onClose();
  }, [onClose]);

  // Handle back navigation
  const handleBack = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (step === 'details') {
      setStep('reason');
    } else if (step === 'confirmation') {
      // Don't allow back from confirmation
      return;
    }
  }, [step]);

  // Get selected reason data
  const selectedReasonData = selectedReason 
    ? REPORT_REASONS.find(r => r.id === selectedReason) 
    : null;

  // Render reason selection step
  const renderReasonStep = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Why are you reporting this post?</Text>
      <Text style={styles.subtitle}>
        Your report helps keep our community safe. We'll review this content and take appropriate action.
      </Text>

      <ScrollView style={styles.reasonsList} showsVerticalScrollIndicator={false}>
        {REPORT_REASONS.map((reason) => (
          <TouchableOpacity
            key={reason.id}
            style={[
              styles.reasonOption,
              selectedReason === reason.id && styles.selectedReason,
            ]}
            onPress={() => handleReasonSelect(reason.id)}
            activeOpacity={0.7}
          >
            <View style={styles.reasonContent}>
              <View style={styles.reasonHeader}>
                <MaterialIcons
                  name={reason.icon}
                  size={24}
                  color={selectedReason === reason.id ? colors.primary : colors.textSecondary}
                />
                <Text style={[
                  styles.reasonTitle,
                  selectedReason === reason.id && styles.selectedReasonTitle,
                ]}>
                  {reason.title}
                </Text>
                {selectedReason === reason.id && (
                  <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                )}
              </View>
              <Text style={styles.reasonDescription}>{reason.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Render details step
  const renderDetailsStep = () => (
    <KeyboardAvoidingView 
      style={styles.content}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.selectedReasonSummary}>
        <MaterialIcons
          name={selectedReasonData?.icon || 'warning'}
          size={24}
          color={colors.primary}
        />
        <Text style={styles.selectedReasonTitle}>
          {selectedReasonData?.title}
        </Text>
      </View>

      <Text style={styles.detailsTitle}>Additional Details (Optional)</Text>
      <Text style={styles.detailsSubtitle}>
        Provide more context to help us better understand the issue.
      </Text>

      <TextInput
        style={styles.detailsInput}
        placeholder="Describe the issue in more detail..."
        multiline
        numberOfLines={4}
        value={additionalDetails}
        onChangeText={setAdditionalDetails}
        maxLength={500}
        textAlignVertical="top"
      />

      <Text style={styles.characterCount}>
        {additionalDetails.length}/500 characters
      </Text>

      <TouchableOpacity
        style={styles.blockUserOption}
        onPress={() => setBlockUser(!blockUser)}
        activeOpacity={0.7}
      >
        <View style={styles.checkboxContainer}>
          <View style={[styles.checkbox, blockUser && styles.checkedCheckbox]}>
            {blockUser && (
              <MaterialIcons name="check" size={16} color={colors.white} />
            )}
          </View>
          <Text style={styles.blockUserText}>
            Also block this user
          </Text>
        </View>
        <Text style={styles.blockUserDescription}>
          You won't see posts from this user in your feed
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );

  // Render confirmation step
  const renderConfirmationStep = () => (
    <View style={styles.content}>
      <View style={styles.confirmationContainer}>
        <View style={styles.confirmationIcon}>
          <MaterialIcons name="check-circle" size={64} color={colors.success} />
        </View>
        <Text style={styles.confirmationTitle}>Report Submitted</Text>
        <Text style={styles.confirmationMessage}>
          Thank you for helping keep our community safe. We'll review this content and take appropriate action within 24 hours.
        </Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} />
        
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={step === 'reason' ? handleClose : handleBack}
              style={styles.headerButton}
              disabled={submitting || step === 'confirmation'}
            >
              <MaterialIcons
                name={step === 'reason' ? 'close' : 'arrow-back'}
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Report Post</Text>
            <View style={styles.headerButton} />
          </View>

          {submitting ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner size="large" text="Submitting report..." />
            </View>
          ) : (
            <>
              {step === 'reason' && renderReasonStep()}
              {step === 'details' && renderDetailsStep()}
              {step === 'confirmation' && renderConfirmationStep()}
            </>
          )}

          {/* Footer */}
          {!submitting && step !== 'confirmation' && (
            <View style={styles.footer}>
              <Button
                title={step === 'reason' ? 'Continue' : 'Submit Report'}
                onPress={step === 'reason' ? handleContinue : handleSubmitReport}
                disabled={!selectedReason}
                style={styles.submitButton}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  backdrop: {
    flex: 1,
  },

  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '70%',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.bold,
    color: colors.text,
  },

  content: {
    flex: 1,
    paddingHorizontal: spacing(4),
    paddingTop: spacing(3),
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Reason Step
  title: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    marginBottom: spacing(2),
  },

  subtitle: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    lineHeight: fonts.base * 1.4,
    marginBottom: spacing(4),
  },

  reasonsList: {
    flex: 1,
  },

  reasonOption: {
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(3),
    marginBottom: spacing(2),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.white,
  },

  selectedReason: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },

  reasonContent: {
    flex: 1,
  },

  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(1),
    gap: spacing(2),
  },

  reasonTitle: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    flex: 1,
  },

  selectedReasonTitle: {
    color: colors.primary,
  },

  reasonDescription: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    lineHeight: fonts.sm * 1.3,
  },

  // Details Step
  selectedReasonSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(3),
    backgroundColor: colors.primaryContainer,
    borderRadius: 12,
    marginBottom: spacing(4),
  },

  detailsTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    marginBottom: spacing(1),
  },

  detailsSubtitle: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    marginBottom: spacing(3),
  },

  detailsInput: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 12,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(3),
    fontSize: fonts.base,
    color: colors.text,
    minHeight: 100,
    backgroundColor: colors.white,
  },

  characterCount: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing(1),
    marginBottom: spacing(4),
  },

  blockUserOption: {
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(3),
    borderRadius: 12,
    backgroundColor: colors.surface,
  },

  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(1),
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.outline,
    marginRight: spacing(2),
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkedCheckbox: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  blockUserText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },

  blockUserDescription: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    marginLeft: spacing(4),
  },

  // Confirmation Step
  confirmationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing(6),
  },

  confirmationIcon: {
    marginBottom: spacing(4),
  },

  confirmationTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    marginBottom: spacing(3),
    textAlign: 'center',
  },

  confirmationMessage: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
    paddingHorizontal: spacing(4),
  },

  // Footer
  footer: {
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },

  submitButton: {
    width: '100%',
  },
});

export default ReportModal;