import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { supabase } from "../supabase/config";
import { getPasswordResetRedirectUrl } from "../utils/authDeepLink";
import { useTheme, typography } from "../utils/theme";
import { getErrorMessage } from "../utils/errorMessages";

export default function ForgotPasswordScreen({ initialEmail, onBack }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState(initialEmail || "");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: getPasswordResetRedirectUrl() },
      );
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Text
          style={[typography.screenTitle, styles.title, { color: theme.text }]}
        >
          {t("forgotPassword.title")}
        </Text>

        {sent ? (
          <Text
            style={[typography.body, styles.message, { color: theme.text }]}
          >
            {t("forgotPassword.sentMessage")}
          </Text>
        ) : (
          <>
            <Text
              style={[
                typography.body,
                styles.description,
                { color: theme.textSecondary },
              ]}
            >
              {t("forgotPassword.description")}
            </Text>

            {error ? (
              <Text
                style={[
                  typography.subtext,
                  styles.message,
                  { color: theme.danger },
                ]}
              >
                {error}
              </Text>
            ) : null}

            <TextInput
              style={[
                styles.input,
                { borderColor: theme.inputBorder, color: theme.text },
              ]}
              placeholder={t("auth.emailPlaceholder")}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={handleSubmit}
              disabled={loading || !email.trim()}
            >
              <Text style={[typography.button, { color: theme.onPrimary }]}>
                {loading
                  ? t("forgotPassword.sending")
                  : t("forgotPassword.sendResetLink")}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={[styles.backText, { color: theme.primary }]}>
            {t("forgotPassword.backToLogin")}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  backButton: {
    marginTop: 20,
    alignItems: "center",
  },
  backText: {
    fontSize: 14,
  },
  message: {
    marginBottom: 12,
    textAlign: "center",
  },
});
