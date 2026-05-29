export const enum StorageTypes {
  LOCAL = "localStorage",
  COOKIES = "cookies",
  SESSION = "session",
}

export type TStorageType =
  | StorageTypes.LOCAL
  | StorageTypes.COOKIES
  | StorageTypes.SESSION;

const Storage = (function storageUtil() {
  const isClient = globalThis.window !== undefined;

  const setStorageData = (value: string, type: TStorageType, key: string) => {
    if (!isClient) return;
    if (type === StorageTypes.LOCAL) {
      localStorage.setItem(key, value);
      return;
    }
    if (type === StorageTypes.COOKIES) {
      setCookie(key, value);
      return;
    }
    sessionStorage.setItem(key, value);
  };

  const getStorageData = (type: TStorageType, key: string): string | null => {
    if (!isClient) return null;
    if (type === StorageTypes.LOCAL) {
      return localStorage.getItem(key);
    }
    if (type === StorageTypes.COOKIES) {
      return getCookie(key);
    }
    return sessionStorage.getItem(key);
  };

  const remove = (type: TStorageType, key: string) => {
    if (!isClient) return;
    if (type === StorageTypes.LOCAL) {
      localStorage.removeItem(key);
      return;
    }
    if (type === StorageTypes.COOKIES) {
      clearCookie(key);
      return;
    }
    sessionStorage.removeItem(key);
  };

  /** Wipes every key in `localStorage`, `sessionStorage`, and every cookie visible to `document.cookie` (httpOnly cookies are not reachable from JS). */
  const clearAllStorageTypes = (): void => {
    if (!isClient) return;
    localStorage.clear();
    sessionStorage.clear();
    clearAllCookies();
  };

  return {
    setStorageData,
    getStorageData,
    remove,
    clearAllStorageTypes,
  };
})();

export default Storage;

function setCookie(
  name: string,
  value: string,
  domain?: string,
  daysToExpire = 50000,
): void {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + daysToExpire);
  let cookieString = `${name}=${encodeURIComponent(value)}; expires=${expirationDate.toUTCString()}; path=/`;
  if (domain) {
    cookieString += `; domain=${domain}`;
  }
  document.cookie = cookieString;
}

function getCookie(name: string): string | null {
  const cookies = document.cookie.split(";");
  for (const element of cookies) {
    const cookie = element.trim();
    if (cookie.startsWith(`${name}=`)) {
      return decodeURIComponent(cookie.substring(name.length + 1));
    }
  }
  return null;
}

function clearCookie(name: string, domain?: string): void {
  if (typeof document === "undefined") return;

  let cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  if (domain) {
    cookie += ` domain=${domain};`;
  }

  document.cookie = cookie;
}

function clearAllCookies(): void {
  if (typeof document === "undefined") return;
  const pairs = document.cookie.split(";");
  for (const element of pairs) {
    const trimmed = element.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    const name = (eq === -1 ? trimmed : trimmed.slice(0, eq)).trim();
    if (name) {
      clearCookie(name);
    }
  }
}
