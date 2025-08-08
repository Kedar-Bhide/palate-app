/**
 * Modern Card Component
 * Unified card design with consistent styling, aspect ratios, and responsive layout
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import uiTheme, { colors, spacing, radii, fonts, shadows, layout } from '../../theme/uiTheme';

interface ModernCardProps {
  image?: string | ImageSourcePropType;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  imageAspectRatio?: number;
  variant?: 'elevated' | 'flat' | 'outlined';
}

export default function ModernCard({
  image,
  title,
  subtitle,
  children,
  onPress,
  style,
  imageAspectRatio = layout.cardAspectRatio,
  variant = 'elevated',
}: ModernCardProps) {
  const CardWrapper = onPress ? TouchableOpacity : View;
  const cardProps = onPress ? { onPress, activeOpacity: 0.8 } : {};

  return (
    <CardWrapper
      style={[styles.card, styles[variant], style]}
      {...cardProps}
    >
      {image && (
        <View style={[styles.imageWrap, { aspectRatio: imageAspectRatio }]}>
          <Image
            source={typeof image === 'string' ? { uri: image } : image}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
      )}
      
      <View style={styles.content}>
        {title && (
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        )}
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        {children}
      </View>
    </CardWrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    marginVertical: spacing(1),
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  
  elevated: {
    ...shadows.small,
    backgroundColor: colors.white,
  },
  
  flat: {
    backgroundColor: colors.surface,
  },
  
  outlined: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outline,
  },
  
  imageWrap: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.surfaceVariant,
  },
  
  image: {
    width: '100%',
    height: '100%',
  },
  
  content: {
    padding: spacing(1.5),
  },
  
  title: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    lineHeight: fonts.base * 1.3,
    marginBottom: spacing(0.5),
  },
  
  subtitle: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    lineHeight: fonts.sm * 1.2,
    marginBottom: spacing(0.5),
  },
});

// Profile card variant with square aspect ratio
export function ProfileCard(props: Omit<ModernCardProps, 'imageAspectRatio'>) {
  return <ModernCard {...props} imageAspectRatio={layout.profileAspectRatio} />;
}

// Post card variant with 16:9 aspect ratio
export function PostCard(props: Omit<ModernCardProps, 'imageAspectRatio'>) {
  return <ModernCard {...props} imageAspectRatio={layout.cardAspectRatio} />;
}