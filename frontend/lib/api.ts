import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

import { readAuthToken } from "@/lib/authToken";
import { toast } from "@/components/ui/use-toast";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 60_000;
const TOKEN_KEY = "access_token";
const AUTH_STORE_KEY = "auth-store";
const AUTH_COOKIE_KEY = "access_token";

type RetryableConfig = InternalAxiosRequestConfig & {
  _retried?: boolean;
};

const clearClientAuth = () => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(AUTH_STORE_KEY);
  document.cookie = `${AUTH_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const getMutableHeaders = (config: InternalAxiosRequestConfig): AxiosHeaders => {
  if (config.headers instanceof AxiosHeaders) {
    return config.headers;
  }

  const headers = new AxiosHeaders(config.headers ?? {});
  config.headers = headers;
  return headers;
};

const getErrorDescription = (error: AxiosError): string => {
  if (error.code === "ECONNABORTED") {
    return "The request timed out. Please try again.";
  }

  const responseData = error.response?.data;

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }

  if (responseData && typeof responseData === "object") {
    const detail = (responseData as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }

    const structuredErrors = (responseData as {
      errors?: Array<{ field?: string; message?: string }>;
    }).errors;
    if (Array.isArray(structuredErrors) && structuredErrors.length > 0) {
      const firstError = structuredErrors[0];
      const fieldPrefix = firstError?.field ? `${firstError.field}: ` : "";
      if (typeof firstError?.message === "string" && firstError.message.trim()) {
        return `${fieldPrefix}${firstError.message}`;
      }
    }
  }

  return error.message || "Unexpected error while calling the API.";
};

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

export const adminApi = axios.create({
  baseURL: `${BASE_URL}/api/admin`,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

export const isRequestCanceled = (error: unknown): boolean =>
  axios.isCancel(error) ||
  ((error as { code?: string } | undefined)?.code ?? "") === "ERR_CANCELED";

export function addAuthInterceptors(instance: AxiosInstance) {
  instance.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
      const headers = getMutableHeaders(config);
      const requestId =
        typeof window.crypto?.randomUUID === "function"
          ? window.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      headers.set("X-Request-Id", requestId);

      if (config.data instanceof FormData) {
        headers.delete("Content-Type");
      }

      const token = readAuthToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (isRequestCanceled(error)) {
        return Promise.reject(error);
      }

      const status = error.response?.status;
      const requestConfig = error.config as RetryableConfig | undefined;

      if (
        status &&
        status >= 500 &&
        status < 600 &&
        requestConfig &&
        !requestConfig._retried
      ) {
        requestConfig._retried = true;
        await wait(1000);
        return instance.request(requestConfig);
      }

      if (status === 401) {
        clearClientAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }

      toast({
        variant: "destructive",
        title: "Request failed",
        description: getErrorDescription(error),
      });

      return Promise.reject(error);
    }
  );
}

addAuthInterceptors(api);
addAuthInterceptors(adminApi);
