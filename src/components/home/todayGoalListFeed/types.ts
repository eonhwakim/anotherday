import type { Animated } from 'react-native';
import type { CheckinWithGoal, MemberProgress } from '../../../types/domain';

export type BadgeState = 'START' | 'ALL_CLEAR' | 'FINISHER' | 'LEADER';

export interface MemberCardProps {
  member: MemberProgress;
  isMe: boolean;
  animVal: Animated.Value;
  onCarouselDragChange?: (dragging: boolean) => void;
}

export interface TodayGoalListFeedProps {
  members: MemberProgress[];
  currentUserId?: string;
  onAnimationFinish?: () => void;
  isNight?: boolean;
  onPhotoCarouselDragChange?: (dragging: boolean) => void;
}

export interface FeedHeaderProps {
  isNight: boolean;
  memberCount: number;
}

export interface PhotoSlideCardProps {
  checkin: CheckinWithGoal;
  index: number;
  totalCount: number;
  userId?: string;
  width: number;
  marginRight: number;
  onReactionPress: (checkin: CheckinWithGoal) => void;
}
