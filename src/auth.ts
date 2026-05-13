import axios from "axios";
import { RestApi } from "@openremote/rest";

export interface AuthConfig {
  host: string;
  realm: string;
  clientId: string;
  clientSecret: string;
}

export function getAuthConfig(): AuthConfig {
  const host = process.env.OPENREMOTE_HOST;
  const clientId = process.env.OPENREMOTE_CLIENT_ID;
  const clientSecret = process.env.OPENREMOTE_CLIENT_SECRET;

  if (!host || !clientId || !clientSecret) {
    const missing = [
      !host && "OPENREMOTE_HOST",
      !clientId && "OPENREMOTE_CLIENT_ID",
      !clientSecret && "OPENREMOTE_CLIENT_SECRET",
    ].filter(Boolean);
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  return {
    host: host.replace(/\/+$/, ""),
    realm: process.env.OPENREMOTE_REALM || "master",
    clientId,
    clientSecret,
  };
}

async function fetchToken(
  config: AuthConfig
): Promise<{ accessToken: string; expiresIn: number }> {
  const tokenUrl = `${config.host}/auth/realms/${config.realm}/protocol/openid-connect/token`;
  const data = new URLSearchParams();
  data.append("client_id", config.clientId);
  data.append("client_secret", config.clientSecret);
  data.append("grant_type", "client_credentials");

  const response = await axios.post(tokenUrl, data, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return {
    accessToken: response.data.access_token,
    expiresIn: response.data.expires_in,
  };
}

export async function initAuth(
  rest: RestApi,
  config: AuthConfig
): Promise<void> {
  let currentToken: string;

  const refresh = async () => {
    try {
      const { accessToken, expiresIn } = await fetchToken(config);
      currentToken = accessToken;
      const refreshIn = Math.max((expiresIn - 60) * 1000, 10_000);
      setTimeout(refresh, refreshIn).unref();
    } catch (err) {
      console.error(
        "Token refresh failed:",
        err instanceof Error ? err.message : err
      );
      setTimeout(refresh, 30_000).unref();
    }
  };

  // Initial token fetch — must succeed or server won't start
  const { accessToken, expiresIn } = await fetchToken(config);
  currentToken = accessToken;
  const refreshIn = Math.max((expiresIn - 60) * 1000, 10_000);
  setTimeout(refresh, refreshIn).unref();

  rest.addRequestInterceptor((requestConfig) => {
    requestConfig.headers.Authorization = `Bearer ${currentToken}`;
    return requestConfig;
  });
}
