import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../design/tokens';
import type { MemberDetail } from '../../services/statsService';
import { statisticsSharedStyles as sharedStyles } from './statisticsShared';
import { ds } from '@/design/recipes';
import MonthlySummaryCards from '../../components/ui/MonthlySummaryCards';
import MonthlyTeamTrendChart from '../../components/stats/MonthlyTeamTrendChart';
import TeamMemberCard from '../../components/stats/TeamMemberCard';

interface Props {
  monthLabel: string;
  monthNum: number;
  canNext: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  hasTeam: boolean;
  memberDetails: MemberDetail[];
  teamRate: number | null;
  teamPrevRate: number | null;
  mvpName: string | null;
  monthTotalDays: number;
}

export default function TeamMonthlyStatistics({
  monthLabel,
  canNext,
  onPrevMonth,
  onNextMonth,
  hasTeam,
  memberDetails,
  teamRate,
  teamPrevRate,
  mvpName,
  monthTotalDays,
}: Props) {
  const memberRanks = useMemo(() => {
    const ranks: number[] = [];
    let currentRank = 1;

    for (let i = 0; i < memberDetails.length; i++) {
      if (i > 0) {
        const prev = memberDetails[i - 1];
        const curr = memberDetails[i];

        if (prev.rate !== curr.rate) {
          currentRank = i + 1;
        }
      }
      ranks.push(currentRank);
    }
    return ranks;
  }, [memberDetails]);

  return (
    <View style={sharedStyles.container}>
      <View style={sharedStyles.selectorRow}>
        <TouchableOpacity style={sharedStyles.selectorBtn} onPress={onPrevMonth}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryLight} />
        </TouchableOpacity>
        <View style={sharedStyles.labelBox}>
          <Text style={sharedStyles.labelMain}>{monthLabel}</Text>
        </View>
        <TouchableOpacity
          style={[sharedStyles.selectorBtn, !canNext && { opacity: 0.4 }]}
          onPress={onNextMonth}
          disabled={!canNext}
        >
          <Ionicons
            name="chevron-forward"
            size={22}
            color={canNext ? colors.primaryLight : 'rgba(26,26,26,0.25)'}
          />
        </TouchableOpacity>
      </View>
      {/* 통계카드(3) */}
      {hasTeam && (
        <MonthlySummaryCards
          rate={teamRate}
          prevRate={teamPrevRate}
          centerValue={mvpName}
          centerLabel="월간 MVP"
          rateLabel="팀 월간 평균"
        />
      )}
      {/* 팀원별 주차별 추이 */}
      {hasTeam && memberDetails.length > 0 && <MonthlyTeamTrendChart members={memberDetails} />}
      {/* 팀원별 루틴 상세 */}
      <View>
        {hasTeam && memberDetails.length > 0 && (
          <>
            {/* 소제목 제거 — 아래 멤버 카드가 스스로 설명함
            <Text style={[ds.cardTitle, styles.detailsTitle]}>Details</Text>
            */}
            <View style={{ gap: 12 }}>
              {memberDetails.map((member, index) => {
                const rank = memberRanks[index];
                return (
                  <View key={member.userId} style={[ds.card, styles.memberCard]}>
                    {/* 루틴상세 */}
                    <TeamMemberCard
                      member={member}
                      rank={rank}
                      variant="monthly"
                      monthTotalDays={monthTotalDays}
                    />
                    {/* 한마디 / 회고 — 작성된 것만 */}
                    {member.hanmadi || member.hoego ? (
                      <View>
                        {member.hanmadi ? (
                          <View style={sharedStyles.dividerSection}>
                            <Text style={sharedStyles.subLabel}>한마디</Text>
                            <Text style={sharedStyles.reviewText}>{member.hanmadi}</Text>
                          </View>
                        ) : null}
                        {member.hoego ? (
                          <View style={sharedStyles.dividerSection}>
                            <Text style={sharedStyles.subLabel}>회고</Text>
                            <Text style={sharedStyles.reviewText}>{member.hoego}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  memberCard: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  detailsTitle: {
    marginTop: 26,
    marginBottom: 16,
  },
});
