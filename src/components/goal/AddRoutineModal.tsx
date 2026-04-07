import React from 'react';

import BottomSheetModal from '../ui/BottomSheetModal';
import RoutineComposer from './RoutineComposer';

interface AddRoutineModalProps {
  visible: boolean;
  onClose: () => void;
  onDone?: () => void | Promise<void>;
}

export default function AddRoutineModal({ visible, onClose, onDone }: AddRoutineModalProps) {
  const handleDone = async () => {
    await onDone?.();
    onClose();
  };

  return (
    <BottomSheetModal visible={visible} title="루틴 추가" onClose={onClose}>
      <RoutineComposer visible={visible} inModal onDone={handleDone} />
    </BottomSheetModal>
  );
}
