import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AuthStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../stores/authStore';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import GlassModal from '../../components/ui/GlassModal';
import { colors, typography, spacing } from '../../design/tokens';

type LoginNav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const KAKAO_YELLOW = '#FEE500';
const KAKAO_TEXT = 'rgba(0,0,0,0.85)';

export default function LoginScreen() {
  const navigation = useNavigation<LoginNav>();
  const { signIn, signInWithKakao, finalizeKakaoSignup, cancelKakaoSignup, isLoading, clearError } =
    useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [pendingKakaoUser, setPendingKakaoUser] = useState<{
    userId: string;
    email: string | null;
  } | null>(null);

  useEffect(() => {
    const loadSavedEmail = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('savedEmail');
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberEmail(true);
        }
      } catch (e) {
        console.error('Failed to load saved email', e);
      }
    };
    loadSavedEmail();
  }, []);

  const handleKakaoLogin = async () => {
    setKakaoLoading(true);
    try {
      const result = await signInWithKakao();
      if (!result.success) {
        const currentError = useAuthStore.getState().error;
        Alert.alert('카카오 로그인 실패', currentError ?? '잠시 후 다시 시도해주세요.');
        clearError();
        return;
      }

      if (result.isNewUser) {
        // 안내 모달 표시
        setPendingKakaoUser({ userId: result.pendingUserId, email: result.pendingEmail });
      }
      // 기존 user면 RootNavigator가 알아서 화면 전환
    } finally {
      setKakaoLoading(false);
    }
  };

  const handleStartAsNewKakaoUser = async () => {
    if (!pendingKakaoUser) return;
    const ok = await finalizeKakaoSignup(pendingKakaoUser.userId, pendingKakaoUser.email);
    if (!ok) {
      const currentError = useAuthStore.getState().error;
      Alert.alert('가입 실패', currentError ?? '프로필 생성 중 오류가 발생했습니다.');
      clearError();
      return;
    }
    setPendingKakaoUser(null);
  };

  const handleSwitchToEmailFromKakao = async () => {
    // 빈 카카오 user 삭제 + 로그아웃 → 이메일 로그인 폼 표시
    await cancelKakaoSignup();
    setPendingKakaoUser(null);
    setShowEmailForm(true);
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      if (rememberEmail) {
        await AsyncStorage.setItem('savedEmail', email.trim());
      } else {
        await AsyncStorage.removeItem('savedEmail');
      }
    } catch (e) {
      console.error('Failed to save email preference', e);
    }

    const success = await signIn(email.trim(), password);
    if (!success) {
      const currentError = useAuthStore.getState().error;
      Alert.alert('로그인 실패', currentError ?? '알 수 없는 오류가 발생했습니다.');
      clearError();
    }
  };

  return (
    <View style={styles.wrapper}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Another Day</Text>
              <Text style={styles.subtitle}>또 다른 하루를 쌓아가다</Text>
              <Text style={styles.subtitle2}>팀과 함께 매일의 목표를 달성해보세요</Text>
            </View>

            <View style={styles.primaryArea}>
              <TouchableOpacity
                style={[styles.kakaoButton, kakaoLoading && styles.disabled]}
                onPress={handleKakaoLogin}
                disabled={kakaoLoading || isLoading}
                activeOpacity={0.85}
              >
                <Ionicons name="chatbubble" size={18} color={KAKAO_TEXT} />
                <Text style={styles.kakaoText}>카카오로 시작하기</Text>
              </TouchableOpacity>

              {!showEmailForm ? (
                <TouchableOpacity
                  style={styles.toggleEmail}
                  onPress={() => setShowEmailForm(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleEmailText}>이미 이메일로 가입하셨나요?</Text>
                  <Text style={styles.toggleEmailLink}>이메일로 로그인</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>이메일로 로그인</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <View style={styles.form}>
                    <Input
                      label="이메일"
                      placeholder="email@example.com"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Input
                      label="비밀번호"
                      placeholder="비밀번호 입력"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      rightElement={
                        <TouchableOpacity
                          onPress={() => setShowPassword((prev) => !prev)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={showPassword ? 'eye-off' : 'eye'}
                            size={18}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                      }
                    />

                    <TouchableOpacity
                      style={styles.checkboxContainer}
                      onPress={() => setRememberEmail(!rememberEmail)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={rememberEmail ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={rememberEmail ? colors.text : colors.textMuted}
                      />
                      <Text style={[styles.checkboxText, rememberEmail && styles.checkboxTextActive]}>
                        이메일 기억하기
                      </Text>
                    </TouchableOpacity>

                    <Button
                      title="이메일로 로그인"
                      onPress={handleEmailLogin}
                      loading={isLoading}
                      style={{ marginTop: 8 }}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.registerLink}
                    onPress={() => navigation.navigate('Register')}
                  >
                    <Text style={styles.registerText}>
                      계정이 없으신가요? <Text style={styles.registerBold}>회원가입</Text>
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <GlassModal
        visible={!!pendingKakaoUser}
        title="처음 오셨나요?"
        onClose={() => {
          // 모달 외부 탭 시에도 카카오 빈 user 정리
          void handleSwitchToEmailFromKakao();
        }}
        hideButtons
      >
        <Text style={styles.modalBody}>
          기존에 이메일로 가입한 계정이 있다면,{'\n'}
          이메일로 로그인한 뒤 마이페이지에서{'\n'}
          카카오 계정을 연결해주세요.
        </Text>
        <View style={styles.modalActions}>
          <Button
            title="이메일로 로그인하기"
            onPress={handleSwitchToEmailFromKakao}
            variant="outline"
            style={{ marginBottom: 8 }}
          />
          <Button
            title="새 계정으로 시작하기"
            onPress={handleStartAsNewKakaoUser}
            loading={isLoading}
          />
        </View>
      </GlassModal>
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
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    ...typography.titleLg,
    color: colors.primary,
    marginBottom: 12,
    letterSpacing: spacing[1],
  },
  subtitle: {
    ...typography.titleSm,
    fontWeight: '500',
    color: colors.text,
  },
  subtitle2: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  primaryArea: {
    width: '100%',
  },
  kakaoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    backgroundColor: KAKAO_YELLOW,
  },
  kakaoText: {
    fontSize: 16,
    fontWeight: '600',
    color: KAKAO_TEXT,
  },
  disabled: {
    opacity: 0.5,
  },
  toggleEmail: {
    alignItems: 'center',
    marginTop: 24,
    gap: 4,
  },
  toggleEmailText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  toggleEmailLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textDecorationLine: 'underline',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  dividerText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  form: {
    marginBottom: 24,
  },
  registerLink: {
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  registerBold: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  checkboxText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.textMuted,
  },
  checkboxTextActive: {
    color: colors.text,
  },
  modalBody: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    textAlign: 'center',
    paddingVertical: 8,
  },
  modalActions: {
    marginTop: 16,
  },
});
