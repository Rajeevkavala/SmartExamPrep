import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

import { toast } from "@/components/ui/use-toast";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "token";
const AUTH_STORE_KEY = "auth-store";
const AUTH_COOKIE_KEY = "token";

type RetryableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
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

const getErrorDescription = (error: AxiosError): string => {
  const responseData = error.response?.data;

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }

  if (responseData && typeof responseData === "object") {
    const detail = (responseData as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
  }

  return error.message || "Unexpected error while calling the API.";
};

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { "Content-Type": "application/json" },
});

export const adminApi = axios.create({
  baseURL: `${BASE_URL}/api/admin`,
  headers: { "Content-Type": "application/json" },
});

export function addAuthInterceptors(instance: AxiosInstance) {
  instance.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        if (
          config.headers &&
          typeof (config.headers as { set?: unknown }).set === "function"
        ) {
          (config.headers as { set: (name: string, value: string) => void }).set(
            "Authorization",
            `Bearer ${token}`
          );
        } else {
          config.headers = {
            ...(config.headers ?? {}),
            Authorization: `Bearer ${token}`,
          } as InternalAxiosRequestConfig["headers"];
        }
      }
    }

    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const status = error.response?.status;
      const requestConfig = error.config as RetryableConfig | undefined;

      if (
        status &&
        status >= 500 &&
        status < 600 &&
        requestConfig &&
        !requestConfig._retry
      ) {
        requestConfig._retry = true;
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