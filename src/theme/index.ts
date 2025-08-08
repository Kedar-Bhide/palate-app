import { Platform } from 'react-native';

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
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    full: number;
  };
  shadows: {
    none: any;
    sm: any;
    md: any;
    lg: any;
    xl: any;
  };
  animation: {
    duration: {
      fast: number;
      normal: number;
      slow: number;
    };
  };
  touchTarget: {
    minHeight: number;
    minWidth: number;
  };
}

const lightColors = {
  primary: '#FF6B35',
  primaryLight: '#FF8A5C',
  primaryDark: '#E55A2E',
  secondary: '#FFB85C',
  secondaryLight: '#FFCC80',
  secondaryDark: '#F57C00',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  background: '#FFFFFF',
  surface: '#FAFAFA',
  surfaceVariant: '#F5F5F5',
  outline: '#E5E5E5',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
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
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.5,
    loose: 1.6,
  },
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

const shadows = {
  none: {},
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
    },
    android: {
      elevation: 2,
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    android: {
      elevation: 5,
    },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
    },
    android: {
      elevation: 8,
    },
  }),
  xl: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.44,
      shadowRadius: 10.32,
    },
    android: {
      elevation: 16,
    },
  }),
};

const animation = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
};

const touchTarget = {
  minHeight: 44,
  minWidth: 44,
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

export const theme = lightTheme;
export default theme;