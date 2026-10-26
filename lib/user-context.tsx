"use client";
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
export type User = { name: string } | null;
interface UserContextValue {
  user: User;
  login: (user: User) => void;
  logout: () => void;
}
const UserContext = createContext<UserContextValue | null>(null);
// Sesión guardada en localStorage, leída como store externo (sin setState en efectos).
const STORAGE_KEY = "av_user";
const listeners = new Set<() => void>();
let memoryUser: string | null = null; // respaldo si localStorage no está disponible
function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return memoryUser;
  }
}
function writeStored(value: string | null) {
  memoryUser = value;
  try {
    if (value === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // localStorage unavailable — session stays in memory only
  }
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function UserProvider({ children }: { children: ReactNode }) {
  // En el servidor no hay sesión; el cliente la lee tras hidratar.
  const stored = useSyncExternalStore(subscribe, readStored, () => null);
  const user = useMemo<User>(() => {
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }, [stored]);
  const login = (u: User) => writeStored(u === null ? null : JSON.stringify(u));
  const logout = () => writeStored(null);
  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}
export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
