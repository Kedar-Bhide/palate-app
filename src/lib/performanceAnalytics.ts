export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'fps' | 'count' | 'percentage';
  category: 'rendering' | 'network' | 'memory' | 'user_interaction' | 'bundle' | 'custom';
  timestamp: number;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface PerformanceAnalysis {
  overallScore: number;
  categoryScores: Record<string, number>;
  trends: Array<{
    metric: string;
    trend: 'improving' | 'stable' | 'degrading';
    change: number;
    confidence: number;
  }>;
  recommendations: string[];
  criticalIssues: string[];
  summary: string;
}

export interface PerformanceBottleneck {
  id: string;
  type: 'component' | 'network' | 'memory' | 'computation' | 'io';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: number; // 0-100
  affectedMetrics: string[];
  detectedAt: number;
  suggestedFix: string;
  estimatedImprovement: number;
}

export interface PerformanceReport {
  id: string;
  generatedAt: number;
  timeRange: {
    start: number;
    end: number;
  };
  analysis: PerformanceAnalysis;
  bottlenecks: PerformanceBottleneck[];
  metrics: PerformanceMetric[];
  deviceInfo: DeviceInfo;
  appInfo: AppInfo;
}

export interface OptimizationRecommendation {
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  estimatedImpact: number; // 0-100
  implementationComplexity: 'easy' | 'medium' | 'hard';
  steps: string[];
  relatedMetrics: string[];
}

interface DeviceInfo {
  model?: string;
  os: string;
  osVersion: string;
  memory?: number;
  screenSize: { width: number; height: number };
  connectionType?: string;
}

interface AppInfo {
  version: string;
  buildNumber?: string;
  environment: 'development' | 'staging' | 'production';
}

// Global performance tracking
const performanceMetrics = new Map<string, PerformanceMetric[]>();
const metricSubscribers = new Set<(metric: PerformanceMetric) => void>();
const analysisHistory: PerformanceAnalysis[] = [];
const detectedBottlenecks = new Map<string, PerformanceBottleneck>();

// Performance thresholds for scoring
const PERFORMANCE_THRESHOLDS = {
  rendering: {
    excellent: { fps: 58, renderTime: 16 },
    good: { fps: 45, renderTime: 22 },
    poor: { fps: 30, renderTime: 33 },
  },
  memory: {
    excellent: { usage: 50, leaks: 0 },
    good: { usage: 70, leaks: 1 },
    poor: { usage: 85, leaks: 3 },
  },
  network: {
    excellent: { latency: 100, errorRate: 0.01 },
    good: { latency: 300, errorRate: 0.05 },
    poor: { latency: 1000, errorRate: 0.1 },
  },
  bundle: {
    excellent: { size: 1024 * 1024, loadTime: 500 },
    good: { size: 2 * 1024 * 1024, loadTime: 1000 },
    poor: { size: 5 * 1024 * 1024, loadTime: 3000 },
  },
};

/**
 * Track a performance metric
 */
export const trackPerformanceMetric = (metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): string => {
  const completeMetric: PerformanceMetric = {
    ...metric,
    id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };

  // Store metric
  const categoryMetrics = performanceMetrics.get(metric.category) || [];
  categoryMetrics.push(completeMetric);
  
  // Keep only last 100 metrics per category
  if (categoryMetrics.length > 100) {
    categoryMetrics.shift();
  }
  
  performanceMetrics.set(metric.category, categoryMetrics);

  // Notify subscribers
  metricSubscribers.forEach(subscriber => {
    try {
      subscriber(completeMetric);
    } catch (error) {
      console.error('Error in performance metric subscriber:', error);
    }
  });

  console.log(`Performance metric tracked: ${metric.name} = ${metric.value}${metric.unit}`);
  
  return completeMetric.id;
};

/**
 * Analyze performance data and generate insights
 */
export const analyzePerformanceData = (timeRangeMs?: number): PerformanceAnalysis => {
  const now = Date.now();
  const timeThreshold = timeRangeMs ? now - timeRangeMs : 0;

  // Get recent metrics for analysis
  const recentMetrics = Array.from(performanceMetrics.values())
    .flat()
    .filter(metric => metric.timestamp > timeThreshold);

  if (recentMetrics.length === 0) {
    return {
      overallScore: 100,
      categoryScores: {},
      trends: [],
      recommendations: ['Start tracking performance metrics to get insights'],
      criticalIssues: [],
      summary: 'No performance data available for analysis',
    };
  }

  // Calculate category scores
  const categoryScores: Record<string, number> = {};
  const categories = Array.from(new Set(recentMetrics.map(m => m.category)));

  categories.forEach(category => {
    const categoryMetrics = recentMetrics.filter(m => m.category === category);
    categoryScores[category] = calculateCategoryScore(category, categoryMetrics);
  });

  // Calculate overall score
  const overallScore = Object.values(categoryScores).reduce((sum, score) => sum + score, 0) / categories.length;

  // Analyze trends
  const trends = analyzeTrends(recentMetrics);

  // Generate recommendations
  const recommendations = generateRecommendations(categoryScores, trends);

  // Identify critical issues
  const criticalIssues = identifyCriticalIssues(recentMetrics, categoryScores);

  // Generate summary
  const summary = generateSummary(overallScore, categoryScores, criticalIssues);

  const analysis: PerformanceAnalysis = {
    overallScore: Math.round(overallScore),
    categoryScores,
    trends,
    recommendations,
    criticalIssues,
    summary,
  };

  // Store analysis in history
  analysisHistory.push(analysis);
  if (analysisHistory.length > 20) {
    analysisHistory.shift();
  }

  return analysis;
};

/**
 * Detect performance bottlenecks
 */
export const detectBottlenecks = (timeRangeMs: number = 5 * 60 * 1000): PerformanceBottleneck[] => {
  const now = Date.now();
  const timeThreshold = now - timeRangeMs;

  const recentMetrics = Array.from(performanceMetrics.values())
    .flat()
    .filter(metric => metric.timestamp > timeThreshold);

  const bottlenecks: PerformanceBottleneck[] = [];

  // Detect rendering bottlenecks
  const renderingMetrics = recentMetrics.filter(m => m.category === 'rendering');
  const avgFPS = calculateAverage(renderingMetrics.filter(m => m.name === 'fps').map(m => m.value));
  
  if (avgFPS < PERFORMANCE_THRESHOLDS.rendering.poor.fps) {
    bottlenecks.push({
      id: `rendering_fps_${now}`,
      type: 'component',
      severity: avgFPS < 20 ? 'critical' : 'high',
      description: `Low FPS detected: average ${avgFPS.toFixed(1)} fps`,
      impact: Math.max(0, 100 - (avgFPS / 60) * 100),
      affectedMetrics: ['fps', 'render_time'],
      detectedAt: now,
      suggestedFix: 'Optimize component render cycles, reduce complexity, use memoization',
      estimatedImprovement: 30,
    });
  }

  // Detect memory bottlenecks
  const memoryMetrics = recentMetrics.filter(m => m.category === 'memory');
  const avgMemoryUsage = calculateAverage(memoryMetrics.filter(m => m.name === 'usage_percentage').map(m => m.value));
  
  if (avgMemoryUsage > PERFORMANCE_THRESHOLDS.memory.poor.usage) {
    bottlenecks.push({
      id: `memory_usage_${now}`,
      type: 'memory',
      severity: avgMemoryUsage > 95 ? 'critical' : 'high',
      description: `High memory usage: ${avgMemoryUsage.toFixed(1)}%`,
      impact: Math.max(0, avgMemoryUsage - 50),
      affectedMetrics: ['memory_usage', 'memory_leaks'],
      detectedAt: now,
      suggestedFix: 'Clear unused caches, fix memory leaks, optimize image usage',
      estimatedImprovement: 40,
    });
  }

  // Detect network bottlenecks
  const networkMetrics = recentMetrics.filter(m => m.category === 'network');
  const avgLatency = calculateAverage(networkMetrics.filter(m => m.name === 'latency').map(m => m.value));
  
  if (avgLatency > PERFORMANCE_THRESHOLDS.network.poor.latency) {
    bottlenecks.push({
      id: `network_latency_${now}`,
      type: 'network',
      severity: avgLatency > 3000 ? 'critical' : 'medium',
      description: `High network latency: ${avgLatency.toFixed(0)}ms`,
      impact: Math.min(100, (avgLatency / 1000) * 20),
      affectedMetrics: ['network_latency', 'request_time'],
      detectedAt: now,
      suggestedFix: 'Implement caching, reduce payload sizes, optimize API calls',
      estimatedImprovement: 50,
    });
  }

  // Store detected bottlenecks
  bottlenecks.forEach(bottleneck => {
    detectedBottlenecks.set(bottleneck.id, bottleneck);
  });

  return bottlenecks;
};

/**
 * Calculate User Experience score based on key metrics
 */
export const calculateUXScore = (): number => {
  const recentMetrics = Array.from(performanceMetrics.values())
    .flat()
    .filter(metric => metric.timestamp > Date.now() - 60000); // Last minute

  if (recentMetrics.length === 0) {
    return 100; // No data, assume good
  }

  const weights = {
    fps: 0.3,
    memory: 0.2,
    network: 0.25,
    interaction: 0.25,
  };

  let score = 0;
  let totalWeight = 0;

  // FPS score
  const fpsMetrics = recentMetrics.filter(m => m.name === 'fps');
  if (fpsMetrics.length > 0) {
    const avgFPS = calculateAverage(fpsMetrics.map(m => m.value));
    const fpsScore = Math.min(100, (avgFPS / 60) * 100);
    score += fpsScore * weights.fps;
    totalWeight += weights.fps;
  }

  // Memory score
  const memoryMetrics = recentMetrics.filter(m => m.name === 'usage_percentage');
  if (memoryMetrics.length > 0) {
    const avgMemory = calculateAverage(memoryMetrics.map(m => m.value));
    const memoryScore = Math.max(0, 100 - avgMemory);
    score += memoryScore * weights.memory;
    totalWeight += weights.memory;
  }

  // Network score
  const networkMetrics = recentMetrics.filter(m => m.name === 'latency');
  if (networkMetrics.length > 0) {
    const avgLatency = calculateAverage(networkMetrics.map(m => m.value));
    const networkScore = Math.max(0, 100 - (avgLatency / 1000) * 20);
    score += networkScore * weights.network;
    totalWeight += weights.network;
  }

  // Interaction score
  const interactionMetrics = recentMetrics.filter(m => m.name === 'interaction_latency');
  if (interactionMetrics.length > 0) {
    const avgInteraction = calculateAverage(interactionMetrics.map(m => m.value));
    const interactionScore = Math.max(0, 100 - (avgInteraction / 200) * 100);
    score += interactionScore * weights.interaction;
    totalWeight += weights.interaction;
  }

  return totalWeight > 0 ? Math.round(score / totalWeight) : 100;
};

/**
 * Generate comprehensive performance report
 */
export const generatePerformanceReport = (): PerformanceReport => {
  const now = Date.now();
  const timeRange = {
    start: now - (24 * 60 * 60 * 1000), // Last 24 hours
    end: now,
  };

  const analysis = analyzePerformanceData(24 * 60 * 60 * 1000);
  const bottlenecks = detectBottlenecks(24 * 60 * 60 * 1000);
  
  const allMetrics = Array.from(performanceMetrics.values())
    .flat()
    .filter(metric => metric.timestamp > timeRange.start);

  const report: PerformanceReport = {
    id: `report_${now}`,
    generatedAt: now,
    timeRange,
    analysis,
    bottlenecks,
    metrics: allMetrics,
    deviceInfo: getDeviceInfo(),
    appInfo: getAppInfo(),
  };

  console.log('Performance report generated:', report.analysis.summary);
  
  return report;
};

/**
 * Generate optimization recommendations based on current metrics
 */
export const optimizeBasedOnMetrics = (): OptimizationRecommendation[] => {
  const analysis = analyzePerformanceData();
  const bottlenecks = detectBottlenecks();
  const recommendations: OptimizationRecommendation[] = [];

  // Rendering optimizations
  if (analysis.categoryScores.rendering < 70) {
    recommendations.push({
      priority: analysis.categoryScores.rendering < 50 ? 'critical' : 'high',
      category: 'rendering',
      title: 'Optimize Component Rendering',
      description: 'Your app has rendering performance issues that affect user experience',
      estimatedImpact: 85,
      implementationComplexity: 'medium',
      steps: [
        'Use React.memo() for expensive components',
        'Implement virtualized lists for long content',
        'Optimize image rendering and caching',
        'Reduce component re-renders with useMemo and useCallback',
        'Profile components with React DevTools',
      ],
      relatedMetrics: ['fps', 'render_time', 'component_updates'],
    });
  }

  // Memory optimizations
  if (analysis.categoryScores.memory < 70) {
    recommendations.push({
      priority: analysis.categoryScores.memory < 40 ? 'critical' : 'high',
      category: 'memory',
      title: 'Optimize Memory Usage',
      description: 'High memory usage detected - risk of crashes on low-end devices',
      estimatedImpact: 75,
      implementationComplexity: 'medium',
      steps: [
        'Implement proper cleanup in useEffect',
        'Clear image caches periodically',
        'Fix memory leaks in subscriptions',
        'Optimize data structures and caching',
        'Use lazy loading for non-critical components',
      ],
      relatedMetrics: ['memory_usage', 'memory_leaks', 'gc_frequency'],
    });
  }

  // Network optimizations
  if (analysis.categoryScores.network < 70) {
    recommendations.push({
      priority: 'high',
      category: 'network',
      title: 'Optimize Network Performance',
      description: 'Network requests are slow and affecting user experience',
      estimatedImpact: 70,
      implementationComplexity: 'easy',
      steps: [
        'Implement request caching and deduplication',
        'Use compression for API responses',
        'Implement proper retry logic with exponential backoff',
        'Preload critical data',
        'Optimize payload sizes',
      ],
      relatedMetrics: ['network_latency', 'request_time', 'error_rate'],
    });
  }

  // Bundle optimizations
  if (analysis.categoryScores.bundle < 70) {
    recommendations.push({
      priority: 'medium',
      category: 'bundle',
      title: 'Optimize Bundle Size',
      description: 'Large bundle size is affecting app startup time',
      estimatedImpact: 60,
      implementationComplexity: 'hard',
      steps: [
        'Implement code splitting by route',
        'Use lazy loading for non-critical components',
        'Analyze and remove unused dependencies',
        'Optimize import statements for tree shaking',
        'Compress and minify assets',
      ],
      relatedMetrics: ['bundle_size', 'load_time', 'startup_time'],
    });
  }

  // Sort by priority and impact
  recommendations.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.estimatedImpact - a.estimatedImpact;
  });

  return recommendations;
};

/**
 * Subscribe to performance metrics
 */
export const subscribeToMetrics = (callback: (metric: PerformanceMetric) => void): (() => void) => {
  metricSubscribers.add(callback);
  
  return () => {
    metricSubscribers.delete(callback);
  };
};

/**
 * Get performance analytics summary
 */
export const getPerformanceSummary = () => {
  const uxScore = calculateUXScore();
  const recentAnalysis = analysisHistory[analysisHistory.length - 1];
  const criticalBottlenecks = Array.from(detectedBottlenecks.values())
    .filter(b => b.severity === 'critical');

  return {
    uxScore,
    lastAnalysis: recentAnalysis,
    criticalBottlenecks: criticalBottlenecks.length,
    totalMetrics: Array.from(performanceMetrics.values()).flat().length,
    categories: Array.from(performanceMetrics.keys()),
  };
};

// Helper functions
const calculateAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const calculateCategoryScore = (category: string, metrics: PerformanceMetric[]): number => {
  if (metrics.length === 0) return 100;

  // Category-specific scoring logic
  switch (category) {
    case 'rendering': {
      const fpsMetrics = metrics.filter(m => m.name === 'fps');
      const avgFPS = calculateAverage(fpsMetrics.map(m => m.value));
      return Math.min(100, (avgFPS / 60) * 100);
    }
    
    case 'memory': {
      const usageMetrics = metrics.filter(m => m.name === 'usage_percentage');
      const avgUsage = calculateAverage(usageMetrics.map(m => m.value));
      return Math.max(0, 100 - avgUsage);
    }
    
    case 'network': {
      const latencyMetrics = metrics.filter(m => m.name === 'latency');
      const avgLatency = calculateAverage(latencyMetrics.map(m => m.value));
      return Math.max(0, 100 - (avgLatency / 1000) * 20);
    }
    
    default:
      return 75; // Default good score
  }
};

const analyzeTrends = (metrics: PerformanceMetric[]) => {
  const trends: PerformanceAnalysis['trends'] = [];
  const metricNames = Array.from(new Set(metrics.map(m => m.name)));

  metricNames.forEach(name => {
    const metricValues = metrics
      .filter(m => m.name === name)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(m => m.value);

    if (metricValues.length < 2) return;

    const trend = calculateTrend(metricValues);
    trends.push({
      metric: name,
      trend: trend.direction,
      change: trend.change,
      confidence: trend.confidence,
    });
  });

  return trends;
};

const calculateTrend = (values: number[]) => {
  if (values.length < 2) {
    return { direction: 'stable' as const, change: 0, confidence: 0 };
  }

  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.ceil(values.length / 2));

  const firstAvg = calculateAverage(firstHalf);
  const secondAvg = calculateAverage(secondHalf);

  const change = ((secondAvg - firstAvg) / firstAvg) * 100;
  const absChange = Math.abs(change);

  let direction: 'improving' | 'stable' | 'degrading';
  if (absChange < 5) {
    direction = 'stable';
  } else if (change > 0) {
    direction = 'improving';
  } else {
    direction = 'degrading';
  }

  const confidence = Math.min(100, Math.max(0, (absChange / 50) * 100));

  return { direction, change, confidence };
};

const generateRecommendations = (categoryScores: Record<string, number>, trends: PerformanceAnalysis['trends']): string[] => {
  const recommendations: string[] = [];

  Object.entries(categoryScores).forEach(([category, score]) => {
    if (score < 50) {
      recommendations.push(`Critical: Improve ${category} performance (score: ${score})`);
    } else if (score < 70) {
      recommendations.push(`Consider optimizing ${category} performance (score: ${score})`);
    }
  });

  trends.forEach(trend => {
    if (trend.trend === 'degrading' && trend.confidence > 70) {
      recommendations.push(`Monitor ${trend.metric} - performance is degrading (${trend.change.toFixed(1)}%)`);
    }
  });

  return recommendations;
};

const identifyCriticalIssues = (metrics: PerformanceMetric[], categoryScores: Record<string, number>): string[] => {
  const issues: string[] = [];

  // Check for critical category scores
  Object.entries(categoryScores).forEach(([category, score]) => {
    if (score < 30) {
      issues.push(`Critical ${category} performance issue (score: ${score})`);
    }
  });

  // Check for specific critical metrics
  const criticalFPS = metrics.filter(m => m.name === 'fps' && m.value < 20);
  if (criticalFPS.length > 0) {
    issues.push(`Critical: FPS dropped below 20 (${criticalFPS.length} times)`);
  }

  const criticalMemory = metrics.filter(m => m.name === 'usage_percentage' && m.value > 95);
  if (criticalMemory.length > 0) {
    issues.push(`Critical: Memory usage exceeded 95% (${criticalMemory.length} times)`);
  }

  return issues;
};

const generateSummary = (overallScore: number, categoryScores: Record<string, number>, criticalIssues: string[]): string => {
  if (criticalIssues.length > 0) {
    return `Performance needs immediate attention (score: ${overallScore}). ${criticalIssues.length} critical issues detected.`;
  }

  if (overallScore >= 80) {
    return `Excellent performance (score: ${overallScore}). Keep up the good work!`;
  } else if (overallScore >= 60) {
    return `Good performance (score: ${overallScore}) with room for improvement.`;
  } else {
    return `Performance issues detected (score: ${overallScore}). Optimization recommended.`;
  }
};

const getDeviceInfo = (): DeviceInfo => {
  return {
    os: 'iOS', // This would be detected dynamically
    osVersion: '16.0',
    screenSize: { width: 390, height: 844 },
    connectionType: 'wifi',
  };
};

const getAppInfo = (): AppInfo => {
  return {
    version: '1.0.0',
    buildNumber: '1',
    environment: __DEV__ ? 'development' : 'production',
  };
};