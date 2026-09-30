import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  TouchableOpacityProps,
} from 'react-native';
import { MOTION } from '../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Small shared press feedback for the existing touch targets. */
export function MotionTouchableOpacity({
  children,
  disabled,
  activeOpacity: _activeOpacity,
  onPressIn,
  onPressOut,
  style,
  ...props
}: TouchableOpacityProps) {
  void _activeOpacity;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const reduceMotion = useRef(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) reduceMotion.current = enabled;
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => { reduceMotion.current = enabled; },
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const animateTo = (pressed: boolean) => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: pressed && !reduceMotion.current ? MOTION.pressedScale : 1,
        duration: reduceMotion.current ? 0 : pressed ? MOTION.pressIn : MOTION.pressOut,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: pressed ? 0.88 : 1,
        duration: reduceMotion.current ? 0 : pressed ? MOTION.pressIn : MOTION.pressOut,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateHover = (hovered: boolean) => {
    Animated.timing(opacity, {
      toValue: hovered ? 0.94 : 1,
      duration: reduceMotion.current ? 0 : MOTION.hover,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => { animateTo(true); onPressIn?.(event); }}
      onPressOut={(event) => { animateTo(false); onPressOut?.(event); }}
      onHoverIn={() => animateHover(true)}
      onHoverOut={() => animateHover(false)}
      style={[style, { transform: [{ scale }], opacity }]}
    >
      {children}
    </AnimatedPressable>
  );
}

