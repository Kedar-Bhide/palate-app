import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Goal, UserCuisineProgress } from '../../types/cuisine';
import { colors, spacing, radii, fonts, shadows } from '../../theme/uiTheme';

interface GoalSettingProps {
  currentGoals: Goal[];
  onGoalSet: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  onGoalUpdate: (goalId: string, progress: number) => void;
  userProgress: UserCuisineProgress[];
}

const GOAL_TEMPLATES = [
  {
    type: 'monthly' as const,
    title: 'Monthly Explorer',
    description: 'Try new cuisines this month',
    icon: '📅',
    suggestedTargets: [3, 5, 8, 10],
    maxTarget: 20,
  },
  {
    type: 'yearly' as const,
    title: 'Yearly Adventurer',
    description: 'Expand your palate this year',
    icon: '🗓️',
    suggestedTargets: [25, 50, 75, 100],
    maxTarget: 200,
  },
  {
    type: 'streak' as const,
    title: 'Streak Master',
    description: 'Maintain consecutive days trying new cuisines',
    icon: '🔥',
    suggestedTargets: [7, 14, 21, 30],
    maxTarget: 60,
  },
  {
    type: 'category' as const,
    title: 'Category Explorer',
    description: 'Try cuisines from different categories',
    icon: '🌍',
    suggestedTargets: [3, 5, 8, 10],
    maxTarget: 15,
  },
];

export default function GoalSetting({
  currentGoals,
  onGoalSet,
  onGoalUpdate,
  userProgress,
}: GoalSettingProps) {
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof GOAL_TEMPLATES[0] | null>(null);
  const [customTarget, setCustomTarget] = useState('');

  const calculateGoalProgress = useCallback((goal: Goal): number => {
    const now = new Date();
    
    switch (goal.type) {
      case 'monthly':
        return userProgress.filter(p => {
          const progressDate = new Date(p.first_tried_at);
          return progressDate.getMonth() === now.getMonth() && 
                 progressDate.getFullYear() === now.getFullYear();
        }).length;
        
      case 'yearly':
        return userProgress.filter(p => {
          const progressDate = new Date(p.first_tried_at);
          return progressDate.getFullYear() === now.getFullYear();
        }).length;
        
      case 'streak':
        return calculateCurrentStreak();
        
      case 'category':
        const categories = new Set(
          userProgress.map(p => p.cuisine?.category).filter(Boolean)
        );
        return categories.size;
        
      default:
        return 0;
    }
  }, [userProgress]);

  const calculateCurrentStreak = (): number => {
    if (userProgress.length === 0) return 0;

    const sortedProgress = [...userProgress].sort(
      (a, b) => new Date(b.first_tried_at).getTime() - new Date(a.first_tried_at).getTime()
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const progress of sortedProgress) {
      const tryDate = new Date(progress.first_tried_at);
      tryDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((currentDate.getTime() - tryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= streak + 1) {
        streak++;
        currentDate = tryDate;
      } else {
        break;
      }
    }

    return streak;
  };

  const handleCreateGoal = (template: typeof GOAL_TEMPLATES[0], target: number) => {
    const deadline = template.type === 'monthly' 
      ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()
      : template.type === 'yearly'
      ? new Date(new Date().getFullYear(), 11, 31).toISOString()
      : undefined;

    const goal: Omit<Goal, 'id' | 'createdAt'> = {
      type: template.type,
      title: `${template.title}: ${target} ${template.type === 'category' ? 'categories' : 'cuisines'}`,
      description: template.description,
      target,
      current: 0,
      deadline,
      completed: false,
    };

    onGoalSet(goal);
    setShowGoalModal(false);
    setSelectedTemplate(null);
    setCustomTarget('');
  };

  const handleCustomGoal = () => {
    if (!selectedTemplate || !customTarget) return;
    
    const target = parseInt(customTarget, 10);
    if (isNaN(target) || target <= 0 || target > selectedTemplate.maxTarget) {
      Alert.alert('Invalid Target', `Please enter a number between 1 and ${selectedTemplate.maxTarget}`);
      return;
    }

    handleCreateGoal(selectedTemplate, target);
  };

  const getGoalProgress = (goal: Goal) => {
    const current = calculateGoalProgress(goal);
    const percentage = Math.min((current / goal.target) * 100, 100);
    return { current, percentage };
  };

  const getGoalIcon = (goal: Goal): string => {
    switch (goal.type) {
      case 'monthly': return '📅';
      case 'yearly': return '🗓️';
      case 'streak': return '🔥';
      case 'category': return '🌍';
      default: return '🎯';
    }
  };

  const getGoalStatus = (goal: Goal) => {
    const { current } = getGoalProgress(goal);
    
    if (goal.completed || current >= goal.target) {
      return { status: 'completed', color: colors.success, text: 'Completed!' };
    }
    
    if (goal.deadline) {
      const deadline = new Date(goal.deadline);
      const now = new Date();
      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft < 0) {
        return { status: 'expired', color: colors.error, text: 'Expired' };
      }
      
      if (daysLeft <= 7) {
        return { status: 'urgent', color: colors.warning, text: `${daysLeft} days left` };
      }
      
      return { status: 'active', color: colors.primary, text: `${daysLeft} days left` };
    }
    
    return { status: 'active', color: colors.primary, text: 'In Progress' };
  };

  const activeGoals = currentGoals.filter(goal => !goal.completed);
  const completedGoals = currentGoals.filter(goal => goal.completed);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Your Goals</Text>
          <Text style={styles.subtitle}>Set targets to stay motivated</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowGoalModal(true)}
        >
          <Ionicons name="add" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Goals</Text>
            {activeGoals.map((goal) => {
              const { current, percentage } = getGoalProgress(goal);
              const status = getGoalStatus(goal);

              return (
                <View key={goal.id} style={styles.goalCard}>
                  <View style={styles.goalHeader}>
                    <View style={styles.goalTitleContainer}>
                      <Text style={styles.goalIcon}>{getGoalIcon(goal)}</Text>
                      <View style={styles.goalInfo}>
                        <Text style={styles.goalTitle} numberOfLines={1}>
                          {goal.title}
                        </Text>
                        <Text style={styles.goalDescription} numberOfLines={1}>
                          {goal.description}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                      <Text style={styles.statusText}>{status.text}</Text>
                    </View>
                  </View>

                  <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressText}>
                        {current} of {goal.target}
                      </Text>
                      <Text style={styles.progressPercentage}>
                        {Math.round(percentage)}%
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${percentage}%`,
                            backgroundColor: status.color,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {current >= goal.target && !goal.completed && (
                    <TouchableOpacity
                      style={styles.completeButton}
                      onPress={() => onGoalUpdate(goal.id, goal.target)}
                    >
                      <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                      <Text style={styles.completeButtonText}>Mark Complete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed Goals</Text>
            {completedGoals.slice(0, 3).map((goal) => (
              <View key={goal.id} style={[styles.goalCard, styles.completedGoal]}>
                <View style={styles.goalHeader}>
                  <View style={styles.goalTitleContainer}>
                    <Text style={styles.goalIcon}>{getGoalIcon(goal)}</Text>
                    <View style={styles.goalInfo}>
                      <Text style={styles.goalTitle} numberOfLines={1}>
                        {goal.title}
                      </Text>
                      <Text style={styles.completedDate}>
                        Completed • {new Date(goal.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {currentGoals.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎯</Text>
            <Text style={styles.emptyTitle}>Set Your First Goal</Text>
            <Text style={styles.emptyMessage}>
              Goals help you stay motivated and track your culinary journey progress.
            </Text>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => setShowGoalModal(true)}
            >
              <Text style={styles.emptyActionText}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Goal Creation Modal */}
      <Modal
        visible={showGoalModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowGoalModal(false);
          setSelectedTemplate(null);
          setCustomTarget('');
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Goal</Text>
            <TouchableOpacity
              onPress={() => {
                setShowGoalModal(false);
                setSelectedTemplate(null);
                setCustomTarget('');
              }}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {!selectedTemplate ? (
              <View>
                <Text style={styles.templateSectionTitle}>Choose Goal Type</Text>
                {GOAL_TEMPLATES.map((template) => (
                  <TouchableOpacity
                    key={template.type}
                    style={styles.templateCard}
                    onPress={() => setSelectedTemplate(template)}
                  >
                    <Text style={styles.templateIcon}>{template.icon}</Text>
                    <View style={styles.templateInfo}>
                      <Text style={styles.templateTitle}>{template.title}</Text>
                      <Text style={styles.templateDescription}>{template.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setSelectedTemplate(null)}
                >
                  <Ionicons name="arrow-back" size={20} color={colors.primary} />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>

                <View style={styles.selectedTemplate}>
                  <Text style={styles.selectedTemplateIcon}>{selectedTemplate.icon}</Text>
                  <Text style={styles.selectedTemplateTitle}>{selectedTemplate.title}</Text>
                  <Text style={styles.selectedTemplateDescription}>
                    {selectedTemplate.description}
                  </Text>
                </View>

                <Text style={styles.targetSectionTitle}>Choose Your Target</Text>
                
                {/* Suggested Targets */}
                <View style={styles.suggestedTargets}>
                  {selectedTemplate.suggestedTargets.map((target) => (
                    <TouchableOpacity
                      key={target}
                      style={styles.targetButton}
                      onPress={() => handleCreateGoal(selectedTemplate, target)}
                    >
                      <Text style={styles.targetButtonText}>{target}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom Target */}
                <View style={styles.customTargetSection}>
                  <Text style={styles.customTargetLabel}>Custom Target</Text>
                  <View style={styles.customTargetInput}>
                    <TextInput
                      style={styles.textInput}
                      value={customTarget}
                      onChangeText={setCustomTarget}
                      placeholder={`1-${selectedTemplate.maxTarget}`}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                    <TouchableOpacity
                      style={[
                        styles.customTargetButton,
                        !customTarget && styles.customTargetButtonDisabled,
                      ]}
                      onPress={handleCustomGoal}
                      disabled={!customTarget}
                    >
                      <Text style={styles.customTargetButtonText}>Create</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  title: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
  },

  subtitle: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    marginTop: spacing(0.25),
  },

  addButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: {
    marginBottom: spacing(2),
  },

  sectionTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginHorizontal: spacing(2),
    marginVertical: spacing(1),
  },

  goalCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing(2),
    marginBottom: spacing(1),
    padding: spacing(2),
    borderRadius: radii.lg,
    ...shadows.small,
  },

  completedGoal: {
    opacity: 0.7,
    backgroundColor: colors.surfaceVariant,
  },

  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(1.5),
  },

  goalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  goalIcon: {
    fontSize: 24,
    marginRight: spacing(1),
  },

  goalInfo: {
    flex: 1,
  },

  goalTitle: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(0.25),
  },

  goalDescription: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
  },

  completedDate: {
    fontSize: fonts.sm,
    color: colors.success,
    fontStyle: 'italic',
  },

  statusBadge: {
    paddingHorizontal: spacing(0.75),
    paddingVertical: spacing(0.25),
    borderRadius: radii.sm,
  },

  statusText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.semibold,
    color: colors.white,
  },

  progressSection: {
    marginBottom: spacing(1),
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing(0.5),
  },

  progressText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.text,
  },

  progressPercentage: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.primary,
  },

  progressBar: {
    height: 8,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.full,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: radii.full,
  },

  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing(1),
    borderRadius: radii.md,
    marginTop: spacing(1),
    gap: spacing(0.5),
  },

  completeButtonText: {
    color: colors.white,
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
  },

  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(4),
  },

  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing(2),
  },

  emptyTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(1),
    textAlign: 'center',
  },

  emptyMessage: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
    marginBottom: spacing(3),
  },

  emptyAction: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: radii.lg,
  },

  emptyActionText: {
    color: colors.white,
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  modalTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
  },

  modalContent: {
    flex: 1,
    padding: spacing(2),
  },

  templateSectionTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(1.5),
  },

  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    padding: spacing(2),
    borderRadius: radii.lg,
    marginBottom: spacing(1),
  },

  templateIcon: {
    fontSize: 24,
    marginRight: spacing(1.5),
  },

  templateInfo: {
    flex: 1,
  },

  templateTitle: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(0.25),
  },

  templateDescription: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(2),
    gap: spacing(0.5),
  },

  backButtonText: {
    fontSize: fonts.base,
    color: colors.primary,
    fontWeight: fonts.weights.medium,
  },

  selectedTemplate: {
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    padding: spacing(2),
    borderRadius: radii.lg,
    marginBottom: spacing(2),
  },

  selectedTemplateIcon: {
    fontSize: 32,
    marginBottom: spacing(1),
  },

  selectedTemplateTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    marginBottom: spacing(0.5),
  },

  selectedTemplateDescription: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  targetSectionTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(1),
  },

  suggestedTargets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
    marginBottom: spacing(2),
  },

  targetButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderRadius: radii.lg,
    minWidth: 60,
    alignItems: 'center',
  },

  targetButtonText: {
    color: colors.white,
    fontSize: fonts.lg,
    fontWeight: fonts.weights.bold,
  },

  customTargetSection: {
    marginTop: spacing(2),
  },

  customTargetLabel: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.text,
    marginBottom: spacing(1),
  },

  customTargetInput: {
    flexDirection: 'row',
    gap: spacing(1),
  },

  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radii.md,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.5),
    fontSize: fonts.base,
    color: colors.text,
  },

  customTargetButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  customTargetButtonDisabled: {
    backgroundColor: colors.surfaceVariant,
  },

  customTargetButtonText: {
    color: colors.white,
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
  },
});