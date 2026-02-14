import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { useTeamStore } from '../stores/teamStore';
import { RootStackParamList } from '../types/navigation';
import AuthStack from './AuthStack';
import AppTabs from './AppTabs';
import TeamDetailScreen from '../screens/team/TeamDetailScreen';
import MemberStatsScreen from '../screens/team/MemberStatsScreen';
import ProfileEditScreen from '../screens/mypage/ProfileEditScreen';
import { COLORS } from '../constants/defaults';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, isLoading: authLoading, restoreSession } = useAuthStore();
  const { currentTeam, fetchTeams } = useTeamStore();
  const [isReady, setIsReady] = useState(false);

  // 1. 세션 복원
  useEffect(() => {
    restoreSession();
  }, []);

  // 2. 유저 정보 로드 후, 팀 정보 로드
  useEffect(() => {
    const init = async () => {
      if (user) {
        await fetchTeams(user.id);
      }
      setIsReady(true);
    };

    if (!authLoading) {
      init();
    }
  }, [user, authLoading]);

  // 로딩 화면
  if (authLoading || !isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // 1. 비로그인 -> 로그인/회원가입
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          // 2. 로그인 O -> 바로 메인 앱 (팀 없으면 메인 내에서 처리)
          <>
            <Stack.Screen name="App" component={AppTabs} />
            <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
            <Stack.Screen name="TeamDetail" component={TeamDetailScreen} />
            <Stack.Screen name="MemberStats" component={MemberStatsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
