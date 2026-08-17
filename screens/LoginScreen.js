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
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../firebase/config";
import { useTheme, typography } from "../utils/theme";
import { GENERIC_ERROR_MESSAGE } from "../utils/errorMessages";

function getPasswordStrength(password, theme) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: "Weak", color: theme.danger };
  if (score <= 3) return { label: "Medium", color: theme.warning };
  return { label: "Strong", color: theme.primary };
}

function getAuthErrorMessage(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try logging in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    default:
      return GENERIC_ERROR_MESSAGE;
  }
}

export default function LoginScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = getPasswordStrength(password, theme);
  const strengthLevel =
    passwordStrength.label === "Weak"
      ? 1
      : passwordStrength.label === "Medium"
        ? 2
        : 3;

  const handleSubmit = async () => {
    setError("");
    setInfo("");

    if (isRegistering && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        await sendEmailVerification(userCredential.user);
        await signOut(auth);
        setPassword("");
        setConfirmPassword("");
        setIsRegistering(false);
        setInfo("Check your email to verify your account, then log in.");
      } else {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        if (!userCredential.user.emailVerified) {
          await signOut(auth);
          setError("Please verify your email before logging in.");
        }
      }
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setInfo("");

    if (!email) {
      setError('Enter your email above first, then tap "Forgot password?"');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
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
        <Text style={[typography.screenTitle, styles.title, { color: theme.text }]}>
          PlantPal
        </Text>

        {error ? (
          <Text style={[typography.subtext, styles.message, { color: theme.danger }]}>
            {error}
          </Text>
        ) : null}
        {info ? (
          <Text style={[typography.subtext, styles.message, { color: theme.primary }]}>
            {info}
          </Text>
        ) : null}

        <TextInput
          style={[
            styles.input,
            { borderColor: theme.inputBorder, color: theme.text },
          ]}
          placeholder="Email"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <View style={[styles.passwordRow, { borderColor: theme.inputBorder }]}>
          <TextInput
            style={[styles.passwordInput, { color: theme.text }]}
            placeholder="Password"
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
                      i < strengthLevel ? passwordStrength.color : theme.border,
                  },
                ]}
              />
            ))}
            <Text
              style={[styles.strengthLabel, { color: passwordStrength.color }]}
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
              placeholder="Confirm Password"
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
          <TouchableOpacity
            style={styles.forgotButton}
            onPress={handleForgotPassword}
          >
            <Text style={[styles.switchText, { color: theme.primary }]}>
              Forgot password?
            </Text>
          </TouchableOpacity>
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
            {loading ? "Please wait..." : isRegistering ? "Register" : "Log In"}
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
              ? "Already have an account? Log In"
              : "Don't have an account? Register"}
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
  forgotButton: {
    alignItems: "flex-end",
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
