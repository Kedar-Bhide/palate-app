import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { theme } from '../../theme';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<{
    error: Error;
    errorInfo: ErrorInfo | null;
    resetError: () => void;
  }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'screen' | 'component' | 'critical';
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number | boolean | null | undefined>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Log error to console in development
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Error info:', errorInfo);
    }

    // Log error for production monitoring
    this.logError(error, errorInfo);

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error state if resetOnPropsChange is true and props changed
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetError();
      return;
    }

    // Reset error state if resetKeys changed
    if (hasError && resetKeys && prevProps.resetKeys !== resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => prevProps.resetKeys?.[index] !== key
      );
      
      if (hasResetKeyChanged) {
        this.resetError();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  logError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        level: this.props.level || 'component',
        errorId: this.state.errorId,
        userAgent: navigator.userAgent,
      };

      // In a real app, you would send this to your error reporting service
      // Examples: Sentry, Crashlytics, Bugsnag, etc.
      console.log('Error logged:', errorData);
      
      // For now, just log to console
      if (!__DEV__) {
        // You could send to your analytics service here
        // Analytics.logError(errorData);
      }
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  };

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  handleRetry = () => {
    this.resetError();
    
    // Add a small delay to prevent immediate re-rendering issues
    this.resetTimeoutId = window.setTimeout(() => {
      // Force a re-render of children
      this.forceUpdate();
    }, 100);
  };

  handleReload = () => {
    // In React Native, you might want to restart the app
    // For now, just reset the error
    this.resetError();
  };

  handleReportError = () => {
    const { error, errorInfo } = this.state;
    
    if (!error) return;

    const subject = encodeURIComponent(`Error Report - ${error.message}`);
    const body = encodeURIComponent(
      `Error: ${error.message}\n\nStack: ${error.stack}\n\nComponent Stack: ${errorInfo?.componentStack || 'N/A'}\n\nTimestamp: ${new Date().toISOString()}`
    );
    
    const mailto = `mailto:support@palate-app.com?subject=${subject}&body=${body}`;
    Linking.openURL(mailto);
  };

  renderDefaultFallback = () => {
    const { error, errorInfo } = this.state;
    const { level = 'component' } = this.props;

    if (level === 'component') {
      return (
        <View style={styles.componentErrorContainer}>
          <MaterialIcons name="error-outline" size={24} color={theme.colors.error} />
          <Text style={styles.componentErrorText}>Something went wrong</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={this.handleRetry}
          >
            <MaterialIcons name="refresh" size={16} color={theme.colors.primary} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.screenErrorContainer} contentContainerStyle={styles.screenErrorContent}>
        <View style={styles.errorHeader}>
          <MaterialIcons name="error" size={48} color={theme.colors.error} />
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorSubtitle}>
            We're sorry for the inconvenience. The app encountered an unexpected error.
          </Text>
        </View>

        <View style={styles.errorActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={this.handleRetry}
          >
            <MaterialIcons name="refresh" size={20} color={theme.colors.white} />
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={this.handleReload}
          >
            <MaterialIcons name="home" size={20} color={theme.colors.primary} />
            <Text style={styles.secondaryButtonText}>Go Home</Text>
          </TouchableOpacity>
        </View>

        {__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Debug Information</Text>
            <ScrollView style={styles.debugScrollView}>
              <Text style={styles.debugText}>
                <Text style={styles.debugLabel}>Error: </Text>
                {error?.message}
              </Text>
              <Text style={styles.debugText}>
                <Text style={styles.debugLabel}>Stack: </Text>
                {error?.stack}
              </Text>
              {errorInfo && (
                <Text style={styles.debugText}>
                  <Text style={styles.debugLabel}>Component Stack: </Text>
                  {errorInfo.componentStack}
                </Text>
              )}
            </ScrollView>
          </View>
        )}

        <View style={styles.errorFooter}>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={this.handleReportError}
          >
            <MaterialIcons name="bug-report" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.reportButtonText}>Report this error</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  render() {
    const { hasError } = this.state;
    const { children, fallback: CustomFallback } = this.props;

    if (hasError) {
      // Render custom fallback if provided
      if (CustomFallback) {
        return (
          <CustomFallback
            error={this.state.error!}
            errorInfo={this.state.errorInfo}
            resetError={this.resetError}
          />
        );
      }

      // Render default fallback
      return this.renderDefaultFallback();
    }

    return children;
  }
}

const styles = StyleSheet.create({
  componentErrorContainer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    minHeight: 120,
  },
  componentErrorText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  retryButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
    marginLeft: theme.spacing.xs,
  },
  
  screenErrorContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screenErrorContent: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'center',
  },
  errorHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  errorTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  errorSubtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.base * 1.5,
  },
  errorActions: {
    marginBottom: theme.spacing.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  primaryButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.white,
    marginLeft: theme.spacing.sm,
  },
  secondaryButton: {
    backgroundColor: theme.colors.white,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  secondaryButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  debugContainer: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.gray[900],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    maxHeight: 200,
  },
  debugTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.white,
    marginBottom: theme.spacing.sm,
  },
  debugScrollView: {
    flex: 1,
  },
  debugText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.gray[300],
    fontFamily: 'monospace',
    marginBottom: theme.spacing.sm,
  },
  debugLabel: {
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.white,
  },
  errorFooter: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  reportButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
});

export default ErrorBoundary;