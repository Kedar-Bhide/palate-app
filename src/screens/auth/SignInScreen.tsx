import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AuthForm from '../../components/auth/AuthForm';
import { useAuth } from '../../hooks/useAuth';
import Colors from '../../constants/Colors';
import Layout from '../../constants/Layout';

type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
};

type SignInScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'SignIn'>;

const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

type SignInFormData = z.infer<typeof signInSchema>;

export default function SignInScreen() {
  const navigation = useNavigation<SignInScreenNavigationProp>();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const { control, handleSubmit, formState: { errors }, reset } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: SignInFormData) => {
    try {
      setLoading(true);
      setErrorMessage('');
      
      const result = await signIn(data);
      
      if (result.error) {
        setErrorMessage('Please check your email and password and try again');
        // Clear password field for security
        reset({ email: data.email, password: '' });
      }
    } catch (error) {
      setErrorMessage('Connection issue, please try again');
      reset({ email: data.email, password: '' });
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
      validation: signInSchema.shape.email,
    },
    {
      name: 'password',
      placeholder: 'Password',
      secureTextEntry: true,
      leftIcon: 'lock-closed-outline',
      validation: signInSchema.shape.password,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your culinary journey</Text>
        </View>

        <View style={styles.formContainer}>
          <AuthForm
            fields={formFields}
            control={control}
            errors={errors}
            onSubmit={handleSubmit(onSubmit)}
            submitText="Sign In"
            loading={loading}
            errorMessage={errorMessage}
          />

          {/* Forgot Password Link */}
          <TouchableOpacity style={styles.forgotPassword} disabled={loading}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('SignUp')}
            disabled={loading}
          >
            <Text style={styles.signUpText}>
              Don't have an account?{' '}
              <Text style={styles.signUpLink}>Sign Up</Text>
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
  forgotPassword: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.lg,
  },
  forgotPasswordText: {
    fontSize: Layout.fontSize.md,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.xl,
  },
  signUpText: {
    fontSize: Layout.fontSize.md,
    color: Colors.light.gray[600],
  },
  signUpLink: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
});