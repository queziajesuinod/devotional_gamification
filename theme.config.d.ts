type Swatch = { light: string; dark: string };

export const themeColors: {
  primary: Swatch;
  primaryDark: Swatch;
  primaryLight: Swatch;
  secondary: Swatch;
  accent: Swatch;
  banner: Swatch;
  background: Swatch;
  surface: Swatch;
  foreground: Swatch;
  muted: Swatch;
  border: Swatch;
  success: Swatch;
  warning: Swatch;
  error: Swatch;
  info: Swatch;
  gold: Swatch;
  star: Swatch;
  royal: Swatch;
  parchment: Swatch;
  wood: Swatch;
  blueDark: Swatch;
  coral: Swatch;
};

declare const themeConfig: {
  themeColors: typeof themeColors;
};

export default themeConfig;
