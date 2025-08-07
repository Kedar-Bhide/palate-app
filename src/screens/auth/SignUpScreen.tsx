import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Icon from 'react-native-vector-icons/Ionicons';
import AuthForm from '../../components/auth/AuthForm';
import { useAuth } from '../../hooks/useAuth';
import { isUsernameAvailable } from '../../lib/queries';
import Colors from '../../constants/Colors';
import Layout from '../../constants/Layout';

type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
};

type SignUpScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*]/, 'Password must contain at least one special character');

const signUpSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(50, 'Display name must be less than 50 characters'),
  password: passwordSchema,
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

interface PasswordRequirement {
  text: string;
  met: boolean;
}

export default function SignUpScreen() {
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirement[]>([]);

  const { control, handleSubmit, formState: { errors }, watch, reset } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      username: '',
      displayName: '',
      password: '',
      confirmPassword: '',
    },
  });

  const watchedPassword = watch('password', '');
  const watchedConfirmPassword = watch('confirmPassword', '');
  const watchedUsername = watch('username', '');

  // Update password requirements in real-time
  useEffect(() => {
    const requirements: PasswordRequirement[] = [
      { text: 'At least 8 characters', met: watchedPassword.length >= 8 },
      { text: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(watchedPassword) },
      { text: 'One lowercase letter (a-z)', met: /[a-z]/.test(watchedPassword) },
      { text: 'One number (0-9)', met: /[0-9]/.test(watchedPassword) },
      { text: 'One special character (!@#$%^&*)', met: /[!@#$%^&*]/.test(watchedPassword) },
    ];
    setPasswordRequirements(requirements);
  }, [watchedPassword]);

  // Check username availability
  useEffect(() => {
    const checkUsername = async () => {
      if (watchedUsername.length >= 3 && /^[a-zA-Z0-9_]+$/.test(watchedUsername)) {
        setCheckingUsername(true);
        try {
          const { data: available, error } = await isUsernameAvailable(watchedUsername);
          if (!error) {
            setUsernameAvailable(available);
          }
        } catch (error) {
          // Ignore errors in real-time checking
        }
        setCheckingUsername(false);
      } else {
        setUsernameAvailable(null);
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedUsername]);

  const onSubmit = async (data: SignUpFormData) => {
    try {
      setLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      
      const result = await signUp({
        email: data.email,
        username: data.username,
        password: data.password,
        display_name: data.displayName,
      });
      
      if (result.error) {
        if (result.error.includes('Username')) {
          setErrorMessage(result.error);
        } else if (result.error.includes('password')) {
          setErrorMessage('Password doesn\'t meet requirements');
        } else {
          setErrorMessage('Unable to create account. Please try again.');
        }
      } else {
        setSuccessMessage('Account created successfully! Welcome to Palate!');
      }
    } catch (error) {
      setErrorMessage('Connection issue, please try again');
    } finally {
      setLoading(false);
    }
  };

  const formFields = [
    {
      name: 'email',
      placeholder: 'Email address',
      keyboardType: 'email-address' as const,
      autoCapitalize: 'none' as const,
      leftIcon: 'mail-outline',
      validation: signUpSchema.shape.email,
    },
    {
      name: 'displayName',
      placeholder: 'Display Name',
      autoCapitalize: 'words' as const,
      leftIcon: 'person-outline',
      validation: signUpSchema.shape.displayName,
    },
    {
      name: 'username',
      placeholder: 'Username',
      autoCapitalize: 'none' as const,
      leftIcon: 'at-outline',
      validation: signUpSchema.shape.username,
    },
    {
      name: 'password',
      placeholder: 'Password',
      secureTextEntry: true,
      leftIcon: 'lock-closed-outline',
      validation: signUpSchema.shape.password,
    },
    {
      name: 'confirmPassword',
      placeholder: 'Confirm Password',
      secureTextEntry: true,
      leftIcon: 'lock-closed-outline',
      validation: signUpSchema.shape.confirmPassword,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Palate to start sharing your food journey</Text>
        </View>

        <View style={styles.formContainer}>
          <AuthForm
            fields={formFields}
            control={control}
            errors={errors}
            onSubmit={handleSubmit(onSubmit)}
            submitText="Create Account"
            loading={loading}
            errorMessage={errorMessage}
            successMessage={successMessage}
          >
            {/* Username Availability */}
            {watchedUsername.length >= 3 && (
              <View style={styles.usernameStatus}>
                {checkingUsername ? (
                  <Text style={styles.checkingText}>Checking availability...</Text>
                ) : usernameAvailable === true ? (
                  <View style={styles.availableContainer}>
                    <Icon name="checkmark-circle" size={16} color={Colors.light.success} />
                    <Text style={styles.availableText}>Username available</Text>
                  </View>
                ) : usernameAvailable === false ? (
                  <View style={styles.unavailableContainer}>
                    <Icon name="close-circle" size={16} color={Colors.light.error} />
                    <Text style={styles.unavailableText}>Username taken</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Password Requirements */}
            {watchedPassword.length > 0 && (
              <View style={styles.passwordRequirements}>
                <Text style={styles.requirementsTitle}>Password must contain:</Text>
                {passwordRequirements.map((req, index) => (
                  <View key={index} style={styles.requirementRow}>
                    <Icon
                      name={req.met ? 'checkmark-circle' : 'ellipse-outline'}
                      size={14}
                      color={req.met ? Colors.light.success : Colors.light.gray[400]}
                    />
                    <Text style={[
                      styles.requirementText,
                      req.met ? styles.requirementMet : styles.requirementUnmet
                    ]}>
                      {req.text}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Password Match Indicator */}
            {watchedConfirmPassword.length > 0 && (
              <View style={styles.passwordMatch}>
                {watchedPassword === watchedConfirmPassword ? (
                  <View style={styles.matchContainer}>
                    <Icon name="checkmark-circle" size={16} color={Colors.light.success} />
                    <Text style={styles.matchText}>Passwords match</Text>
                  </View>
                ) : (
                  <View style={styles.noMatchContainer}>
                    <Icon name="close-circle" size={16} color={Colors.light.error} />
                    <Text style={styles.noMatchText}>Passwords don't match</Text>
                  </View>
                )}
              </View>
            )}
          </AuthForm>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('SignIn')}
            disabled={loading}
          >
            <Text style={styles.signInText}>
              Already have an account?{' '}
              <Text style={styles.signInLink}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Layout.spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: Layout.spacing.xxl,
    paddingBottom: Layout.spacing.xl,
  },
  title: {
    fontSize: Layout.fontSize.xxxl,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Layout.spacing.sm,
  },
  subtitle: {
    fontSize: Layout.fontSize.md,
    color: Colors.light.gray[600],
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
  },
  usernameStatus: {
    marginBottom: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.md,
  },
  checkingText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.light.gray[500],
  },
  availableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availableText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.light.success,
    marginLeft: Layout.spacing.xs,
  },
  unavailableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unavailableText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.light.error,
    marginLeft: Layout.spacing.xs,
  },
  passwordRequirements: {
    marginBottom: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    backgroundColor: Colors.light.gray[50],
    borderRadius: Layout.borderRadius.md,
  },
  requirementsTitle: {
    fontSize: Layout.fontSize.sm,
    color: Colors.light.gray[600],
    marginBottom: Layout.spacing.sm,
    fontWeight: '500',
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.xs,
  },
  requirementText: {
    fontSize: Layout.fontSize.sm,
    marginLeft: Layout.spacing.sm,
  },
  requirementMet: {
    color: Colors.light.success,
  },
  requirementUnmet: {
    color: Colors.light.gray[500],
  },
  passwordMatch: {
    marginBottom: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.md,
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.light.success,
    marginLeft: Layout.spacing.xs,
  },
  noMatchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noMatchText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.light.error,
    marginLeft: Layout.spacing.xs,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.xl,
  },
  signInText: {
    fontSize: Layout.fontSize.md,
    color: Colors.light.gray[600],
  },
  signInLink: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
});