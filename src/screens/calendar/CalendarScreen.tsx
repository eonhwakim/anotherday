import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import CyberFrame from '../../components/ui/CyberFrame';
import { useAuthStore } from '../../stores/authStore';
import { useGoalStore } from '../../stores/goalStore';
import { useStatsStore } from '../../stores/statsStore';
import { useTeamStore } from '../../stores/teamStore';
import CheckinModal from '../../components/mypage/CheckinModal';
import DailyRecordsModal from '../../components/mypage/DailyRecordsModal';
import Button from '../../components/common/Button';
import dayjs from '../../lib/dayjs';
import { getCalendarWeekRanges } from '../../components/stats/StatsShared';
import { COLORS } from '../../constants/defaults';


export default function CalendarScreen() {
  const user = useAuthStore((s) => s.user);
  const { currentTeam } = useTeamStore();
  const { teamGoals, myGoals, fetchTeamGoals, fetchMyGoals } = useGoalStore();
  const {
    monthlyCheckins,
    calendarMarkings,
    memberDateCheckins,
    fetchCalendarMarkings,
    fetchCheckinsForDate,
    fetchMemberDateCheckins,
    fetchMonthlyCheckins,
    fetchMemberProgress,
    toggleReaction,
  } = useStatsStore();

  const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const scrollRef = useRef<ScrollView>(null);
  const lastTapRef = useRef(0);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      if (navigation.isFocused()) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        }
        lastTapRef.current = now;
      }
    });
    return unsubscribe;
  }, [navigation]);

  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [currentMonth, setCurrentMonth] = useState(dayjs().format('YYYY-MM'));
  const [checkinModalVisible, setCheckinModalVisible] = useState(false);
  const [dailyRecordsModalVisible, setDailyRecordsModalVisible] = useState(false);
  const [photoModal, setPhotoModal] = useState<{ url: string; checkinId: string } | null>(null);
  const [selectedMember, setSelectedMember] = useState<{ userId: string; nickname: string; profileImageUrl: string | null } | null>(null);
  const [lastTap, setLastTap] = useState<number | null>(null);

  // selectedDate를 ref로 관리하여 useFocusEffect에서 최신 값을 참조
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  // 현재 모달에 띄워진 체크인 정보 찾기
  const currentCheckin = React.useMemo(() => {
    if (!photoModal) return null;
    for (const member of memberDateCheckins) {
      const found = member.checkins.find(c => c.id === photoModal.checkinId);
      if (found) return found;
    }
    return null;
  }, [photoModal, memberDateCheckins]);

  // 내가 리액션 했는지 여부
  const isReacted = React.useMemo(() => {
    if (!currentCheckin || !user) return false;
    return currentCheckin.reactions?.some(r => r.user_id === user.id) ?? false;
  }, [currentCheckin, user]);

  // ── 현재 팀에 해당하는 나의 목표만 필터링 (인증 모달용) ──
  const currentTeamUserGoals = React.useMemo(() => {
    if (!teamGoals || teamGoals.length === 0) return [];
    if (!myGoals || !user) return [];
    const myOwnedGoalIds = new Set(
      teamGoals.filter((g) => g.owner_id === user.id).map((g) => g.id),
    );
    return myGoals.filter((ug) => myOwnedGoalIds.has(ug.goal_id));
  }, [teamGoals, myGoals, user]);

  // ── 인증 모달용: 활성+비활성(오늘 제외) 모두 포함 (패스 토글 가능)
  const goalsForCheckinModal = React.useMemo(() => {
    const ugSource = currentTeamUserGoals;
    const myOwnedGoalIds = new Set(
      (teamGoals || []).filter((g) => g.owner_id === user?.id).map((g) => g.id),
    );
    const weekStart = dayjs(selectedDate).startOf('isoWeek').format('YYYY-MM-DD');
    const weekEnd = dayjs(selectedDate).endOf('isoWeek').format('YYYY-MM-DD');
    return (teamGoals || [])
      .filter((g) => myOwnedGoalIds.has(g.id))
      .filter((g) => {
        const ug = ugSource.find((u) => u.goal_id === g.id);
        if (!ug) return false;
        if (ug.start_date && selectedDate < ug.start_date) return false;
        return true;
      })
      .map((g) => {
        const ug = ugSource.find((u) => u.goal_id === g.id);
        const weeklyDoneCount = (monthlyCheckins || []).filter(
          (c) =>
            c.goal_id === g.id &&
            c.date >= weekStart &&
            c.date <= weekEnd &&
            c.status === 'done',
        ).length;
        return {
          goal: g,
          frequency: (ug?.frequency ?? 'daily') as 'daily' | 'weekly_count',
          isExcluded: ug ? !ug.is_active : false,
          targetCount: ug?.target_count ?? null,
          weeklyDoneCount,
        };
      });
  }, [teamGoals, currentTeamUserGoals, selectedDate, user, monthlyCheckins]);

  const selectedDateCheckins = React.useMemo(
    () =>
      (monthlyCheckins || []).filter((c) => c.date === selectedDate),
    [monthlyCheckins, selectedDate],
  );

  const isTodaySelected = selectedDate === dayjs().format('YYYY-MM-DD');

  const handleCheckinPress = () => {
    setCheckinModalVisible(true);
  };

  const handleCheckinDone = useCallback(async () => {
    if (!user) return;
    await fetchMyGoals(user.id);
    const goals = useGoalStore.getState().teamGoals;
    await fetchMonthlyCheckins(user.id, currentMonth);
    await fetchMemberDateCheckins(currentTeam?.id, user.id, selectedDate);
    await fetchCalendarMarkings(user.id, currentMonth);
    await fetchMemberProgress(currentTeam?.id, user.id);
  }, [user, currentMonth, selectedDate, currentTeam]);

  // 화면 포커스 시 데이터 로드 (selectedDate는 ref로 참조하여 deps에서 제거)
  // → 날짜 클릭 시 handleDayPress에서만 fetchMemberDateCheckins를 호출하도록 하여
  //   useFocusEffect와의 race condition 방지
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchCalendarMarkings(user.id, currentMonth);
        fetchMyGoals(user.id);
        fetchTeamGoals(currentTeam?.id ?? '', user.id);
        fetchMonthlyCheckins(user.id, currentMonth);
        fetchMemberDateCheckins(currentTeam?.id, user.id, selectedDateRef.current);
      }
    }, [user, currentMonth, currentTeam]),
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
    if (user) {
      fetchCalendarMarkings(user.id, ym);
      fetchMonthlyCheckins(user.id, ym);
    }
  };

  const handlePhotoPress = async () => {
    if (!photoModal || !user) return;
    
    // 더블 탭 로직 (300ms)
    const now = Date.now();
    if (lastTap && now - lastTap < 300) {
      await handleReactionPress();
      setLastTap(null);
    } else {
      setLastTap(now);
    }
  };

  const handleReactionPress = async () => {
    if (!photoModal || !user) return;
    
    // Optimistic Update: 즉시 store 상태 변경 (await 안함)
    toggleReaction(photoModal.checkinId, {
      id: user.id,
      nickname: user.nickname,
      profile_image_url: user.profile_image_url
    });
    
    // 백그라운드에서 최신 데이터 동기화 (선택사항, 정합성 유지를 위해)
    // 낙관적 업데이트가 있으므로 즉시 호출하지 않아도 됨.
    // 필요하다면 약간의 딜레이 후 호출하거나 생략 가능.
    // 여기선 제거하여 반응 속도 최적화 (어차피 store가 업데이트됨)
  };

  const { dataStart, dataEnd } = React.useMemo(() => getCalendarWeekRanges(currentMonth), [currentMonth]);

  const renderDay = useCallback(({ date, state, marking }: any) => {
    // 주차(Row) 계산 (통계 기준 dataStart 활용)
    const diffDays = dayjs(date.dateString).diff(dayjs(dataStart), 'day');
    const weekNum = Math.floor(diffDays / 7) + 1;
    
    // 통계 범위 내에 있는 날짜인지 확인
    const isExcluded = date.dateString < dataStart || date.dateString > dataEnd;
    
    // 지브라 패턴: 통계 범위 내의 홀수/짝수 주차에 각각 다른 배경색 적용
    const isEvenWeek = !isExcluded && (weekNum % 2 === 0);
    const isOddWeek = !isExcluded && (weekNum % 2 === 1);
    
    // 월요일이면서 통계 범위 내일 때만 주차 라벨 표시
    const isMonday = dayjs(date.dateString).day() === 1;
    const showWeekLabel = isMonday && !isExcluded;

    // 1. 날짜 텍스트 컬러 결정
    let textColor = '#1A1A1A'; // 기본 검정
    const isToday = state === 'today';
    const isSelected = marking?.selected;
    const isDisabled = state === 'disabled'; // 달력상 이전/다음 달 날짜

    // 우선순위: 선택됨 > Disabled(회색) > Today > 마킹된 컬러 > 기본
    if (marking?.textColor) textColor = marking.textColor; // 1. 마킹 (기본보다 우선)
    if (isToday) textColor = '#FF6B3D'; // 2. 오늘
    if (isDisabled) textColor = 'rgba(26, 26, 26, 0.20)'; // 3. Disabled (마킹보다 우선 -> 회색 처리)
    if (isSelected) textColor = marking?.selectedTextColor || '#FF6B3D'; // 4. 선택됨 (최우선)

    return (
      <View style={[
        styles.dayCellWrapper, 
        isEvenWeek && styles.zebraStripeEven,
        isOddWeek && styles.zebraStripeOdd
      ]}>
        {showWeekLabel && (
          <Text style={styles.weekNumberLabel}>{weekNum}주</Text>
        )}
        <TouchableOpacity
          onPress={() => handleDayPress(date)}
          activeOpacity={0.7}
          style={[
            styles.dayContainer,
            isToday && !isSelected && styles.todayContainer,
            isSelected && styles.selectedDayContainer
          ]}
        >
          <Text style={[styles.dayText, { color: textColor }]}>
            {date.day}
          </Text>
          {marking?.marked && (
            <View style={[styles.dot, { backgroundColor: marking.dotColor || '#FF6B3D' }]} />
          )}
        </TouchableOpacity>
      </View>
    );
  }, [handleDayPress, dataStart, dataEnd]);

  const calendarMarkedDates = React.useMemo(() => {
    const marks: Record<string, any> = {};
    
    // 1. 기본 마킹 (Dots)
    Object.entries(calendarMarkings).forEach(([date, m]) => {
      marks[date] = {
        marked: true,
        dotColor: m.dotColor,
      };
    });

    // 2. 통계 월 기준 범위 (4일 미만 주 처리) 시각화
    // - 통계 범위에 포함되는 날짜 (Extra Days 포함) -> 활성 컬러
    const startDt = dayjs(dataStart);
    const endDt = dayjs(dataEnd);
    
    let curr = startDt;
    while (curr.isBefore(endDt) || curr.isSame(endDt, 'day')) {
      const dStr = curr.format('YYYY-MM-DD');
      if (!marks[dStr]) marks[dStr] = {};
      
      // 이미 기본 마킹이 있다면 유지하되, 텍스트 컬러만 지정
      marks[dStr] = {
        ...marks[dStr],
        textColor: '#1A1A1A', // 기본: 진하게
        disabled: false,
      };
      curr = curr.add(1, 'day');
    }

    // - 현재 월의 날짜 중 통계 범위 밖인 날짜 -> 파란색 등 다른 색으로 표시 (이월됨)
    const monthStart = dayjs(`${currentMonth}-01`);
    const monthEnd = monthStart.endOf('month');
    let mCurr = monthStart;
    while (mCurr.isBefore(monthEnd) || mCurr.isSame(monthEnd, 'day')) {
      if (mCurr.isBefore(startDt) || mCurr.isAfter(endDt)) {
        const dStr = mCurr.format('YYYY-MM-DD');
        if (!marks[dStr]) marks[dStr] = {};
        marks[dStr] = {
          ...marks[dStr],
          textColor: '#3B82F6', // 파란색: 통계 이월됨 표시
          disabled: false,
        };
      }
      mCurr = mCurr.add(1, 'day');
    }

    // 3. 선택된 날짜 (Override)
    if (selectedDate) {
      if (!marks[selectedDate]) marks[selectedDate] = {};
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: 'rgba(255, 107, 61, 0.18)',
        selectedTextColor: '#FF6B3D',
      };
    }
    return marks;
  }, [calendarMarkings, selectedDate, dataStart, dataEnd, currentMonth]);

  const selectedMarking = calendarMarkings[selectedDate];
  const formattedDate = dayjs(selectedDate).format('M월 D일 (ddd)');
  const isFuture = dayjs(selectedDate).isAfter(dayjs(), 'day');

  // 선택된 날짜가 통계 범위 밖인지 확인 (이월된 날짜인지)
  const isExcludedFromStats = React.useMemo(() => {
    return selectedDate < dataStart || selectedDate > dataEnd;
  }, [selectedDate, dataStart, dataEnd]);

  // 선택된 날짜가 현재 달력의 월과 다른지 (이전/다음달 날짜)
  const isOtherMonth = React.useMemo(() => !selectedDate.startsWith(currentMonth), [selectedDate, currentMonth]);

  const statsGuideMessage = React.useMemo(() => {
    if (isExcludedFromStats) {
      if (selectedDate < dataStart) {
        return `💡 이 날짜는 지난달(${dayjs(currentMonth).subtract(1, 'month').format('M월')}) 통계에 합산됩니다.`;
      }
      if (selectedDate > dataEnd) {
        return `💡 이 날짜는 다음달(${dayjs(currentMonth).add(1, 'month').format('M월')}) 통계에 합산됩니다.`;
      }
    }
    // 통계 범위 안이지만 달력상 다른 달인 경우 (회색으로 표시됨)
    if (isOtherMonth) {
      return `💡 이 날짜는 이번 달(${dayjs(currentMonth).format('M월')}) 통계에 포함됩니다.`;
    }
    return null;
  }, [isExcludedFromStats, isOtherMonth, selectedDate, dataStart, dataEnd, currentMonth]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView ref={scrollRef} style={styles.scroll}>
        <CyberFrame style={styles.calendarContainer} contentStyle={styles.calendarContent}>
          <Calendar
            firstDay={1}
            dayComponent={renderDay}
            theme={{
              calendarBackground: 'transparent',
              todayTextColor: '#FF6B3D',
              selectedDayBackgroundColor: 'rgba(255, 107, 61, 0.18)',
              selectedDayTextColor: '#FF6B3D',
              arrowColor: '#FF6B3D',
              monthTextColor: '#1A1A1A',
              dayTextColor: 'rgba(26, 26, 26, 0.80)',
              textDisabledColor: 'rgba(26, 26, 26, 0.20)',
              textDayFontWeight: '500',
              textMonthFontWeight: '700',
              textDayHeaderFontWeight: '500',
              textSectionTitleColor: 'rgba(26, 26, 26, 0.40)'
            }}
            style={styles.calendar}
            markedDates={calendarMarkedDates}
            onDayPress={handleDayPress}
            onMonthChange={handleMonthChange}
          />
        </CyberFrame>

        {/* ── 날짜 요약 ── */}
        <CyberFrame style={styles.dateSummaryFrame} contentStyle={styles.dateSummaryContent}>
          <View style={styles.dateSummaryHeader}>
            <Text style={styles.dateSummaryTitle}>{formattedDate}</Text>
            
            {selectedMarking && selectedMarking.dayStatus !== 'future' && (
              <View style={styles.scoreContainer}>
                {/* <View style={styles.scoreBadge}>
                  <View style={styles.scoreLabelRow}>
                    <Text style={styles.scoreLabelText}>완료</Text>
                    <Text style={styles.scoreLabelText}>총목표</Text>
                  </View>
                  <View style={styles.scoreValueRow}>
                    <Text style={styles.scoreDoneText}>{selectedMarking.doneCount ?? 0}</Text>
                    <Text style={styles.scoreSlash}>/</Text>
                    <Text style={styles.scoreTotalText}>{selectedMarking.totalGoals ?? 0}</Text>
                  </View>
                </View> */}
                <CyberFrame glassOnly={true} style={styles.scoreBadgeWrapper} contentStyle={styles.scoreBadgeContent}>
                  <View style={styles.scoreLabelRow}>
                    <Text style={styles.scoreLabelText}>완료</Text>
                    <Text style={styles.scoreLabelText}>총목표</Text>
                  </View>
                  <View style={styles.scoreValueRow}>
                    <Text style={styles.scoreDoneText}>{selectedMarking.doneCount ?? 0}</Text>
                    <Text style={styles.scoreSlash}>/</Text>
                    <Text style={styles.scoreTotalText}>{selectedMarking.totalGoals ?? 0}</Text>
                  </View>
                </CyberFrame>
                {/* {selectedMarking.totalGoals && selectedMarking.totalGoals > 0 && (
                  <Text style={styles.percentText}>
                    {Math.round(((selectedMarking.doneCount ?? 0) / ((selectedMarking.totalGoals ?? 1) || 1)) * 100)}%
                  </Text>
                )} */}
              </View>
            )}
          </View>
          
          {/* 통계 이월 날짜 안내 메시지 */}
          {statsGuideMessage && (
            <View style={styles.excludedStatsBox}>
              <Text style={styles.excludedStatsText}>{statsGuideMessage}</Text>
            </View>
          )}

          {selectedMarking && selectedMarking.dayStatus === 'future' ? (
            <View>
              <Text style={styles.futureLabel}>예정된 목표 {selectedMarking.totalGoals}개</Text>
              {(selectedMarking.goalNames ?? []).length > 0 && (
                <View style={styles.goalNameChips}>
                  {(selectedMarking.goalNames ?? []).map((name, i) => (
                    <View key={i} style={styles.goalNameChip}>
                      <Text style={styles.goalNameChipText}>{name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : selectedMarking ? (
            <View>
              {(selectedMarking.goalNames ?? []).length > 0 && (
                <View style={styles.goalNameChips}>
                  {(selectedMarking.goalNames ?? []).map((name, i) => (
                    <View key={i} style={styles.goalNameChip}>
                      <Text style={styles.goalNameChipText}>{name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.noDataText}>
              {isFuture ? '아직 오지 않은 날이에요' : '기록 없음'}
            </Text>
          )}
        </CyberFrame>

        {/* ── 팀 멤버별 체크인 상세 ── */}
        {memberDateCheckins.length > 0 && (
          <View style={styles.memberSection}>
            <Text style={styles.memberSectionTitle}>
              {currentTeam ? `${currentTeam.name} 멤버` : '내 기록'}
            </Text>
            {memberDateCheckins.map((member) => (
              <CyberFrame key={member.userId} style={styles.memberCardFrame} contentStyle={styles.memberCardContent}>
                {/* 멤버 헤더 */}
                <TouchableOpacity 
                  style={styles.memberHeader}
                  onPress={() => {
                    setSelectedMember({
                      userId: member.userId,
                      nickname: member.nickname,
                      profileImageUrl: member.profileImageUrl,
                    });
                  }}
                >
                  <View style={styles.memberAvatar}>
                    {member.profileImageUrl ? (
                      <Image source={{ uri: member.profileImageUrl }} style={styles.memberAvatarImg} />
                    ) : (
                      <Ionicons name="person" size={16} color="rgba(255,255,255,0.50)" />
                    )}
                  </View>
                  <Text style={styles.memberName}>{member.nickname}</Text>
                  
                  <View style={styles.scoreContainer}>
                    <View>
                      <View style={styles.scoreLabelRow}>
                        <Text style={styles.scoreLabelText}>완료</Text>
                        <Text style={styles.scoreLabelText}>총목표</Text>
                      </View>
                      <View style={styles.scoreValueRow}>
                        <Text style={styles.scoreTotalText}>{member.doneCount}</Text>
                        <Text style={styles.scoreSlash}>/</Text>
                        <Text style={styles.scoreTotalText}>{member.totalGoals}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* 체크인 목록 */}
                {member.checkins.length === 0 && (
                  <Text style={styles.memberEmpty}>
                    {isFuture ? '예정' : '기록 없음'}
                  </Text>
                )}
                {member.checkins.map((checkin) => {
                  const isPass = checkin.status === 'pass';
                  const reactions = checkin.reactions || [];

                  return (
                    <View key={checkin.id} style={styles.checkinRow}>
                      {/* 사진 or 아이콘 */}
                      {checkin.photo_url ? (
                        <TouchableOpacity onPress={() => setPhotoModal({ url: checkin.photo_url!, checkinId: checkin.id })}>
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
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View>
                            <Text style={styles.checkinGoalName}>
                              {checkin.goal?.name ?? '목표'}
                            </Text>
                            <Text style={styles.checkinTime}>
                              {dayjs(checkin.created_at).format('HH:mm')} · {isPass ? '패스' : '완료'}
                            </Text>
                          </View>
                          
                          {/* 리액션 스티커들 (사진 옆/정보 우측) */}
                          {reactions.length > 0 && (
                            <View style={styles.reactionContainer}>
                              {reactions.map((r, idx) => (
                                <View 
                                  key={r.id} 
                                  style={[
                                    styles.reactionSticker, 
                                    { zIndex: reactions.length - idx, marginLeft: idx > 0 ? -8 : 0 }
                                  ]}
                                >
                                  {r.user.profile_image_url ? (
                                    <Image source={{ uri: r.user.profile_image_url }} style={styles.reactionAvatar} />
                                  ) : (
                                    <View style={[styles.reactionAvatar, { backgroundColor: '#555' }]}>
                                      <Ionicons name="person" size={14} color="#fff" />
                                    </View>
                                  )}
                                </View>
                              ))}
                            </View>
                          )}
                        </View>

                        {checkin.memo && (
                          <Text style={styles.checkinMemo} numberOfLines={2}>
                            {checkin.memo}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </CyberFrame>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── 플로팅 기록 보기 버튼 ── */}
      <TouchableOpacity 
        style={styles.floatingButtonWrapper}
        onPress={() => setDailyRecordsModalVisible(true)}
        activeOpacity={0.8}
      >
        <Image 
          source={require('../../../assets/floating-btn.png')} 
          style={styles.floatingButtonImage} 
          resizeMode="stretch" 
        />
        <View style={styles.floatingButtonContent}>
          <Ionicons name="list" size={24} color="#FFFFFF" />
          <Text style={styles.floatingButtonText}>기록 보기</Text>
        </View>
      </TouchableOpacity>

      {/* ── 사진 확대 모달 ── */}
      <Modal visible={!!photoModal} transparent animationType="fade" onRequestClose={() => setPhotoModal(null)}>
        <View style={styles.photoOverlay}>
          {/* 백그라운드 클릭 시 닫기 (Absolute Fill) */}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPhotoModal(null)} />
          
          <View style={styles.photoContainer}>
            {photoModal && (
              <Pressable onPress={handlePhotoPress}>
                <Image source={{ uri: photoModal.url }} style={styles.photoFull} resizeMode="contain" />
              </Pressable>
            )}
            <TouchableOpacity style={styles.photoCloseBtn} onPress={() => setPhotoModal(null)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            {/* 탭 힌트 & 좋아요 버튼 */}
            <View style={styles.photoHint}>
              <Text style={styles.photoHintText}>탭하여 봤어요(인증) 표시</Text>
              <TouchableOpacity onPress={handleReactionPress} style={[styles.reactionBtn, isReacted && styles.reactionBtnActive]}>
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

      {/* ── 인증 체크인 모달 ── */}
      <CheckinModal
        visible={checkinModalVisible}
        date={selectedDate}
        goalsWithFrequency={goalsForCheckinModal}
        checkins={selectedDateCheckins}
        onClose={() => setCheckinModalVisible(false)}
        onCheckinDone={handleCheckinDone}
      />

      {/* ── 일간 기록 모달 ── */}
      <DailyRecordsModal
        visible={dailyRecordsModalVisible}
        date={selectedDate}
        memberRecords={memberDateCheckins}
        onClose={() => setDailyRecordsModalVisible(false)}
      />
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffffff' },
  safe: { flex: 1, backgroundColor: 'transparent' }, // 배경 이미지가 보이도록 투명하게 설정
  scroll: { flex: 1 },
  calendarContainer: {
    marginTop: 12,
    marginHorizontal: 12, 
    marginBottom: 8,
  },
  calendarContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  calendar: {
    backgroundColor: 'transparent',
  },
  checkinButtonHint: {
    fontSize: 12,
    color: 'rgba(26,26,26,0.40)',
    textAlign: 'center',
    marginTop: 8,
  },

  // ── 날짜 요약 ──
  dateSummaryFrame: {
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  dateSummaryContent: {
    padding: 14,
  },
  dateSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dateSummaryTitle: {
    fontSize: 15, fontWeight: '700', color: '#1A1A1A'
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  scoreBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 61, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreBadgeWrapper: {
    borderRadius: 12, // 점수 뱃지에 맞게 조금 덜 둥글게 조정
  },
  scoreBadgeContent: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  scoreLabelRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 2,
    gap: 4,
  },
  scoreLabelText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 107, 61, 0.7)',
  },
  scoreValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  scoreDoneText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF6B3D',
  },
  scoreSlash: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 107, 61, 0.4)',
    marginHorizontal: 4,
  },
  scoreTotalText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(26, 26, 26, 0.6)',
  },
  percentText: {
    fontSize: 24, fontWeight: '800', color: '#FF6B3D', maxWidth: 72, textAlign: 'right',
  },
  noDataText: {
    fontSize: 13, color: 'rgba(26,26,26,0.30)', fontWeight: '500',
  },
  futureLabel: {
    fontSize: 13, fontWeight: '600', color: 'rgba(255, 107, 61, 0.65)', marginBottom: 8,
  },
  goalNameChips: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8,
  },
  goalNameChip: {
    backgroundColor: 'rgba(255, 107, 61, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 61, 0.14)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  goalNameChipText: {
    fontSize: 11, fontWeight: '600', color: 'rgba(26,26,26,0.50)',
  },

  // ── 팀 멤버 섹션 ──
  memberSection: {
    marginTop: 16, paddingHorizontal: 12,
  },
  memberSectionTitle: {
    fontSize: 14, fontWeight: '700', color: 'rgba(26,26,26,0.45)',
    marginBottom: 10, letterSpacing: 0.3,
  },
  memberCardFrame: {
    marginBottom: 10,
  },
  memberCardContent: {
    padding: 12,
  },
  memberHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
    paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 107, 61, 0.08)',
  },
  memberAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 61, 0.08)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.18)',
  },
  memberAvatarImg: { width: 28, height: 28, borderRadius: 14 },
  memberName: {
    fontSize: 14, fontWeight: '700', color: '#1A1A1A', flex: 1,
  },
  memberEmpty: {
    fontSize: 13, color: 'rgba(26,26,26,0.45)', textAlign: 'center', paddingVertical: 8,
  },

  // ── 체크인 행 ──
  checkinRow: {
    flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 6,
  },
  checkinThumb: {
    width: 40, height: 40, borderRadius: 6, backgroundColor: '#FFF2EC',
  },
  zoomIcon: {
    position: 'absolute', bottom: 2, right: 2,
    backgroundColor: 'rgba(0,0,0,0.50)', borderRadius: 4,
    width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  checkinIcon: {
    width: 40, height: 40, borderRadius: 6,
    backgroundColor: 'rgba(255, 107, 61, 0.08)',
    borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkinIconPass: {
    backgroundColor: 'rgba(255,181,71,0.10)',
    borderColor: 'rgba(255,181,71,0.20)',
  },
  checkinInfo: { flex: 1 },
  checkinGoalName: {
    fontSize: 14, fontWeight: '600', color: '#1A1A1A',
  },
  checkinTime: {
    fontSize: 11, color: 'rgba(26,26,26,0.40)', marginTop: 1,
  },
  checkinMemo: {
    fontSize: 11, color: 'rgba(26,26,26,0.35)', marginTop: 2,
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
  photoHint: {
    position: 'absolute', bottom: -100, width: '100%', alignItems: 'center', gap: 8,
  },
  photoHintText: {
    color: 'rgba(255,255,255,0.6)', fontSize: 12,
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
    tintColor: '#4ADE80', // 활성화 색상
  },
  
  // ── 리액션 스티커 ──
  reactionContainer: {
    flexDirection: 'row', alignItems: 'center',
  },
  reactionSticker: {
    width: 22, height: 22, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#FFFAF7',
    overflow: 'hidden',
    backgroundColor: '#FFF2EC',
    alignItems: 'center', justifyContent: 'center',
  },
  reactionAvatar: {
    width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center',
  },

  // 통계 이월 안내 메시지
  excludedStatsBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  excludedStatsText: {
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '600',
  },

  // 커스텀 데이 렌더링
  dayCellWrapper: {
    width: 51,
    height: 42,
    marginHorizontal: -4, // 셀 간 간격을 없애고 일자 가로줄을 만들기 위함
    alignItems: 'center',
    justifyContent: 'center',
  },
  zebraStripeEven: {
    // backgroundColor: 'rgba(79, 79, 78, 0.02)', // 짝수 주차: 아주 연한 오렌지
  },
  zebraStripeOdd: {
    // backgroundColor: 'rgba(70, 68, 68, 0.03)', // 홀수 주차: 아주 연한 회색
  },
  weekNumberLabel: {
    position: 'absolute',
    top: 2,
    left: 6,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 107, 61, 0.6)',
  },
  dayContainer: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16,
  },
  todayContainer: {
    borderWidth: 1.5,
    borderColor: '#FF6B3D',
  },
  selectedDayContainer: {
    backgroundColor: 'rgba(255, 107, 61, 0.18)',
  },
  dayText: {
    fontSize: 14, fontWeight: '500',
  },
  dot: {
    width: 4, height: 4, borderRadius: 2, marginTop: 4,
  },
  
  // ── 플로팅 버튼 ──
  floatingButtonWrapper: {
    position: 'absolute',
    right: 10,
    bottom: 26,
    width: 140, // 버튼 이미지 비율에 맞춰 적절한 너비 설정
    height: 52, // 높이 설정
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
