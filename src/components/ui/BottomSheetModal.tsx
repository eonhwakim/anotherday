import React, { type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  type DimensionValue,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  disableClose?: boolean;
}

export default function BottomSheetModal({
  visible,
  onClose,
  title,
  children,
  blurIntensity = 30,
  maxHeight = '75%',
  showHandle = true,
  disableClose = false,
}: BottomSheetModalProps) {
  const insets = useSafeAreaInsets();
  const [shouldRender, setShouldRender] = React.useState(visible);
  const transition = React.useRef(new Animated.Value(visible ? 1 : 0)).current;

  React.useEffect(() => {
    if (visible) {
      setShouldRender(true);
    }

    Animated.timing(transition, {
      toValue: visible ? 1 : 0,
      duration: visible ? 220 : 160,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) {
        setShouldRender(false);
      }
    });
  }, [transition, visible]);

  const handleClose = () => {
    if (disableClose) return;
    onClose();
  };

  if (!shouldRender) return null;

  const backdropOpacity = transition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const sheetTranslateY = transition.interpolate({
    inputRange: [0, 1],
    outputRange: [72, 0],
  });

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={handleClose} accessible={false}>
          <Animated.View style={[styles.overlayBg, { opacity: backdropOpacity }]} />
        </TouchableWithoutFeedback>
        <Animated.View
          pointerEvents="box-none"
          style={[styles.sheetMotion, { transform: [{ translateY: sheetTranslateY }] }]}
        >
          <SafeBlurView
            intensity={blurIntensity}
            tint="light"
            style={[styles.sheet, { maxHeight, paddingBottom: Math.max(insets.bottom + 18, 34) }]}
          >
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
                onPress={handleClose}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="닫기"
                disabled={disableClose}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {children}
          </SafeBlurView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetMotion: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 10,
    elevation: 10,
  },
  sheet: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    minHeight: 260,
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
