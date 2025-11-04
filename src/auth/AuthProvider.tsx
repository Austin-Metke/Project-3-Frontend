import * as WebBrowser from "expo-web-browser";
WebBrowser.maybeCompleteAuthSession();

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as AuthSession from "expo-auth-session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

// Replace this with your Google Cloud Web Client ID
const GOOGLE_CLIENT_ID_WEB =
  "965757428397-ftt72l7d8gnpdrkmftu3jne5clc2otkm.apps.googleusercontent.com";

const TOKEN_KEY = "auth.tokens.v1";
const PROFILE_KEY = "auth.profile.v1";

export type AuthUser = {
  id: string;
  name?: string;
  email?: string;
  picture?: string;
};

type Tokens = {
  access_token: string;
  expires_in: number;
  obtained_at: number;
  id_token?: string;
};

type AuthContextShape = {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextShape | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};

function isExpired(tokens: Tokens | null) {
  if (!tokens) return true;
  const now = Date.now();
  const expiresAt = tokens.obtained_at + tokens.expires_in * 1000 - 30_000;
  return now >= expiresAt;
}

async function fetchGoogleProfile(accessToken: string): Promise<AuthUser> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch profile");
  const data = await res.json();
  return {
    id: data.sub,
    name: data.name,
    email: data.email,
    picture: data.picture,
  };
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Let useAuthRequest manage the correct redirect (Expo proxy on native)
  const useProxy = Platform.OS !== "web";

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID_WEB,
      responseType: AuthSession.ResponseType.Code,
      scopes: ["openid", "email", "profile"],
      prompt: AuthSession.Prompt.SelectAccount,
      redirectUri: AuthSession.makeRedirectUri(),
    },
    discovery, // important: drives proxy vs direct
  );

  useEffect(() => {
    (async () => {
      try {
        const [tokRaw, profileRaw] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(PROFILE_KEY),
        ]);
        const tokens = tokRaw ? JSON.parse(tokRaw) : null;
        const profile = profileRaw ? JSON.parse(profileRaw) : null;
        if (tokens && !isExpired(tokens) && profile) {
          setUser(profile);
        } else {
          await AsyncStorage.multiRemove([TOKEN_KEY, PROFILE_KEY]);
        }
      } catch (e) {
        console.warn("Auth hydrate failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!request) throw new Error("Auth request not ready yet");

    // No options here; useProxy already set in the hook
    const result = await promptAsync();
    if (result.type !== "success") {
      if (result.type === "dismiss" || result.type === "cancel") return;
      throw new Error((result as any)?.error ?? "Authentication cancelled");
    }

    const { code } = result.params;
    if (!code) throw new Error("No authorization code returned");

    // Use the exact redirectUri that the request used (proxy on native)
    const redirectUsed = (request as any)?.redirectUri ?? AuthSession.makeRedirectUri();

    const tokenRes = await AuthSession.exchangeCodeAsync(
      {
        clientId: GOOGLE_CLIENT_ID_WEB,
        code,
        redirectUri: redirectUsed,
      },
      discovery
    );

    const tokens: Tokens = {
      access_token: tokenRes.accessToken!,
      expires_in: tokenRes.expiresIn ?? 3600,
      obtained_at: Date.now(),
      id_token: tokenRes.idToken ?? undefined,
    };

    const profile = await fetchGoogleProfile(tokens.access_token);
    console.log("✅ Signed in user:", profile?.email ?? profile?.id);

    await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setUser(profile);
  }, [promptAsync, request]);

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, PROFILE_KEY]);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signInWithGoogle, signOut }),
    [user, loading, signInWithGoogle, signOut]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};
