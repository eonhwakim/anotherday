import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/defaults';

/**
 * 팀 선택/참가 화면 (MVP 확장용 - 기본 구조만)
 */
export default function TeamSelectScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>팀 선택</Text>
        <Text style={styles.placeholder}>
          팀 선택/참가 기능은 추후 구현됩니다.
        </Text>
      </View>
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
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
  },
  placeholder: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
});
