import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { RootStackParamList } from '../types/navigation';
import { useUserTeamsQuery } from '../queries/teamQueries';
import AuthStack from './AuthStack';
import AppTabs from './AppTabs';
import TeamMemberScreen from '../screens/team/TeamMemberScreen';
import TeamProfileEditScreen from '../screens/team/TeamProfileEditScreen';
import ProfileEditScreen from '../screens/mypage/ProfileEditScreen';
import AppSettingsScreen from '../screens/mypage/AppSettingsScreen';
import AddRoutineScreen from '../screens/mypage/AddRoutineScreen';
import { colors } from '../design/tokens';
import { scheduleDailyNotifications } from '../utils/notifications';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, isLoading: authLoading, restoreSession } = useAuthStore();
  const teamsQuery = useUserTeamsQuery(user?.id);
  const [isReady, setIsReady] = useState(false);

  // 1. 세션 복원
  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  // 2. 유저 정보 로드 후, 팀 정보 로드 + 알림 스케줄
  useEffect(() => {
    const init = async () => {
      if (user) {
        scheduleDailyNotifications().catch(() => {});
      }
      setIsReady(true);
    };

    if (!authLoading) {
      init();
    }
  }, [user, authLoading]);

  // 로딩 화면
  if (authLoading || (user && teamsQuery.isLoading) || !isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
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
            <Stack.Screen name="TeamMember" component={TeamMemberScreen} />
            <Stack.Screen name="TeamProfileEdit" component={TeamProfileEditScreen} />
            <Stack.Screen name="AppSettings" component={AppSettingsScreen} />
            <Stack.Screen name="AddRoutine" component={AddRoutineScreen} />
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
    backgroundColor: colors.background,
  },
});
