import React from 'react';
import { View, Modal, StyleSheet, Pressable, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReactionWithUser } from '../../types/domain';
import { FeedReactionAvatars } from '../home/TodayGoalListFeed';

interface CalendarPhotoModalProps {
  photoModal: { url: string; checkinId: string } | null;
  reactions?: ReactionWithUser[];
  onClose: () => void;
}

export default function CalendarPhotoModal({
  photoModal,
  reactions = [],
  onClose,
}: CalendarPhotoModalProps) {
  return (
    <Modal visible={!!photoModal} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.photoOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.photoContainer}>
          {photoModal ? (
            <Image
              source={{ uri: photoModal.url }}
              style={styles.photoFull}
              resizeMode="contain"
            />
          ) : null}
          <TouchableOpacity style={styles.photoCloseBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          {reactions.length > 0 ? (
            <View style={styles.reactionOverlay}>
              <FeedReactionAvatars reactions={reactions} size="lg" />
            </View>
          ) : null}
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
  reactionOverlay: {
    position: 'absolute',
    bottom: -64,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
