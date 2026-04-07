import React, { type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  type DimensionValue,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../design/tokens';

const SafeBlurView = Platform.OS === 'android' ? View : BlurView;

export interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  /** 헤더 가운데 표시 (문자열이면 `headerTitle` 스타일 적용) */
  title: ReactNode;
  children: ReactNode;
  blurIntensity?: number;
  maxHeight?: DimensionValue;
  showHandle?: boolean;
}

export default function BottomSheetModal({
  visible,
  onClose,
  title,
  children,
  blurIntensity = 30,
  maxHeight = '75%',
  showHandle = true,
}: BottomSheetModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={onClose} accessible={false}>
          <View style={styles.overlayBg} />
        </TouchableWithoutFeedback>
        <SafeBlurView intensity={blurIntensity} tint="light" style={[styles.sheet, { maxHeight }]}>
          {showHandle ? <View style={styles.handleBar} /> : null}
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <View style={styles.headerTitleWrap}>
              {typeof title === 'string' || typeof title === 'number' ? (
                <Text style={styles.headerTitle}>{title}</Text>
              ) : (
                title
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="닫기"
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {children}
        </SafeBlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  overlayBg: {
    flex: 1,
  },
  sheet: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#FF6B3D',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 90, 61, 0.2)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerSpacer: {
    width: 28,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  closeBtn: {
    padding: 4,
    width: 28,
    alignItems: 'flex-end',
  },
});
