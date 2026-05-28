import axios, { BASE_URL } from "@/services/axios";

type ApiResponse<T> = Promise<T>;

const buildUrl = (path: string): string => {
  const normalizedPath = path.replace(/^\/+/, "");
  return `${BASE_URL}/${normalizedPath}`;
};

export const httpGet = <T>(path: string): ApiResponse<T> => {
  return axios
    .get<T>(buildUrl(path))
    .then((response) => {
      return response.data;
    })
    .catch((error: unknown) => {
      throw error;
    });
};

export const httpPost = <T, TPayload = unknown>(
  path: string,
  values: TPayload,
): ApiResponse<T> => {
  return axios
    .post<T>(buildUrl(path), values)
    .then((response) => {
      return response.data;
    })
    .catch((error: unknown) => {
      throw error;
    });
};

export const httpPut = <T, TPayload = unknown>(
  path: string,
  values: TPayload,
): ApiResponse<T> => {
  return axios
    .put<T>(buildUrl(path), values)
    .then((response) => {
      return response.data;
    })
    .catch((error: unknown) => {
      throw error;
    });
};

export const httpPatch = <T, TPayload = unknown>(
  path: string,
  values: TPayload,
): ApiResponse<T> => {
  return axios
    .patch<T>(buildUrl(path), values)
    .then((response) => {
      return response.data;
    })
    .catch((error: unknown) => {
      throw error;
    });
};

export const httpDelete = <T>(path: string): ApiResponse<T> => {
  return axios
    .delete<T>(buildUrl(path))
    .then((response) => {
      return response.data;
    })
    .catch((error: unknown) => {
      throw error;
    });
};
