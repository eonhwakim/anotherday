import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { User } from '../../types/domain';
import FrameCard from '../ui/FrameCard';
import Avatar from '../ui/Avatar';
import { colors, radius, spacing, typography } from '../../design/recipes';

interface MyPageProfileCardProps {
  user: User | null;
  onPress: () => void;
}

export default function MyPageProfileCard({ user, onPress }: MyPageProfileCardProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <FrameCard style={styles.profileFrame} contentStyle={styles.profileCard} padded={false}>
        <View style={styles.avatarLarge}>
          <Avatar uri={user?.profile_image_url ?? null} size={56} />
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
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </FrameCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  profileFrame: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    borderRadius: radius.lg,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[4],
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  nickname: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  detailText: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'none',
    marginBottom: 2,
  },
  email: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'none',
  },
});
