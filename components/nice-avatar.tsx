import { View } from "react-native";

export type NiceAvatarConfig = Record<string, unknown>;

type NiceAvatarProps = {
  config?: NiceAvatarConfig | null;
  size?: number;
};

export const genNiceAvatarConfig = (): NiceAvatarConfig => ({});

export const NiceAvatar = ({ size = 96 }: NiceAvatarProps) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: "#e2e8f0",
    }}
  />
);
