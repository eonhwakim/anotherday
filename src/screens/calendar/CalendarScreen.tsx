import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useGoalStore } from '../../stores/goalStore';
import { useTeamStore } from '../../stores/teamStore';
import MemberProfileModal from '../../components/calendar/MemberProfileModal';
import CheckinModal from '../../components/mypage/CheckinModal';
import Button from '../../components/common/Button';
import dayjs from '../../lib/dayjs';
import { COLORS } from '../../constants/defaults';

const STATUS_IMAGES: Record<string, any> = {
  all_done: require('../../../assets/wow.png'),
  mixed: require('../../../assets/boom.png'),
  mostly_fail: require('../../../assets/oops.png'),
  partial: require('../../../assets/bang.png'),
  none: null,
};

export default function CalendarScreen() {
  const user = useAuthStore((s) => s.user);
  const { currentTeam } = useTeamStore();
  const {
    teamGoals,
    myGoals,
    monthlyCheckins,
    calendarMarkings,
    memberDateCheckins,
    fetchCalendarMarkings,
    fetchCheckinsForDate,
    fetchMemberDateCheckins,
    fetchTeamGoals,
    fetchMyGoals,
    fetchMonthlyCheckins,
    fetchMemberProgress,
    toggleReaction,
  } = useGoalStore();

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
      (monthlyCheckins || []).filter(
        (c) =>
          c.date === selectedDate &&
          currentTeamUserGoals.some(
            (g) => g.goal_id === c.goal_id,
          ),
      ),
    [monthlyCheckins, selectedDate, currentTeamUserGoals],
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

  const calendarMarkedDates = React.useMemo(() => {
    const marks: Record<string, any> = {};
    Object.entries(calendarMarkings).forEach(([date, m]) => {
      marks[date] = {
        marked: true,
        dotColor: m.dotColor,
        selected: date === selectedDate,
        selectedColor: date === selectedDate
          ? 'rgba(255, 107, 61, 0.18)'
          : undefined,
        selectedTextColor: date === selectedDate ? '#FF6B3D' : undefined,
      };
    });
    if (selectedDate && !marks[selectedDate]) {
      marks[selectedDate] = {
        selected: true,
        selectedColor: 'rgba(255, 107, 61, 0.18)',
      };
    }
    return marks;
  }, [calendarMarkings, selectedDate]);

  const selectedMarking = calendarMarkings[selectedDate];
  const formattedDate = dayjs(selectedDate).format('M월 D일 (ddd)');
  const isFuture = dayjs(selectedDate).isAfter(dayjs(), 'day');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView ref={scrollRef} style={styles.scroll}>
        <Text style={styles.screenTitle}>캘린더</Text>

        <Calendar
          firstDay={1}
          theme={{
            calendarBackground: '#FFFFFF',
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
            textSectionTitleColor: 'rgba(26, 26, 26, 0.40)',
          }}
          style={styles.calendar}
          markedDates={calendarMarkedDates}
          onDayPress={handleDayPress}
          onMonthChange={handleMonthChange}
        />

        {/* ── 인증하기 버튼 ── */}
        <View style={styles.checkinButtonWrap}>
          <Button
            title={isTodaySelected ? '인증하기' : '기록 보기'}
            onPress={handleCheckinPress}
            variant={isTodaySelected ? 'primary' : 'outline'}
          />
        </View>

        {/* ── 날짜 요약 ── */}
        <View style={styles.dateSummary}>
          <Text style={styles.dateSummaryTitle}>{formattedDate}</Text>
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
              <View style={styles.statusRow}>
                {STATUS_IMAGES[selectedMarking.dayStatus ?? 'none'] && (
                  <Image
                    source={STATUS_IMAGES[selectedMarking.dayStatus ?? 'none']}
                    style={styles.statusImage}
                    resizeMode="contain"
                  />
                )}
                <Text style={styles.statusText}>
                  {(selectedMarking.passCount ?? 0) > 0 && `${selectedMarking.passCount}패스 · `}
                  {selectedMarking.doneCount ?? 0}완료
                  {' / '}{selectedMarking.totalGoals ?? 0}개 목표
                </Text>
                {selectedMarking.totalGoals && selectedMarking.totalGoals > 0 && (
                  <Text style={styles.percentText}>
                    {Math.round(((selectedMarking.doneCount ?? 0) / ((selectedMarking.totalGoals ?? 1) || 1)) * 100)}%
                  </Text>
                )}
              </View>
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
                  <Text style={styles.memberStat}>
                    {member.passCount > 0 && `${member.passCount} 패스 `}
                    {member.doneCount} 완료 / {member.totalGoals}
                  </Text>
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
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

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

      {/* ── 멤버 프로필 모달 ── */}
      {selectedMember && (
        <MemberProfileModal
          visible={!!selectedMember}
          userId={selectedMember.userId}
          nickname={selectedMember.nickname}
          profileImageUrl={selectedMember.profileImageUrl}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFAF7' },
  scroll: { flex: 1 },
  screenTitle: {
    fontSize: 24, fontWeight: '800', color: '#1A1A1A',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, letterSpacing: -0.5,
  },
  calendar: {
    marginHorizontal: 12, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.12)',
    overflow: 'hidden',
    shadowColor: '#FF6B3D', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  checkinButtonWrap: {
    marginHorizontal: 12,
    marginTop: 12,
  },
  checkinButtonHint: {
    fontSize: 12,
    color: 'rgba(26,26,26,0.40)',
    textAlign: 'center',
    marginTop: 8,
  },

  // ── 날짜 요약 ──
  dateSummary: {
    marginHorizontal: 12, marginTop: 12, padding: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.12)', borderRadius: 12,
    shadowColor: '#FF6B3D', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 1,
  },
  dateSummaryTitle: {
    fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  statusImage: { width: 32, height: 32 },
  statusText: {
    fontSize: 13, fontWeight: '600', color: 'rgba(26,26,26,0.55)', flex: 1,
  },
  percentText: {
    fontSize: 15, fontWeight: '800', color: '#FF6B3D',
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
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: 'rgba(255, 107, 61, 0.12)', borderRadius: 12,
    padding: 12, marginBottom: 10,
    shadowColor: '#FF6B3D', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 1,
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
  memberStat: {
    fontSize: 12, fontWeight: '600', color: 'rgba(26,26,26,0.40)',
  },
  memberEmpty: {
    fontSize: 13, color: 'rgba(26,26,26,0.25)', textAlign: 'center', paddingVertical: 8,
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
});
