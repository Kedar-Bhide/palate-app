import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  PanResponder,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useMemoryManagement } from '../../hooks/useMemoryManagement';
import { useNetworkCache } from '../../hooks/useNetworkCache';

export interface PerformanceIssue {
  type: 'fps' | 'memory' | 'network' | 'interaction';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: number;
  value?: number;
  recommendations?: string[];
}

export interface PerformanceMonitorProps {
  enabled: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showFPS?: boolean;
  showMemory?: boolean;
  showNetwork?: boolean;
  onPerformanceIssue?: (issue: PerformanceIssue) => void;
  draggable?: boolean;
  expandable?: boolean;
}

interface PerformanceMetrics {
  fps: number;
  averageFPS: number;
  memoryUsage: number;
  memoryPressure: string;
  networkLatency: number;
  networkRequests: number;
  interactionLatency: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled,
  position = 'top-right',
  showFPS = true,
  showMemory = true,
  showNetwork = true,
  onPerformanceIssue,
  draggable = true,
  expandable = true,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    averageFPS: 60,
    memoryUsage: 0,
    memoryPressure: 'low',
    networkLatency: 0,
    networkRequests: 0,
    interactionLatency: 0,
  });
  
  const [expanded, setExpanded] = useState(false);
  const [position3d, setPosition] = useState(() => {
    switch (position) {
      case 'top-left':
        return { x: 20, y: 50 };
      case 'top-right':
        return { x: SCREEN_WIDTH - 120, y: 50 };
      case 'bottom-left':
        return { x: 20, y: SCREEN_HEIGHT - 150 };
      case 'bottom-right':
      default:
        return { x: SCREEN_WIDTH - 120, y: SCREEN_HEIGHT - 150 };
    }
  });
  
  const panRef = useRef(new Animated.ValueXY(position3d)).current;
  const opacityRef = useRef(new Animated.Value(0.8)).current;
  const scaleRef = useRef(new Animated.Value(1)).current;
  
  // Performance tracking refs
  const fpsHistory = useRef<number[]>([]);
  const frameTimestamp = useRef(Date.now());
  const frameCount = useRef(0);
  const networkStartTimes = useRef<Map<string, number>>(new Map());
  const interactionStartTime = useRef<number>(0);
  
  const { memoryUsage, memoryPressure, memoryLeaks } = useMemoryManagement();
  const { getNetworkQuality, isOnline } = useNetworkCache();

  // FPS tracking
  const trackFPS = useCallback(() => {
    const now = Date.now();
    const delta = now - frameTimestamp.current;
    
    if (delta >= 1000) {
      const currentFPS = Math.round((frameCount.current * 1000) / delta);
      
      fpsHistory.current.push(currentFPS);
      if (fpsHistory.current.length > 60) {
        fpsHistory.current.shift();
      }
      
      const averageFPS = fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length;
      
      setMetrics(prev => ({
        ...prev,
        fps: currentFPS,
        averageFPS: Math.round(averageFPS),
      }));
      
      // Check for FPS issues
      if (currentFPS < 30 && onPerformanceIssue) {
        onPerformanceIssue({
          type: 'fps',
          severity: currentFPS < 20 ? 'critical' : 'high',
          description: `Low FPS detected: ${currentFPS} fps`,
          timestamp: now,
          value: currentFPS,
          recommendations: [
            'Reduce component complexity',
            'Optimize heavy computations',
            'Check for memory leaks',
            'Use virtualized lists for long lists',
          ],
        });
      }
      
      frameCount.current = 0;
      frameTimestamp.current = now;
    } else {
      frameCount.current++;
    }
  }, [onPerformanceIssue]);

  // Network performance tracking
  const trackNetworkPerformance = useCallback(() => {
    const quality = getNetworkQuality();
    let latency = 0;
    
    switch (quality) {
      case 'poor':
        latency = 2000;
        break;
      case 'good':
        latency = 500;
        break;
      case 'excellent':
        latency = 100;
        break;
    }
    
    setMetrics(prev => ({
      ...prev,
      networkLatency: latency,
      networkRequests: prev.networkRequests + (Math.random() < 0.1 ? 1 : 0), // Simulate request tracking
    }));
    
    // Check for network issues
    if (latency > 1000 && isOnline && onPerformanceIssue) {
      onPerformanceIssue({
        type: 'network',
        severity: latency > 3000 ? 'critical' : 'high',
        description: `High network latency: ${latency}ms`,
        timestamp: Date.now(),
        value: latency,
        recommendations: [
          'Check internet connection',
          'Consider offline caching',
          'Implement request retry logic',
          'Reduce payload sizes',
        ],
      });
    }
  }, [getNetworkQuality, isOnline, onPerformanceIssue]);

  // Memory performance tracking
  const trackMemoryPerformance = useCallback(() => {
    const usagePercentage = memoryUsage.usagePercentage;
    
    setMetrics(prev => ({
      ...prev,
      memoryUsage: usagePercentage,
      memoryPressure,
    }));
    
    // Check for memory issues
    if (usagePercentage > 80 && onPerformanceIssue) {
      onPerformanceIssue({
        type: 'memory',
        severity: usagePercentage > 95 ? 'critical' : 'high',
        description: `High memory usage: ${usagePercentage.toFixed(1)}%`,
        timestamp: Date.now(),
        value: usagePercentage,
        recommendations: [
          'Force garbage collection',
          'Clear unused caches',
          'Reduce image memory usage',
          'Check for memory leaks',
        ],
      });
    }
    
    // Check for memory leaks
    if (memoryLeaks.length > 0) {
      const criticalLeaks = memoryLeaks.filter(leak => leak.severity === 'critical');
      if (criticalLeaks.length > 0 && onPerformanceIssue) {
        onPerformanceIssue({
          type: 'memory',
          severity: 'critical',
          description: `${criticalLeaks.length} critical memory leaks detected`,
          timestamp: Date.now(),
          value: criticalLeaks.length,
          recommendations: [
            'Review component lifecycle methods',
            'Check subscription cleanup',
            'Verify timer cleanup',
            'Audit reference management',
          ],
        });
      }
    }
  }, [memoryUsage, memoryPressure, memoryLeaks, onPerformanceIssue]);

  // Interaction latency tracking
  const trackInteractionLatency = useCallback(() => {
    if (interactionStartTime.current > 0) {
      const latency = Date.now() - interactionStartTime.current;
      
      setMetrics(prev => ({
        ...prev,
        interactionLatency: latency,
      }));
      
      // Check for interaction issues
      if (latency > 100 && onPerformanceIssue) {
        onPerformanceIssue({
          type: 'interaction',
          severity: latency > 300 ? 'high' : 'medium',
          description: `Slow interaction response: ${latency}ms`,
          timestamp: Date.now(),
          value: latency,
          recommendations: [
            'Optimize touch handlers',
            'Reduce computation in handlers',
            'Use native driver for animations',
            'Debounce rapid interactions',
          ],
        });
      }
      
      interactionStartTime.current = 0;
    }
  }, [onPerformanceIssue]);

  // Pan responder for dragging
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => draggable,
    onPanResponderMove: Animated.event(
      [null, { dx: panRef.x, dy: panRef.y }],
      { useNativeDriver: false }
    ),
    onPanResponderRelease: (_, gestureState) => {
      const newX = Math.max(0, Math.min(SCREEN_WIDTH - 100, position3d.x + gestureState.dx));
      const newY = Math.max(0, Math.min(SCREEN_HEIGHT - 100, position3d.y + gestureState.dy));
      
      setPosition({ x: newX, y: newY });
      
      Animated.spring(panRef, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
      }).start();
    },
  });

  // Toggle expanded view
  const toggleExpanded = useCallback(() => {
    if (!expandable) return;
    
    setExpanded(!expanded);
    
    Animated.parallel([
      Animated.spring(scaleRef, {
        toValue: expanded ? 1 : 1.2,
        useNativeDriver: true,
      }),
      Animated.timing(opacityRef, {
        toValue: expanded ? 0.8 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [expanded, expandable, scaleRef, opacityRef]);

  // Start performance monitoring
  useEffect(() => {
    if (!enabled) return;
    
    const monitoringInterval = setInterval(() => {
      trackFPS();
      trackNetworkPerformance();
      trackMemoryPerformance();
      trackInteractionLatency();
    }, 1000);
    
    return () => {
      clearInterval(monitoringInterval);
    };
  }, [enabled, trackFPS, trackNetworkPerformance, trackMemoryPerformance, trackInteractionLatency]);

  // Track interactions
  useEffect(() => {
    const startInteractionTracking = () => {
      interactionStartTime.current = Date.now();
    };
    
    // This is a simplified version - in a real implementation,
    // you'd want to integrate with React Navigation or gesture handlers
    const touchStartListener = () => startInteractionTracking();
    
    return () => {
      // Cleanup listeners
    };
  }, []);

  if (!enabled) {
    return null;
  }

  const getPerformanceColor = (value: number, type: 'fps' | 'memory' | 'network' | 'interaction') => {
    switch (type) {
      case 'fps':
        return value >= 55 ? theme.colors.success : value >= 30 ? theme.colors.warning : theme.colors.error;
      case 'memory':
        return value <= 50 ? theme.colors.success : value <= 80 ? theme.colors.warning : theme.colors.error;
      case 'network':
        return value <= 200 ? theme.colors.success : value <= 1000 ? theme.colors.warning : theme.colors.error;
      case 'interaction':
        return value <= 100 ? theme.colors.success : value <= 200 ? theme.colors.warning : theme.colors.error;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: position3d.x,
          top: position3d.y,
          opacity: opacityRef,
          transform: [
            { translateX: panRef.x },
            { translateY: panRef.y },
            { scale: scaleRef },
          ],
        },
        expanded && styles.expandedContainer,
      ]}
      {...(draggable ? panResponder.panHandlers : {})}
    >
      <TouchableOpacity
        onPress={toggleExpanded}
        style={[styles.monitor, expanded && styles.expandedMonitor]}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.header}>
          <MaterialIcons
            name="speed"
            size={16}
            color={theme.colors.white}
          />
          <Text style={styles.title}>Performance</Text>
          {expandable && (
            <MaterialIcons
              name={expanded ? 'expand-less' : 'expand-more'}
              size={16}
              color={theme.colors.white}
            />
          )}
        </View>

        {/* Compact view */}
        {!expanded && (
          <View style={styles.compactMetrics}>
            {showFPS && (
              <View style={styles.metric}>
                <Text style={[styles.metricValue, { color: getPerformanceColor(metrics.fps, 'fps') }]}>
                  {metrics.fps}
                </Text>
                <Text style={styles.metricLabel}>FPS</Text>
              </View>
            )}
            {showMemory && (
              <View style={styles.metric}>
                <Text style={[styles.metricValue, { color: getPerformanceColor(metrics.memoryUsage, 'memory') }]}>
                  {metrics.memoryUsage.toFixed(0)}%
                </Text>
                <Text style={styles.metricLabel}>MEM</Text>
              </View>
            )}
          </View>
        )}

        {/* Expanded view */}
        {expanded && (
          <View style={styles.expandedMetrics}>
            {showFPS && (
              <View style={styles.expandedMetric}>
                <Text style={styles.expandedLabel}>FPS</Text>
                <Text style={[styles.expandedValue, { color: getPerformanceColor(metrics.fps, 'fps') }]}>
                  {metrics.fps} / {metrics.averageFPS} avg
                </Text>
              </View>
            )}
            
            {showMemory && (
              <View style={styles.expandedMetric}>
                <Text style={styles.expandedLabel}>Memory</Text>
                <Text style={[styles.expandedValue, { color: getPerformanceColor(metrics.memoryUsage, 'memory') }]}>
                  {metrics.memoryUsage.toFixed(1)}% ({metrics.memoryPressure})
                </Text>
              </View>
            )}
            
            {showNetwork && (
              <View style={styles.expandedMetric}>
                <Text style={styles.expandedLabel}>Network</Text>
                <Text style={[styles.expandedValue, { color: getPerformanceColor(metrics.networkLatency, 'network') }]}>
                  {metrics.networkLatency}ms
                </Text>
              </View>
            )}
            
            <View style={styles.expandedMetric}>
              <Text style={styles.expandedLabel}>Interaction</Text>
              <Text style={[styles.expandedValue, { color: getPerformanceColor(metrics.interactionLatency, 'interaction') }]}>
                {metrics.interactionLatency}ms
              </Text>
            </View>
            
            {memoryLeaks.length > 0 && (
              <View style={[styles.expandedMetric, styles.warningMetric]}>
                <Text style={styles.expandedLabel}>Memory Leaks</Text>
                <Text style={[styles.expandedValue, { color: theme.colors.error }]}>
                  {memoryLeaks.length} detected
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 999999,
  },
  expandedContainer: {
    // Additional styles for expanded state
  },
  monitor: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    minWidth: 80,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  expandedMonitor: {
    minWidth: 200,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  title: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    marginLeft: theme.spacing.xs,
    flex: 1,
  },
  compactMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
  },
  metricLabel: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.xs,
    opacity: 0.8,
  },
  expandedMetrics: {
    gap: theme.spacing.sm,
  },
  expandedMetric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  warningMetric: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  expandedLabel: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.sm,
    opacity: 0.9,
  },
  expandedValue: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});

PerformanceMonitor.displayName = 'PerformanceMonitor';

export default PerformanceMonitor;