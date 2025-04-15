import React, { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';

// Erstelle Auth-Kontext
const AuthContext = createContext();

// Auth-Provider-Komponente
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Beim Laden der App prüfen, ob ein Token im localStorage vorhanden ist
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.post('http://localhost:8082/api/auth/verify', { token });
          if (response.status === 200) {
            setUser({
              ...response.data.user,
              token
            });
          } else {
            // Token ist ungültig, aus localStorage entfernen
            localStorage.removeItem('token');
          }
        } catch (err) {
          console.error('Fehler bei der Token-Überprüfung:', err);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Login-Funktion
  const login = async (username, password) => {
    try {
      setError('');
      const response = await axios.post('http://localhost:8082/api/auth/login', { username, password });
      if (response.status === 200) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        setUser({
          ...user,
          token
        });
        return true;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Anmeldefehler');
      return false;
    }
  };

  // Logout-Funktion
  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await axios.post('http://localhost:8082/api/auth/logout', { token });
      }
    } catch (err) {
      console.error('Fehler beim Logout:', err);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  // Auth-Header für API-Anfragen
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Prüfen, ob Benutzer angemeldet ist
  const isAuthenticated = () => {
    return !!user;
  };

  // Prüfen, ob Benutzer Admin ist
  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        getAuthHeader,
        isAuthenticated,
        isAdmin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook für einfachen Zugriff auf den Auth-Kontext
export const useAuth = () => {
  return useContext(AuthContext);
};
