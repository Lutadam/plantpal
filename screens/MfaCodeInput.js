import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme, typography } from "../utils/theme";

export default function MfaCodeInput({
  code,
  onChangeCode,
  onVerify,
  onCancel,
  busy,
}) {
  const theme = useTheme();

  return (
    <>
      <TextInput
        style={[
          styles.input,
          { borderColor: theme.inputBorder, color: theme.text },
        ]}
        placeholder="123456"
        placeholderTextColor={theme.textMuted}
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={onChangeCode}
      />
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={[typography.button, { color: theme.textSecondary }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.verifyButton, { backgroundColor: theme.primary }]}
          onPress={onVerify}
          disabled={busy || code.length !== 6}
        >
          <Text style={[typography.button, { color: theme.onPrimary }]}>
            {busy ? "Verifying..." : "Verify"}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: "center",
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  verifyButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
});
