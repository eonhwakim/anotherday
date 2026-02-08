import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { useAuthStore } from '../../stores/authStore';
import { useGoalStore } from '../../stores/goalStore';
import CheckinList from '../../components/calendar/CheckinList';
import dayjs from '../../lib/dayjs';
import { COLORS } from '../../constants/defaults';

export default function CalendarScreen() {
  const user = useAuthStore((s) => s.user);
  const {
    calendarMarkings,
    selectedDateCheckins,
    fetchCalendarMarkings,
    fetchCheckinsForDate,
  } = useGoalStore();

  const [selectedDate, setSelectedDate] = useState(
    dayjs().format('YYYY-MM-DD')
  );
  const [currentMonth, setCurrentMonth] = useState(
    dayjs().format('YYYY-MM')
  );

  // 월 변경 시 마킹 데이터 로드
  useEffect(() => {
    if (user) {
      fetchCalendarMarkings(user.id, currentMonth);
    }
  }, [user, currentMonth]);

  // 날짜 선택 시 체크인 목록 로드
  useEffect(() => {
    if (user && selectedDate) {
      fetchCheckinsForDate(user.id, selectedDate);
    }
  }, [user, selectedDate]);

  const handleDayPress = useCallback((day: DateData) => {
    setSelectedDate(day.dateString);
  }, []);

  const handleMonthChange = useCallback((month: DateData) => {
    setCurrentMonth(`${month.year}-${String(month.month).padStart(2, '0')}`);
  }, []);

  // react-native-calendars 마킹 형식으로 변환
  const markedDates: Record<string, any> = {};
  Object.entries(calendarMarkings).forEach(([date, info]) => {
    markedDates[date] = {
      marked: info.marked,
      dotColor: info.dotColor,
      selected: date === selectedDate,
      selectedColor: COLORS.primary,
    };
  });

  // 선택된 날짜가 마킹에 없으면 선택 표시만 추가
  if (!markedDates[selectedDate]) {
    markedDates[selectedDate] = {
      selected: true,
      selectedColor: COLORS.primary,
    };
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll}>
        <Text style={styles.screenTitle}>캘린더</Text>

        <Calendar
          markedDates={markedDates}
          onDayPress={handleDayPress}
          onMonthChange={handleMonthChange}
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

        {/* 선택 날짜의 체크인 요약 (달력 위에 간단한 텍스트) */}
        {calendarMarkings[selectedDate] && (
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              {dayjs(selectedDate).format('M/D')} 인증:{' '}
              {calendarMarkings[selectedDate].checkinCount}개
            </Text>
          </View>
        )}

        {/* 체크인 목록 */}
        <CheckinList
          checkins={selectedDateCheckins}
          date={selectedDate}
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
