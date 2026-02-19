'use client';

let memoryToken: string | null = null;

const STORAGE_KEY = 'ventasve_access_token';

export const getAccessToken = () => {
  if (typeof window === 'undefined') {
    return memoryToken;
  }
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value || null;
  } catch {
    return memoryToken;
  }
};

export const setAccessToken = (token: string | null) => {
  memoryToken = token;
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (!token) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, token);
    }
  } catch {
  }
};

