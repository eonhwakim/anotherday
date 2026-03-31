import React from 'react';
import { TouchableOpacity, StyleSheet, Image, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CalendarFloatingRecordsButtonProps {
  onPress: () => void;
}

export default function CalendarFloatingRecordsButton({
  onPress,
}: CalendarFloatingRecordsButtonProps) {
  return (
    <TouchableOpacity style={styles.floatingButtonWrapper} onPress={onPress} activeOpacity={0.8}>
      <Image
        source={require('../../../../assets/floating-btn.png')}
        style={styles.floatingButtonImage}
        resizeMode="stretch"
      />
      <View style={styles.floatingButtonContent}>
        <Ionicons name="list" size={24} color="#FFFFFF" />
        <Text style={styles.floatingButtonText}>기록 보기</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  floatingButtonWrapper: {
    position: 'absolute',
    right: 10,
    bottom: 26,
    width: 140,
    height: 52,
    justifyContent: 'center',
  },
  floatingButtonImage: {
    position: 'absolute',
    width: 140,
    height: 65,
  },
  floatingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: '100%',
    paddingHorizontal: 20,
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
