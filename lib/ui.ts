import type { ViewStyle } from "react-native";

/**
 * Sombra suave padrão do app — substitui bordas duras por uma profundidade leve.
 * Use em cards/painéis: remova `border`/`border-2` e passe `style={SOFT_SHADOW}`.
 * Funciona em web (box-shadow) e nativo (elevation).
 */
export const SOFT_SHADOW: ViewStyle = {
  shadowColor: "#1A1A1A",
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
};
