import React, { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import config from '../config';

// Erstelle Auth-Kontext
const AuthContext = createContext();

// Auth-Provider-Komponente
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);

  // Beim Laden der App prüfen, ob ein Token im localStorage vorhanden ist
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const response = await axios.post(`${config.authUrl}/verify`, { token });
          if (response.status === 200) {
            setUser({
              ...JSON.parse(localStorage.getItem('user')),
              token
            });
            setToken(token);
            setAuthenticated(true);
          } else {
            // Token ist ungültig, aus localStorage entfernen
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
          }
        } catch (err) {
          console.error('Fehler bei der Token-Überprüfung:', err);
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Token verifizieren
  const verifyToken = async (token) => {
    try {
      const response = await axios.post(`${config.authUrl}/verify`, { token });
      return response.data.valid;
    } catch (error) {
      console.error('Fehler bei der Token-Verifizierung:', error);
      return false;
    }
  };

  // Benutzer einloggen
  const login = async (username, password) => {
    try {
      setError('');
      setLoading(true);
      const response = await axios.post(`${config.authUrl}/login`, { username, password });
      
      const { token, user } = response.data;
      
      // Token und Benutzer im localStorage speichern
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // State aktualisieren
      setToken(token);
      setUser(user);
      setAuthenticated(true);
      setLoading(false);
      
      return true;
    } catch (error) {
      console.error('Fehler beim Login:', error);
      setError('Fehler bei der Anmeldung. Bitte überprüfen Sie Ihre Zugangsdaten.');
      setLoading(false);
      return false;
    }
  };

  // Benutzer ausloggen
  const logout = async () => {
    try {
      if (token) {
        await axios.post(`${config.authUrl}/logout`, { token });
      }
    } catch (error) {
      console.error('Fehler beim Logout:', error);
    } finally {
      // Token und Benutzer aus localStorage entfernen
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      // State zurücksetzen
      setToken(null);
      setUser(null);
      setAuthenticated(false);
    }
  };

  // Auth-Header für API-Anfragen
  const getAuthHeader = () => {
    const token = localStorage.getItem('authToken');
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
