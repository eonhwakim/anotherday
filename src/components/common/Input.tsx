import React from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { COLORS } from '../../constants/defaults';
import CyberFrame from '../ui/CyberFrame';

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
      <CyberFrame
        style={[
          styles.inputWrapper,
          error ? styles.inputWrapperError : null,
          success ? styles.inputWrapperSuccess : null,
        ]}
        contentStyle={styles.inputContent}
        glassOnly={true}
      >
        <TextInput
          style={[
            styles.input,
            rightElement ? styles.inputWithRightElement : null,
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
      </CyberFrame>
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
    borderRadius: 12,
  },
  inputContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
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
  inputWrapperError: {
    borderColor: COLORS.error,
  },
  inputWrapperSuccess: {
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
