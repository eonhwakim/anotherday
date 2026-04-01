import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MyPageFabMenuProps {
  visible: boolean;
  onClose: () => void;
  onCreateTeam: () => void;
  onJoinTeam: () => void;
  onAddResolution: () => void;
  onAddRoutine: () => void;
}

export default function MyPageFabMenu({
  visible,
  onClose,
  onCreateTeam,
  onJoinTeam,
  onAddResolution,
  onAddRoutine,
}: MyPageFabMenuProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.fabOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <View style={styles.fabMenuContainer}>
          <View style={styles.fabMenuSection}>
            <TouchableOpacity style={styles.fabMenuItem} onPress={onCreateTeam}>
              <Ionicons name="add-circle-outline" size={20} color="#1A1A1A" />
              <Text style={styles.fabMenuText}>팀 생성</Text>
            </TouchableOpacity>
            <View style={styles.fabMenuDivider} />
            <TouchableOpacity style={styles.fabMenuItem} onPress={onJoinTeam}>
              <Ionicons name="enter-outline" size={20} color="#1A1A1A" />
              <Text style={styles.fabMenuText}>팀 참가</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fabMenuSection}>
            <TouchableOpacity style={styles.fabMenuItem} onPress={onAddResolution}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#1A1A1A" />
              <Text style={styles.fabMenuText}>한마디 추가</Text>
            </TouchableOpacity>
            <View style={styles.fabMenuDivider} />
            <TouchableOpacity style={styles.fabMenuItem} onPress={onAddRoutine}>
              <Ionicons name="calendar-outline" size={20} color="#1A1A1A" />
              <Text style={styles.fabMenuText}>루틴 추가</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.floatingButton, styles.floatingButtonClose]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={28} color="#1A1A1A" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fabOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  fabMenuContainer: {
    position: 'absolute',
    right: 20,
    bottom: 200,
    width: 200,
  },
  fabMenuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  fabMenuText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  fabMenuDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  floatingButton: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButtonClose: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    borderRadius: 40,
    width: 64,
    height: 64,
    bottom: 120,
    right: 24,
  },
});
