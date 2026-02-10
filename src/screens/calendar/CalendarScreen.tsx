import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useGoalStore } from '../../stores/goalStore';
import { useTeamStore } from '../../stores/teamStore';
import dayjs from '../../lib/dayjs';
import { COLORS } from '../../constants/defaults';

const STATUS_EMOJI: Record<string, string> = {
  all_done: '✅',
  mixed: '💤',
  mostly_fail: '❌',
  partial: '🔸',
  none: '',
};

export default function CalendarScreen() {
  const user = useAuthStore((s) => s.user);
  const { currentTeam } = useTeamStore();
  const {
    teamGoals,
    myGoals,
    calendarMarkings,
    memberDateCheckins,
    fetchCalendarMarkings,
    fetchCheckinsForDate,
    fetchMemberDateCheckins,
    fetchTeamGoals,
    fetchMyGoals,
  } = useGoalStore();

  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [currentMonth, setCurrentMonth] = useState(dayjs().format('YYYY-MM'));
  const [photoModal, setPhotoModal] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchCalendarMarkings(user.id, currentMonth);
        fetchMyGoals(user.id);
        fetchTeamGoals(currentTeam?.id ?? '', user.id);
        if (selectedDate) {
          fetchMemberDateCheckins(currentTeam?.id, user.id, selectedDate);
        }
      }
    }, [user, currentMonth, selectedDate, currentTeam]),
  );

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    if (user) {
      fetchMemberDateCheckins(currentTeam?.id, user.id, day.dateString);
    }
  };

  const handleMonthChange = (month: DateData) => {
    const ym = `${month.year}-${String(month.month).padStart(2, '0')}`;
    setCurrentMonth(ym);
    if (user) fetchCalendarMarkings(user.id, ym);
  };

  // 캘린더 마킹 변환
  const calendarMarkedDates = React.useMemo(() => {
    const marks: Record<string, any> = {};
    Object.entries(calendarMarkings).forEach(([date, m]) => {
      marks[date] = {
        marked: true,
        dotColor: m.dotColor,
        selected: date === selectedDate,
        selectedColor: 'rgba(255,255,255,0.12)',
      };
    });
    if (selectedDate && !marks[selectedDate]) {
      marks[selectedDate] = {
        selected: true,
        selectedColor: 'rgba(255,255,255,0.12)',
      };
    }
    return marks;
  }, [calendarMarkings, selectedDate]);

  const selectedMarking = calendarMarkings[selectedDate];
  const formattedDate = dayjs(selectedDate).format('M월 D일 (ddd)');
  const isFuture = dayjs(selectedDate).isAfter(dayjs(), 'day');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll}>
        <Text style={styles.screenTitle}>캘린더</Text>

        <Calendar
          theme={{
            calendarBackground: '#0A0A0A',
            todayTextColor: '#FFFFFF',
            selectedDayBackgroundColor: 'rgba(255,255,255,0.15)',
            selectedDayTextColor: '#FFFFFF',
            arrowColor: 'rgba(255,255,255,0.50)',
            monthTextColor: '#FFFFFF',
            dayTextColor: 'rgba(255,255,255,0.80)',
            textDisabledColor: 'rgba(255,255,255,0.15)',
            textDayFontWeight: '500',
            textMonthFontWeight: '700',
            textDayHeaderFontWeight: '500',
            textSectionTitleColor: 'rgba(255,255,255,0.35)',
          }}
          style={styles.calendar}
          markedDates={calendarMarkedDates}
          onDayPress={handleDayPress}
          onMonthChange={handleMonthChange}
        />

        {/* ── 날짜 요약 ── */}
        <View style={styles.dateSummary}>
          <Text style={styles.dateSummaryTitle}>{formattedDate}</Text>
          {selectedMarking && (
            <View style={styles.statusRow}>
              <Text style={styles.statusEmoji}>
                {STATUS_EMOJI[selectedMarking.dayStatus ?? 'none']}
              </Text>
              <Text style={styles.statusText}>
                {selectedMarking.doneCount ?? 0}완료
                {(selectedMarking.passCount ?? 0) > 0 && ` · ${selectedMarking.passCount}패스`}
                {' / '}{selectedMarking.totalGoals ?? 0}개 목표
              </Text>
              {selectedMarking.totalGoals && selectedMarking.totalGoals > 0 && (
                <Text style={styles.percentText}>
                  {Math.round(((selectedMarking.doneCount ?? 0) / ((selectedMarking.totalGoals ?? 1) - (selectedMarking.passCount ?? 0) || 1)) * 100)}%
                </Text>
              )}
            </View>
          )}
          {!selectedMarking && !isFuture && (
            <Text style={styles.noDataText}>기록 없음</Text>
          )}
          {isFuture && (
            <Text style={styles.noDataText}>아직 오지 않은 날이에요</Text>
          )}
        </View>

        {/* ── 팀 멤버별 체크인 상세 ── */}
        {memberDateCheckins.length > 0 && (
          <View style={styles.memberSection}>
            <Text style={styles.memberSectionTitle}>
              {currentTeam ? `${currentTeam.name} 멤버` : '내 기록'}
            </Text>
            {memberDateCheckins.map((member) => (
              <View key={member.userId} style={styles.memberCard}>
                {/* 멤버 헤더 */}
                <View style={styles.memberHeader}>
                  <View style={styles.memberAvatar}>
                    {member.profileImageUrl ? (
                      <Image source={{ uri: member.profileImageUrl }} style={styles.memberAvatarImg} />
                    ) : (
                      <Ionicons name="person" size={16} color="rgba(255,255,255,0.50)" />
                    )}
                  </View>
                  <Text style={styles.memberName}>{member.nickname}</Text>
                  <Text style={styles.memberStat}>
                    {member.doneCount}완료
                    {member.passCount > 0 && ` · ${member.passCount}패스`}
                    {' / '}{member.totalGoals}
                  </Text>
                </View>

                {/* 체크인 목록 */}
                {member.checkins.length === 0 && (
                  <Text style={styles.memberEmpty}>
                    {isFuture ? '예정' : '기록 없음'}
                  </Text>
                )}
                {member.checkins.map((checkin) => {
                  const isPass = checkin.status === 'pass';
                  return (
                    <View key={checkin.id} style={styles.checkinRow}>
                      {/* 사진 or 아이콘 */}
                      {checkin.photo_url ? (
                        <TouchableOpacity onPress={() => setPhotoModal(checkin.photo_url)}>
                          <Image source={{ uri: checkin.photo_url }} style={styles.checkinThumb} />
                          <View style={styles.zoomIcon}>
                            <Ionicons name="expand" size={10} color="#fff" />
                          </View>
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.checkinIcon, isPass && styles.checkinIconPass]}>
                          <Ionicons
                            name={isPass ? 'pause' : 'checkmark'}
                            size={18}
                            color={isPass ? '#FFB547' : '#fff'}
                          />
                        </View>
                      )}
                      <View style={styles.checkinInfo}>
                        <Text style={styles.checkinGoalName}>
                          {checkin.goal?.name ?? '목표'}
                        </Text>
                        <Text style={styles.checkinTime}>
                          {dayjs(checkin.created_at).format('HH:mm')} · {isPass ? '패스' : '완료'}
                        </Text>
                        {checkin.memo && (
                          <Text style={styles.checkinMemo} numberOfLines={2}>
                            {checkin.memo}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── 사진 확대 모달 ── */}
      <Modal visible={!!photoModal} transparent animationType="fade" onRequestClose={() => setPhotoModal(null)}>
        <TouchableOpacity style={styles.photoOverlay} activeOpacity={1} onPress={() => setPhotoModal(null)}>
          <View style={styles.photoContainer}>
            {photoModal && (
              <Image source={{ uri: photoModal }} style={styles.photoFull} resizeMode="contain" />
            )}
            <TouchableOpacity style={styles.photoCloseBtn} onPress={() => setPhotoModal(null)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  screenTitle: {
    fontSize: 24, fontWeight: '800', color: COLORS.text,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, letterSpacing: -0.5,
  },
  calendar: {
    marginHorizontal: 12, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    shadowColor: 'rgba(255,255,255,0.06)', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 3,
  },

  // ── 날짜 요약 ──
  dateSummary: {
    marginHorizontal: 12, marginTop: 12, padding: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 8,
  },
  dateSummaryTitle: {
    fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  statusEmoji: { fontSize: 16 },
  statusText: {
    fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.60)', flex: 1,
  },
  percentText: {
    fontSize: 15, fontWeight: '800', color: '#FFFFFF',
  },
  noDataText: {
    fontSize: 13, color: 'rgba(255,255,255,0.30)', fontWeight: '500',
  },

  // ── 팀 멤버 섹션 ──
  memberSection: {
    marginTop: 16, paddingHorizontal: 12,
  },
  memberSectionTitle: {
    fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.50)',
    marginBottom: 10, letterSpacing: 0.3,
  },
  memberCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8,
    padding: 12, marginBottom: 10,
  },
  memberHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
    paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  memberAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  memberAvatarImg: { width: 28, height: 28, borderRadius: 14 },
  memberName: {
    fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1,
  },
  memberStat: {
    fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.40)',
  },
  memberEmpty: {
    fontSize: 13, color: 'rgba(255,255,255,0.25)', textAlign: 'center', paddingVertical: 8,
  },

  // ── 체크인 행 ──
  checkinRow: {
    flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 6,
  },
  checkinThumb: {
    width: 40, height: 40, borderRadius: 6, backgroundColor: COLORS.surfaceLight,
  },
  zoomIcon: {
    position: 'absolute', bottom: 2, right: 2,
    backgroundColor: 'rgba(0,0,0,0.50)', borderRadius: 4,
    width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  checkinIcon: {
    width: 40, height: 40, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkinIconPass: {
    backgroundColor: 'rgba(255,181,71,0.10)',
    borderColor: 'rgba(255,181,71,0.20)',
  },
  checkinInfo: { flex: 1 },
  checkinGoalName: {
    fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)',
  },
  checkinTime: {
    fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 1,
  },
  checkinMemo: {
    fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2,
  },

  // ── 사진 모달 ──
  photoOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.90)',
    justifyContent: 'center', alignItems: 'center',
  },
  photoContainer: { width: '90%', aspectRatio: 1, position: 'relative' },
  photoFull: { width: '100%', height: '100%', borderRadius: 8 },
  photoCloseBtn: {
    position: 'absolute', top: -40, right: 0,
    padding: 8,
  },
});
