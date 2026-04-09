import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = "access_token";
const TOKEN_COOKIE_NAME = "access_token";
const TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24;

type DecodedAccessToken = {
  exp?: number;
  role?: "student" | "admin";
};

const readCookieValue = (cookieName: string) => {
  if (typeof document === "undefined") {
    return null;
  }

  const encodedPrefix = `${encodeURIComponent(cookieName)}=`;
  const cookieEntry = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(encodedPrefix));

  if (!cookieEntry) {
    return null;
  }

  return decodeURIComponent(cookieEntry.slice(encodedPrefix.length));
};

export const readAuthToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const localToken = localStorage.getItem(TOKEN_KEY);
  const cookieToken = readCookieValue(TOKEN_COOKIE_NAME);
  const candidate = [localToken, cookieToken].find(
    (token) => typeof token === "string" && token && !isAuthTokenExpired(token)
  );

  if (!candidate) {
    clearAuthToken();
    return null;
  }

  persistAuthToken(candidate);
  return candidate;
};

export const decodeAuthToken = (token: string): DecodedAccessToken | null => {
  try {
    return jwtDecode<DecodedAccessToken>(token);
  } catch {
    return null;
  }
};

export const isAuthTokenExpired = (token: string, bufferSeconds = 15) => {
  const decoded = decodeAuthToken(token);
  if (!decoded?.exp) {
    return false;
  }

  return decoded.exp <= Math.floor(Date.now() / 1000) + bufferSeconds;
};

export const persistAuthToken = (token: string) => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
  const secureSuffix = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${TOKEN_COOKIE_MAX_AGE}; SameSite=Lax${secureSuffix}`;
};

export const clearAuthToken = () => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
};
