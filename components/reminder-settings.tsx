import { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  DEFAULT_REMINDER_PREFS,
  getReminderPrefs,
  requestReminderPermission,
  saveReminderPrefs,
  syncDailyReminders,
  type ReminderPrefs,
} from "@/lib/reminders";
import { useNotifications } from "@/components/notification-provider";

const HOUR_OPTIONS = [6, 7, 8, 12, 17, 18, 19, 20];

/** Settings card to turn the daily reminder on/off and pick its time. */
export function ReminderSettings({
  doneToday,
  streak,
}: {
  doneToday: boolean;
  streak: number;
}) {
  const notifications = useNotifications();
  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_REMINDER_PREFS);

  useEffect(() => {
    getReminderPrefs()
      .then(setPrefs)
      .catch(() => {});
  }, []);

  if (Platform.OS === "web") return null;

  const update = async (next: ReminderPrefs) => {
    if (next.enabled && !prefs.enabled) {
      const granted = await requestReminderPermission();
      if (!granted) {
        notifications.error(
          "Permita as notificações nas configurações do celular para receber lembretes.",
        );
        return;
      }
    }
    setPrefs(next);
    await saveReminderPrefs(next);
    await syncDailyReminders({ doneToday, streak }).catch(() => {});
    if (next.enabled) {
      notifications.success(
        `Lembrete diário às ${String(next.hour).padStart(2, "0")}h ✅`,
      );
    }
  };

  return (
    <View className="bg-surface rounded-xl p-4 border border-border mb-4">
      <View className="flex-row justify-between items-center">
        <View className="flex-1 pr-3">
          <Text className="text-foreground text-lg font-bold">
            Lembrete diário
          </Text>
          <Text className="text-muted text-sm mt-1">
            Um aviso para seu devocional e outro às 21h se sua sequência estiver
            em risco.
          </Text>
        </View>
        <Switch
          value={prefs.enabled}
          onValueChange={(enabled) => update({ ...prefs, enabled })}
        />
      </View>

      {prefs.enabled && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4"
        >
          <View className="flex-row gap-2">
            {HOUR_OPTIONS.map((hour) => {
              const selected = prefs.hour === hour;
              return (
                <TouchableOpacity
                  key={hour}
                  onPress={() => update({ ...prefs, hour, minute: 0 })}
                  className={`px-4 py-2 rounded-full border ${
                    selected
                      ? "bg-primary border-primary"
                      : "bg-background border-border"
                  }`}
                >
                  <Text
                    className={
                      selected ? "text-white font-bold" : "text-foreground"
                    }
                  >
                    {String(hour).padStart(2, "0")}h
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
