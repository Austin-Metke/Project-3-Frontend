import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { useAuth } from "../auth/AuthProvider"; // cleaned path

const GoogleLogo = () => (
  <View style={styles.googleMark}>
    <View style={[styles.arc, styles.arcBlue]} />
    <View style={[styles.arc, styles.arcRed]} />
    <View style={[styles.arc, styles.arcYellow]} />
    <View style={[styles.arc, styles.arcGreen]} />
  </View>
);

const Login: React.FC = () => {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPressSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e?.message ?? "Sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onPressSignOut = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signOut();
    } catch (e: any) {
      setError(e?.message ?? "Sign-out failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Preparing sign-in…</Text>
      </View>
    );
  }

  if (user) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          {user.picture ? (
            <Image source={{ uri: user.picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]} />
          )}
          <Text style={styles.title}>Welcome{user.name ? `, ${user.name}` : "!"}</Text>
          <Text style={styles.subtitle}>{user.email}</Text>

          <TouchableOpacity
            style={[styles.button, styles.outlineBtn, submitting && styles.disabled]}
            onPress={onPressSignOut}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator />
            ) : (
              <Text style={[styles.buttonText, styles.outlineText]}>Sign out</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.envHint}>
          {Platform.OS === "web"
            ? "You're on the web — make sure the Google OAuth redirect URI matches your deployed origin."
            : "You're on a native platform — Expo AuthSession proxy will handle the redirect."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <GoogleLogo />
        <Text style={styles.title}>Sign in to EcoPoints</Text>
        <Text style={styles.subtitle}>Use any personal Google account</Text>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, submitting && styles.disabled]}
          onPress={onPressSignIn}
          disabled={submitting}
          activeOpacity={0.9}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue with Google</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By continuing, you agree to our Terms and acknowledge our Privacy Policy.
        </Text>
      </View>

      <Text style={styles.envHint}>
        {Platform.OS === "web"
          ? "If you see a redirect error, verify your Google OAuth Client ID and web redirect URIs."
          : "If sign-in doesn’t open, make sure the Expo Go client is updated."}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F7F7FB",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  muted: {
    color: "#666",
    fontSize: 14,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  error: {
    color: "#B00020",
    textAlign: "center",
    backgroundColor: "#FFECEF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    width: "100%",
  },
  button: {
    marginTop: 8,
    width: "100%",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1B73E8",
  },
  outlineBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  outlineText: {
    color: "#0F172A",
  },
  disclaimer: {
    marginTop: 8,
    fontSize: 12,
    color: "#7A7A85",
    textAlign: "center",
  },
  envHint: {
    marginTop: 16,
    fontSize: 12,
    color: "#7A7A85",
    textAlign: "center",
    maxWidth: 420,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarFallback: {
    backgroundColor: "#E5E7EB",
  },
  googleMark: {
    width: 56,
    height: 56,
    marginBottom: 4,
    position: "relative",
  },
  arc: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 6,
    borderColor: "transparent",
  },
  arcBlue: { borderTopColor: "#4285F4", transform: [{ rotate: "0deg" }] },
  arcRed: { borderRightColor: "#EA4335", transform: [{ rotate: "90deg" }] },
  arcYellow: { borderBottomColor: "#FBBC05", transform: [{ rotate: "180deg" }] },
  arcGreen: { borderLeftColor: "#34A853", transform: [{ rotate: "270deg" }] },
});

export default Login;
