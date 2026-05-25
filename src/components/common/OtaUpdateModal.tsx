import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '../../design/tokens';

interface OtaUpdateModalProps {
  /** 다운로드된 OTA 업데이트가 적용 대기 중일 때 true */
  visible: boolean;
  /** "지금 적용" — 앱을 재시작해 즉시 적용 */
  onApply: () => void;
}

/**
 * OTA 업데이트 다운로드 완료 안내 모달.
 * 사용자가 "지금 적용"을 누르면 reloadAsync로 그 자리에서 새 번들이 적용됩니다.
 * 닫기 없이 적용만 가능합니다.
 */
export default function OtaUpdateModal({ visible, onApply }: OtaUpdateModalProps) {
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>업데이트가 준비됐어요</Text>
          <Text style={styles.message}>
            새로운 변경사항이 다운로드됐어요. 지금 적용하면 바로 반영됩니다.
          </Text>

          <Pressable style={[styles.button, styles.primaryButton]} onPress={onApply}>
            <Text style={styles.primaryButtonText}>지금 적용</Text>
          </Pressable>
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
  button: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
