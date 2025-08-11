import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';

export interface ErrorBoundaryProps {
  error: Error;
  errorInfo: ErrorInfo;
  onRetry: () => void;
  onReport: (error: Error, errorInfo: ErrorInfo) => void;
}

export interface RecoveryStrategy {
  name: string;
  description: string;
  action: () => void | Promise<void>;
  autoExecute?: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface AdvancedErrorBoundaryProps {
  children: ReactNode;
  level: 'screen' | 'component' | 'critical';
  fallback?: React.ComponentType<ErrorBoundaryProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  recoveryStrategies?: RecoveryStrategy[];
  enableErrorReporting?: boolean;
  enableUserFeedback?: boolean;
  maxRetries?: number;
  resetOnPropsChange?: boolean;
  resetKeys?: string[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  isRecovering: boolean;
  recoveryAttempts: string[];
  userFeedback: string;
}

interface ErrorReport {
  errorId: string;
  message: string;
  stack: string;
  componentStack: string;
  level: string;
  timestamp: number;
  retryCount: number;
  userAgent: string;
  appVersion: string;
  recoveryAttempts: string[];
  userFeedback?: string;
  context?: Record<string, any>;
}

// Error categorization and handling
const categorizeError = (error: Error): {
  category: 'network' | 'rendering' | 'logic' | 'permission' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
} => {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';

  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return { category: 'network', severity: 'medium', recoverable: true };
  }

  // Rendering errors
  if (message.includes('render') || stack.includes('render') || message.includes('element')) {
    return { category: 'rendering', severity: 'high', recoverable: true };
  }

  // Permission errors
  if (message.includes('permission') || message.includes('unauthorized')) {
    return { category: 'permission', severity: 'medium', recoverable: false };
  }

  // Logic errors
  if (message.includes('undefined') || message.includes('null') || message.includes('cannot read property')) {
    return { category: 'logic', severity: 'high', recoverable: true };
  }

  return { category: 'unknown', severity: 'critical', recoverable: false };
};

class AdvancedErrorBoundary extends Component<AdvancedErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private errorReportingEnabled: boolean;

  constructor(props: AdvancedErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false,
      recoveryAttempts: [],
      userFeedback: '',
    };

    this.errorReportingEnabled = props.enableErrorReporting ?? true;
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AdvancedErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    this.setState({
      errorInfo,
    });

    // Report error
    if (this.errorReportingEnabled) {
      this.reportError(error, errorInfo);
    }

    // Call onError callback
    this.props.onError?.(error, errorInfo);

    // Attempt automatic recovery
    this.attemptAutoRecovery(error, errorInfo);
  }

  componentDidUpdate(prevProps: AdvancedErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset error state when specified props change
    if (hasError && resetOnPropsChange && resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        key => (prevProps as any)[key] !== (this.props as any)[key]
      );

      if (hasResetKeyChanged) {
        console.log('Resetting error boundary due to prop change');
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const { errorId, retryCount, recoveryAttempts, userFeedback } = this.state;
      const { level } = this.props;

      const errorReport: ErrorReport = {
        errorId: errorId!,
        message: error.message,
        stack: error.stack || '',
        componentStack: errorInfo.componentStack,
        level,
        timestamp: Date.now(),
        retryCount,
        userAgent: navigator.userAgent,
        appVersion: '1.0.0', // Should come from app config
        recoveryAttempts,
        userFeedback: userFeedback || undefined,
        context: {
          props: this.props,
          // Add additional context as needed
        },
      };

      // In a real app, send to error reporting service
      console.log('Error report:', errorReport);
      
      // Could integrate with services like Sentry, Bugsnag, etc.
      // await errorReportingService.report(errorReport);

    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  attemptAutoRecovery = async (error: Error, errorInfo: ErrorInfo) => {
    const { recoveryStrategies = [] } = this.props;
    const errorCategory = categorizeError(error);

    if (!errorCategory.recoverable) {
      console.log('Error is not recoverable, skipping auto-recovery');
      return;
    }

    // Get applicable recovery strategies
    const applicableStrategies = recoveryStrategies
      .filter(strategy => strategy.autoExecute)
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

    if (applicableStrategies.length === 0) {
      console.log('No auto-recovery strategies available');
      return;
    }

    this.setState({ isRecovering: true });

    for (const strategy of applicableStrategies) {
      try {
        console.log(`Attempting recovery strategy: ${strategy.name}`);
        
        await strategy.action();
        
        this.setState(prevState => ({
          recoveryAttempts: [...prevState.recoveryAttempts, strategy.name],
        }));

        // Wait a bit before next strategy
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (strategyError) {
        console.error(`Recovery strategy ${strategy.name} failed:`, strategyError);
      }
    }

    this.setState({ isRecovering: false });
  };

  resetErrorBoundary = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false,
      recoveryAttempts: [],
      userFeedback: '',
    });
  };

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      Alert.alert(
        'Maximum Retries Reached',
        `This component has failed ${maxRetries} times. Please restart the app or report the issue.`,
        [{ text: 'OK' }]
      );
      return;
    }

    console.log(`Retrying... Attempt ${retryCount + 1}/${maxRetries}`);

    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1,
      isRecovering: true,
    }));

    // Add a delay before retry to let things settle
    this.retryTimeoutId = setTimeout(() => {
      this.setState({ isRecovering: false });
      this.resetErrorBoundary();
    }, 1000);
  };

  handleRecoveryStrategy = async (strategy: RecoveryStrategy) => {
    this.setState({ isRecovering: true });

    try {
      console.log(`Executing recovery strategy: ${strategy.name}`);
      await strategy.action();
      
      this.setState(prevState => ({
        recoveryAttempts: [...prevState.recoveryAttempts, strategy.name],
        isRecovering: false,
      }));

      // If strategy succeeds, try to reset the boundary
      setTimeout(() => {
        this.resetErrorBoundary();
      }, 500);

    } catch (error) {
      console.error(`Recovery strategy ${strategy.name} failed:`, error);
      this.setState({ isRecovering: false });
      
      Alert.alert(
        'Recovery Failed',
        `The recovery strategy "${strategy.name}" failed. Please try another approach.`,
        [{ text: 'OK' }]
      );
    }
  };

  handleShareError = async () => {
    const { error, errorInfo, errorId } = this.state;
    
    if (!error || !errorInfo) return;

    const errorDetails = `
Error ID: ${errorId}
Message: ${error.message}
Stack: ${error.stack}
Component Stack: ${errorInfo.componentStack}
    `.trim();

    try {
      await Share.share({
        message: `App Error Report:\n\n${errorDetails}`,
        title: 'Error Report',
      });
    } catch (shareError) {
      console.error('Failed to share error:', shareError);
    }
  };

  handleCopyError = async () => {
    const { error, errorInfo, errorId } = this.state;
    
    if (!error || !errorInfo) return;

    const errorDetails = `
Error ID: ${errorId}
Message: ${error.message}
Stack: ${error.stack}
Component Stack: ${errorInfo.componentStack}
    `.trim();

    try {
      await Clipboard.setString(errorDetails);
      Alert.alert('Copied', 'Error details copied to clipboard');
    } catch (copyError) {
      console.error('Failed to copy error:', copyError);
    }
  };

  render() {
    const { hasError, error, errorInfo, isRecovering, retryCount } = this.state;
    const { 
      children, 
      fallback: FallbackComponent, 
      level, 
      maxRetries = 3,
      recoveryStrategies = [],
      enableUserFeedback = false,
    } = this.props;

    if (hasError && error && errorInfo) {
      // Use custom fallback component if provided
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={error}
            errorInfo={errorInfo}
            onRetry={this.handleRetry}
            onReport={(err, info) => this.reportError(err, info)}
          />
        );
      }

      // Default error UI
      const errorCategory = categorizeError(error);
      const canRetry = retryCount < maxRetries;
      const hasRecoveryStrategies = recoveryStrategies.length > 0;

      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Error Icon and Title */}
            <View style={styles.header}>
              <MaterialIcons
                name="error-outline"
                size={48}
                color={theme.colors.error}
                style={styles.errorIcon}
              />
              <Text style={styles.title}>
                {level === 'critical' ? 'Critical Error' : 'Something went wrong'}
              </Text>
              <Text style={styles.subtitle}>
                {errorCategory.category} error • {errorCategory.severity} severity
              </Text>
            </View>

            {/* Error Message */}
            <View style={styles.messageContainer}>
              <Text style={styles.message}>
                {error.message || 'An unexpected error occurred'}
              </Text>
              {retryCount > 0 && (
                <Text style={styles.retryInfo}>
                  Retry attempt {retryCount} of {maxRetries}
                </Text>
              )}
            </View>

            {/* Recovery Strategies */}
            {hasRecoveryStrategies && (
              <View style={styles.recoveryContainer}>
                <Text style={styles.recoveryTitle}>Try these solutions:</Text>
                {recoveryStrategies.map((strategy, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.recoveryButton}
                    onPress={() => this.handleRecoveryStrategy(strategy)}
                    disabled={isRecovering}
                  >
                    <Text style={styles.recoveryButtonText}>
                      {strategy.name}
                    </Text>
                    <Text style={styles.recoveryDescription}>
                      {strategy.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              {canRetry && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={this.handleRetry}
                  disabled={isRecovering}
                >
                  <MaterialIcons name="refresh" size={20} color={theme.colors.white} />
                  <Text style={styles.primaryButtonText}>
                    {isRecovering ? 'Retrying...' : 'Try Again'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={this.handleShareError}
              >
                <MaterialIcons name="share" size={20} color={theme.colors.primary} />
                <Text style={styles.secondaryButtonText}>Share Error</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={this.handleCopyError}
              >
                <MaterialIcons name="content-copy" size={20} color={theme.colors.primary} />
                <Text style={styles.secondaryButtonText}>Copy Details</Text>
              </TouchableOpacity>
            </View>

            {/* User Feedback */}
            {enableUserFeedback && (
              <View style={styles.feedbackContainer}>
                <Text style={styles.feedbackTitle}>Help us improve</Text>
                <Text style={styles.feedbackSubtitle}>
                  What were you doing when this error occurred?
                </Text>
                {/* TextInput would go here for user feedback */}
              </View>
            )}

            {/* Technical Details (Collapsible) */}
            {__DEV__ && (
              <View style={styles.technicalDetails}>
                <Text style={styles.technicalTitle}>Technical Details</Text>
                <Text style={styles.technicalText}>
                  Error: {error.message}
                </Text>
                <Text style={styles.technicalText}>
                  Stack: {error.stack}
                </Text>
                <Text style={styles.technicalText}>
                  Component Stack: {errorInfo.componentStack}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      );
    }

    return children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  errorIcon: {
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  messageContainer: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  message: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    lineHeight: theme.typography.fontSize.base * 1.5,
    textAlign: 'center',
  },
  retryInfo: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  recoveryContainer: {
    marginBottom: theme.spacing.lg,
  },
  recoveryTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  recoveryButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recoveryButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
  },
  recoveryDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  actionsContainer: {
    gap: theme.spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  feedbackContainer: {
    marginTop: theme.spacing.xl,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.md,
  },
  feedbackTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  feedbackSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  technicalDetails: {
    marginTop: theme.spacing.xl,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.md,
  },
  technicalTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  technicalText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: theme.spacing.xs,
  },
});

export default AdvancedErrorBoundary;