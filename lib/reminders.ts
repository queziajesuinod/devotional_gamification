/**
 * Local daily reminders (no push server needed).
 *
 * We schedule one-off notifications for the next few days instead of a repeating
 * trigger, so today's reminders can be skipped once the user has already completed
 * a challenge. The window is refreshed every time the dashboard loads.
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

const PREFS_KEY = "reminder-prefs-v1";
const ID_PREFIX = "devocional-reminder-";
const DAYS_AHEAD = 7;
const STREAK_RISK_HOUR = 21;
const ANDROID_CHANNEL = "daily-reminders";

export type ReminderPrefs = { enabled: boolean; hour: number; minute: number };

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = { enabled: false, hour: 19, minute: 0 };

const isSupported = Platform.OS === "ios" || Platform.OS === "android";

let handlerSet = false;
const ensureHandler = () => {
  if (handlerSet || !isSupported) return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
};

export async function getReminderPrefs(): Promise<ReminderPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_REMINDER_PREFS;
    return { ...DEFAULT_REMINDER_PREFS, ...(JSON.parse(raw) as Partial<ReminderPrefs>) };
  } catch {
    return DEFAULT_REMINDER_PREFS;
  }
}

export async function saveReminderPrefs(prefs: ReminderPrefs) {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

/** Ask for notification permission. Returns true when granted. */
export async function requestReminderPermission(): Promise<boolean> {
  if (!isSupported) return false;
  ensureHandler();
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: "Lembretes diários",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function cancelOurReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

const DAILY_MESSAGES = [
  "Seu devocional de hoje está te esperando 📖",
  "Separe uns minutinhos com Deus hoje 🙏",
  "Um novo desafio do dia chegou! ✨",
  "Que tal ler a Palavra agora? 🌱",
];

async function schedule(id: string, date: Date, title: string, body: string) {
  if (date.getTime() <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, ...(Platform.OS === "android" ? { channelId: ANDROID_CHANNEL } : {}) },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

/**
 * Re-schedules the reminder window.
 * - doneToday: skip today's reminders
 * - streak: when > 0, also schedules a "sequência em risco" nudge at 21h
 */
export async function syncDailyReminders({ doneToday, streak }: { doneToday: boolean; streak: number }) {
  if (!isSupported) return;
  ensureHandler();

  const prefs = await getReminderPrefs();
  await cancelOurReminders();
  if (!prefs.enabled) return;

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  for (let offset = 0; offset < DAYS_AHEAD; offset += 1) {
    if (offset === 0 && doneToday) continue;

    const day = new Date();
    day.setDate(day.getDate() + offset);

    const reminderAt = new Date(day);
    reminderAt.setHours(prefs.hour, prefs.minute, 0, 0);
    await schedule(
      `${ID_PREFIX}daily-${offset}`,
      reminderAt,
      "Devocional Quest",
      DAILY_MESSAGES[(day.getDate() + offset) % DAILY_MESSAGES.length]
    );

    const riskAt = new Date(day);
    riskAt.setHours(STREAK_RISK_HOUR, 0, 0, 0);
    // Only nudge if the risk time is after the regular reminder
    if (streak > 0 && riskAt.getTime() > reminderAt.getTime()) {
      await schedule(
        `${ID_PREFIX}risk-${offset}`,
        riskAt,
        "Sua sequência está em risco 🔥",
        offset === 0
          ? `Você está com ${streak} ${streak === 1 ? "dia" : "dias"} seguidos. Complete um desafio antes da meia-noite!`
          : "Complete um desafio hoje para manter sua sequência!"
      );
    }
  }
}
