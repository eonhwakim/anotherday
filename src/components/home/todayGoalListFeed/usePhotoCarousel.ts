import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, type PanResponderGestureState } from 'react-native';
import type { CheckinWithGoal } from '../../../types/domain';
import {
  CAROUSEL_DRAG_COMMIT_FRAC,
  CAROUSEL_FLICK_VX,
  PHOTO_CARD_GAP,
  PHOTO_CARD_PEEK,
  SINGLE_PHOTO_PULL_RATIO,
} from './constants';

function carouselMoveShouldSetResponder(_: unknown, gesture: PanResponderGestureState) {
  const adx = Math.abs(gesture.dx);
  const ady = Math.abs(gesture.dy);
  if (adx < 1) return false;
  return adx > ady + 2;
}

function carouselSnapIndexFromGesture(
  current: number,
  velocityX: number,
  snapInterval: number,
  photoCount: number,
): number {
  if (photoCount < 2 || snapInterval <= 0) return 0;
  const raw = -current / snapInterval;
  const pivot = Math.round(Math.max(0, Math.min(photoCount - 1, raw)));

  let index: number;
  if (velocityX < -CAROUSEL_FLICK_VX) {
    index = Math.min(photoCount - 1, pivot + 1);
  } else if (velocityX > CAROUSEL_FLICK_VX) {
    index = Math.max(0, pivot - 1);
  } else {
    index = Math.floor(raw + (1 - CAROUSEL_DRAG_COMMIT_FRAC));
  }

  return Math.max(0, Math.min(photoCount - 1, index));
}

export function usePhotoCarousel(
  todayCheckins: CheckinWithGoal[] | undefined,
  screenWidth: number,
  onCarouselDragChange?: (dragging: boolean) => void,
) {
  const photoCheckins = useMemo(
    () => (todayCheckins ?? []).filter((checkin) => !!checkin.photo_url),
    [todayCheckins],
  );
  const [photoSectionWidth, setPhotoSectionWidth] = useState(Math.max(screenWidth - 96, 220));
  const carouselX = useRef(new Animated.Value(0)).current;
  const carouselPullStartRef = useRef(0);
  const lastCarouselSyncRef = useRef(0);
  const carouselMaxOffsetRef = useRef(0);
  const carouselSnapPointsRef = useRef<number[]>([0]);
  const photoCountRef = useRef(0);
  const snapIntervalRef = useRef(0);
  const carouselAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const maxPullPx = useMemo(
    () => (photoSectionWidth > 0 ? Math.round(photoSectionWidth * SINGLE_PHOTO_PULL_RATIO) : 0),
    [photoSectionWidth],
  );

  const cardWidth = useMemo(() => {
    if (photoSectionWidth <= 0) return 0;
    return Math.max(photoSectionWidth - PHOTO_CARD_PEEK, 160);
  }, [photoSectionWidth]);

  const peekTailWidth = useMemo(() => {
    if (photoSectionWidth <= 0 || photoCheckins.length === 0) return 0;
    return Math.max(100, Math.round(photoSectionWidth * SINGLE_PHOTO_PULL_RATIO) + PHOTO_CARD_PEEK);
  }, [photoSectionWidth, photoCheckins.length]);

  const snapInterval = cardWidth > 0 ? cardWidth + PHOTO_CARD_GAP : 0;

  const carouselContentWidth = useMemo(() => {
    const count = photoCheckins.length;
    if (count < 1 || cardWidth <= 0) return 0;
    return count * cardWidth + count * PHOTO_CARD_GAP + peekTailWidth;
  }, [photoCheckins.length, cardWidth, peekTailWidth]);

  const rawMaxOffset = useMemo(() => {
    if (photoSectionWidth <= 0 || carouselContentWidth <= 0) return 0;
    return Math.max(0, carouselContentWidth - photoSectionWidth);
  }, [photoSectionWidth, carouselContentWidth]);

  const carouselMaxOffset = useMemo(() => {
    if (photoCheckins.length <= 1) return Math.min(maxPullPx, rawMaxOffset);
    return rawMaxOffset;
  }, [photoCheckins.length, maxPullPx, rawMaxOffset]);

  const carouselSnapPoints = useMemo(() => {
    const count = photoCheckins.length;
    const points = new Set<number>([0]);

    if (count >= 2 && snapInterval > 0) {
      for (let index = 0; index < count; index += 1) {
        points.add(-index * snapInterval);
      }
    }

    return [...points].sort((a, b) => a - b);
  }, [photoCheckins.length, snapInterval]);

  carouselMaxOffsetRef.current = carouselMaxOffset;
  carouselSnapPointsRef.current = carouselSnapPoints;
  photoCountRef.current = photoCheckins.length;
  snapIntervalRef.current = snapInterval;

  const photoCarouselResetKey = useMemo(
    () =>
      (todayCheckins ?? [])
        .filter((checkin) => !!checkin.photo_url)
        .map((checkin) => checkin.id)
        .join('|'),
    [todayCheckins],
  );

  const snapCarouselToNearest = useCallback(
    (gesture?: PanResponderGestureState | null) => {
      carouselAnimRef.current?.stop();
      carouselPullStartRef.current = 0;

      const current = lastCarouselSyncRef.current;
      const velocityX = gesture?.vx ?? 0;
      const count = photoCountRef.current;
      const currentSnapInterval = snapIntervalRef.current;
      const firstPoint = carouselSnapPointsRef.current[0] ?? 0;
      const lastPhotoSnap =
        count >= 2 && currentSnapInterval > 0 ? -((count - 1) * currentSnapInterval) : 0;
      const beyondLastPhoto = current < lastPhotoSnap - 2;
      const useTailSpring = beyondLastPhoto || current > 2;

      let nextTarget = firstPoint;

      if (current > 2) {
        nextTarget = 0;
      } else if (beyondLastPhoto) {
        nextTarget = lastPhotoSnap;
      } else if (count >= 2 && currentSnapInterval > 0) {
        const nextIndex = carouselSnapIndexFromGesture(
          current,
          velocityX,
          currentSnapInterval,
          count,
        );
        nextTarget = -nextIndex * currentSnapInterval;
      } else {
        let bestDistance = Math.abs(current - firstPoint);
        for (const point of carouselSnapPointsRef.current) {
          const distance = Math.abs(current - point);
          if (distance < bestDistance) {
            bestDistance = distance;
            nextTarget = point;
          }
        }
      }

      lastCarouselSyncRef.current = nextTarget;

      const animation = useTailSpring
        ? Animated.spring(carouselX, {
            toValue: nextTarget,
            friction: 7,
            tension: 100,
            useNativeDriver: false,
          })
        : Animated.timing(carouselX, {
            toValue: nextTarget,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          });

      carouselAnimRef.current = animation;
      animation.start(({ finished }) => {
        carouselAnimRef.current = null;
        if (finished) {
          carouselX.setValue(nextTarget);
          lastCarouselSyncRef.current = nextTarget;
        }
      });
    },
    [carouselX],
  );

  const carouselPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: carouselMoveShouldSetResponder,
        onMoveShouldSetPanResponderCapture: carouselMoveShouldSetResponder,
        onShouldBlockNativeResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          onCarouselDragChange?.(true);
          carouselAnimRef.current?.stop();
          carouselX.stopAnimation((value) => {
            const base =
              typeof value === 'number' && !Number.isNaN(value)
                ? value
                : lastCarouselSyncRef.current;
            carouselPullStartRef.current = base;
            lastCarouselSyncRef.current = base;
          });
        },
        onPanResponderMove: (_event, gesture) => {
          const maxOffset = carouselMaxOffsetRef.current;
          let nextValue = carouselPullStartRef.current + gesture.dx;

          if (nextValue > 0) {
            nextValue *= 0.22;
          } else if (nextValue < -maxOffset) {
            nextValue = -maxOffset + (nextValue + maxOffset) * 0.28;
          }

          lastCarouselSyncRef.current = nextValue;
          carouselX.setValue(nextValue);
        },
        onPanResponderRelease: (_event, gesture) => {
          onCarouselDragChange?.(false);
          snapCarouselToNearest(gesture);
        },
        onPanResponderTerminate: (_event, gesture) => {
          onCarouselDragChange?.(false);
          snapCarouselToNearest(gesture);
        },
      }),
    [carouselX, onCarouselDragChange, snapCarouselToNearest],
  );

  useEffect(() => {
    carouselAnimRef.current?.stop();
    carouselX.stopAnimation();
    carouselX.setValue(0);
    lastCarouselSyncRef.current = 0;
    carouselPullStartRef.current = 0;
  }, [photoCarouselResetKey, carouselX]);

  return {
    cardWidth,
    carouselPanResponder,
    carouselX,
    peekTailWidth,
    photoCheckins,
    photoSectionWidth,
    setPhotoSectionWidth,
  };
}
