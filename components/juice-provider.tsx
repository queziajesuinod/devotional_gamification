import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Confetti, haptic, randomCheer } from "@/components/juice";

type BurstOptions = {
  /** Headline; defaults to a random cheer ("Mandou bem! 🙌") */
  title?: string;
  xp?: number;
  denario?: number;
  /** Extra line, e.g. "Missão concluída" */
  subtitle?: string;
  /** Rain confetti too (default: true) */
  confetti?: boolean;
};

type JuiceApi = {
  /** Floating reward chip that pops, rises and fades (+ optional confetti). */
  burst: (options?: BurstOptions) => void;
  /** Confetti only. */
  confetti: (count?: number) => void;
};

const JuiceContext = createContext<JuiceApi | null>(null);

type ActiveBurst = Required<Pick<BurstOptions, "title">> & BurstOptions & { key: number };

function RewardChip({ burst, onDone }: { burst: ActiveBurst; onDone: () => void }) {
  const scale = useSharedValue(0.3);
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(withTiming(1, { duration: 120 }), withDelay(1300, withTiming(0, { duration: 350 })));
    scale.value = withSpring(1, { damping: 7, stiffness: 180 });
    y.value = withDelay(500, withTiming(-90, { duration: 1250, easing: Easing.in(Easing.quad) }));
    const timer = setTimeout(onDone, 1900);
    return () => clearTimeout(timer);
  }, [burst.key, onDone, opacity, scale, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: "38%", alignItems: "center", zIndex: 1000 }}>
      <Animated.View style={style} className="bg-background rounded-3xl px-6 py-4 items-center border-2 border-primary shadow-lg">
        <Text className="text-foreground text-2xl font-extrabold">{burst.title}</Text>
        {burst.subtitle ? <Text className="text-muted text-sm mt-1">{burst.subtitle}</Text> : null}
        {(burst.xp || burst.denario) ? (
          <View className="flex-row gap-2 mt-2">
            {burst.xp ? (
              <View className="bg-primary px-3 py-1 rounded-full">
                <Text className="text-white font-extrabold">+{burst.xp} XP</Text>
              </View>
            ) : null}
            {burst.denario ? (
              <View className="bg-warning px-3 py-1 rounded-full">
                <Text className="text-foreground font-extrabold">+{burst.denario} 💰</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

export function JuiceProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveBurst | null>(null);
  const [confettiKey, setConfettiKey] = useState<number | null>(null);
  const [confettiCount, setConfettiCount] = useState(70);
  const counter = useRef(0);

  const confetti = useCallback((count = 70) => {
    counter.current += 1;
    setConfettiCount(count);
    setConfettiKey(counter.current);
  }, []);

  const burst = useCallback(
    (options: BurstOptions = {}) => {
      counter.current += 1;
      haptic.success();
      setActive({ ...options, title: options.title ?? randomCheer(), key: counter.current });
      if (options.confetti !== false) confetti(40);
    },
    [confetti]
  );

  const clearBurst = useCallback(() => setActive(null), []);
  const clearConfetti = useCallback(() => setConfettiKey(null), []);
  const api = useMemo(() => ({ burst, confetti }), [burst, confetti]);

  return (
    <JuiceContext.Provider value={api}>
      <View style={{ flex: 1 }}>
        {children}
        {active && <RewardChip key={active.key} burst={active} onDone={clearBurst} />}
        <Confetti burstKey={confettiKey} count={confettiCount} onDone={clearConfetti} />
      </View>
    </JuiceContext.Provider>
  );
}

export function useJuice(): JuiceApi {
  const ctx = useContext(JuiceContext);
  if (!ctx) throw new Error("useJuice must be used within a JuiceProvider");
  return ctx;
}
