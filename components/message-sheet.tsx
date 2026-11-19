/**
 * Bottom sheet to send a cell member one of the encouragement messages
 * ("Estou orando por você", "Continue firme!", "Você me inspira").
 * One message per person per day (server rule). The receiver reads it on Início.
 */
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { trpc } from "@/lib/trpc";
import { GameIcon } from "@/components/game-icon";
import { GameButton, GameCloseButton } from "@/components/game-button";
import { FaceBadge } from "@/components/face-badge";
import { PopIn } from "@/components/juice";
import { useJuice } from "@/components/juice-provider";
import { useNotifications } from "@/components/notification-provider";
import type { Figurine as FigurineData } from "@shared/character-catalog";
import { SOFT_SHADOW } from "@/lib/ui";

export type MessageTarget = {
  userId: number;
  name: string;
  figurine?: FigurineData | null;
  sentToday?: boolean;
};

export function MessageSheet({
  target,
  groupId,
  onClose,
}: {
  target: MessageTarget | null;
  groupId: number;
  onClose: () => void;
}) {
  const { data: messages } = trpc.engagement.messages.useQuery();
  const [picked, setPicked] = useState<number | null>(null);
  const choice = picked ?? messages?.[0]?.id ?? null;
  const utils = trpc.useUtils();
  const juice = useJuice();
  const notifications = useNotifications();
  const send = trpc.engagement.encourage.useMutation({
    onSuccess: () => {
      juice.burst({
        title: "Mensagem enviada!",
        subtitle: `${target?.name} vai ver no Início`,
        confetti: false,
      });
      utils.engagement.groupWeek.invalidate({ groupId });
      utils.engagement.weeklyQuests.invalidate();
      onClose();
    },
    onError: (error) => notifications.error(error.message),
  });

  const visible = !!target;
  const sent = !!target?.sentToday;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(11,23,51,0.55)",
          justifyContent: "flex-end",
        }}
      >
        {/* Inner Pressable swallows taps so the sheet itself doesn't close */}
        <Pressable
          onPress={() => {}}
          style={{ width: "100%", maxWidth: 560, alignSelf: "center" }}
        >
          <View
            className="bg-surface"
            style={{
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              paddingBottom: 32,
              ...SOFT_SHADOW,
            }}
          >
            {target ? (
              <View>
                <View className="flex-row items-center">
                  <FaceBadge
                    figurine={target.figurine}
                    size={56}
                    ring="#F2B50C"
                    label={target.name}
                  />
                  <View className="flex-1 ml-3">
                    <Text className="text-muted text-xs font-bold">
                      Mandar mensagem para
                    </Text>
                    <Text
                      className="font-display text-foreground"
                      style={{ fontSize: 20 }}
                      numberOfLines={1}
                    >
                      {target.name}
                    </Text>
                  </View>
                  <GameCloseButton onPress={onClose} />
                </View>

                {sent ? (
                  <PopIn gentle>
                    <View className="items-center mt-6 mb-2 px-4">
                      <GameIcon name="love-letter" size={64} />
                      <Text
                        className="font-display text-foreground text-center mt-3"
                        style={{ fontSize: 18 }}
                      >
                        Mensagem já enviada hoje!
                      </Text>
                      <Text className="text-muted text-center text-sm mt-1">
                        Você já alegrou {target.name} hoje. Amanhã dá para
                        mandar outra.
                      </Text>
                    </View>
                  </PopIn>
                ) : (
                  <>
                    <Text className="text-foreground font-extrabold mt-5 mb-3">
                      Escolha sua mensagem:
                    </Text>
                    <View style={{ gap: 10 }} accessibilityRole="radiogroup">
                      {(messages ?? []).map((info, i) => {
                        const active = choice === info.id;
                        return (
                          <PopIn key={info.id} delay={i * 60} gentle>
                            <Pressable
                              accessibilityRole="radio"
                              accessibilityState={{ selected: active }}
                              accessibilityLabel={info.label}
                              onPress={() => setPicked(info.id)}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                padding: 14,
                                borderRadius: 18,
                                borderWidth: active ? 3 : 2,
                                borderColor: active ? "#F2B50C" : "#D8C9A8",
                                backgroundColor: active
                                  ? "rgba(242,181,12,0.14)"
                                  : "rgba(244,228,193,0.35)",
                              }}
                            >
                              <GameIcon
                                name={info.icon}
                                size={40}
                                style={{ marginRight: 12 }}
                              />
                              <Text
                                className="text-foreground font-extrabold flex-1"
                                style={{ fontSize: 16 }}
                              >
                                {info.label}
                              </Text>
                              {active ? (
                                <GameIcon name="seal" size={26} />
                              ) : null}
                            </Pressable>
                          </PopIn>
                        );
                      })}
                    </View>
                    <Text className="text-muted text-xs text-center mt-3">
                      {target.name} vai ver sua mensagem numa cartinha no
                      Início.
                    </Text>
                    <View className="mt-4">
                      <GameButton
                        fullWidth
                        size="lg"
                        variant="banner"
                        icon="love-letter"
                        title="Enviar mensagem"
                        loading={send.isPending}
                        disabled={choice == null}
                        onPress={() =>
                          choice != null && send.mutate({ toUserId: target.userId, messageId: choice })
                        }
                      />
                    </View>
                  </>
                )}
              </View>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
