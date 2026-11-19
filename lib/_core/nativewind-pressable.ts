// NativeWind + Pressable: className can swallow onPress. Disable className mapping globally.
import { Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { cssInterop, remapProps } from "nativewind";

remapProps(Pressable, { className: false });

// PressableScale (components/juice.tsx) aplica a className num Animated.View do
// reanimated — que o NativeWind não estiliza por padrão, deixando botões sem
// fundo/layout. Registrar o cssInterop faz a className voltar a funcionar nele.
cssInterop(Animated.View, { className: "style" });
