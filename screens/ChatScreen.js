import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  getChatMessages,
  addChatMessage,
  deleteChatMessages,
} from "../db/chatDb";
import { sendChatMessage } from "../utils/gemini";
import { useTheme, typography } from "../utils/theme";
import { showGenericErrorAlert } from "../utils/alerts";
import { confirmDestructiveAction } from "../utils/confirmDelete";

function showChatErrorAlert(status, t) {
  const messageKey =
    {
      "no-key": "chat.errorNoKey",
      "rate-limited": "chat.errorRateLimited",
      "invalid-key": "chat.errorInvalidKey",
      "network-error": "chat.errorNetwork",
    }[status] || "errors.generic";
  Alert.alert(t("alerts.genericTitle"), t(messageKey));
}

function buildSystemPrompt(plant, t) {
  const base = t("chat.systemPromptBase");
  if (!plant) return base;
  return `${base}\n\n${t("chat.systemPromptPlantContext", {
    name: plant.name,
    species: plant.species || t("chat.unknownSpecies"),
    intervalDays: plant.wateringIntervalDays,
  })}`;
}

export default function ChatScreen({ user, plant, onClose }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) return;
    getChatMessages(user.uid, plant?.id ?? null)
      .then(setMessages)
      .catch((err) => showGenericErrorAlert(err))
      .finally(() => setLoading(false));
  }, [user?.uid, plant?.id]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || loading) return;

    setInput("");
    setSending(true);
    try {
      const userMessage = await addChatMessage(
        user.uid,
        plant?.id ?? null,
        "user",
        text,
      );
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);

      const reply = await sendChatMessage(
        nextMessages.map((m) => ({ role: m.role, content: m.content })),
        buildSystemPrompt(plant, t),
      );
      if (reply.status !== "ok") {
        showChatErrorAlert(reply.status, t);
        return;
      }

      const assistantMessage = await addChatMessage(
        user.uid,
        plant?.id ?? null,
        "assistant",
        reply.text,
      );
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      showGenericErrorAlert(err);
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = () => {
    confirmDestructiveAction(
      t("chat.clearChatTitle"),
      t("chat.clearChatMessage"),
      t("chat.clearChatButton"),
      async () => {
        try {
          await deleteChatMessages(user.uid, plant?.id ?? null);
          setMessages([]);
        } catch (err) {
          showGenericErrorAlert(err);
        }
      },
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={onClose ? ["top", "bottom"] : ["top"]}
    >
      <View style={styles.header}>
        {onClose ? (
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={26} color={theme.iconMuted} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSlot} />
        )}
        <Text
          style={[typography.navTitle, styles.headerTitle, { color: theme.text }]}
          numberOfLines={1}
        >
          {plant
            ? t("chat.titleForPlant", { name: plant.name })
            : t("chat.title")}
        </Text>
        {messages.length > 0 ? (
          <TouchableOpacity onPress={handleClearChat}>
            <Ionicons name="trash-outline" size={22} color={theme.danger} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSlot} />
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        {loading ? (
          <ActivityIndicator
            style={styles.loading}
            size="large"
            color={theme.primary}
          />
        ) : messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={40}
              color={theme.placeholderIcon}
            />
            <Text
              style={[
                typography.subtext,
                styles.emptyText,
                { color: theme.textMuted },
              ]}
            >
              {t("chat.emptyState")}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
            renderItem={({ item }) => (
              <View
                style={[
                  styles.bubble,
                  item.role === "user"
                    ? [styles.bubbleUser, { backgroundColor: theme.primary }]
                    : [styles.bubbleAssistant, { backgroundColor: theme.card }],
                ]}
              >
                <Text
                  style={[
                    typography.body,
                    {
                      color:
                        item.role === "user" ? theme.onPrimary : theme.text,
                    },
                  ]}
                >
                  {item.content}
                </Text>
              </View>
            )}
          />
        )}

        {sending ? (
          <Text
            style={[
              typography.subtext,
              styles.sending,
              { color: theme.textMuted },
            ]}
          >
            {t("chat.sending")}
          </Text>
        ) : null}

        <View
          style={[styles.inputRow, { borderTopColor: theme.border }]}
        >
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.inputBorder,
                backgroundColor: theme.surface,
                color: theme.text,
              },
            ]}
            placeholder={t("chat.inputPlaceholder")}
            placeholderTextColor={theme.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: theme.primary },
              (sending || loading || !input.trim()) &&
                styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={sending || loading || !input.trim()}
          >
            <Ionicons name="send" size={18} color={theme.onPrimary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    textAlign: "center",
  },
  headerSlot: {
    width: 26,
  },
  loading: {
    marginTop: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 12,
    textAlign: "center",
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  sending: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
