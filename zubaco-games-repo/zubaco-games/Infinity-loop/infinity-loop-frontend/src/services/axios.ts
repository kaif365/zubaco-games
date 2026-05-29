import {
  clearSessionToken,
  hydrateSessionTokenFromStorage,
  readSessionToken,
  runUnauthorizedRecovery,
} from "@/lib/auth";
import URL from "@/services/endpoints";
import axiosLib, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from "axios";

const TOKEN_RETRY_KEY = "__infinityLoopTokenRetryDone__" as const;

export const resolveGameApiBase = (): string =>
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export const resolveDevSessionBase = (): string => {
  const authURL = process.env.NEXT_PUBLIC_MOCK_USER_SESSION_URL?.trim() ?? "";
  return authURL.length > 0 ? authURL : resolveGameApiBase();
};

export const resolveAdminBase = (): string => {
  const admin = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL?.trim() ?? "";
  return admin.length > 0 ? admin : resolveGameApiBase();
};

export const BASE_URL = resolveGameApiBase();

const axiosClient = axiosLib.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

function isDevSessionRequest(config: InternalAxiosRequestConfig): boolean {
  const url = config.url ?? "";
  return url.includes(URL.USER_AUTH_DEV_SESSION);
}

axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = readSessionToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error: AxiosError) =>
    Promise.reject(error instanceof Error ? error : new Error(String(error))),
);

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as
      | (InternalAxiosRequestConfig & { [TOKEN_RETRY_KEY]?: boolean })
      | undefined;
    const status = error.response?.status;

    if (
      status !== 401 ||
      !config ||
      config[TOKEN_RETRY_KEY] ||
      isDevSessionRequest(config)
    ) {
      throw error;
    }

    config[TOKEN_RETRY_KEY] = true;

    try {
      clearSessionToken();
      await runUnauthorizedRecovery();
      await hydrateSessionTokenFromStorage();
      const token = readSessionToken();
      if (!token) {
        throw error;
      }
      const headers = AxiosHeaders.from(config.headers ?? {});
      headers.set("Authorization", `Bearer ${token}`);
      config.headers = headers;
      return axiosClient.request(config);
    } catch {
      throw error;
    }
  },
);

export default axiosClient;
