"use client";

/**
 * BayFlow Cookie-based Authentication Management
 * Replaces localStorage with secure browser cookies.
 */

export function setCookie(name: string, value: string, days = 7) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;

  // Explicitly remove from localStorage to ensure token is not retained in local storage
  try {
    localStorage.removeItem(name);
  } catch (e) {}
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"));
  if (match) {
    return decodeURIComponent(match[2]);
  }

  // Graceful migration fallback: If found in legacy localStorage, migrate to cookie and delete from localStorage
  try {
    const legacy = localStorage.getItem(name);
    if (legacy) {
      setCookie(name, legacy, 7);
      localStorage.removeItem(name);
      return legacy;
    }
  } catch (e) {}

  return null;
}

export function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
  try {
    localStorage.removeItem(name);
  } catch (e) {}
}

// Named Auth Helpers
export const getAuthToken = (): string | null => getCookie("bayflow_token");
export const setAuthToken = (token: string): void => setCookie("bayflow_token", token);
export const clearAuthToken = (): void => {
  deleteCookie("bayflow_token");
  deleteCookie("bayflow_user_role");
};

export const getAuthRole = (): string | null => getCookie("bayflow_user_role");
export const setAuthRole = (role: string): void => setCookie("bayflow_user_role", role);
export const clearAuthRole = (): void => deleteCookie("bayflow_user_role");
