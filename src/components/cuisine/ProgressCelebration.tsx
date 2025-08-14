/**
 * ProgressCelebration Component
 * Achievement unlock celebrations with confetti effects and animations
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts, shadows, radii } from '../../theme/uiTheme';
import { Achievement } from '../../types/cuisine';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ProgressMilestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  value: number;
  previousValue: number;
  type: 'cuisine_count' | 'diversity_score' | 'streak' | 'achievement_unlock';
}

interface ProgressCelebrationProps {
  achievement?: Achievement;
  milestone?: ProgressMilestone;
  visible: boolean;
  onClose: () => void;
  onShare?: () => void;
}

interface ConfettiPiece {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  scale: Animated.Value;
  color: string;
  shape: 'circle' | 'square' | 'triangle';
}

const CONFETTI_COLORS = [
  colors.primary,
  colors.accent,
  colors.success,
  colors.warning,
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
];

export default function ProgressCelebration({
  achievement,
  milestone,
  visible,
  onClose,
  onShare,
}: ProgressCelebrationProps) {
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Create confetti pieces
  useEffect(() => {
    if (visible) {
      const pieces: ConfettiPiece[] = [];
      for (let i = 0; i < 50; i++) {
        pieces.push({
          id: i,
          x: new Animated.Value(Math.random() * SCREEN_WIDTH),
          y: new Animated.Value(-50),
          rotation: new Animated.Value(Math.random() * 360),
          scale: new Animated.Value(Math.random() * 0.5 + 0.5),
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          shape: ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)] as 'circle' | 'square' | 'triangle',
        });
      }
      setConfettiPieces(pieces);
    }
  }, [visible]);

  // Animation sequences with proper cleanup
  const animationRefs = useRef<Animated.CompositeAnimation[]>([]);
  
  useEffect(() => {
    if (visible) {
      // Clear any existing animations
      animationRefs.current.forEach(animation => animation.stop());
      animationRefs.current = [];

      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Main entrance animation
      const entranceAnimation = Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]);
      animationRefs.current.push(entranceAnimation);
      entranceAnimation.start();

      // Bounce animation for the main content
      const bounceAnimation = Animated.sequence([
        Animated.delay(200),
        Animated.spring(bounceAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]);
      animationRefs.current.push(bounceAnimation);
      bounceAnimation.start();

      // Rotation animation for the icon
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      animationRefs.current.push(rotateAnimation);
      rotateAnimation.start();

      // Pulse animation for emphasis
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      animationRefs.current.push(pulseAnimation);
      pulseAnimation.start();

      // Confetti animation with proper cleanup tracking
      const confettiAnimations = confettiPieces.map((piece) => {
        const fallDistance = SCREEN_HEIGHT + 100;
        const fallDuration = 3000 + Math.random() * 2000;
        const swayDistance = 100 + Math.random() * 100;

        return Animated.parallel([
          // Falling animation
          Animated.timing(piece.y, {
            toValue: fallDistance,
            duration: fallDuration,
            useNativeDriver: true,
          }),
          // Swaying animation
          Animated.loop(
            Animated.sequence([
              Animated.timing(piece.x, {
                toValue: piece.x._value + swayDistance,
                duration: 1000 + Math.random() * 1000,
                useNativeDriver: true,
              }),
              Animated.timing(piece.x, {
                toValue: piece.x._value - swayDistance,
                duration: 1000 + Math.random() * 1000,
                useNativeDriver: true,
              }),
            ])
          ),
          // Rotation animation
          Animated.loop(
            Animated.timing(piece.rotation, {
              toValue: 360,
              duration: 2000 + Math.random() * 1000,
              useNativeDriver: true,
            })
          ),
        ]);
      });

      const confettiParallel = Animated.parallel(confettiAnimations);
      animationRefs.current.push(confettiParallel);
      confettiParallel.start();
    } else {
      // Stop all animations and reset values
      animationRefs.current.forEach(animation => animation.stop());
      animationRefs.current = [];
      
      fadeAnim.setValue(0);
      scaleAnim.setValue(0);
      bounceAnim.setValue(0);
      rotateAnim.setValue(0);
      pulseAnim.setValue(1);
    }

    // Cleanup function to stop animations when component unmounts
    return () => {
      animationRefs.current.forEach(animation => animation.stop());
      animationRefs.current = [];
    };
  }, [visible, confettiPieces]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleShare = async () => {
    if (!onShare) return;

    try {
      const content = achievement 
        ? `🎉 Just unlocked the "${achievement.name}" achievement in my culinary journey! ${achievement.icon}`
        : milestone 
        ? `🌟 Reached a new milestone: ${milestone.title}! ${milestone.icon}`
        : '🎉 Celebrating my culinary progress!';

      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Share.share({
          message: content,
          title: 'Culinary Achievement!',
        });
      }
      
      onShare();
    } catch (error) {
      console.error('Error sharing achievement:', error);
    }
  };

  const renderConfetti = () => {
    return confettiPieces.map((piece) => (
      <Animated.View
        key={piece.id}
        style={[
          styles.confettiPiece,
          {
            backgroundColor: piece.color,
            transform: [
              { translateX: piece.x },
              { translateY: piece.y },
              { 
                rotate: piece.rotation.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                })
              },
              { scale: piece.scale },
            ],
          },
          getConfettiShape(piece.shape),
        ]}
      />
    ));
  };

  const getConfettiShape = (shape: 'circle' | 'square' | 'triangle') => {
    switch (shape) {
      case 'circle':
        return { borderRadius: 5, width: 10, height: 10 };
      case 'square':
        return { width: 8, height: 8 };
      case 'triangle':
        return { 
          width: 0,
          height: 0,
          backgroundColor: 'transparent',
          borderStyle: 'solid',
          borderLeftWidth: 4,
          borderRightWidth: 4,
          borderBottomWidth: 8,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
        };
      default:
        return { borderRadius: 5, width: 10, height: 10 };
    }
  };

  const getGradientColors = () => {
    if (achievement?.tier === 'platinum') {
      return ['#E8E8E8', '#B8B8B8', '#E0E0E0'];
    } else if (achievement?.tier === 'gold') {
      return ['#FFD700', '#FFA500', '#FFE55C'];
    } else if (achievement?.tier === 'silver') {
      return ['#C0C0C0', '#A8A8A8', '#D3D3D3'];
    } else if (achievement?.tier === 'bronze') {
      return ['#CD7F32', '#A0522D', '#D2B48C'];
    }
    return [colors.primary, colors.primaryDark, colors.accent];
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Confetti Layer */}
        <View style={styles.confettiContainer}>
          {renderConfetti()}
        </View>

        {/* Main Content */}
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={getGradientColors()}
            style={styles.contentBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <MaterialIcons name="close" size={24} color={colors.white} />
            </TouchableOpacity>

            {/* Main Icon */}
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transform: [
                    { scale: pulseAnim },
                    { rotate: rotateInterpolate },
                    { scale: bounceAnim },
                  ],
                },
              ]}
            >
              <Text style={styles.mainIcon}>
                {achievement?.icon || milestone?.icon || '🎉'}
              </Text>
            </Animated.View>

            {/* Content */}
            <Animated.View
              style={[
                styles.textContent,
                {
                  transform: [{ scale: bounceAnim }],
                },
              ]}
            >
              <Text style={styles.congratsText}>Congratulations!</Text>
              
              <Text style={styles.titleText}>
                {achievement?.name || milestone?.title || 'Achievement Unlocked!'}
              </Text>

              <Text style={styles.descriptionText}>
                {achievement?.description || milestone?.description || 'Keep up the great work!'}
              </Text>

              {achievement?.points && (
                <View style={styles.pointsContainer}>
                  <MaterialIcons name="star" size={20} color={colors.warning} />
                  <Text style={styles.pointsText}>
                    +{achievement.points} points
                  </Text>
                </View>
              )}

              {milestone?.type === 'cuisine_count' && (
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>
                    {milestone.previousValue} → {milestone.value} cuisines
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Action Buttons */}
            <Animated.View
              style={[
                styles.buttonContainer,
                {
                  transform: [{ scale: bounceAnim }],
                },
              ]}
            >
              {onShare && (
                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                  <MaterialIcons name="share" size={20} color={colors.white} />
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.continueButton} onPress={handleClose}>
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },

  confettiPiece: {
    position: 'absolute',
    zIndex: 2,
  },

  container: {
    width: SCREEN_WIDTH * 0.85,
    maxHeight: SCREEN_HEIGHT * 0.8,
    zIndex: 3,
  },

  contentBackground: {
    borderRadius: radii.xl,
    padding: spacing(3),
    alignItems: 'center',
    ...shadows.large,
  },

  closeButton: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
    zIndex: 4,
    padding: spacing(0.5),
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },

  iconContainer: {
    marginBottom: spacing(2),
  },

  mainIcon: {
    fontSize: 80,
    textAlign: 'center',
  },

  textContent: {
    alignItems: 'center',
    marginBottom: spacing(3),
  },

  congratsText: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.bold,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing(1),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  titleText: {
    fontSize: fonts.xxl,
    fontWeight: fonts.weights.bold,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing(1.5),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  descriptionText: {
    fontSize: fonts.base,
    color: colors.white,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
    marginBottom: spacing(1),
    opacity: 0.9,
  },

  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: radii.md,
    marginTop: spacing(1),
  },

  pointsText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.bold,
    color: colors.white,
    marginLeft: spacing(0.5),
  },

  progressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: radii.md,
    marginTop: spacing(1),
  },

  progressText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.white,
    textAlign: 'center',
  },

  buttonContainer: {
    flexDirection: 'row',
    gap: spacing(1.5),
    width: '100%',
  },

  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: spacing(1.5),
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  shareButtonText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.white,
    marginLeft: spacing(0.5),
  },

  continueButton: {
    flex: 2,
    backgroundColor: colors.white,
    paddingVertical: spacing(1.5),
    borderRadius: radii.md,
    alignItems: 'center',
  },

  continueButtonText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.bold,
    color: colors.primary,
  },
});