/** @type {const} */
const themeColors = {
  // MaravilhasApp Primary Colors
  primary: { light: '#4ECDC4', dark: '#4ECDC4' }, // Verde Água
  primaryDark: { light: '#2B8A7E', dark: '#2B8A7E' }, // Verde Escuro
  primaryLight: { light: '#A8E6E1', dark: '#A8E6E1' }, // Azul Claro
  
  // Secondary/Accent (keeping gold for denarios/rewards)
  secondary: { light: '#2c7772ff', dark: '#39968fff' },
  accent: { light: '#A8E6E1', dark: '#A8E6E1' },
  
  // Neutral Colors
  background: { light: '#FFFFFF', dark: '#151718' },
  surface: { light: '#F5F7F6', dark: '#1e2022' },
  foreground: { light: '#333333', dark: '#ECEDEE' },
  muted: { light: '#666666', dark: '#9BA1A6' },
  border: { light: '#D0D8D5', dark: '#334155' },
  
  // Semantic Colors
  success: { light: '#4ECDC4', dark: '#4ECDC4' }, // Using primary for success
  warning: { light: '#FFF4A3', dark: '#FFF4A3' },
  error: { light: '#FF7F7F', dark: '#FF7F7F' },
  info: { light: '#808080ff', dark: '#a8a8a8ff' },
  
  // Supporting Colors
  blueDark: { light: '#1E5A5A', dark: '#1E5A5A' },
  coral: { light: '#FF7F7F', dark: '#FF7F7F' },
};

module.exports = { themeColors };
