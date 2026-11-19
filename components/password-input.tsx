/**
 * Parchment password field with a "Mostrar / Esconder" toggle (auth screens).
 */
import { useState } from "react";
import type React from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { AUTH_INPUT, AUTH_PLACEHOLDER } from "@/components/auth-card";

export function PasswordInput({
  inputRef,
  ...props
}: Omit<TextInputProps, "secureTextEntry" | "style"> & { inputRef?: React.Ref<TextInput> }) {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <TextInput
        ref={inputRef}
        style={[AUTH_INPUT, { paddingRight: 96 }]}
        placeholderTextColor={AUTH_PLACEHOLDER}
        secureTextEntry={!visible}
        autoCapitalize="none"
        {...props}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visible ? "Esconder senha" : "Mostrar senha"}
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        style={{ position: "absolute", right: 8, top: 0, bottom: 0, justifyContent: "center", paddingHorizontal: 8 }}
      >
        <Text className="text-primary font-extrabold text-sm">{visible ? "Esconder" : "Mostrar"}</Text>
      </Pressable>
    </View>
  );
}
