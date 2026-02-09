import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AppTabParamList } from '../types/navigation';
import HomeScreen from '../screens/home/HomeScreen';
import CalendarScreen from '../screens/calendar/CalendarScreen';
import MyPageScreen from '../screens/mypage/MyPageScreen';
import { COLORS } from '../constants/defaults';

const Tab = createBottomTabNavigator<AppTabParamList>();

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.secondary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingTop: 6,
          height: 88,
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
          else if (route.name === 'MyPageTab') iconName = 'person';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ tabBarLabel: '오늘' }} />
      <Tab.Screen name="CalendarTab" component={CalendarScreen} options={{ tabBarLabel: '캘린더' }} />
      <Tab.Screen name="MyPageTab" component={MyPageScreen} options={{ tabBarLabel: '마이' }} />
    </Tab.Navigator>
  );
}
