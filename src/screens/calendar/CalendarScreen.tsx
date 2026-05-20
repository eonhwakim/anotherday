import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../../types/navigation';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';

import dayjs from '../../lib/dayjs';
import { colors } from '../../design/tokens';
import { ds, typography } from '../../design/recipes';
import { getCalendarWeekRanges } from '../../lib/statsUtils';
import useTabDoubleTapScrollTop from '../../hooks/useTabDoubleTapScrollTop';
import { useDailyTodosQuery } from '../../queries/todoQueries';
import { useTeamMembersQuery } from '../../queries/teamQueries';
import { useCalendarMarkingsQuery, useMemberDateCheckinsQuery } from '../../queries/statsQueries';
import { queryKeys } from '../../queries/queryKeys';

import GradientBackground from '../../components/ui/GradientBackground';
import CalendarDateSummaryCard from '../../components/calendar/CalendarDateSummaryCard';
import CalendarMemberCheckinsSection from '../../components/calendar/CalendarMemberCheckinsSection';
import CalendarPhotoModal from '../../components/calendar/CalendarPhotoModal';
import PageHeader from '../../components/ui/PageHeader';

export default function CalendarScreen() {
  const user = useAuthStore((s) => s.user);
  const { currentTeam } = useTeamStore();
  const queryClient = useQueryClient();

  const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const scrollRef = useRef<ScrollView>(null);
  useTabDoubleTapScrollTop({ navigation, scrollRef });

  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [currentMonth, setCurrentMonth] = useState(dayjs().format('YYYY-MM'));
  const [photoModal, setPhotoModal] = useState<{ url: string; checkinId: string } | null>(null);
  const { data: members = [] } = useTeamMembersQuery(currentTeam?.id);
  const { data: dailyTodos = [] } = useDailyTodosQuery(user?.id, selectedDate);
  const { data: calendarMarkings = {} } = useCalendarMarkingsQuery(user?.id, currentMonth);
  const { data: memberDateCheckins = [] } = useMemberDateCheckinsQuery(
    currentTeam?.id,
    user?.id,
    selectedDate,
  );

  const photoModalContext = (() => {
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
  })();

  useFocusEffect(
    useCallback(() => {
      if (user) {
        const todayDate = dayjs().format('YYYY-MM-DD');
        const todayMonth = dayjs().format('YYYY-MM');

        setSelectedDate(todayDate);
        setCurrentMonth(todayMonth);

        void queryClient.invalidateQueries({
          queryKey: queryKeys.stats.calendar(user.id, todayMonth),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.stats.memberDateCheckins(currentTeam?.id, user.id, todayDate),
        });
        if (currentTeam?.id) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.teams.members(currentTeam.id),
          });
        }
      }
    }, [currentTeam, queryClient, user]),
  );

  const handleDayPress = useCallback((day: DateData) => {
    setSelectedDate(day.dateString);
  }, []);

  const handleMonthChange = useCallback((month: DateData) => {
    const ym = `${month.year}-${String(month.month).padStart(2, '0')}`;
    setCurrentMonth(ym);
  }, []);

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

      const isSunday = dayjs(date.dateString).day() === 0;
      const showWeekLabel = isSunday;

      let textColor = '';
      const isToday = state === 'today';
      const isSelected = marking?.selected;
      const isDisabled = state === 'disabled';

      if (marking?.textColor) textColor = marking.textColor;
      if (isToday) textColor = colors.primary;
      if (isDisabled) textColor = 'rgba(26, 26, 26, 0.20)';
      if (isSelected) textColor = marking?.selectedTextColor || colors.primary;

      let weekProgressNode = null;
      if (showWeekLabel) {
        const todayStr = dayjs().format('YYYY-MM-DD');
        const weekEndStr = date.dateString;
        const weekStartStr = dayjs(date.dateString).subtract(6, 'day').format('YYYY-MM-DD');

        let weekState: 'past' | 'current' | 'future' | 'empty' = 'future';
        if (isExcluded) {
          weekState = 'empty';
        } else if (todayStr > weekEndStr) {
          weekState = 'past';
        } else if (todayStr >= weekStartStr && todayStr <= weekEndStr) {
          weekState = 'current';
        } else {
          weekState = 'future';
        }

        const prevWeekEndStr = dayjs(date.dateString).subtract(7, 'day').format('YYYY-MM-DD');
        const isPrevWeekExcluded = prevWeekEndStr < dataStart || prevWeekEndStr > dataEnd;

        const nextWeekEndStr = dayjs(date.dateString).add(7, 'day').format('YYYY-MM-DD');
        const isNextWeekExcluded = nextWeekEndStr < dataStart || nextWeekEndStr > dataEnd;

        const showBg = weekState !== 'empty';
        const roundTop = isPrevWeekExcluded;
        const roundBottom = isNextWeekExcluded;

        weekProgressNode = (
          <View style={styles.weekProgressContainer}>
            {showBg && (
              <View
                style={[
                  styles.weekProgressBar,
                  { top: roundTop ? 0 : -10 },
                  { bottom: roundBottom ? 0 : -10 },
                  roundTop && { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
                  roundBottom && { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
                ]}
              />
            )}

            {weekState === 'empty' && <View style={[styles.weekCircle, styles.weekCircleEmpty]} />}

            {weekState === 'past' && (
              <View style={[styles.weekCircle, styles.weekCirclePast]}>
                <Text style={styles.weekTextPast}>{weekNum}주</Text>
              </View>
            )}

            {weekState === 'current' && (
              <View style={styles.weekFlameContainer}>
                <Image
                  source={require('../../../assets/fire.png')}
                  style={styles.flameImage}
                  resizeMode="contain"
                />
                <View style={styles.flameTextContainer}>
                  <Text style={styles.weekTextCurrent}>{weekNum}주</Text>
                </View>
              </View>
            )}

            {weekState === 'future' && (
              <View style={[styles.weekCircle, styles.weekCircleFuture]}>
                <Text style={styles.weekTextFuture}>{weekNum}주</Text>
              </View>
            )}
          </View>
        );
      }

      return (
        <View
          style={[
            styles.dayCellWrapper,
            isEvenWeek && styles.zebraStripeEven,
            isOddWeek && styles.zebraStripeOdd,
          ]}
        >
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

          {weekProgressNode}
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

  const teamWithCaption = React.useMemo(() => {
    if (!currentTeam || members.length === 0) return null;
    return `${members.length}명의 팀원과 함께`;
  }, [currentTeam, members.length]);

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
    <GradientBackground>
      <SafeAreaView style={ds.safe} edges={['top']}>
        <ScrollView ref={scrollRef} style={ds.scroll} contentContainerStyle={ds.scrollContent}>
          <View>
            {teamWithCaption ? <PageHeader title="Calendar" subtitle={teamWithCaption} /> : null}

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

            <CalendarDateSummaryCard
              formattedDate={formattedDate}
              selectedMarking={selectedMarking}
              statsGuideMessage={statsGuideMessage}
              isFuture={isFuture}
              myMember={myMember}
              dailyTodos={dailyTodos}
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
          </View>
        </ScrollView>
        <CalendarPhotoModal
          photoModal={photoModal}
          reactions={photoModalContext.checkin?.reactions ?? []}
          onClose={() => setPhotoModal(null)}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  calendarContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingRight: 28, // 주차 막대가 들어갈 공간을 달력 내부에 확보
  },
  calendar: {
    backgroundColor: 'transparent',
    borderRadius: 20,
  },
  dayCellWrapper: {
    width: '100%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zebraStripeEven: {},
  zebraStripeOdd: {},
  weekProgressContainer: {
    position: 'absolute',
    right: -32, // 달력 우측 패딩 공간 안으로 들어오도록 조정
    top: 0,
    bottom: 0,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  weekProgressBar: {
    position: 'absolute',
    width: 24,
    backgroundColor: 'rgba(255, 107, 61, 0.2)',
  },
  weekCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  weekCirclePast: {
    backgroundColor: '#FF6B3D',
  },
  weekCircleFuture: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
  },
  weekCircleEmpty: {
    width: 22,
    height: 22,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
  },
  weekTextPast: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  weekTextFuture: {
    color: '#999',
    fontSize: 10,
    fontWeight: '700',
  },
  weekFlameContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 38,
    zIndex: 2,
  },
  flameImage: {
    position: 'absolute',
    top: -4,
    width: 38,
    height: 38,
  },
  flameTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekTextCurrent: {
    color: colors.white,
    bottom: -4,
    fontSize: 11,
    fontWeight: '800',
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
