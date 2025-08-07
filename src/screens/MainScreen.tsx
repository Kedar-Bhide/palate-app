import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button } from 'react-native-elements';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../hooks/useAuth';
import Colors from '../constants/Colors';
import Layout from '../constants/Layout';

export default function MainScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.welcomeContainer}>
            <View style={styles.avatarContainer}>
              <Icon name="person" size={40} color={Colors.light.primary} />
            </View>
            <Text style={styles.welcomeTitle}>Welcome to Palate!</Text>
            <Text style={styles.welcomeSubtitle}>Your culinary journey starts here</Text>
          </View>
        </View>

        {/* User Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Profile</Text>
            
            <View style={styles.infoRow}>
            <Icon name="mail-outline" size={20} color={Colors.light.gray[600]} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Icon name="at-outline" size={20} color={Colors.light.gray[600]} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>
                {user?.profile?.username || 'Not set'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Icon name="person" size={20} color={Colors.light.gray[600]} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>
                {user?.profile?.display_name || 'Not set'}
              </Text>
            </View>
          </View>
        </View>

        {/* Coming Soon Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coming Soon</Text>
            <View style={styles.comingSoonContainer}>
            <Icon name="restaurant-outline" size={30} color={Colors.light.secondary} />
            <Text style={styles.comingSoonText}>
              Start sharing your culinary adventures, discover new cuisines, and connect with food lovers around the world!
            </Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          buttonStyle={[styles.signOutButton, { backgroundColor: Colors.light.error }]}
          titleStyle={styles.signOutButtonText}
          icon={<Icon name="log-out-outline" size={20} color="white" style={{ marginRight: 8 }} />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Layout.spacing.lg,
  },
  header: {
    paddingVertical: Layout.spacing.xl,
  },
  welcomeContainer: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  welcomeTitle: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Layout.spacing.xs,
  },
  welcomeSubtitle: {
    fontSize: Layout.fontSize.md,
    color: Colors.light.gray[600],
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: Layout.borderRadius.lg,
    marginBottom: Layout.spacing.lg,
    padding: Layout.spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.light.gray[200],
  },
  cardTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Layout.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Layout.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray[200],
    marginBottom: Layout.spacing.sm,
  },
  infoContent: {
    marginLeft: Layout.spacing.md,
    flex: 1,
  },
  infoLabel: {
    fontSize: Layout.fontSize.sm,
    color: Colors.light.gray[600],
    marginBottom: Layout.spacing.xs,
  },
  infoValue: {
    fontSize: Layout.fontSize.md,
    color: Colors.light.text,
    fontWeight: '500',
  },
  comingSoonContainer: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.lg,
  },
  comingSoonText: {
    fontSize: Layout.fontSize.md,
    color: Colors.light.gray[700],
    textAlign: 'center',
    lineHeight: 24,
    marginTop: Layout.spacing.md,
  },
  signOutButton: {
    borderRadius: Layout.borderRadius.lg,
    paddingVertical: Layout.spacing.md,
    marginTop: Layout.spacing.lg,
    marginBottom: Layout.spacing.xl,
  },
  signOutButtonText: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
  },
});