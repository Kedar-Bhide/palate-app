import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { Button } from 'react-native-elements';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import Colors from '../../constants/Colors';
import Layout from '../../constants/Layout';

type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
};

type WelcomeScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

export default function WelcomeScreen() {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>🍽️</Text>
          </View>
          <Text style={styles.appName}>Palate</Text>
          <Text style={styles.tagline}>Every meal tells a story</Text>
        </View>

        {/* Middle Section */}
        <View style={styles.middle}>
          <Text style={styles.welcomeText}>
            Discover, share, and explore culinary adventures with friends
          </Text>
        </View>

        {/* Footer Section */}
        <View style={styles.footer}>
          <Button
            title="Sign In"
            buttonStyle={[styles.primaryButton, { backgroundColor: Colors.light.primary }]}
            titleStyle={styles.primaryButtonText}
            onPress={() => navigation.navigate('SignIn')}
          />
          <Button
            title="Sign Up"
            buttonStyle={[styles.secondaryButton, { borderColor: Colors.light.primary }]}
            titleStyle={[styles.secondaryButtonText, { color: Colors.light.primary }]}
            onPress={() => navigation.navigate('SignUp')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.spacing.xl,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: Layout.spacing.xxl,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.light.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  logo: {
    fontSize: 60,
  },
  appName: {
    fontSize: Layout.fontSize.xxxl,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: Layout.spacing.sm,
  },
  tagline: {
    fontSize: Layout.fontSize.lg,
    color: Colors.light.gray[600],
    textAlign: 'center',
  },
  middle: {
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
  },
  welcomeText: {
    fontSize: Layout.fontSize.lg,
    color: Colors.light.gray[700],
    textAlign: 'center',
    lineHeight: 28,
  },
  footer: {
    paddingBottom: Layout.spacing.xl,
  },
  primaryButton: {
    borderRadius: Layout.borderRadius.lg,
    paddingVertical: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
  },
  primaryButtonText: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderRadius: Layout.borderRadius.lg,
    paddingVertical: Layout.spacing.md,
  },
  secondaryButtonText: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
  },
});