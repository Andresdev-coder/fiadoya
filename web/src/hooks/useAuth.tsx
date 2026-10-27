import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import { api, tokenStore } from "../api/client";
import type { AuthResponse, User } from "../api/types";

type RegisterInput = {
  storeName: string;
  name: string;
  email: string;
  password: string;
};
type RecoverInput = {
  email: string;
  recoveryCode: string;
  newPassword: string;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  recoverPassword: (input: RecoverInput) => Promise<void>;
  issueRecoveryCode: (password: string) => Promise<string>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => tokenStore.get() !== null);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  // Al abrir la app, recuperar la sesión si hay token guardado.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.addEventListener("auth:logout", logout);
    return () => window.removeEventListener("auth:logout", logout);
  }, [logout]);

  const start = (res: AuthResponse) => {
    tokenStore.set(res.token);
    setUser(res.user);
  };

  const login = async (email: string, password: string) =>
    start(
      await api<AuthResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      }),
    );

  const register = async (input: RegisterInput) =>
    start(
      await api<AuthResponse>("/auth/register", {
        method: "POST",
        body: input,
      }),
    );

  // Cambiar o recuperar la contraseña cierra las otras sesiones: la API devuelve un token nuevo para esta.
  const changePassword = async (currentPassword: string, newPassword: string) =>
    start(
      await api<AuthResponse>("/auth/change-password", {
        method: "POST",
        body: { currentPassword, newPassword },
      }),
    );

  const recoverPassword = async (input: RecoverInput) =>
    start(
      await api<AuthResponse>("/auth/recover", { method: "POST", body: input }),
    );

  const issueRecoveryCode = async (password: string) => {
    const res = await api<{ recoveryCode: string }>("/auth/recovery-code", {
      method: "POST",
      body: { password },
    });
    setUser(await api<User>("/auth/me")); // refresca hasRecoveryCode
    return res.recoveryCode;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        changePassword,
        recoverPassword,
        issueRecoveryCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
