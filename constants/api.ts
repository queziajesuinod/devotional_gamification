import { Platform } from "react-native";

const PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;
const PUBLIC_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const DEFAULT_LOCAL_API_URL = "http://localhost:3009";

const deriveWebApiOrigin = () => {
  if (typeof window === "undefined") {
    return PUBLIC_API_URL || PUBLIC_API_BASE_URL || DEFAULT_LOCAL_API_URL;
  }
  return PUBLIC_API_URL
    ? PUBLIC_API_URL.replace(/\/$/, "")
    : PUBLIC_API_BASE_URL
      ? PUBLIC_API_BASE_URL.replace(/\/$/, "")
      : (() => {
        const { origin } = window.location;
        if (origin.includes(":8081")) {
          return origin.replace(":8081", ":3009");
        }
        return origin.replace(/^8081-/, "3009-");
      })();
};

export const getApiBaseUrl = () => {
  const fallbackUrl = PUBLIC_API_URL || PUBLIC_API_BASE_URL || DEFAULT_LOCAL_API_URL;
  if (Platform.OS === "web") {
    return deriveWebApiOrigin();
  }
  return fallbackUrl.replace(/\/$/, "");
};
