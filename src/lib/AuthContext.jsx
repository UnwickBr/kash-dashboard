import React, { createContext, useState, useContext, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({ mode: "vercel-neon" });

  const refreshSession = async () => {
    if (!base44.auth.getToken()) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthError(null);
      return;
    }

    try {
      setIsLoadingAuth(true);
      setAuthError(null);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({
        type: error.status === 401 ? "auth_required" : "unknown",
        message: error.message || "Falha ao carregar sessão.",
      });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const login = async ({ email, password }) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const currentUser = await base44.auth.login({ email, password });
      setUser(currentUser);
      setIsAuthenticated(true);
      return currentUser;
    } catch (error) {
      setAuthError({
        type: error.status === 401 ? "auth_required" : "unknown",
        message: error.message || "Não foi possível entrar.",
      });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const loginWithGoogle = async (payload) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const currentUser = await base44.auth.loginWithGoogle(payload);
      setUser(currentUser);
      setIsAuthenticated(true);
      return currentUser;
    } catch (error) {
      setAuthError({
        type: error.status === 401 ? "auth_required" : "unknown",
        message: error.message || "Não foi possível entrar com Google.",
      });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const register = async ({ fullName, email, password, birthDate }) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const currentUser = await base44.auth.register({ fullName, email, password, birthDate });
      setUser(currentUser);
      setIsAuthenticated(true);
      return currentUser;
    } catch (error) {
      setAuthError({
        type: "unknown",
        message: error.message || "Não foi possível criar a conta.",
      });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    await base44.auth.logout();
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
  };

  const updateProfile = async (payload) => {
    const updatedUser = await base44.auth.updateProfile(payload);
    setUser(updatedUser);
    return updatedUser;
  };

  const changePassword = async (payload) => {
    return base44.auth.changePassword(payload);
  };

  const cancelSubscription = async () => {
    const result = await base44.auth.cancelSubscription();
    if (result?.user) {
      setUser(result.user);
    } else {
      await refreshSession();
    }
    return result;
  };

  const navigateToLogin = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      currentUser: user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      login,
      loginWithGoogle,
      register,
      updateProfile,
      changePassword,
      cancelSubscription,
      logout,
      navigateToLogin,
      checkAppState: refreshSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
