import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { User } from '../../types/domain';
import Avatar from '../ui/Avatar';
import { colors, spacing } from '../../design/recipes';

interface MyPageProfileCardProps {
  user: User | null;
  onPress: () => void;
}

export default function MyPageProfileCard({ user, onPress }: MyPageProfileCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.profileSection}>
      <View style={styles.profileCard}>
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
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  profileSection: {
    marginBottom: spacing[5],
  },
  /** 메탈 프레임 카드 → 다른 탭과 같은 반투명 흰 카드 */
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
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
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: colors.text,
    marginBottom: 3,
  },
  detailText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  email: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
