import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AppTabParamList } from '../types/navigation';
import HomeScreen from '../screens/home/HomeScreen';
import CalendarScreen from '../screens/calendar/CalendarScreen';
import StatisticsScreen from '../screens/stats/StatisticsScreen';
import MyPageScreen from '../screens/mypage/MyPageScreen';
import { COLORS } from '../constants/defaults';

const Tab = createBottomTabNavigator<AppTabParamList>();

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FF6B3D',
        tabBarInactiveTintColor: 'rgba(26,26,26,0.35)',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: 'rgba(255, 107, 61, 0.15)',
          borderTopWidth: 1,
          paddingTop: 6,
          height: 88,
          shadowColor: '#FF6B3D',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'HomeTab') iconName = 'home';
          else if (route.name === 'CalendarTab') iconName = 'calendar';
          else if (route.name === 'StatsTab') iconName = 'stats-chart';
          else if (route.name === 'MyPageTab') iconName = 'person';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ tabBarLabel: '오늘' }} />
      <Tab.Screen name="CalendarTab" component={CalendarScreen} options={{ tabBarLabel: '캘린더' }} />
      <Tab.Screen name="StatsTab" component={StatisticsScreen} options={{ tabBarLabel: '통계' }} />
      <Tab.Screen name="MyPageTab" component={MyPageScreen} options={{ tabBarLabel: '마이' }} />
    </Tab.Navigator>
  );
}
