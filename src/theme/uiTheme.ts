/**
 * Centralized UI Theme Constants
 * Provides consistent design tokens for modern, responsive UI
 */

import { Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Color palette - modern, accessible design with gentle blue
export const colors = {
  primary: '#3B82F6',
  primaryLight: '#93C5FD',
  primaryDark: '#1E40AF',
  primaryContainer: '#EBF4FF',
  secondary: '#FF6B35',
  accent: '#8B5CF6',
  background: '#FFFFFF',
  surface: '#FEFEFE',
  surfaceVariant: '#F8FAFC',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  outline: '#F1F5F9',
  border: '#E2E8F0',
  white: '#FFFFFF',
  black: '#000000',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.3)',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

// Spacing helper function - 8px base unit
export const spacing = (multiplier: number): number => multiplier * 8;

// Border radii for consistent rounded corners
export const radii = {
  xs: 4,
  sm: 6,
  card: 12,
  button: 8,
  input: 10,
  lg: 16,
  xl: 20,
  full: 9999,
};

// Typography scale with responsive sizing
const baseWidth = 375;
const scale = (size: number) => Math.round(size * (width / baseWidth));

export const fonts = {
  xs: scale(12),
  sm: scale(14),
  base: scale(16),
  lg: scale(18),
  xl: scale(20),
  xxl: scale(24),
  xxxl: scale(28),
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

// Bottom navigation height - platform specific
export const bottomNavHeight = Platform.OS === 'ios' ? 50 : 48;

// Safe area and layout constants
export const layout = {
  headerHeight: Platform.OS === 'ios' ? 44 : 56,
  touchTarget: 44,
  cardAspectRatio: 16 / 9,
  profileAspectRatio: 1,
};

// Shadow/elevation styles for cards and modals
export const shadows = {
  small: Platform.select({
    ios: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 3,
    },
  }),
  medium: Platform.select({
    ios: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: {
      elevation: 6,
    },
  }),
  large: Platform.select({
    ios: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
    },
    android: {
      elevation: 12,
    },
  }),
};

// Screen dimensions for responsive calculations
export const screen = {
  width,
  height,
  isSmall: width < 375,
  isLarge: width > 414,
};

export default {
  colors,
  spacing,
  radii,
  fonts,
  bottomNavHeight,
  layout,
  shadows,
  screen,
};