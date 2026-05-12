import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTabParamList } from '../types/navigation';
import HomeScreen from '../screens/home/HomeScreen';
import GoalScreen from '../screens/goal/GoalScreen';
import CalendarScreen from '../screens/calendar/CalendarScreen';
import StatisticsScreen from '../screens/stats/StatisticsScreen';
import MyPageScreen from '../screens/mypage/MyPageScreen';
import { colors } from '../design/tokens';

const Tab = createBottomTabNavigator<AppTabParamList>();
const SafeBlurView = Platform.OS === 'android' ? View : BlurView;

const TAB_META: Record<
  keyof AppTabParamList,
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  HomeTab: { label: 'Today', icon: 'sunny' },
  GoalTab: { label: 'Habits', icon: 'list' },
  CalendarTab: { label: 'Calendar', icon: 'calendar' },
  StatsTab: { label: 'Stats', icon: 'bar-chart' },
  MyPageTab: { label: 'Profile', icon: 'person' },
};

function SlidingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const horizontalInset = styles.glassShell.paddingHorizontal;
  const availableWidth = width - (typeof horizontalInset === 'number' ? horizontalInset * 2 : 24);
  const tabWidth = availableWidth / state.routes.length;
  const indicatorWidth = 42;
  const indicatorTranslateX = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(indicatorTranslateX, {
      toValue:
        (typeof horizontalInset === 'number' ? horizontalInset : 12) +
        state.index * tabWidth +
        (tabWidth - indicatorWidth) / 2,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
      mass: 0.9,
    }).start();
  }, [horizontalInset, indicatorTranslateX, state.index, tabWidth]);

  return (
    <View style={styles.tabBarWrap}>
      <SafeBlurView
        intensity={50}
        tint="light"
        style={[styles.glassShell, { paddingBottom: Math.max(insets.bottom, 10) }]}
      >
        <View style={styles.edgeHighlight} />
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
                <View style={styles.iconWrap}>
                  {isFocused ? <View style={styles.activeGlow} /> : null}
                  <Ionicons
                    name={meta.icon}
                    size={22}
                    color={color}
                    style={isFocused ? styles.activeIcon : styles.inactiveIcon}
                  />
                </View>
                <Text style={[styles.tabLabel, isFocused && styles.tabLabelFocused, { color }]}>
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SafeBlurView>
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <SlidingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  glassShell: {
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: 'rgba(255,255,255,0.42)',
    minHeight: 58,
    paddingHorizontal: 12,
    paddingTop: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 12,
  },
  edgeHighlight: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    height: 4,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconWrap: {
    width: 46,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeGlow: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 61, 0.1)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 12,
  },
  activeIcon: {
    textShadowColor: 'rgba(255, 107, 61, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  inactiveIcon: {
    textShadowColor: 'transparent',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
    paddingTop: 4,
  },
  tabLabelFocused: {
    fontWeight: '700',
    textShadowColor: 'rgba(255, 107, 61, 0.22)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
