import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { handleServiceError } from '../../lib/serviceError';
import { useTeamStore } from '../../stores/teamStore';
import { useUpdateTeamProfileMutation } from '../../queries/teamMutations';
import { colors } from '../../design/tokens';
import { ds } from '../../design/recipes';
import GradientBackground from '../../components/ui/GradientBackground';
import PageHeader from '../../components/ui/PageHeader';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import BaseCard from '../../components/ui/BaseCard';
import { RootStackParamList } from '../../types/navigation';

type TeamProfileEditRouteProp = RouteProp<RootStackParamList, 'TeamProfileEdit'>;

export default function TeamProfileEditScreen() {
  const navigation = useNavigation();
  const route = useRoute<TeamProfileEditRouteProp>();
  const { teamId } = route.params;
  const { teams } = useTeamStore();
  const updateTeamProfileMutation = useUpdateTeamProfileMutation();
  const team = teams.find((t) => t.id === teamId);

  const [name, setName] = useState(team?.name || '');
  const [imageUri, setImageUri] = useState<string | null>(team?.profile_image_url || null);

  useEffect(() => {
    if (team) {
      setName(team.name);
      setImageUri(team.profile_image_url || null);
    }
  }, [team]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('알림', '갤러리 접근 권한이 필요합니다.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('알림', '팀 이름을 입력해주세요.');
      return;
    }

    try {
      const updated = await updateTeamProfileMutation.mutateAsync({
        teamId,
        name: name.trim(),
        imageUri,
      });
      setImageUri(updated.profileImageUrl);
      navigation.goBack();
    } catch (e) {
      handleServiceError(e);
    }
  };

  return (
    <GradientBackground curve>
      <SafeAreaView style={ds.safe} edges={['top']}>
        <ScrollView style={ds.scroll} contentContainerStyle={ds.scrollContent}>
          <PageHeader title="팀 프로필 설정" onBack={() => navigation.goBack()} />

          <View style={styles.profileImageContainer}>
            <TouchableOpacity onPress={handlePickImage} style={styles.imageWrapper}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.profileImage} />
              ) : (
                <View style={[styles.profileImage, styles.placeholderImage]}>
                  <Ionicons name="people" size={36} color={colors.primaryLight} />
                </View>
              )}
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={14} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>

          <BaseCard style={styles.formFrame} contentStyle={styles.form}>
            <Input
              label="팀 이름"
              value={name}
              onChangeText={setName}
              placeholder="팀 이름을 입력하세요"
            />
          </BaseCard>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="저장하기"
            onPress={handleSave}
            loading={updateTeamProfileMutation.isPending}
          />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  profileImageContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  imageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderImage: {
    backgroundColor: 'rgba(255, 107, 61, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formFrame: {
    marginBottom: 16,
    borderRadius: 16,
  },
  form: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  footer: {
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
});
