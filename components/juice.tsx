/**
 * "Juice" kit: small, reusable animations that make the app feel like a game.
 * Built on Reanimated (UI thread). Every looping/celebration effect respects the
 * system "reduce motion" setting.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type PressableProps,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { GameIcon } from "@/components/game-icon";

// ============================================
// HAPTICS + COPY
// ============================================

const isNative = Platform.OS !== "web";

export const haptic = {
  tap: () =>
    isNative &&
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  pop: () =>
    isNative &&
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  success: () =>
    isNative &&
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    ),
  big: () => {
    if (!isNative) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    setTimeout(
      () =>
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}),
      180,
    );
  },
};

const CHEERS = [
  "Mandou bem!",
  "Arrasou!",
  "Isso aí!",
  "Show de bola!",
  "Que demais!",
  "Firme e forte!",
  "Glória!",
  "Partiu próximo!",
];

export const randomCheer = () =>
  CHEERS[Math.floor(Math.random() * CHEERS.length)];

export const CONFETTI_COLORS = [
  "#F2B50C", // ouro
  "#FFD64E", // estrela
  "#E24B50", // vermelho estandarte
  "#3D6FD6", // azul real
  "#43B36E", // verde
  "#7B3FA0", // roxo realeza
  "#FFFFFF",
];

// ============================================
// PRESSABLE THAT SQUISHES
// ============================================

export function PressableScale({
  children,
  onPress,
  disabled,
  className,
  style,
  hapticOnPress = true,
  ...rest
}: PressableProps & {
  className?: string;
  style?: ViewStyle;
  hapticOnPress?: boolean;
  children: ReactNode;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 6, stiffness: 300 });
      }}
      onPress={(event) => {
        if (hapticOnPress) haptic.tap();
        onPress?.(event);
      }}
    >
      <Animated.View
        className={className}
        style={[style, animatedStyle, disabled ? { opacity: 0.5 } : null]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ============================================
// LOOPS: WIGGLE, FLAME, FLOAT
// (No pulsing/breathing scale: the product owner asked for no pulse anywhere.)
// ============================================

/** Shake every couple of seconds, like a chest that wants to be opened. */
export function Wiggle({
  active = true,
  children,
}: {
  active?: boolean;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (!active || reduced) {
      cancelAnimation(rotate);
      rotate.value = 0;
      return;
    }
    rotate.value = withRepeat(
      withSequence(
        withDelay(1400, withTiming(-8, { duration: 70 })),
        withTiming(8, { duration: 70 }),
        withTiming(-6, { duration: 70 }),
        withTiming(6, { duration: 70 }),
        withTiming(0, { duration: 70 }),
      ),
      -1,
    );
  }, [active, reduced, rotate]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** Flickering flame for the streak. Bigger streaks burn a bit faster. */
export function Flame({
  size = 36,
  streak = 1,
}: {
  size?: number;
  streak?: number;
}) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  const speed = streak >= 30 ? 260 : streak >= 7 ? 340 : 420;

  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(
      withTiming(1, { duration: speed, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [reduced, speed, t]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { scaleY: 1 + t.value * 0.12 },
      { scaleX: 1 - t.value * 0.05 },
      { rotate: `${(t.value - 0.5) * 6}deg` },
    ],
  }));

  return (
    <Animated.View style={[{ transformOrigin: "bottom" } as ViewStyle, style]}>
      <GameIcon name="streak" size={Math.round(size * 1.15)} />
    </Animated.View>
  );
}

/** Slow up-and-down float, for mascots, chests and big icons. */
export function Float({
  children,
  distance = 6,
}: {
  children: ReactNode;
  distance?: number;
}) {
  const reduced = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    y.value = withRepeat(
      withTiming(-distance, {
        duration: 1200,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [reduced, distance, y]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

// ============================================
// ENTRANCES
// ============================================

/** Springs in from zero, optionally after a delay. Re-runs when `trigger` changes. */
export function PopIn({
  children,
  delay = 0,
  trigger,
  spin = false,
  gentle = false,
}: {
  children: ReactNode;
  delay?: number;
  trigger?: unknown;
  spin?: boolean;
  /** Minimal overshoot — use for speech bubbles / text that shouldn't balloon past its box. */
  gentle?: boolean;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withSpring(1, gentle ? { damping: 18, stiffness: 180 } : { damping: 9, stiffness: 160 }),
    );
  }, [delay, trigger, progress, gentle]);

  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 1.5),
    transform: [
      { scale: progress.value },
      { rotate: spin ? `${(1 - progress.value) * -180}deg` : "0deg" },
    ],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

// ============================================
// NUMBERS + BARS
// ============================================

/** Number that counts from its previous value (or `from`) to `value`. */
export function CountUp({
  value,
  from,
  duration = 900,
  prefix = "",
  suffix = "",
  className,
  style,
}: {
  value: number;
  from?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: object;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(from ?? value);
  const previous = useRef(from ?? value);

  useEffect(() => {
    const start = previous.current;
    previous.current = value;
    if (reduced || start === value) {
      setDisplay(value);
      return;
    }
    let frame: number;
    const startedAt = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - startedAt) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (value - start) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduced]);

  return (
    <Text className={className} style={style}>
      {prefix}
      {display}
      {suffix}
    </Text>
  );
}

/** Progress bar that fills smoothly and has a shine sweeping across it. */
export function AnimatedBar({
  percent,
  height = 10,
  fillClassName = "bg-primary",
  trackClassName = "bg-border",
  shine = true,
  from,
}: {
  percent: number;
  height?: number;
  fillClassName?: string;
  trackClassName?: string;
  shine?: boolean;
  from?: number;
}) {
  const reduced = useReducedMotion();
  const width = useSharedValue(from ?? 0);
  const sweep = useSharedValue(0);
  const clamped = Math.max(0, Math.min(100, percent));

  useEffect(() => {
    width.value = withTiming(clamped, {
      duration: reduced ? 0 : 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, reduced, width]);

  useEffect(() => {
    if (!shine || reduced) return;
    sweep.value = withRepeat(
      withDelay(
        1200,
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [shine, reduced, sweep]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));
  const shineStyle = useAnimatedStyle(() => ({
    left: `${sweep.value * 140 - 40}%`,
  }));

  return (
    <View
      className={`${trackClassName} rounded-full overflow-hidden`}
      style={{ height }}
    >
      <Animated.View
        className={`${fillClassName} rounded-full overflow-hidden`}
        style={[{ height }, fillStyle]}
      >
        {shine && (
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 0,
                bottom: 0,
                width: "35%",
                backgroundColor: "rgba(255,255,255,0.45)",
                transform: [{ skewX: "-20deg" }],
              },
              shineStyle,
            ]}
          />
        )}
      </Animated.View>
    </View>
  );
}

// ============================================
// CONFETTI
// ============================================

type Particle = {
  id: number;
  x: number;
  drift: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  spin: number;
  shape: "rect" | "circle" | "emoji";
  emoji: string;
};

const ICON_BITS = ["xp", "extra", "heart", "coin"] as const;

const CONFETTI_MAX_MS = 3400; // max delay (350) + max duration (3000) + margin

function ConfettiPiece({ p, height }: { p: Particle; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      p.delay,
      withTiming(1, { duration: p.duration, easing: Easing.in(Easing.quad) }),
    );
  }, [p, t]);

  const style = useAnimatedStyle(() => ({
    opacity: t.value > 0.85 ? (1 - t.value) / 0.15 : 1,
    transform: [
      { translateX: p.x + Math.sin(t.value * Math.PI * 3) * p.drift },
      { translateY: -40 + t.value * (height + 80) },
      { rotate: `${t.value * p.spin}deg` },
    ],
  }));

  return (
    <Animated.View style={[{ position: "absolute", top: 0, left: 0 }, style]}>
      {p.shape === "emoji" ? (
        <GameIcon name={p.emoji as (typeof ICON_BITS)[number]} size={p.size + 12} />
      ) : (
        <View
          style={{
            width: p.size,
            height: p.shape === "rect" ? p.size * 0.5 : p.size,
            borderRadius: p.shape === "circle" ? p.size : 2,
            backgroundColor: p.color,
          }}
        />
      )}
    </Animated.View>
  );
}

/**
 * Full-screen confetti rain. Change `burstKey` to fire again.
 * Renders nothing when reduce-motion is on.
 */
export function Confetti({
  burstKey,
  count = 70,
  onDone,
}: {
  burstKey: number | string | null;
  count?: number;
  onDone?: () => void;
}) {
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();

  const particles = useMemo<Particle[]>(() => {
    if (burstKey === null) return [];
    return Array.from({ length: count }, (_, i) => {
      const roll = Math.random();
      return {
        id: i,
        x: Math.random() * width,
        drift: 15 + Math.random() * 35,
        delay: Math.random() * 350,
        duration: 1800 + Math.random() * 1200,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 8 + Math.random() * 8,
        spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 720),
        shape: roll < 0.12 ? "emoji" : roll < 0.55 ? "rect" : "circle",
        emoji: ICON_BITS[i % ICON_BITS.length],
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstKey, count]);

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    if (burstKey === null) return;
    const timer = setTimeout(
      () => onDoneRef.current?.(),
      reduced ? 0 : CONFETTI_MAX_MS,
    );
    return () => clearTimeout(timer);
  }, [burstKey, reduced]);

  if (reduced || burstKey === null) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
      }}
    >
      {particles.map((p) => (
        <ConfettiPiece key={`${burstKey}-${p.id}`} p={p} height={height} />
      ))}
    </View>
  );
}
