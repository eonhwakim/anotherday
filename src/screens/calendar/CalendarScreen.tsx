import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../../types/navigation';
import { useAuthStore } from '../../stores/authStore';
import { useGoalStore } from '../../stores/goalStore';
import { useStatsStore } from '../../stores/statsStore';
import { useTeamStore } from '../../stores/teamStore';

import dayjs from '../../lib/dayjs';
import { colors } from '../../design/tokens';
import { getCalendarWeekRanges } from '../../lib/statsUtils';
import useTabDoubleTapScrollTop from '../../hooks/useTabDoubleTapScrollTop';

import CalendarDateSummaryCard from '../../components/calendar/CalendarDateSummaryCard';
import CalendarMemberCheckinsSection from '../../components/calendar/CalendarMemberCheckinsSection';
import CalendarPhotoModal from '../../components/calendar/CalendarPhotoModal';
// import CalendarFloatingRecordsButton from '../../components/calendar/CalendarFloatingRecordsButton';
// import DailyRecordsModal from '../../components/mypage/DailyRecordsModal';

export default function CalendarScreen() {
  const user = useAuthStore((s) => s.user);
  const { currentTeam } = useTeamStore();
  const { fetchTeamGoals, fetchMyGoals } = useGoalStore();
  const {
    calendarMarkings,
    memberDateCheckins,
    fetchCalendarMarkings,
    fetchMemberDateCheckins,
    fetchMonthlyCheckins,
  } = useStatsStore();

  const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const scrollRef = useRef<ScrollView>(null);
  useTabDoubleTapScrollTop({ navigation, scrollRef });

  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [currentMonth, setCurrentMonth] = useState(dayjs().format('YYYY-MM'));
  // const [dailyRecordsModalVisible, setDailyRecordsModalVisible] = useState(false);
  const [photoModal, setPhotoModal] = useState<{ url: string; checkinId: string } | null>(null);

  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  const photoModalContext = React.useMemo(() => {
    if (!photoModal)
      return {
        checkin: null as (typeof memberDateCheckins)[0]['checkins'][0] | null,
        member: null as (typeof memberDateCheckins)[0] | null,
      };
    for (const m of memberDateCheckins) {
      const c = m.checkins.find((x) => x.id === photoModal.checkinId);
      if (c) return { checkin: c, member: m };
    }
    return { checkin: null, member: null };
  }, [photoModal, memberDateCheckins]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        const todayDate = dayjs().format('YYYY-MM-DD');
        const todayMonth = dayjs().format('YYYY-MM');

        setSelectedDate(todayDate);
        setCurrentMonth(todayMonth);

        fetchCalendarMarkings(user.id, todayMonth);
        fetchMyGoals(user.id);
        fetchTeamGoals(currentTeam?.id ?? '', user.id);
        fetchMonthlyCheckins(user.id, todayMonth);
        fetchMemberDateCheckins(currentTeam?.id, user.id, todayDate);
      }
    }, [
      user,
      currentTeam,
      fetchCalendarMarkings,
      fetchMyGoals,
      fetchTeamGoals,
      fetchMonthlyCheckins,
      fetchMemberDateCheckins,
    ]),
  );

  const handleDayPress = useCallback(
    (day: DateData) => {
      setSelectedDate(day.dateString);
      if (user) {
        fetchMemberDateCheckins(currentTeam?.id, user.id, day.dateString);
      }
    },
    [user, currentTeam, fetchMemberDateCheckins],
  );

  const handleMonthChange = useCallback(
    (month: DateData) => {
      const ym = `${month.year}-${String(month.month).padStart(2, '0')}`;
      setCurrentMonth(ym);
      if (user) {
        fetchCalendarMarkings(user.id, ym);
        fetchMonthlyCheckins(user.id, ym);
      }
    },
    [user, fetchCalendarMarkings, fetchMonthlyCheckins],
  );

  const { dataStart, dataEnd } = React.useMemo(
    () => getCalendarWeekRanges(currentMonth),
    [currentMonth],
  );

  const renderDay = useCallback(
    ({
      date,
      state,
      marking,
    }: {
      date?: DateData;
      state?: string;
      marking?: {
        selected?: boolean;
        selectedTextColor?: string;
        marked?: boolean;
        dotColor?: string;
        textColor?: string;
      };
    }) => {
      if (!date) return null;

      const diffDays = dayjs(date.dateString).diff(dayjs(dataStart), 'day');
      const weekNum = Math.floor(diffDays / 7) + 1;

      const isExcluded = date.dateString < dataStart || date.dateString > dataEnd;
      const isEvenWeek = !isExcluded && weekNum % 2 === 0;
      const isOddWeek = !isExcluded && weekNum % 2 === 1;

      const isMonday = dayjs(date.dateString).day() === 1;
      const showWeekLabel = isMonday && !isExcluded;

      let textColor = '';
      const isToday = state === 'today';
      const isSelected = marking?.selected;
      const isDisabled = state === 'disabled';

      if (marking?.textColor) textColor = marking.textColor;
      if (isToday) textColor = colors.primary;
      if (isDisabled) textColor = 'rgba(26, 26, 26, 0.20)';
      if (isSelected) textColor = marking?.selectedTextColor || colors.primary;

      return (
        <View
          style={[
            styles.dayCellWrapper,
            isEvenWeek && styles.zebraStripeEven,
            isOddWeek && styles.zebraStripeOdd,
          ]}
        >
          {showWeekLabel && <Text style={styles.weekNumberLabel}>{weekNum}주</Text>}
          <TouchableOpacity
            onPress={() => handleDayPress(date)}
            activeOpacity={0.7}
            style={[
              styles.dayContainer,
              isToday && !isSelected && styles.todayContainer,
              isSelected && styles.selectedDayContainer,
            ]}
          >
            <Text style={[styles.dayText, { color: textColor }]}>{date.day}</Text>
            {marking?.marked && (
              <View style={[styles.dot, { backgroundColor: marking.dotColor || colors.primary }]} />
            )}
          </TouchableOpacity>
        </View>
      );
    },
    [handleDayPress, dataStart, dataEnd],
  );

  const calendarMarkedDates = React.useMemo(() => {
    const marks: Record<
      string,
      {
        marked?: boolean;
        dotColor?: string;
        selected?: boolean;
        selectedColor?: string;
        selectedTextColor?: string;
        textColor?: string;
        disabled?: boolean;
      }
    > = {};

    Object.entries(calendarMarkings).forEach(([date, m]) => {
      marks[date] = {
        marked: true,
        dotColor: m.dotColor,
      };
    });

    const startDt = dayjs(dataStart);
    const endDt = dayjs(dataEnd);

    let curr = startDt;
    while (curr.isBefore(endDt) || curr.isSame(endDt, 'day')) {
      const dStr = curr.format('YYYY-MM-DD');
      if (!marks[dStr]) marks[dStr] = {};

      marks[dStr] = {
        ...marks[dStr],
        textColor: colors.text,
        disabled: false,
      };
      curr = curr.add(1, 'day');
    }

    const monthStart = dayjs(`${currentMonth}-01`);
    const monthEnd = monthStart.endOf('month');
    let mCurr = monthStart;
    while (mCurr.isBefore(monthEnd) || mCurr.isSame(monthEnd, 'day')) {
      if (mCurr.isBefore(startDt) || mCurr.isAfter(endDt)) {
        const dStr = mCurr.format('YYYY-MM-DD');
        if (!marks[dStr]) marks[dStr] = {};
        marks[dStr] = {
          ...marks[dStr],
          textColor: colors.blue,
          disabled: false,
        };
      }
      mCurr = mCurr.add(1, 'day');
    }

    if (selectedDate) {
      if (!marks[selectedDate]) marks[selectedDate] = {};
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: colors.primaryStrong,
        selectedTextColor: colors.primary,
      };
    }
    return marks;
  }, [calendarMarkings, selectedDate, dataStart, dataEnd, currentMonth]);

  const selectedMarking = calendarMarkings[selectedDate];
  const formattedDate = dayjs(selectedDate).format('M월 D일 (ddd)');
  const isFuture = dayjs(selectedDate).isAfter(dayjs(), 'day');
  const myMember = React.useMemo(
    () => memberDateCheckins.find((member) => member.userId === user?.id) ?? null,
    [memberDateCheckins, user?.id],
  );

  const isExcludedFromStats = React.useMemo(
    () => selectedDate < dataStart || selectedDate > dataEnd,
    [selectedDate, dataStart, dataEnd],
  );

  const isOtherMonth = React.useMemo(
    () => !selectedDate.startsWith(currentMonth),
    [selectedDate, currentMonth],
  );

  const statsGuideMessage = React.useMemo(() => {
    if (isExcludedFromStats) {
      if (selectedDate < dataStart) {
        return `💡 이 날짜는 지난달(${dayjs(currentMonth).subtract(1, 'month').format('M월')}) 통계에 합산됩니다.`;
      }
      if (selectedDate > dataEnd) {
        return `💡 이 날짜는 다음달(${dayjs(currentMonth).add(1, 'month').format('M월')}) 통계에 합산됩니다.`;
      }
    }

    if (isOtherMonth) {
      return `💡 이 날짜는 이번 달(${dayjs(currentMonth).format('M월')}) 통계에 포함됩니다.`;
    }
    return null;
  }, [isExcludedFromStats, isOtherMonth, selectedDate, dataStart, dataEnd, currentMonth]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView ref={scrollRef} style={styles.scroll}>
          <View style={styles.calendarShadowWrap}>
            <View style={styles.calendarContainer}>
              <Calendar
                firstDay={1}
                dayComponent={renderDay}
                theme={{
                  calendarBackground: 'transparent',
                  todayTextColor: colors.primary,
                  selectedDayBackgroundColor: colors.primaryStrong,
                  selectedDayTextColor: colors.primary,
                  arrowColor: colors.primary,
                  monthTextColor: colors.text,
                  dayTextColor: 'rgba(26, 26, 26, 0.80)',
                  textDisabledColor: 'rgba(26, 26, 26, 0.20)',
                  textDayFontWeight: '500',
                  textMonthFontWeight: '700',
                  textDayHeaderFontWeight: '500',
                  textSectionTitleColor: 'rgba(26, 26, 26, 0.40)',
                }}
                style={styles.calendar}
                markedDates={calendarMarkedDates}
                onDayPress={handleDayPress}
                onMonthChange={handleMonthChange}
              />
            </View>
          </View>

          <CalendarDateSummaryCard
            formattedDate={formattedDate}
            selectedMarking={selectedMarking}
            statsGuideMessage={statsGuideMessage}
            isFuture={isFuture}
            myMember={myMember}
            allMembers={memberDateCheckins}
            selectedDate={selectedDate}
            onOpenPhoto={setPhotoModal}
          />

          <CalendarMemberCheckinsSection
            members={memberDateCheckins}
            teamName={currentTeam?.name}
            currentUserId={user?.id}
            selectedDate={selectedDate}
            isFuture={isFuture}
            onOpenPhoto={setPhotoModal}
          />

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* <CalendarFloatingRecordsButton onPress={() => setDailyRecordsModalVisible(true)} /> */}

        <CalendarPhotoModal
          photoModal={photoModal}
          reactions={photoModalContext.checkin?.reactions ?? []}
          onClose={() => setPhotoModal(null)}
        />

        {/* <DailyRecordsModal
          visible={dailyRecordsModalVisible}
          date={selectedDate}
          memberRecords={memberDateCheckins}
          onClose={() => setDailyRecordsModalVisible(false)}
        /> */}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
  },
  calendarShadowWrap: {
    marginTop: 12,
    marginHorizontal: 14,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 8,
  },
  calendarContainer: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  calendar: {
    backgroundColor: 'transparent',
    borderRadius: 22,
  },
  dayCellWrapper: {
    width: 62,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zebraStripeEven: {},
  zebraStripeOdd: {},
  weekNumberLabel: {
    position: 'absolute',
    top: 2,
    left: 6,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 107, 61, 0.6)',
  },
  dayContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  todayContainer: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  selectedDayContainer: {
    backgroundColor: colors.primaryStrong,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});
