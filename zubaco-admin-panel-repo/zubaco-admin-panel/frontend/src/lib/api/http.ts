import { apiRequest } from "@/lib/api/client";
import type { ApiRequestOptions } from "@/lib/api/client";

type RequestConfig = Omit<ApiRequestOptions, "method" | "path" | "body">;
type BodyRequestConfig<TBody> = Omit<ApiRequestOptions, "method" | "path"> & {
  body?: TBody;
};

export function get<TResponse>(
  path: string,
  config?: RequestConfig,
): Promise<TResponse | null> {
  return apiRequest<TResponse>({ method: "GET", path, ...config });
}

export function post<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  config?: BodyRequestConfig<TBody>,
): Promise<TResponse | null> {
  return apiRequest<TResponse>({ method: "POST", path, body, ...config });
}

export function put<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  config?: BodyRequestConfig<TBody>,
): Promise<TResponse | null> {
  return apiRequest<TResponse>({ method: "PUT", path, body, ...config });
}

export function patch<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  config?: BodyRequestConfig<TBody>,
): Promise<TResponse | null> {
  return apiRequest<TResponse>({ method: "PATCH", path, body, ...config });
}

export function del<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  config?: BodyRequestConfig<TBody>,
): Promise<TResponse | null> {
  return apiRequest<TResponse>({ method: "DELETE", path, body, ...config });
}
