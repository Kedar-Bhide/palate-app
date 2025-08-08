import { Platform, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// More refined responsive scaling for smoother UI
const getResponsiveSize = (baseSize: number): number => {
  const scale = Math.min(SCREEN_WIDTH / 375, 1.2); // Cap at 120% for very large screens
  return Math.max(baseSize * scale, baseSize * 0.85); // Min 85% of original size
};

const getResponsiveFontSize = (baseSize: number): number => {
  const scale = Math.min(SCREEN_WIDTH / 375, 1.15); // Gentler font scaling
  return Math.max(baseSize * scale, baseSize * 0.9); // Min 90% for readability
};

const getResponsiveSpacing = (baseSpacing: number): number => {
  const scale = Math.min(SCREEN_WIDTH / 375, 1.1); // Conservative spacing scaling
  return Math.max(baseSpacing * scale, baseSpacing * 0.8); // Min 80% of original
};

export interface Theme {
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    secondaryLight: string;
    secondaryDark: string;
    success: string;
    error: string;
    warning: string;
    info: string;
    background: string;
    surface: string;
    surfaceVariant: string;
    outline: string;
    text: string;
    textSecondary: string;
    textDisabled: string;
    white: string;
    black: string;
    gray: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
  };
  typography: {
    fontSize: {
      xs: number;
      sm: number;
      base: number;
      lg: number;
      xl: number;
      '2xl': number;
      '3xl': number;
    };
    fontWeight: {
      light: '300';
      normal: '400';
      medium: '500';
      semibold: '600';
      bold: '700';
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
      loose: number;
    };
    letterSpacing: {
      tight: number;
      normal: number;
      wide: number;
      wider: number;
    };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    '3xl': number;
  };
  borderRadius: {
    none: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    '3xl': number;
    full: number;
  };
  shadows: {
    none: any;
    xs: any;
    sm: any;
    md: any;
    lg: any;
    xl: any;
  };
  animation: {
    duration: {
      instant: number;
      fast: number;
      normal: number;
      slow: number;
      slower: number;
    };
    easing: {
      ease: 'ease';
      easeIn: 'ease-in';
      easeOut: 'ease-out';
      easeInOut: 'ease-in-out';
    };
  };
  touchTarget: {
    minHeight: number;
    minWidth: number;
  };
}

const lightColors = {
  primary: '#E91E63',
  primaryLight: '#F48FB1',
  primaryDark: '#C2185B',
  secondary: '#FF6B35',
  secondaryLight: '#FF8A66',
  secondaryDark: '#E55A2E',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  background: '#FFFFFF',
  surface: '#FEFEFE',
  surfaceVariant: '#F8FAFC',
  outline: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#64748B',
  textDisabled: '#94A3B8',
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
};

const darkColors = {
  primary: '#FF6B35',
  primaryLight: '#FF8A5C',
  primaryDark: '#E55A2E',
  secondary: '#FFB85C',
  secondaryLight: '#FFCC80',
  secondaryDark: '#F57C00',
  success: '#10B981',
  error: '#F87171',
  warning: '#FBBF24',
  info: '#60A5FA',
  background: '#0F0F0F',
  surface: '#1A1A1A',
  surfaceVariant: '#262626',
  outline: '#404040',
  text: '#FFFFFF',
  textSecondary: '#A3A3A3',
  textDisabled: '#737373',
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
};

const typography = {
  fontSize: {
    xs: getResponsiveFontSize(12),
    sm: getResponsiveFontSize(14),
    base: getResponsiveFontSize(16),
    lg: getResponsiveFontSize(18),
    xl: getResponsiveFontSize(20),
    '2xl': getResponsiveFontSize(24),
    '3xl': getResponsiveFontSize(28),
  },
  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.35,
    relaxed: 1.5,
    loose: 1.6,
  },
  letterSpacing: {
    tight: -0.2,
    normal: 0,
    wide: 0.2,
    wider: 0.4,
  },
};

const spacing = {
  xs: getResponsiveSpacing(4),
  sm: getResponsiveSpacing(8),
  md: getResponsiveSpacing(12),
  lg: getResponsiveSpacing(16),
  xl: getResponsiveSpacing(24),
  xxl: getResponsiveSpacing(32),
  '3xl': getResponsiveSpacing(48),
};

const borderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  '3xl': 24,
  full: 9999,
};

const shadows = {
  none: {},
  xs: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1,
    },
    android: {
      elevation: 1,
    },
  }),
  sm: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    android: {
      elevation: 3,
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    },
    android: {
      elevation: 6,
    },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
    android: {
      elevation: 12,
    },
  }),
  xl: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
    },
    android: {
      elevation: 20,
    },
  }),
};

const animation = {
  duration: {
    instant: 75,
    fast: 150,
    normal: 250,
    slow: 400,
    slower: 600,
  },
  easing: {
    ease: 'ease' as const,
    easeIn: 'ease-in' as const,
    easeOut: 'ease-out' as const,
    easeInOut: 'ease-in-out' as const,
  },
};

const touchTarget = {
  minHeight: getResponsiveSize(44),
  minWidth: getResponsiveSize(44),
};

export const lightTheme: Theme = {
  colors: lightColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  touchTarget,
};

export const darkTheme: Theme = {
  colors: darkColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  touchTarget,
};

// Export modern UI theme alongside legacy theme for gradual migration
export { default as uiTheme } from './uiTheme';
export * from './uiTheme';

export const theme = lightTheme;
export default theme;