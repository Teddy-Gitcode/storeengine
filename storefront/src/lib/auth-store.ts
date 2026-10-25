"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  apiGoogle,
  apiLogin,
  apiLogout,
  apiMe,
  apiRegister,
  apiUpdateMe,
  apiVerifyEmail,
  type CustomerUser,
} from "@/lib/account-api";

export type User = CustomerUser & { initials: string };

type AuthState = {
  user: User | null;
  hydrated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<User>;
  loginWithGoogle: (credential: string) => Promise<User>;
  /** Creates the account and sends a code. Nobody is signed in yet — the
   *  address has to answer first — so this returns where to send them. */
  register: (payload: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    marketing_opt_in?: boolean;
  }) => Promise<{ email: string }>;
  /** The last step of signing in: the right code issues the session. */
  verifyEmail: (email: string, code: string) => Promise<{ user: User; ordersLinked: number }>;
  updateProfile: (payload: { name?: string; phone?: string; marketing_opt_in?: boolean }) => Promise<User>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

function deriveInitials(name: string, email: string) {
  const source = name?.trim() || email.split("@")[0] || "K";
  return source
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("") || "K";
}

function toUser(u: CustomerUser): User {
  return { ...u, initials: deriveInitials(u.name, u.email) };
}

/** Registered by wishlist-store so a fresh login can merge guest items to the server. */
const loginListeners: Array<() => void> = [];
export function onLogin(listener: () => void) {
  loginListeners.push(listener);
}
function notifyLogin() {
  for (const listener of loginListeners) listener();
}

/** The mirror image: stores holding account-owned data drop it on sign-out. */
const logoutListeners: Array<() => void> = [];
export function onLogout(listener: () => void) {
  logoutListeners.push(listener);
}
function notifyLogout() {
  for (const listener of logoutListeners) listener();
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,
      login: async (email, password, remember = true) => {
        const { user } = await apiLogin(email, password, remember);
        const mapped = toUser(user);
        set({ user: mapped });
        notifyLogin();
        return mapped;
      },
      loginWithGoogle: async (credential) => {
        const { user } = await apiGoogle(credential);
        const mapped = toUser(user);
        set({ user: mapped });
        notifyLogin();
        return mapped;
      },
      register: async (payload) => {
        // The marketing choice rides along with the signup now. It used to be
        // written straight afterwards with the profile endpoint, which needs a
        // session — and there is no session here any more.
        const { email } = await apiRegister(payload);
        return { email: email || payload.email };
      },
      verifyEmail: async (email, code) => {
        const res = await apiVerifyEmail({ email, code });
        const mapped = toUser(res.user);
        set({ user: mapped });
        notifyLogin();
        return { user: mapped, ordersLinked: res.orders_linked ?? 0 };
      },
      updateProfile: async (payload) => {
        const user = toUser(await apiUpdateMe(payload));
        set({ user });
        return user;
      },
      refresh: async () => {
        try {
          set({ user: toUser(await apiMe()) });
        } catch {
          // Cookie missing or expired — make the UI match reality.
          set({ user: null });
          notifyLogout();
        }
      },
      signOut: async () => {
        set({ user: null });
        notifyLogout();
        await apiLogout().catch(() => undefined);
      },
    }),
    {
      name: "store-auth",
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);
