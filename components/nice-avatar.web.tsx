import Avatar, { genConfig } from "react-nice-avatar";

export type NiceAvatarConfig = ReturnType<typeof genConfig>;

type NiceAvatarProps = {
  config?: NiceAvatarConfig | null;
  size?: number;
};

export const genNiceAvatarConfig = (): NiceAvatarConfig => genConfig();

export const NiceAvatar = ({ config, size = 96 }: NiceAvatarProps) => {
  const resolved = config ?? genConfig();
  return <Avatar style={{ width: size, height: size }} {...resolved} />;
};
