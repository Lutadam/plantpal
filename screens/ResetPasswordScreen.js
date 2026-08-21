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
import { supabase } from "../supabase/config";
import { useTheme, typography } from "../utils/theme";
import { GENERIC_ERROR_MESSAGE } from "../utils/errorMessages";

export default function ResetPasswordScreen({ onDone, onCancel }) {
  const theme = useTheme();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (password.length < 6) {
      setError("Password should be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      onDone();
    } catch (err) {
      setError(GENERIC_ERROR_MESSAGE);
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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text
          style={[typography.screenTitle, styles.title, { color: theme.text }]}
        >
          Set a new password
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
          placeholder="New password"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={[
            styles.input,
            { borderColor: theme.inputBorder, color: theme.text },
          ]}
          placeholder="Confirm new password"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={handleSubmit}
          disabled={loading || !password || !confirmPassword}
        >
          <Text style={[typography.button, { color: theme.onPrimary }]}>
            {loading ? "Please wait..." : "Update password"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={[styles.cancelText, { color: theme.textSecondary }]}>
            Cancel
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
    marginBottom: 32,
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
  cancelButton: {
    marginTop: 16,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
  },
  message: {
    marginBottom: 12,
    textAlign: "center",
  },
});
