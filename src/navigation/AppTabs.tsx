import React from 'react';
import { View, Text, Pressable, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AppTabParamList } from '../types/navigation';
import HomeScreen from '../screens/home/HomeScreen';
import GoalScreen from '../screens/goal/GoalScreen';
import CalendarScreen from '../screens/calendar/CalendarScreen';
import StatisticsScreen from '../screens/stats/StatisticsScreen';
import MyPageScreen from '../screens/mypage/MyPageScreen';
import { colors } from '../design/tokens';

const Tab = createBottomTabNavigator<AppTabParamList>();

const TAB_META: Record<
  keyof AppTabParamList,
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  HomeTab: { label: '오늘', icon: 'home' },
  GoalTab: { label: '내목표', icon: 'list' },
  CalendarTab: { label: '캘린더', icon: 'calendar' },
  StatsTab: { label: '통계', icon: 'bar-chart' },
  MyPageTab: { label: '마이', icon: 'person' },
};

function SlidingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const tabWidth = width / state.routes.length;
  const indicatorWidth = 42;
  const indicatorTranslateX = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(indicatorTranslateX, {
      toValue: state.index * tabWidth + (tabWidth - indicatorWidth) / 2,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
      mass: 0.9,
    }).start();
  }, [indicatorTranslateX, state.index, tabWidth]);

  return (
    <View style={styles.tabBarWrap}>
      <Animated.View
        style={[
          styles.activeIndicator,
          {
            width: indicatorWidth,
            transform: [{ translateX: indicatorTranslateX }],
          },
        ]}
      />

      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          const isFocused = state.index === index;
          const meta = TAB_META[route.name as keyof AppTabParamList];
          const color = isFocused ? colors.primary : 'rgba(26,26,26,0.35)';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={descriptor.options.tabBarAccessibilityLabel}
              testID={descriptor.options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabButton}
            >
              <Ionicons name={meta.icon} size={22} color={color} />
              <Text style={[styles.tabLabel, { color }]}>{meta.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <SlidingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="GoalTab" component={GoalScreen} />
      <Tab.Screen name="CalendarTab" component={CalendarScreen} />
      <Tab.Screen name="StatsTab" component={StatisticsScreen} />
      <Tab.Screen name="MyPageTab" component={MyPageScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarWrap: {
    position: 'relative',
    backgroundColor: colors.white,
    borderTopColor: colors.white,
    borderTopWidth: 1,
    height: 88,
    paddingBottom: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    height: 4,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
    backgroundColor: colors.primary,
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
