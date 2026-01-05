import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ToastProvider, type ToastOptions, useToast } from "react-native-toast-notifications";

type NotificationVariant = "success" | "error" | "info";

type NotificationOptions = {
  duration?: number;
  placement?: "top" | "bottom";
} & Partial<ToastOptions>;

type NotificationApi = {
  success: (message: string, options?: NotificationOptions) => void;
  error: (message: string, options?: NotificationOptions) => void;
  info: (message: string, options?: NotificationOptions) => void;
};

const NotificationContext = createContext<NotificationApi | null>(null);

const createToast = (toast: ReturnType<typeof useToast>, variant: NotificationVariant) => {
  return (message: string, options: NotificationOptions = {}) => {
    toast.show(message, {
      ...options,
      type: options.type ?? (variant === "error" ? "danger" : variant),
      duration: options.duration ?? 3000,
      placement: options.placement ?? "top",
      animationType: options.animationType ?? "slide-in",
    });
  };
};

const NotificationBridge = ({ children }: { children: ReactNode }) => {
  const toast = useToast();

  const value = useMemo(
    () => ({
      success: createToast(toast, "success"),
      error: createToast(toast, "error"),
      info: createToast(toast, "info"),
    }),
    [toast],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => (
  <ToastProvider
    placement="top"
    duration={3000}
    animationType="slide-in"
    offsetTop={32}
    offsetBottom={32}
    swipeEnabled
  >
    <NotificationBridge>{children}</NotificationBridge>
  </ToastProvider>
);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
