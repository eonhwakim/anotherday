import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GuideModalProps {
  visible: boolean;
  onClose: (savePreference: boolean) => void;
}

export default function GuideModal({ visible, onClose }: GuideModalProps) {
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
        <View style={styles.guideModalContent}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.guideScrollContent}
            bounces={false}
          >
            <Image
              source={require('../../../assets/warning-icon.png')}
              style={styles.guideIconImage}
              resizeMode="contain"
            />
            <Text style={styles.guideTitle}>꼭 읽어주세요</Text>
            <Text style={styles.guideText}>
              이 앱은 <Text style={styles.highlight}>목표 수행 직후, 카메라로만</Text> 인증할 수 있어요.{'\n'}
              앨범 사진은 사용할 수 없습니다.
            </Text>
            <View style={styles.guideWarningBox}>
              <View style={styles.guideWarningItem}>
                <Ionicons name="checkmark-circle" size={18} color="#4ADE80" />
                <Text style={[styles.guideWarningText, { color: '#EF4444' }]}>목표 설정→직접 수행→즉시 카메라 인증</Text>
              </View>
              <View style={styles.guideWarningItem}>
                <Ionicons name="close-circle" size={18} color="#EF4444" />
                <Text style={styles.guideWarningText}>나중에 몰아서 인증하는 건 불가해요</Text>
              </View>
              <View style={styles.guideWarningItem}>
                <Ionicons name="close-circle" size={18} color="#EF4444" />
                <Text style={styles.guideWarningText}>앨범에서 사진 선택은 지원하지 않아요</Text>
              </View>
            </View>
            <Text style={styles.guideSubText}>
              진짜 수행한 순간을 함께 기록하기 위해{'\n'}실시간 카메라 인증만 허용하고 있어요.{'\n'}
              목표를 마치면 바로 찍어주세요 📸
            </Text>

            <TouchableOpacity
              style={styles.guideCheckRow}
              onPress={() => setNeverShowAgain((v) => !v)}
              activeOpacity={0.7}
            >
              <View style={[styles.guideCheckbox, neverShowAgain && styles.guideCheckboxActive]}>
                {neverShowAgain && <Ionicons name="checkmark" size={13} color="#fff" />}
              </View>
              <Text style={[styles.guideCheckLabel, neverShowAgain && styles.guideCheckLabelActive]}>다시 보지 않기</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.guideConfirmBtn} onPress={handleConfirm}>
              <Text style={styles.guideConfirmText}>이해했어요</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  guideModalContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxHeight: '88%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.15)',
    shadowColor: '#FF6B3D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  guideScrollContent: {
    padding: 32,
    alignItems: 'center',
  },
  guideIconImage: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  guideTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  guideText: {
    fontSize: 16,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  highlight: {
    color: '#FF6B3D',
    fontWeight: '700',
  },
  guideWarningBox: {
    backgroundColor: 'rgba(255, 107, 61, 0.06)',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    gap: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.15)',
  },
  guideWarningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guideWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#555555',
    fontWeight: '600',
    flexWrap: 'wrap',
  },
  guideSubText: {
    fontSize: 14,
    color: 'rgba(26,26,26,0.50)',
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 20,
  },
  guideCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 16,
    gap: 10,
  },
  guideCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(26,26,26,0.30)',
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
    color: 'rgba(26,26,26,0.50)',
  },
  guideCheckLabelActive: {
    color: '#1A1A1A',
  },
  guideConfirmBtn: {
    backgroundColor: '#FF6B3D',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#FF6B3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  guideConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
