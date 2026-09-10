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
const TAB_BAR_SIDE_MARGIN = 18;
const TAB_BAR_HORIZONTAL_PAD = 8;

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
  const availableWidth = width - TAB_BAR_SIDE_MARGIN * 2 - TAB_BAR_HORIZONTAL_PAD * 2;
  const tabWidth = availableWidth / state.routes.length;
  const indicatorWidth = 46;
  const indicatorTranslateX = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(indicatorTranslateX, {
      toValue: TAB_BAR_HORIZONTAL_PAD + state.index * tabWidth + (tabWidth - indicatorWidth) / 2,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
      mass: 0.9,
    }).start();
  }, [indicatorTranslateX, state.index, tabWidth]);

  return (
    <View style={[styles.tabBarWrap, { bottom: Math.max(insets.bottom - 12, 4) }]}>
      <SafeBlurView intensity={36} tint="light" style={styles.glassShell}>
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
                    size={20}
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
    left: TAB_BAR_SIDE_MARGIN,
    right: TAB_BAR_SIDE_MARGIN,
    backgroundColor: 'transparent',
  },
  glassShell: {
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
    minHeight: 56,
    paddingHorizontal: TAB_BAR_HORIZONTAL_PAD,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(235, 244, 250, 0.78)',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 10,
  },
  edgeHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.74)',
  },
  activeIndicator: {
    position: 'absolute',
    top: 7,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 107, 61, 0.12)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 44,
  },
  iconWrap: {
    width: 36,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeGlow: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 61, 0.08)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  activeIcon: {
    textShadowColor: 'rgba(255, 107, 61, 0.22)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  inactiveIcon: {
    textShadowColor: 'transparent',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 0,
    paddingTop: 1,
  },
  tabLabelFocused: {
    fontWeight: '600',
    textShadowColor: 'rgba(255, 107, 61, 0.12)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
