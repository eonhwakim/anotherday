import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { COLORS } from '../../constants/defaults';

/**
 * 팀 만들기 화면 (MVP 확장용 - 기본 구조만)
 */
export default function TeamCreateScreen() {
  const user = useAuthStore((s) => s.user);
  const { createTeam } = useTeamStore();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setIsLoading(true);
    const team = await createTeam(name.trim(), user.id);
    setIsLoading(false);

    if (team) {
      Alert.alert('팀 생성 완료', `"${team.name}" 팀이 생성되었어요!`);
    } else {
      Alert.alert('오류', '팀 생성에 실패했어요.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>새 팀 만들기</Text>
        <Input
          label="팀 이름"
          placeholder="팀 이름을 입력하세요"
          value={name}
          onChangeText={setName}
        />
        <Button
          title="팀 만들기"
          onPress={handleCreate}
          loading={isLoading}
          disabled={!name.trim()}
        />
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
    marginBottom: 24,
  },
});
