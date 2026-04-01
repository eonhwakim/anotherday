import React from 'react';
import { View, Modal, StyleSheet, Pressable, Image, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CalendarPhotoModalProps {
  photoModal: { url: string; checkinId: string } | null;
  isReacted: boolean;
  onClose: () => void;
  onPhotoPress: () => void;
  onReactionPress: () => void;
}

export default function CalendarPhotoModal({
  photoModal,
  isReacted,
  onClose,
  onPhotoPress,
  onReactionPress,
}: CalendarPhotoModalProps) {
  return (
    <Modal visible={!!photoModal} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.photoOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.photoContainer}>
          {photoModal && (
            <Pressable onPress={onPhotoPress}>
              <Image
                source={{ uri: photoModal.url }}
                style={styles.photoFull}
                resizeMode="contain"
              />
            </Pressable>
          )}
          <TouchableOpacity style={styles.photoCloseBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.photoHint}>
            <Text style={styles.photoHintText}>탭하여 봤어요(인증) 표시</Text>
            <TouchableOpacity
              onPress={onReactionPress}
              style={[styles.reactionBtn, isReacted && styles.reactionBtnActive]}
            >
              <Image
                source={require('../../../assets/thumb-up.png')}
                style={[styles.reactionIcon, isReacted && styles.reactionIconActive]}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  photoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.90)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoContainer: {
    width: '90%',
    aspectRatio: 1,
    position: 'relative',
  },
  photoFull: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  photoCloseBtn: {
    position: 'absolute',
    top: -40,
    right: 0,
    padding: 8,
  },
  photoHint: {
    position: 'absolute',
    bottom: -100,
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  photoHintText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  reactionBtn: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  reactionBtnActive: {
    borderColor: '#4ADE80',
  },
  reactionIcon: {
    width: 36,
    height: 36,
    tintColor: 'rgba(255,255,255,0.5)',
  },
  reactionIconActive: {
    tintColor: '#4ADE80',
  },
});
