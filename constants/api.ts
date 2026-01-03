import { Platform } from "react-native";

const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3009";

const deriveWebApiOrigin = () => {
  if (typeof window === "undefined") {
    return DEFAULT_API_URL;
  }
  const { origin } = window.location;
  if (origin.includes(":8081")) {
    return origin.replace(":8081", ":3009");
  }
  return origin.replace(/^8081-/, "3009-");
};

export const getApiBaseUrl = () => {
  if (Platform.OS === "web") {
    return deriveWebApiOrigin();
  }
  return DEFAULT_API_URL;
};
