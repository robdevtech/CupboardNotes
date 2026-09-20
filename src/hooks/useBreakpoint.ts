import { useWindowDimensions } from 'react-native';

/** Tablet-ish split threshold — scale beautifully phone → tablet */
export const TABLET_MIN_WIDTH = 768;

export function useBreakpoint() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_MIN_WIDTH;
  const isLandscape = width > height;
  return { width, height, isTablet, isLandscape };
}
