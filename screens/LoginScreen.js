import { useState } from "react";
import {
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
import { supabase } from "../supabase/config";
import { needsMfaChallenge } from "../utils/supabaseUser";
import { getPasswordResetRedirectUrl } from "../utils/authDeepLink";
import { useTheme, typography } from "../utils/theme";
import MfaCodeInput from "./MfaCodeInput";

function getPasswordStrength(password, theme, t) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1)
    return { level: 1, label: t("auth.strengthWeak"), color: theme.danger };
  if (score <= 3)
    return { level: 2, label: t("auth.strengthMedium"), color: theme.warning };
  return { level: 3, label: t("auth.strengthStrong"), color: theme.primary };
}

function getAuthErrorMessage(error, t) {
  switch (error?.code) {
    case "user_already_exists":
      return t("auth.errorUserExists");
    case "validation_failed":
    case "email_address_invalid":
      return t("auth.errorInvalidEmail");
    case "weak_password":
      return t("auth.errorWeakPassword");
    case "invalid_credentials":
      return t("auth.errorInvalidCredentials");
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return t("auth.errorRateLimited");
    case "email_not_confirmed":
      return t("auth.errorEmailNotConfirmed");
    default:
      return t("auth.errorGeneric");
  }
}

export default function LoginScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [mfaCode, setMfaCode] = useState("");

  const passwordStrength = getPasswordStrength(password, theme, t);
  const strengthLevel = passwordStrength.level;

  const handleSubmit = async () => {
    setError("");
    setInfo("");

    if (isRegistering && password.length < 6) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;
        await supabase.auth.signOut();
        setPassword("");
        setConfirmPassword("");
        setIsRegistering(false);
        setInfo(t("auth.checkEmailVerify"));
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;

        if (await needsMfaChallenge()) {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const factorId = factors?.totp?.[0]?.id;
          const { data: challenge, error: challengeError } =
            await supabase.auth.mfa.challenge({ factorId });
          if (challengeError) throw challengeError;
          setMfaChallenge({ factorId, challengeId: challenge.id });
        }
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    setError("");
    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaChallenge.factorId,
        challengeId: mfaChallenge.challengeId,
        code: mfaCode.trim(),
      });
      if (verifyError) throw verifyError;
    } catch (err) {
      setError(getAuthErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setInfo("");

    if (!email) {
      setError(t("auth.enterEmailFirstForgot"));
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: getPasswordResetRedirectUrl() },
      );
      if (resetError) throw resetError;
      setInfo(t("auth.passwordResetSent"));
    } catch (err) {
      setError(getAuthErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setError("");
    setInfo("");

    if (!email) {
      setError(t("auth.enterEmailFirstResend"));
      return;
    }

    setLoading(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (resendError) throw resendError;
      setInfo(t("auth.confirmationSent"));
    } catch (err) {
      setError(getAuthErrorMessage(err, t));
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
          {t("auth.appName")}
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
        {info ? (
          <Text
            style={[
              typography.subtext,
              styles.message,
              { color: theme.primary },
            ]}
          >
            {info}
          </Text>
        ) : null}

        {mfaChallenge ? (
          <>
            <Text
              style={[typography.body, styles.message, { color: theme.text }]}
            >
              {t("auth.mfaPrompt")}
            </Text>
            <MfaCodeInput
              code={mfaCode}
              onChangeCode={setMfaCode}
              onVerify={handleVerifyMfa}
              onCancel={() => {
                setMfaChallenge(null);
                setMfaCode("");
                setError("");
                supabase.auth.signOut();
              }}
              busy={loading}
            />
          </>
        ) : (
          <>
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
            <View
              style={[styles.passwordRow, { borderColor: theme.inputBorder }]}
            >
              <TextInput
                style={[styles.passwordInput, { color: theme.text }]}
                placeholder={t("auth.passwordPlaceholder")}
                placeholderTextColor={theme.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword((prev) => !prev)}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={22}
                  color={theme.iconSubtle}
                />
              </TouchableOpacity>
            </View>

            {isRegistering && password ? (
              <View style={styles.strengthRow}>
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor:
                          i < strengthLevel
                            ? passwordStrength.color
                            : theme.border,
                      },
                    ]}
                  />
                ))}
                <Text
                  style={[
                    styles.strengthLabel,
                    { color: passwordStrength.color },
                  ]}
                >
                  {passwordStrength.label}
                </Text>
              </View>
            ) : null}

            {isRegistering ? (
              <View
                style={[styles.passwordRow, { borderColor: theme.inputBorder }]}
              >
                <TextInput
                  style={[styles.passwordInput, { color: theme.text }]}
                  placeholder={t("auth.confirmPasswordPlaceholder")}
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={22}
                    color={theme.iconSubtle}
                  />
                </TouchableOpacity>
              </View>
            ) : null}

            {!isRegistering ? (
              <View style={styles.forgotRow}>
                <TouchableOpacity onPress={handleResendConfirmation}>
                  <Text style={[styles.switchText, { color: theme.primary }]}>
                    {t("auth.resendConfirmation")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={[styles.switchText, { color: theme.primary }]}>
                    {t("auth.forgotPassword")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={handleSubmit}
              disabled={
                loading ||
                !email ||
                !password ||
                (isRegistering && !confirmPassword)
              }
            >
              <Text style={[typography.button, { color: theme.onPrimary }]}>
                {loading
                  ? t("auth.pleaseWait")
                  : isRegistering
                    ? t("auth.register")
                    : t("auth.logIn")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => {
                setError("");
                setInfo("");
                setConfirmPassword("");
                setIsRegistering((prev) => !prev);
              }}
            >
              <Text style={[styles.switchText, { color: theme.primary }]}>
                {isRegistering
                  ? t("auth.switchToLogin")
                  : t("auth.switchToRegister")}
              </Text>
            </TouchableOpacity>
          </>
        )}
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
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
  },
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginTop: -4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginRight: 6,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  button: {
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  switchButton: {
    marginTop: 16,
    alignItems: "center",
  },
  forgotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
    marginBottom: 8,
  },
  switchText: {
    fontSize: 14,
  },
  message: {
    marginBottom: 12,
    textAlign: "center",
  },
});
