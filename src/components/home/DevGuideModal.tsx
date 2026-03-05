import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DevGuideModalProps {
  visible: boolean;
  onClose: (savePreference: boolean) => void;
}

export default function DevGuideModal({ visible, onClose }: DevGuideModalProps) {
  const [neverShowAgain, setNeverShowAgain] = useState(false);

  useEffect(() => {
    if (visible) {
      setNeverShowAgain(false);
    }
  }, [visible]);

  const handleConfirm = () => {
    onClose(neverShowAgain);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalWrapper}>
          <Image
            source={require('../../../assets/notidev.png')}
            style={styles.scrollImage}
            resizeMode="contain"
          />

          {/* 다시 보지 않기 + 시작하기 버튼 */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={styles.guideConfirmBtn}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.guideConfirmText}>시작하기!</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.guideCheckRow}
              onPress={() => setNeverShowAgain((v) => !v)}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <View style={[styles.guideCheckbox, neverShowAgain && styles.guideCheckboxActive]}>
                {neverShowAgain && <Ionicons name="checkmark" size={13} color="#fff" />}
              </View>
              <Text style={[styles.guideCheckLabel, neverShowAgain && styles.guideCheckLabelActive]}>다시 보지 않기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalWrapper: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderRadius: 16,
    overflow: 'hidden',
  },
  scrollImage: {
    width: '100%',
    height: 490,
  },
  bottomSection: {
    width: '100%',
    // paddingTop: 20,
    // paddingHorizontal: 24,
    // paddingBottom: 16,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(139, 90, 43, 0.15)',
  },
  guideCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 14,
    gap: 10,
    marginTop: 12,

  },
  guideCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideCheckboxActive: {
    backgroundColor: '#FF6B3D',
    borderColor: '#FF6B3D',
  },
  guideCheckLabel: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  guideCheckLabelActive: {
    color: '#FFFFFF',
  },
  guideConfirmBtn: {
    backgroundColor: '#FF6B3D',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 100,
    width: '80%',
    alignItems: 'center',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  guideConfirmText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
