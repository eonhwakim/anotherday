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
        // 캘린더 마킹 & 선택 날짜 체크인
        fetchCalendarMarkings(user.id, currentMonth);
        if (selectedDate) {
          fetchCheckinsForDate(user.id, selectedDate);
        }
        
        // 목표 목록도 최신화 (CheckinList에 미완료 항목 표시를 위해)
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
            todayTextColor: COLORS.primary,
            selectedDayBackgroundColor: COLORS.primary,
            selectedDayTextColor: '#fff',
            arrowColor: COLORS.primary,
            monthTextColor: COLORS.text,
            textDayFontWeight: '500',
            textMonthFontWeight: '700',
            textDayHeaderFontWeight: '500',
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
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  calendar: {
    marginHorizontal: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  summary: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
