import React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Input, Button } from 'react-native-elements';
import Icon from 'react-native-vector-icons/Ionicons';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import Colors from '../../constants/Colors';
import Layout from '../../constants/Layout';

interface AuthFormField {
  name: string;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  leftIcon?: string;
  validation?: any;
}

interface AuthFormProps {
  fields: AuthFormField[];
  control: Control<any>;
  errors: FieldErrors<any>;
  onSubmit: () => void;
  submitText: string;
  loading?: boolean;
  errorMessage?: string;
  successMessage?: string;
  children?: React.ReactNode;
}

interface MessageBoxProps {
  message: string;
  type: 'error' | 'success';
}

const MessageBox: React.FC<MessageBoxProps> = ({ message, type }) => (
  <View style={[styles.messageBox, type === 'error' ? styles.errorBox : styles.successBox]}>
    <Icon
      name={type === 'error' ? 'alert-circle' : 'checkmark-circle'}
      size={16}
      color={type === 'error' ? Colors.light.error : Colors.light.success}
      style={styles.messageIcon}
    />
    <Text style={[styles.messageText, type === 'error' ? styles.errorText : styles.successText]}>
      {message}
    </Text>
  </View>
);

export default function AuthForm({
  fields,
  control,
  errors,
  onSubmit,
  submitText,
  loading = false,
  errorMessage,
  successMessage,
  children
}: AuthFormProps) {
  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.form}>
        {/* Form Fields */}
        {fields.map((field) => (
          <View key={field.name} style={styles.fieldContainer}>
            <Controller
              control={control}
              name={field.name}
              rules={field.validation}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  placeholder={field.placeholder}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={field.secureTextEntry}
                  keyboardType={field.keyboardType || 'default'}
                  autoCapitalize={field.autoCapitalize || 'none'}
                  leftIcon={
                    field.leftIcon ? (
                      <Icon
                        name={field.leftIcon}
                        size={20}
                        color={Colors.light.gray[400]}
                      />
                    ) : undefined
                  }
                  inputContainerStyle={[
                    styles.inputContainer,
                    errors[field.name] && styles.inputError
                  ]}
                  inputStyle={styles.input}
                  containerStyle={styles.inputWrapper}
                  errorMessage={errors[field.name]?.message as string}
                  errorStyle={styles.fieldError}
                />
              )}
            />
          </View>
        ))}

        {/* Custom Children (like password requirements) */}
        {children}

        {/* Error Message */}
        {errorMessage && (
          <MessageBox message={errorMessage} type="error" />
        )}

        {/* Success Message */}
        {successMessage && (
          <MessageBox message={successMessage} type="success" />
        )}

        {/* Submit Button */}
        <Button
          title={submitText}
          onPress={onSubmit}
          loading={loading}
          disabled={loading}
          buttonStyle={[styles.submitButton, { backgroundColor: Colors.light.primary }]}
          titleStyle={styles.submitButtonText}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    flex: 1,
  },
  fieldContainer: {
    marginBottom: Layout.spacing.sm,
  },
  inputWrapper: {
    paddingHorizontal: 0,
  },
  inputContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray[300],
    paddingHorizontal: Layout.spacing.md,
    backgroundColor: Colors.light.gray[50],
    borderRadius: Layout.borderRadius.lg,
    borderBottomLeftRadius: Layout.borderRadius.lg,
    borderBottomRightRadius: Layout.borderRadius.lg,
  },
  inputError: {
    borderBottomColor: Colors.light.error,
    borderBottomWidth: 2,
  },
  input: {
    fontSize: Layout.fontSize.md,
    color: Colors.light.text,
    paddingLeft: Layout.spacing.sm,
  },
  fieldError: {
    color: Colors.light.error,
    fontSize: Layout.fontSize.sm,
    marginLeft: Layout.spacing.md,
    marginTop: Layout.spacing.xs,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.lg,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  successBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  messageIcon: {
    marginRight: Layout.spacing.sm,
  },
  messageText: {
    fontSize: Layout.fontSize.sm,
    flex: 1,
  },
  errorText: {
    color: Colors.light.error,
  },
  successText: {
    color: Colors.light.success,
  },
  submitButton: {
    borderRadius: Layout.borderRadius.lg,
    paddingVertical: Layout.spacing.md,
    marginTop: Layout.spacing.lg,
  },
  submitButtonText: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
  },
});