import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AuthStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../stores/authStore';
import { setupDefaultTeam } from '../../services/teamService';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { COLORS } from '../../constants/defaults';

type RegisterNav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export default function RegisterScreen() {
  const navigation = useNavigation<RegisterNav>();
  const { signUp, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !nickname.trim()) {
      Alert.alert('알림', '모든 항목을 입력해주세요.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    const success = await signUp(email.trim(), password, nickname.trim());

    if (success) {
      // 회원가입 성공
      // 기존: 자동 팀 생성 -> 변경: 팀 선택 화면 진입을 위해 아무것도 하지 않음
      // (RootNavigator에서 user가 있으면 AuthStack에서 나가지만, 
      //  팀이 없는 경우를 RootNavigator에서 처리하거나, 초기 진입 로직을 수정해야 함)
      
      // 여기서는 일단 성공만 하면 상태가 변경되어 네비게이터가 전환됨
    } else {
      const currentError = useAuthStore.getState().error;
      Alert.alert('회원가입 실패', currentError ?? '알 수 없는 오류가 발생했습니다.');
      clearError();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>회원가입</Text>
          <Text style={styles.subtitle}>
            Another Day에 오신 것을 환영합니다
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="닉네임"
            placeholder="팀원들에게 보여질 이름"
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="none"
          />
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

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.loginText}>
            이미 계정이 있으신가요?{' '}
            <Text style={styles.loginBold}>로그인</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  form: {
    marginBottom: 24,
  },
  loginLink: {
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loginBold: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
