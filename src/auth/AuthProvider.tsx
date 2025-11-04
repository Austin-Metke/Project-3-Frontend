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
import * as AuthSession from "expo-auth-session";
import {
  AuthRequest,
  ResponseType,
  makeRedirectUri,
  fetchDiscoveryAsync,
  exchangeCodeAsync,
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

/** ===== Storage (web-safe) ===== */
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try { return window.localStorage.getItem(key); } catch { return null; }
    }
    try { return await SecureStore.getItemAsync(key); } catch { return null; }
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === "web") {
      try { window.localStorage.setItem(key, value); } catch { }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string) {
    if (Platform.OS === "web") {
      try { window.localStorage.removeItem(key); } catch { }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

/** ===== Constants ===== */
const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "auth_token";
const PROFILE_KEY = "auth_profile";
const ALLOWED_DOMAIN = "csumb.edu";

// Your Google Web Client ID
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

  /** ===== Login with Google (proxy on native) ===== */
  const loginWithGoogle = useCallback(async () => {
    if (!discovery) throw new Error("Auth discovery not ready yet");

    const isWeb = Platform.OS === "web";
    const proxyRedirect = AuthSession.makeRedirectUri({ useProxy: true } as any);
    const directRedirect = AuthSession.makeRedirectUri();

    // Prefer proxy on native (https://auth.expo.dev/...), direct on web (http://localhost:PORT)
    const redirectUri = isWeb ? directRedirect : proxyRedirect;

    const request = new AuthRequest({
      clientId: GOOGLE_CLIENT_ID_WEB,
      redirectUri,
      responseType: ResponseType.Code,     // Auth Code + PKCE
      scopes: ["openid", "email", "profile"],
      extraParams: { hd: ALLOWED_DOMAIN }, // hint; real enforcement below
    });

    await request.makeAuthUrlAsync(discovery);

    const toMsg = (e: unknown) =>
      typeof e === "string" ? e : (e as any)?.message ?? String(e ?? "OAuth error");

    // Tell promptAsync to use the proxy on native. Cast to any to satisfy older SDK types.
    const result = await request.promptAsync(discovery, { useProxy: !isWeb } as any);

    console.log("[OAuth] redirectUri:", redirectUri);
    console.log("[OAuth] result:", (result as any).type);

    // Some SDK typings only expose "success" | "error", but native can return "dismiss"
    if ((result as any).type === "dismiss") {
      throw new Error("Sign-in dismissed");
    }
    if (result.type === "error") {
      throw new Error(toMsg((result as any).error));
    }
    if (result.type !== "success" || !result.params?.code) {
      throw new Error("No authorization code returned");
    }

    const tokenResponse = await exchangeCodeAsync(
      {
        clientId: GOOGLE_CLIENT_ID_WEB,
        code: result.params.code,
        redirectUri,
        extraParams: request.codeVerifier
          ? { code_verifier: request.codeVerifier }
          : undefined,
      },
      discovery
    );

    // Fetch profile
    const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenResponse.accessToken}` },
    });
    if (!profileRes.ok) throw new Error("Failed to fetch user info");
    const profile = await profileRes.json();

    // Enforce CSUMB-only
    const email: string | undefined = profile?.email?.toLowerCase?.();
    if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      await storage.removeItem(TOKEN_KEY);
      await storage.removeItem(PROFILE_KEY);
      setUser(null);
      throw new Error("Please sign in with your CSUMB account.");
    }

    await storage.setItem(TOKEN_KEY, JSON.stringify(tokenResponse));
    await storage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setUser({ name: profile.name, email: profile.email, picture: profile.picture });
  }, [discovery]);

  /** ===== Logout ===== */
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
