const TOKEN_KEY = "access_token";
const TOKEN_COOKIE_NAME = "access_token";

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

  return localStorage.getItem(TOKEN_KEY) ?? readCookieValue(TOKEN_COOKIE_NAME);
};
