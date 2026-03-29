import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import GlassModal from '../ui/GlassModal';

interface ReviewModalProps {
  visible: boolean;
  value: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function ReviewModal({
  visible,
  value,
  onChangeText,
  onClose,
  onSave,
}: ReviewModalProps) {
  return (
    <GlassModal
      visible={visible}
      title="월간 회고"
      onClose={onClose}
      onConfirm={onSave}
      confirmText="저장"
      cancelText="취소"
    >
      <TextInput
        style={styles.modalInput}
        value={value}
        onChangeText={onChangeText}
        placeholder="잘한 점, 아쉬운 점 등을 자유롭게 기록해보세요"
        placeholderTextColor="rgba(26,26,26,0.3)"
        multiline
        textAlignVertical="top"
        autoFocus
      />
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // 반투명 배경
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: '#1A1A1A',
    minHeight: 140,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
});
