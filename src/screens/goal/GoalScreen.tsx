import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../design/tokens';

import ScreenBackground from '../../components/ui/ScreenBackground';
import BaseCard from '../../components/ui/BaseCard';

export default function GoalScreen() {
  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>내목표</Text>
        </View>

        <View style={styles.content}>
          <BaseCard style={{ alignSelf: 'center', marginTop: 12 }}>
            <Text>TODAY</Text>
            <Text>'오늘의 목표</Text>
          </BaseCard>

          <BaseCard glassOnly style={{ alignSelf: 'center', marginTop: 12 }}>
            <Text>TODAY</Text>
            <Text>'오늘의 목표</Text>
          </BaseCard>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
