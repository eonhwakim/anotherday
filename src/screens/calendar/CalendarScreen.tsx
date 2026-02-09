import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useGoalStore } from '../../stores/goalStore';
import { useTeamStore } from '../../stores/teamStore';
import CheckinList from '../../components/calendar/CheckinList';
import dayjs from '../../lib/dayjs';
import { COLORS } from '../../constants/defaults';

export default function CalendarScreen() {
  const user = useAuthStore((s) => s.user);
  const { currentTeam } = useTeamStore();
  const {
    teamGoals,
    myGoals,
    calendarMarkings,
    selectedDateCheckins,
    fetchCalendarMarkings,
    fetchCheckinsForDate,
    fetchTeamGoals,
    fetchMyGoals,
  } = useGoalStore();

  const [selectedDate, setSelectedDate] = useState(
    dayjs().format('YYYY-MM-DD')
  );
  const [currentMonth, setCurrentMonth] = useState(
    dayjs().format('YYYY-MM')
  );

  // 화면 포커스 될 때 데이터 최신화 (다른 탭에서 변경된 사항 반영)
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchCalendarMarkings(user.id, currentMonth);
        if (selectedDate) {
          fetchCheckinsForDate(user.id, selectedDate);
        }
        fetchMyGoals(user.id);
        fetchTeamGoals(currentTeam?.id ?? '', user.id);
      }
    }, [user, currentMonth, selectedDate, currentTeam])
  );

  // ... (나머지 코드는 동일)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll}>
        <Text style={styles.screenTitle}>캘린더</Text>

        <Calendar
          theme={{
            calendarBackground: COLORS.surface,
            todayTextColor: COLORS.secondary,
            selectedDayBackgroundColor: COLORS.secondary,
            selectedDayTextColor: '#fff',
            arrowColor: COLORS.secondary,
            monthTextColor: COLORS.text,
            dayTextColor: COLORS.text,
            textDisabledColor: COLORS.textMuted,
            textDayFontWeight: '500',
            textMonthFontWeight: '700',
            textDayHeaderFontWeight: '500',
            textSectionTitleColor: COLORS.textSecondary,
          }}
          style={styles.calendar}
        />

        {/* ... (요약 뷰) */}
        {calendarMarkings[selectedDate] && (
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              {dayjs(selectedDate).format('M/D')} 인증:{' '}
              {calendarMarkings[selectedDate].checkinCount}개
            </Text>
          </View>
        )}

        {/* 체크인 목록 + 미달성 목표 표시 */}
        <CheckinList
          checkins={selectedDateCheckins}
          date={selectedDate}
          goals={teamGoals}
          myGoals={myGoals}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    letterSpacing: -0.5,
  },
  calendar: {
    marginHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    shadowColor: 'rgba(255,255,255,0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  summary: {
    paddingHorizontal: 16,
    paddingTop: 16,
    marginHorizontal: 12,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 6,
    paddingBottom: 12,
    shadowColor: 'rgba(255,255,255,0.2)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryLight,
  },
});
