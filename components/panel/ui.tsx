/**
 * Panel UI kit (admin + leader). Clean, modern dashboard look with the Reino brand
 * accent — deliberately NOT the kids' game style. Works in light and dark theme via
 * the theme tokens (bg-surface, text-foreground, border-border…).
 *
 * NOTE: NativeWind className is disabled on Pressable in this project
 * (lib/_core/nativewind-pressable.ts) — every Pressable here is styled with `style`.
 */
import type React from "react";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type ViewStyle,
} from "react-native";
import { GameIcon, type GameIconName } from "@/components/game-icon";
import { useThemeContext } from "@/lib/theme-provider";

export const BRAND = "#27509C";
const BRAND_DARK_MODE = "#4F86EE"; // validated for the dark surface (dataviz validator)

export function useBrandColor() {
  const { colorScheme } = useThemeContext();
  return colorScheme === "dark" ? BRAND_DARK_MODE : BRAND;
}

/** Web confirm / native Alert, resolved as a boolean. */
export async function confirmAction(message: string, confirmLabel = "Confirmar"): Promise<boolean> {
  if (Platform.OS === "web") {
    return typeof window !== "undefined" ? window.confirm(message) : false;
  }
  return new Promise((resolve) => {
    Alert.alert("Confirmar", message, [
      { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

// ---------------------------------------------------------------- layout

export function PageHeader({
  title,
  subtitle,
  actions,
  onBack,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <View className="flex-row flex-wrap items-center gap-3 mb-5">
      {onBack ? <Btn variant="secondary" size="sm" title="← Voltar" onPress={onBack} /> : null}
      <View className="flex-1" style={{ minWidth: 200 }}>
        <Text className="text-foreground text-2xl font-extrabold" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text className="text-muted text-sm mt-0.5">{subtitle}</Text> : null}
      </View>
      {actions ? <View className="flex-row flex-wrap gap-2">{actions}</View> : null}
    </View>
  );
}

export function Card({
  title,
  subtitle,
  action,
  children,
  style,
  padded = true,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}) {
  return (
    <View className="bg-surface rounded-2xl border border-border" style={[{ overflow: "hidden" }, style]}>
      {title || action ? (
        <View className="flex-row items-center px-4 pt-4 pb-2 gap-2">
          <View className="flex-1">
            {title ? <Text className="text-foreground font-extrabold text-base">{title}</Text> : null}
            {subtitle ? <Text className="text-muted text-xs mt-0.5">{subtitle}</Text> : null}
          </View>
          {action}
        </View>
      ) : null}
      <View style={padded ? { padding: 16, paddingTop: title || action ? 8 : 16 } : undefined}>{children}</View>
    </View>
  );
}

/** Responsive grid: children wrap into columns of at least `min` px. */
export function Grid({ children, min = 220, gap = 12 }: { children: React.ReactNode; min?: number; gap?: number }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
      {(Array.isArray(children) ? children : [children]).filter(Boolean).map((child, i) => (
        <View key={i} style={{ flexGrow: 1, flexBasis: min, minWidth: Math.min(min, 260) }}>
          {child}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------- KPIs & chart

export function KpiCard({
  icon,
  label,
  value,
  hint,
  tone = "default",
  onPress,
}: {
  icon: GameIconName;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "attention";
  onPress?: () => void;
}) {
  const body = (
    <View
      className="bg-surface rounded-2xl border p-4 flex-row items-center"
      style={{ borderColor: tone === "attention" ? "#F2B50C" : "rgba(139,90,43,0.22)", borderWidth: tone === "attention" ? 2 : 1 }}
    >
      <View
        className="rounded-xl items-center justify-center mr-3"
        style={{ width: 48, height: 48, backgroundColor: "rgba(39,80,156,0.10)" }}
      >
        <GameIcon name={icon} size={30} />
      </View>
      <View className="flex-1">
        <Text className="text-muted text-xs font-bold" numberOfLines={1}>
          {label}
        </Text>
        <Text className="text-foreground text-2xl font-extrabold" numberOfLines={1}>
          {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
        </Text>
        {hint ? (
          <Text className="text-muted text-xs" numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      {body}
    </Pressable>
  );
}

/**
 * Single-series bar chart (no library). One hue, no legend (the card title names the
 * series), bars anchored to the baseline with 4px rounded tops, value shown for the
 * selected bar (tap/hover) — the latest bar is selected by default.
 */
export function BarChart({
  data,
  height = 140,
  unit = "",
}: {
  data: { label: string; value: number; full?: string }[];
  height?: number;
  unit?: string;
}) {
  const color = useBrandColor();
  const [selected, setSelected] = useState(data.length - 1);
  const max = Math.max(1, ...data.map((d) => d.value));
  const current = data[selected];
  return (
    <View>
      <Text className="text-foreground text-sm font-bold mb-2" accessibilityLiveRegion="polite">
        {current ? `${current.full ?? current.label}: ${current.value.toLocaleString("pt-BR")}${unit}` : " "}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height, gap: 6 }}>
        {data.map((d, i) => {
          const h = Math.max(2, Math.round((d.value / max) * (height - 4)));
          const active = i === selected;
          return (
            <Pressable
              key={d.label + i}
              accessibilityRole="button"
              accessibilityLabel={`${d.full ?? d.label}: ${d.value}${unit}`}
              onPress={() => setSelected(i)}
              onHoverIn={() => setSelected(i)}
              style={{ flex: 1, height, justifyContent: "flex-end", alignItems: "center" }}
            >
              <View
                style={{
                  width: "70%",
                  maxWidth: 36,
                  height: h,
                  backgroundColor: color,
                  opacity: active ? 1 : 0.55,
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                }}
              />
            </Pressable>
          );
        })}
      </View>
      <View className="border-t border-border" style={{ flexDirection: "row", gap: 6, paddingTop: 6 }}>
        {data.map((d, i) => (
          <Text
            key={d.label + i}
            className={`flex-1 text-center text-xs ${i === selected ? "text-foreground font-bold" : "text-muted"}`}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- buttons & badges

type BtnVariant = "primary" | "secondary" | "danger" | "ghost" | "success";

const BTN: Record<BtnVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: BRAND, fg: "#FFFFFF", border: BRAND },
  success: { bg: "#2E8B57", fg: "#FFFFFF", border: "#2E8B57" },
  danger: { bg: "#C1272D", fg: "#FFFFFF", border: "#C1272D" },
  secondary: { bg: "transparent", fg: BRAND, border: "rgba(39,80,156,0.45)" },
  ghost: { bg: "transparent", fg: "#6B5E4C", border: "transparent" },
};

export function Btn({
  title,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  loading,
  disabled,
  fullWidth,
  accessibilityLabel,
}: {
  title: string;
  onPress?: () => void;
  variant?: BtnVariant;
  size?: "sm" | "md";
  icon?: GameIconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}) {
  const c = BTN[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed, hovered }: any) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: fullWidth ? "stretch" : "flex-start",
        gap: 6,
        minHeight: size === "sm" ? 36 : 44,
        paddingHorizontal: size === "sm" ? 12 : 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.bg,
        opacity: off ? 0.5 : pressed ? 0.85 : 1,
        ...(hovered && !off && variant !== "primary" && variant !== "danger" && variant !== "success"
          ? { backgroundColor: "rgba(39,80,156,0.08)" }
          : null),
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={c.fg} />
      ) : icon ? (
        <GameIcon name={icon} size={size === "sm" ? 18 : 20} />
      ) : null}
      <Text style={{ color: c.fg, fontWeight: "800", fontSize: size === "sm" ? 13 : 15 }}>{title}</Text>
    </Pressable>
  );
}

const BADGE = {
  neutral: { bg: "rgba(107,94,76,0.12)", fg: "#6B5E4C" },
  brand: { bg: "rgba(39,80,156,0.12)", fg: "#27509C" },
  good: { bg: "rgba(46,139,87,0.14)", fg: "#23704A" },
  warn: { bg: "rgba(242,181,12,0.20)", fg: "#7A5A00" },
  bad: { bg: "rgba(193,39,45,0.12)", fg: "#A11F25" },
} as const;

export function Badge({ label, tone = "neutral" }: { label: string; tone?: keyof typeof BADGE }) {
  const c = BADGE[tone];
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" }}>
      <Text style={{ color: c.fg, fontSize: 12, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- lists

export function DataRow({
  title,
  subtitle,
  meta,
  leading,
  right,
  onPress,
  last,
}: {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  leading?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: "rgba(139,90,43,0.14)",
      }}
    >
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text className="text-foreground font-bold" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-muted text-xs mt-0.5" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>{meta}</View> : null}
      </View>
      {right}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed, hovered }: any) => ({
        backgroundColor: pressed || hovered ? "rgba(39,80,156,0.06)" : "transparent",
      })}
    >
      {content}
    </Pressable>
  );
}

export function EmptyState({
  icon = "scroll",
  title,
  text,
  action,
}: {
  icon?: GameIconName;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 32, paddingHorizontal: 16, gap: 6 }}>
      <GameIcon name={icon} size={48} />
      <Text className="text-foreground font-extrabold text-center">{title}</Text>
      {text ? <Text className="text-muted text-sm text-center">{text}</Text> : null}
      {action ? <View style={{ marginTop: 8 }}>{action}</View> : null}
    </View>
  );
}

export function Loading({ label = "Carregando..." }: { label?: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 32, gap: 8 }}>
      <ActivityIndicator size="large" color={BRAND} />
      <Text className="text-muted text-sm">{label}</Text>
    </View>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total?: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, gap: 8 }}>
      <Btn size="sm" variant="secondary" title="Anterior" disabled={page <= 1} onPress={() => onChange(page - 1)} />
      <Text className="text-muted text-xs">
        Página {page} de {totalPages}
        {total != null ? ` · ${total} itens` : ""}
      </Text>
      <Btn size="sm" variant="secondary" title="Próxima" disabled={page >= totalPages} onPress={() => onChange(page + 1)} />
    </View>
  );
}

// ---------------------------------------------------------------- forms

export function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 14 }}>
      <View>
        <Text className="text-foreground font-extrabold">{title}</Text>
        {description ? <Text className="text-muted text-xs mt-0.5">{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  error,
  required,
  multiline,
  keyboardType,
  autoCapitalize,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <Text className="text-foreground text-sm font-bold mb-1.5">
        {label}
        {required ? <Text style={{ color: "#C1272D" }}> *</Text> : null}
      </Text>
      <TextInput
        className="text-foreground bg-background"
        style={{
          borderWidth: focused ? 2 : 1,
          borderColor: error ? "#C1272D" : focused ? BRAND : "rgba(139,90,43,0.30)",
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 10 : 0,
          minHeight: multiline ? 110 : 44,
          fontSize: 15,
          textAlignVertical: multiline ? "top" : "center",
        }}
        placeholder={placeholder}
        placeholderTextColor="#9B8C74"
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
        accessibilityLabel={label}
      />
      {error ? (
        <Text style={{ color: "#C1272D" }} className="text-xs mt-1 font-bold">
          {error}
        </Text>
      ) : hint ? (
        <Text className="text-muted text-xs mt-1">{hint}</Text>
      ) : null}
    </View>
  );
}

export function SelectField<T extends string | number>({
  label,
  options,
  value,
  onChange,
  hint,
  required,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (v: T) => void;
  hint?: string;
  required?: boolean;
}) {
  return (
    <View>
      <Text className="text-foreground text-sm font-bold mb-1.5">
        {label}
        {required ? <Text style={{ color: "#C1272D" }}> *</Text> : null}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityRole="radiogroup">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(o.value)}
              style={{
                paddingHorizontal: 12,
                minHeight: 36,
                justifyContent: "center",
                borderRadius: 999,
                borderWidth: active ? 2 : 1,
                borderColor: active ? BRAND : "rgba(139,90,43,0.30)",
                backgroundColor: active ? "rgba(39,80,156,0.10)" : "transparent",
              }}
            >
              <Text style={{ fontWeight: active ? "800" : "600", fontSize: 13 }} className={active ? "text-primary" : "text-foreground"}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {hint ? <Text className="text-muted text-xs mt-1">{hint}</Text> : null}
    </View>
  );
}

export function ToggleField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onChange(!value)}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 }}
    >
      <View
        style={{
          width: 44,
          height: 26,
          borderRadius: 13,
          padding: 3,
          backgroundColor: value ? "#2E8B57" : "rgba(107,94,76,0.35)",
          alignItems: value ? "flex-end" : "flex-start",
        }}
      >
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF" }} />
      </View>
      <View style={{ flex: 1 }}>
        <Text className="text-foreground text-sm font-bold">{label}</Text>
        {hint ? <Text className="text-muted text-xs">{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Sticky-ish footer of a form page: Cancel · (Delete) · Save. */
export function FormActions({
  onCancel,
  onSave,
  saving,
  saveLabel = "Salvar",
  onDelete,
  deleting,
}: {
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  return (
    <View
      className="border-t border-border"
      style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, paddingTop: 16, marginTop: 8 }}
    >
      {onDelete ? <Btn variant="danger" title="Excluir" onPress={onDelete} loading={deleting} /> : null}
      <View style={{ flex: 1 }} />
      <Btn variant="secondary" title="Cancelar" onPress={onCancel} disabled={saving} />
      <Btn variant="primary" title={saveLabel} onPress={onSave} loading={saving} />
    </View>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: "rgba(193,39,45,0.10)", borderRadius: 12, padding: 12 }}>
      <Text style={{ color: "#A11F25", fontWeight: "700" }}>{message}</Text>
    </View>
  );
}
