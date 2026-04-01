import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AuthStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../stores/authStore';
import { checkEmailExists } from '../../services/authService';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { colors, typography } from '../../design/tokens';

type RegisterNav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const navigation = useNavigation<RegisterNav>();
  const { signUp, isLoading, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  // 이메일 유효성 상태
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailChecking, setEmailChecking] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 이메일 형식 검증 + 중복 체크 (디바운스) */
  const validateEmail = useCallback((value: string) => {
    setEmail(value);
    setEmailError('');
    setEmailSuccess('');

    // 이전 타이머 취소
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    // 형식 검증
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    // 형식이 맞으면 디바운스로 중복 체크
    setEmailChecking(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const exists = await checkEmailExists(trimmed);
        if (exists === null) {
          setEmailChecking(false);
          return;
        }

        if (exists) {
          setEmailError('이미 가입된 이메일입니다.');
          setEmailSuccess('');
        } else {
          setEmailSuccess('사용 가능한 이메일입니다.');
          setEmailError('');
        }
      } catch (e) {
        console.warn('[Register] email check error:', e);
      } finally {
        setEmailChecking(false);
      }
    }, 600);
  }, []);

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !nickname.trim()) {
      Alert.alert('알림', '모든 항목을 입력해주세요.');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      Alert.alert('알림', '올바른 이메일 형식을 입력해주세요.');
      return;
    }
    if (emailError) {
      Alert.alert('알림', emailError);
      return;
    }
    if (password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    const success = await signUp(email.trim(), password, nickname.trim());
    if (!success) {
      const currentError = useAuthStore.getState().error;
      Alert.alert('회원가입 실패', currentError ?? '알 수 없는 오류가 발생했습니다.');
      clearError();
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={StyleSheet.absoluteFill}></View>

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <Text style={styles.title}>회원가입</Text>
            <Text style={styles.subtitle}>Another Day에 오신 것을 환영합니다</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="닉네임"
              placeholder="팀원들에게 보여질 이름"
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="none"
            />
            <View>
              <Input
                label="이메일"
                placeholder="email@example.com"
                value={email}
                onChangeText={validateEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={emailError || undefined}
                success={!emailChecking ? emailSuccess || undefined : undefined}
              />
              {emailChecking && (
                <View style={styles.checkingRow}>
                  <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
                  <Text style={styles.checkingText}>이메일 확인 중...</Text>
                </View>
              )}
            </View>
            <Input
              label="비밀번호"
              placeholder="6자 이상"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Button
              title="가입하기"
              onPress={handleRegister}
              loading={isLoading}
              style={{ marginTop: 8 }}
            />
          </View>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.goBack()}>
            <Text style={styles.loginText}>
              이미 계정이 있으신가요? <Text style={styles.loginBold}>로그인</Text>
            </Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    ...typography.titleLg,
    color: colors.text,
    marginBottom: 12,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  form: {
    marginBottom: 32,
  },
  loginLink: {
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginBold: {
    color: colors.secondary,
    fontWeight: '600',
  },
  checkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -12,
    marginBottom: 12,
    paddingLeft: 2,
  },
  checkingText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.40)',
    marginLeft: 6,
  },
});
