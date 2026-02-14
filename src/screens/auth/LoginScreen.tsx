import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
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
import { COLORS } from '../../constants/defaults';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Circle } from 'react-native-svg';

type LoginNav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginNav>();
  const { signIn, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(false);

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

  const handleLogin = async () => {
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
      <View style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="bgGrad" x1="0" y1="0" x2="0.5" y2="1">
              <Stop offset="0%" stopColor="#050510" />
              <Stop offset="100%" stopColor="#080820" />
            </LinearGradient>
            <RadialGradient id="orbA" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
              <Stop offset="0%" stopColor={COLORS.holoCyan} stopOpacity="0.12" />
              <Stop offset="100%" stopColor={COLORS.holoCyan} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="orbB" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
              <Stop offset="0%" stopColor={COLORS.holoPink} stopOpacity="0.10" />
              <Stop offset="100%" stopColor={COLORS.holoPink} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bgGrad)" />
          <Circle cx="75%" cy="18%" r="200" fill="url(#orbA)" />
          <Circle cx="20%" cy="72%" r="160" fill="url(#orbB)" />
        </Svg>
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.header}>
            <Text style={styles.title}>Another Day</Text>
            <Text style={styles.subtitle}>또 다른 하루를 쌓아가다</Text>
            <Text style={styles.subtitle2}>팀과 함께 매일의 목표를 달성해보세요</Text>
          </View>

          <View style={styles.form}>
            <Input label="이메일" placeholder="email@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            <Input label="비밀번호" placeholder="비밀번호 입력" value={password} onChangeText={setPassword} secureTextEntry />
            
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setRememberEmail(!rememberEmail)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={rememberEmail ? 'checkbox' : 'square-outline'}
                size={20}
                color={rememberEmail ? COLORS.text : COLORS.textMuted}
              />
              <Text style={[styles.checkboxText, rememberEmail && styles.checkboxTextActive]}>
                이메일 기억하기
              </Text>
            </TouchableOpacity>

            <Button title="로그인" onPress={handleLogin} loading={isLoading} style={{ marginTop: 8 }} />
          </View>

          <TouchableOpacity style={styles.registerLink} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerText}>
              계정이 없으신가요?{' '}
              <Text style={styles.registerBold}>회원가입</Text>
            </Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 48 },
  title: { fontSize: 36, fontWeight: '800', color: COLORS.text, marginBottom: 12, letterSpacing: 2 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '500' },
  subtitle2: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
  form: { marginBottom: 32 },
  registerLink: { alignItems: 'center' },
  registerText: { fontSize: 14, color: COLORS.textSecondary },
  registerBold: { color: COLORS.secondary, fontWeight: '600' },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  checkboxText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  checkboxTextActive: {
    color: COLORS.text,
  },
});
