import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { ScrollView } from 'react-native';

interface TabPressNavigationLike {
  addListener: (event: 'tabPress', callback: () => void) => () => void;
  isFocused: () => boolean;
}

interface UseTabDoubleTapScrollTopParams {
  navigation: TabPressNavigationLike;
  scrollRef: RefObject<ScrollView | null>;
  thresholdMs?: number;
}

export default function useTabDoubleTapScrollTop({
  navigation,
  scrollRef,
  thresholdMs = 300,
}: UseTabDoubleTapScrollTopParams) {
  const lastTapRef = useRef(0);

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      if (!navigation.isFocused()) return;

      const now = Date.now();
      if (now - lastTapRef.current < thresholdMs) {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
      lastTapRef.current = now;
    });

    return unsubscribe;
  }, [navigation, scrollRef, thresholdMs]);
}
