import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, BackHandler } from 'react-native';
import type { AppUpdateState } from '../../hooks/useAppUpdateCheck';
import { colors } from '../../design/tokens';

interface AppUpdateModalProps {
  state: AppUpdateState;
  latestVersion: string | null;
  onUpdate: () => void;
}

/**
 * 강제/권장 업데이트 모달.
 * - required: 닫기 불가, "업데이트하기"만 가능
 * - recommended: "나중에" / "업데이트하기" 두 버튼
 * - ok: 아무 것도 렌더하지 않음
 */
export default function AppUpdateModal({ state, latestVersion, onUpdate }: AppUpdateModalProps) {
  const [dismissed, setDismissed] = useState(false);

  // 권장 업데이트는 사용자가 닫을 수 있으니, state가 바뀌면 닫힘 상태 초기화
  useEffect(() => {
    setDismissed(false);
  }, [state]);

  // Android 뒤로가기로 강제 업데이트 모달을 닫지 못하게
  useEffect(() => {
    if (state !== 'required') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [state]);

  if (state === 'ok' || dismissed) return null;

  const isRequired = state === 'required';
  const title = isRequired ? '업데이트가 필요해요' : '새 버전이 있어요';
  const message = isRequired
    ? '원활한 사용을 위해 최신 버전으로 업데이트해주세요.'
    : `더 나은 경험을 위해 새 버전(${latestVersion ?? ''})으로 업데이트해보세요.`;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isRequired) setDismissed(true);
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonRow}>
            {!isRequired && (
              <Pressable
                style={[styles.button, styles.secondaryButton]}
                onPress={() => setDismissed(true)}
              >
                <Text style={styles.secondaryButtonText}>나중에</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.button, styles.primaryButton, isRequired && styles.fullWidthButton]}
              onPress={onUpdate}
            >
              <Text style={styles.primaryButtonText}>업데이트하기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlayBackdrop,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthButton: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'rgba(26,26,26,0.06)',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
