import React, { createContext, useState, useContext, useEffect } from "react";
import { base44, localBase44AuthEvent } from "@/api/base44Client";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({ mode: "local" });

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setIsLoadingAuth(true);
      setAuthError(null);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAppPublicSettings({ mode: "local", auth_required: false });
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({
        type: "unknown",
        message: error.message || "Falha ao carregar usuário local",
      });
    } finally {
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    checkAppState();

    if (typeof window === "undefined") {
      return undefined;
    }

    const handleAuthChange = () => {
      checkAppState();
    };

    window.addEventListener(localBase44AuthEvent, handleAuthChange);
    return () => window.removeEventListener(localBase44AuthEvent, handleAuthChange);
  }, []);

  const logout = () => {
    base44.auth.logout();
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin();
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
      logout,
      navigateToLogin,
      checkAppState,
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
