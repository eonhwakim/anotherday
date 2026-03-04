import React from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { COLORS } from '../../constants/defaults';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  success?: string;
  rightElement?: React.ReactNode;
}

export default function Input({ label, error, success, rightElement, style, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            rightElement ? styles.inputWithRightElement : null,
            error ? styles.inputError : null,
            success ? styles.inputSuccess : null,
            style,
          ]}
          placeholderTextColor={COLORS.textMuted}
          {...props}
        />
        {rightElement && (
          <View style={styles.rightElementContainer}>
            {rightElement}
          </View>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {!error && success && <Text style={styles.success}>{success}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputWrapper: {
    position: 'relative',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  inputWithRightElement: {
    paddingRight: 40,
  },
  rightElementContainer: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  inputSuccess: {
    borderColor: '#4ADE80',
  },
  error: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  success: {
    fontSize: 12,
    color: '#4ADE80',
    marginTop: 4,
  },
});
