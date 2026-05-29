import { AUTH_STORAGE_KEY, AUTH_TOKEN_STORAGE_KEY } from "@/config/auth";

type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

export interface ApiRequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  baseUrl?: string;
  query?: QueryParams;
  body?: unknown;
  headers?: HeadersInit;
  token?: string;
  signal?: AbortSignal;
  returnNullOn404?: boolean;
  keepalive?: boolean;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const UNAUTHORIZED_TOAST_EVENT = "app:unauthorized-toast";
let hasHandledUnauthorized = false;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const needle = `${encodeURIComponent(name)}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(needle)) {
      return decodeURIComponent(trimmed.slice(needle.length));
    }
  }

  return null;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:";
  const attrs = [`Path=/`, `SameSite=Lax`, secure ? "Secure" : "", "Max-Age=0"]
    .filter(Boolean)
    .join("; ");
  document.cookie = `${encodeURIComponent(name)}=; ${attrs}`;
}

function handleUnauthorized() {
  if (typeof window === "undefined" || hasHandledUnauthorized) return;
  hasHandledUnauthorized = true;

  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // best-effort cleanup
  }
  deleteCookie(AUTH_TOKEN_STORAGE_KEY);

  window.dispatchEvent(
    new CustomEvent(UNAUTHORIZED_TOAST_EVENT, {
      detail: {
        title: "Session expired",
        description: "Please login again to continue.",
      },
    }),
  );

  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

function buildUrl(
  path: string,
  query?: QueryParams,
  baseUrlOverride?: string,
): URL {
  const rawBaseUrl = (
    baseUrlOverride ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL
  )?.trim();

  if (!rawBaseUrl) {
    throw new Error(
      "API_BASE_URL or NEXT_PUBLIC_API_BASE_URL is not configured.",
    );
  }

  const baseUrl = normalizeBaseUrl(rawBaseUrl);

  let url: URL;
  try {
    url = new URL(path, baseUrl);
  } catch {
    throw new Error(
      `Invalid API base URL: "${rawBaseUrl}". Expected an absolute URL like "https://example.com".`,
    );
  }

  if (!query) return url;

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return url;
}

function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  // If a scheme is already provided, keep as-is.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) return trimmed;

  // Accept bare hosts like "example.com" or "localhost:3000" from envs.
  // Default to http for local addresses, otherwise https.
  const isLocalHost =
    trimmed.startsWith("localhost") || trimmed.startsWith("127.0.0.1");
  const isPrivateIp =
    /^(10|127|169\.254|172\.(1[6-9]|2\d|3[0-1])|192\.168)\./.test(trimmed);

  const scheme = isLocalHost || isPrivateIp ? "http://" : "https://";
  return `${scheme}${trimmed}`;
}

function resolveHeaders(
  url: string,
  token?: string,
  headers?: HeadersInit,
  isFormData?: boolean,
): Headers {
  const merged = new Headers({
    Accept: "application/json",
    ...headers,
  });

  if (!isFormData && !merged.has("Content-Type")) {
    merged.set("Content-Type", "application/json");
  }

  if (url.includes("ngrok")) {
    merged.set("ngrok-skip-browser-warning", "true");
  }

  const authToken = token ?? getCookie(AUTH_TOKEN_STORAGE_KEY);
  if (authToken) {
    merged.set("Authorization", `Bearer ${authToken}`);
  }

  return merged;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return null as T;

  const contentType = response.headers?.get?.("content-type");
  if (!contentType?.includes("application/json")) {
    // Jest mocks often omit headers; still attempt JSON parsing when available.
    if (typeof response.json === "function") {
      return (await response.json()) as T;
    }
    return null as T;
  }

  return (await response.json()) as T;
}

export async function apiRequest<TResponse>({
  method,
  path,
  baseUrl,
  query,
  body,
  headers,
  token,
  signal,
  returnNullOn404 = false,
  keepalive,
}: ApiRequestOptions): Promise<TResponse | null> {
  const url = buildUrl(path, query, baseUrl).toString();

  const isFormData = body instanceof FormData;

  const response = await fetch(url, {
    method,
    headers: resolveHeaders(url, token, headers, isFormData),
    credentials: "include",
    signal,
    keepalive,
    body: isFormData
      ? (body as FormData)
      : body === undefined
        ? undefined
        : JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 404 && returnNullOn404) return null;
    if (response.status === 401) {
      handleUnauthorized();
    }

    const errorPayload = await parseResponse<{
      message?: string;
      error?: string;
      code?: string;
      data?: unknown;
    }>(response);

    const message =
      errorPayload?.message ||
      errorPayload?.error ||
      `Request failed with status ${response.status}`;

    throw new ApiError(
      message,
      response.status,
      errorPayload?.code,
      errorPayload?.data,
    );
  }

  return parseResponse<TResponse>(response);
}
