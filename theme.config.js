/** @type {const} */
const themeColors = {
  // Reino da Palavra — paleta bíblico-medieval: azul real + vermelho estandarte + ouro.
  // (Substitui o teal #4ECDC4 antigo.)

  // Ação / marca
  primary: { light: "#C1272D", dark: "#E24B50" }, // Vermelho estandarte (CTA)
  primaryDark: { light: "#8E1B1F", dark: "#A32A2E" }, // Sombra / pressionado
  primaryLight: { light: "#F0A9A6", dark: "#F0A9A6" }, // Tom suave do primário

  secondary: { light: "#2E8B57", dark: "#43B36E" }, // Verde floresta (2º CTA)
  accent: { light: "#3D6FD6", dark: "#5C94FC" }, // Azul real (XP, destaques, fé)

  // Neutros / superfícies
  background: { light: "#F3F1EA", dark: "#0B1733" }, // Base (telas sem cenário)
  surface: { light: "#FFFFFF", dark: "#17213D" },
  foreground: { light: "#241A12", dark: "#F2EFE6" },
  muted: { light: "#6B5E4C", dark: "#B8AF9C" },
  border: { light: "#D8C9A8", dark: "#2B3550" },

  // Semânticos
  success: { light: "#2E8B57", dark: "#43B36E" },
  warning: { light: "#F2B50C", dark: "#FFCB3D" }, // Ouro (Denário / recompensa)
  error: { light: "#C1272D", dark: "#E24B50" },
  info: { light: "#3D6FD6", dark: "#5C94FC" },

  // Apoio / gamificação
  gold: { light: "#F2B50C", dark: "#FFCB3D" }, // Ouro explícito (moeda, badges)
  star: { light: "#FFD64E", dark: "#FFE27A" }, // Estrela (nível, conquista)
  royal: { light: "#7B3FA0", dark: "#9B5BC4" }, // Realeza (raridade épica)
  parchment: { light: "#F4E4C1", dark: "#2A2415" }, // Pergaminho (leitura)
  wood: { light: "#8B5A2B", dark: "#6B451F" }, // Madeira (baú, moldura)
  blueDark: { light: "#274E9E", dark: "#274E9E" }, // Azul profundo
  coral: { light: "#E24B50", dark: "#E24B50" },
};

module.exports = { themeColors };
