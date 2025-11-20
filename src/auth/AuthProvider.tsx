// auth/AuthProvider.tsx
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
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

// ====== Config ======
const ISSUER = "https://accounts.google.com";
const GOOGLE_CLIENT_ID =
  "965757428397-ftt72l7d8gnpdrkmftu3jne5clc2otkm.apps.googleusercontent.com"; // your Web client id

// SecureStore keys
const TOKEN_KEY = "auth.tokens.v1.secure";
const PROFILE_KEY = "auth.profile.v1";

// ====== Types ======
export type AuthUser = {
  id: string;
  name?: string;
  email?: string;
  picture?: string;
};

type Tokens = {
  access_token: string;
  expires_in: number;   // seconds
  obtained_at: number;  // ms epoch
  id_token?: string;
  refresh_token?: string;
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

// ====== Helpers ======
function isExpired(tokens: Tokens | null) {
  if (!tokens) return true;
  const expiresAt = tokens.obtained_at + tokens.expires_in * 1000 - 30_000; // refresh 30s early
  return Date.now() >= expiresAt;
}

async function fetchGoogleProfile(accessToken: string): Promise<AuthUser> {
  const r = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error("Failed to fetch userinfo");
  const j = await r.json();
  return { id: j.sub, name: j.name, email: j.email, picture: j.picture };
}

// ====== Provider ======
export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [discovery, setDiscovery] =
    useState<AuthSession.DiscoveryDocument | null>(null);

  // Derive the correct redirect for the current runtime
  const redirectUri = useMemo(() => {
    const cfg: any = Constants.expoConfig ?? {};
    const owner = cfg.owner || cfg.username || "your-expo-username";
    const slug = cfg.slug || "ecopoints-app";
    const isExpoGo = Constants.appOwnership === "expo"; // true when running inside Expo Go

    // In Expo Go: use HTTPS proxy (must be in Google "Authorized redirect URIs")
    if (isExpoGo) return `https://auth.expo.io/@${owner}/${slug}`;

    // In standalone/dev builds: use your app scheme deep link
    return AuthSession.makeRedirectUri({ scheme: "ecopoints" });
  }, []);

  // Log the redirect so you can paste it into Google OAuth settings
  useEffect(() => {
    console.log("Auth redirect URI being used:", redirectUri);
  }, [redirectUri]);

  // Fetch discovery
  useEffect(() => {
    AuthSession.fetchDiscoveryAsync(ISSUER).then(setDiscovery);
  }, []);

  // Build the request (PKCE, code flow)
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      redirectUri, // ✅ explicit (proxy on Expo Go, scheme on builds)
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      scopes: ["openid", "email", "profile"],
      // Ask for a refresh token during development / explicit consent
      extraParams: { access_type: "offline", prompt: "consent" },
    },
    discovery
  );

  // Hydrate from storage on app start
  useEffect(() => {
    (async () => {
      try {
        const [tRaw, pRaw] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(PROFILE_KEY),
        ]);
        const tokens: Tokens | null = tRaw ? JSON.parse(tRaw) : null;
        const profile: AuthUser | null = pRaw ? JSON.parse(pRaw) : null;

        if (tokens && profile) {
          if (isExpired(tokens) && tokens.refresh_token && discovery?.tokenEndpoint) {
            const refreshed = await refreshTokens(tokens.refresh_token, discovery.tokenEndpoint);
            if (refreshed) {
              await persistTokens(refreshed);
              setUser(profile);
              setLoading(false);
              return;
            }
          }
          if (!isExpired(tokens)) {
            setUser(profile);
          } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(PROFILE_KEY);
          }
        }
      } catch (e) {
        console.warn("Auth hydrate error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [discovery]);

  // Handle OAuth response (code -> token)
  useEffect(() => {
    (async () => {
      if (response?.type !== "success" || !request || !discovery?.tokenEndpoint) return;
      const { code } = response.params;
      if (!code) return;

      if (!request.codeVerifier) return;
      try {
        const tokenRes = await AuthSession.exchangeCodeAsync(
          {
            clientId: GOOGLE_CLIENT_ID,
            code,
            redirectUri,                         // use the same redirect we sent
            extraParams: {
              code_verifier: request.codeVerifier,
            },
          },
          discovery
        );

        const tokens: Tokens = {
          access_token: tokenRes.accessToken!,
          expires_in: tokenRes.expiresIn ?? 3600,
          obtained_at: Date.now(),
          id_token: tokenRes.idToken ?? undefined,
          refresh_token: (tokenRes as any).refreshToken ?? undefined,
        };

        await persistTokens(tokens);
        const profile = await fetchGoogleProfile(tokens.access_token);
        await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile));
        setUser(profile);
      } catch (e) {
        console.error("Token exchange failed:", e);
      }
    })();
  }, [response, discovery, request, redirectUri]);

  // ----- helpers -----
  async function persistTokens(t: Tokens) {
    await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(t));
  }

  async function refreshTokens(refreshToken: string, tokenEndpoint: string): Promise<Tokens | null> {
    try {
      const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: GOOGLE_CLIENT_ID,
      });
      const res = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const json = await res.json();
      if (!res.ok) {
        console.log("Refresh failed:", json);
        return null;
      }
      const next: Tokens = {
        access_token: json.access_token,
        expires_in: json.expires_in ?? 3600,
        obtained_at: Date.now(),
        id_token: json.id_token ?? undefined,
        refresh_token: json.refresh_token ?? refreshToken, // many providers omit on refresh
      };
      return next;
    } catch (e) {
      console.log("Refresh error:", (e as Error).message);
      return null;
    }
  }

  // ----- public API -----
  const signInWithGoogle = useCallback(async () => {
    if (!request) throw new Error("Sign-in not ready yet");
    const result = await promptAsync(); // library handles proxy vs scheme
    if (result.type !== "success") {
      if (result.type === "dismiss" || result.type === "cancel") return;
      throw new Error((result as any)?.error ?? "Authentication cancelled");
    }
  }, [promptAsync, request]);

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(PROFILE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signInWithGoogle, signOut }),
    [user, loading, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
