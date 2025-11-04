// src/auth/AuthProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";

import type { ReactNode } from "react";

import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import {
  AuthRequest,
  ResponseType,
  makeRedirectUri,
  fetchDiscoveryAsync,
  exchangeCodeAsync
} from "expo-auth-session";

import type { DiscoveryDocument } from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

/** ===== Types ===== */
type User = { name?: string; email?: string; picture?: string } | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

/** ===== Storage (web-safe) =====
 * SecureStore is not available on web, so we fall back to localStorage there.
 */
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === "web") {
      try {
        window.localStorage.setItem(key, value);
      } catch {}
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string) {
    if (Platform.OS === "web") {
      try {
        window.localStorage.removeItem(key);
      } catch {}
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

/** ===== Constants ===== */
const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "auth_token";
const PROFILE_KEY = "auth_profile";

// Replace with your real Web Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID_WEB =
  "965757428397-0qptrjl7r6q4427ur966okjn79erlvde.apps.googleusercontent.com";

/** ===== Provider ===== */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [discovery, setDiscovery] = useState<DiscoveryDocument | null>(null);

  // Bootstrap: discovery + restore session
  useEffect(() => {
    (async () => {
      try {
        const disc = await fetchDiscoveryAsync("https://accounts.google.com");
        setDiscovery(disc);

        const token = await storage.getItem(TOKEN_KEY);
        const profile = await storage.getItem(PROFILE_KEY);
        if (token && profile) setUser(JSON.parse(profile));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (!discovery) throw new Error("Auth discovery not ready yet");

    const redirectUri = makeRedirectUri(); // modern Expo picks the right one
    const request = new AuthRequest({
      clientId: GOOGLE_CLIENT_ID_WEB,
      redirectUri,
      responseType: ResponseType.Code, // Authorization Code with PKCE
      scopes: ["openid", "email", "profile"],
    });

    // Prebuild URL (optional but helpful)
    await request.makeAuthUrlAsync(discovery);

    const result = await request.promptAsync(discovery);
    if (result.type !== "success" || !result.params?.code) {
      throw new Error("Google sign-in canceled or failed");
    }

    // Exchange auth code for tokens (PKCE verifier attached to the request)
    const tokenResponse = await exchangeCodeAsync(
      {
        clientId: GOOGLE_CLIENT_ID_WEB,
        code: result.params.code,
        redirectUri,
        // Some SDKs auto-attach PKCE; passing it explicitly is safe:
        extraParams: request.codeVerifier
          ? { code_verifier: request.codeVerifier }
          : undefined,
      },
      discovery
    );

    // Fetch user profile with access token
    const profileRes = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      { headers: { Authorization: `Bearer ${tokenResponse.accessToken}` } }
    );
    if (!profileRes.ok) throw new Error("Failed to fetch user info");
    const profile = await profileRes.json();

    await storage.setItem(TOKEN_KEY, JSON.stringify(tokenResponse));
    await storage.setItem(PROFILE_KEY, JSON.stringify(profile));

    setUser({
      name: profile.name,
      email: profile.email,
      picture: profile.picture,
    });
  }, [discovery]);

  const logout = useCallback(async () => {
    await storage.removeItem(TOKEN_KEY);
    await storage.removeItem(PROFILE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, loginWithGoogle, logout }),
    [user, loading, loginWithGoogle, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** ===== Hook ===== */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
