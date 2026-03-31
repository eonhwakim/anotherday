import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CyberFrame from '../../../components/ui/CyberFrame';
import type { User } from '../../../types/domain';
import { COLORS } from '../../../constants/defaults';

interface MyPageProfileCardProps {
  user: User | null;
  onPress: () => void;
}

export default function MyPageProfileCard({ user, onPress }: MyPageProfileCardProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <CyberFrame style={styles.profileFrame} contentStyle={styles.profileCard} glassOnly={false}>
        <View style={styles.avatarLarge}>
          {user?.profile_image_url ? (
            <Image
              source={{ uri: user.profile_image_url }}
              style={{ width: 56, height: 56, borderRadius: 28 }}
            />
          ) : (
            <Ionicons name="person" size={28} color={COLORS.primaryLight} />
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.nickname}>{user?.nickname ?? '-'}</Text>
          {(user?.name || user?.gender || user?.age) && (
            <Text style={styles.detailText}>
              {[user.name, user.gender, user.age ? `${user.age}세` : null]
                .filter(Boolean)
                .join(' / ')}
            </Text>
          )}
          <Text style={styles.email}>{user?.email ?? '-'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </CyberFrame>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  profileFrame: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 107, 61, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.25)',
  },
  profileInfo: {
    flex: 1,
  },
  nickname: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  detailText: {
    fontSize: 13,
    color: 'rgba(26,26,26,0.50)',
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
    color: 'rgba(26,26,26,0.35)',
  },
});
