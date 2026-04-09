import React from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native';
import { colors, spacing, typography } from '../../design/recipes';
import CyberFrame from '../ui/CyberFrame';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  success?: string;
  rightElement?: React.ReactNode;
}

export default function Input({
  label,
  error,
  success,
  rightElement,
  style,
  onFocus,
  onBlur,
  editable = true,
  ...props
}: InputProps) {
  const [focused, setFocused] = React.useState(false);
  const showFocusUi = focused && editable && !error;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <CyberFrame
        style={[
          styles.inputWrapper,
          error ? styles.inputWrapperError : null,
          success && !error && !showFocusUi ? styles.inputWrapperSuccess : null,
          showFocusUi ? styles.inputWrapperFocused : null,
        ]}
        contentStyle={styles.inputContent}
        glassOnly={true}
      >
        <TextInput
          style={[styles.input, rightElement ? styles.inputWithRightElement : null, style]}
          placeholderTextColor={colors.textMuted}
          editable={editable}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {rightElement && <View style={styles.rightElementContainer}>{rightElement}</View>}
      </CyberFrame>
      {error && <Text style={styles.error}>{error}</Text>}
      {!error && success && <Text style={styles.success}>{success}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  inputWrapper: {
    borderRadius: 12,
  },
  inputWrapperFocused: {
    backgroundColor: colors.handleTint,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.48,
    shadowRadius: 10,
    elevation: 5,
  },
  inputContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing[2],
    textTransform: 'uppercase',
  },
  input: {
    paddingHorizontal: spacing[4],
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
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
    borderColor: colors.error,
  },
  inputWrapperSuccess: {
    borderColor: colors.successBright,
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  success: {
    fontSize: 12,
    color: colors.successBright,
    marginTop: 4,
  },
});
