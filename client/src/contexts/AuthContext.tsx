import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, workspacesApi } from "../lib/trpc";

type User = { id: number; name: string; email: string; role: string } | null;

interface AuthContextValue {
  user: User;
  workspaceId: number | null;
  loading: boolean;
  onboardingCompleted: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, organizationName?: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  workspaceId: null,
  loading: true,
  onboardingCompleted: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  error: null,
  clearError: () => {},
});

async function fetchWorkspaceId(): Promise<number | null> {
  try {
    const result = (await workspacesApi.bootstrap()) as {
      workspaces: Array<{
        workspace: {
          id: number;
          name: string;
        };
      }>;
    };
    return result.workspaces?.[0]?.workspace?.id ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading: authLoading } = useQuery({
    queryKey: ["auth.me"],
    queryFn: () => authApi.me() as Promise<User>,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (authLoading) return;
    const nextUser = data ?? null;
    setUser(nextUser);
    if (nextUser) {
      (async () => {
        const wid = await fetchWorkspaceId();
        setWorkspaceId(wid);
        setLoading(false);
      })();
    } else {
      setWorkspaceId(null);
      setLoading(false);
    }
  }, [data, authLoading]);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const result = (await authApi.login({ email, password })) as User;
      setUser(result);
      queryClient.setQueryData(["auth.me"], result);
      const wid = await fetchWorkspaceId();
      setWorkspaceId(wid);
      setLoading(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      throw err;
    }
  };

  const register = async (name: string, email: string, password: string, organizationName?: string) => {
    try {
      setError(null);
      const result = (await authApi.register({ name, email, password, organizationName })) as User;
      setUser(result);
      queryClient.setQueryData(["auth.me"], result);
      const wid = await fetchWorkspaceId();
      setWorkspaceId(wid);
      setLoading(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch { /* ignore */ }
    setUser(null);
    setWorkspaceId(null);
    setLoading(false);
    queryClient.setQueryData(["auth.me"], null);
    queryClient.clear();
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaceId,
        loading,
        onboardingCompleted: true,
        login,
        register,
        logout,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
