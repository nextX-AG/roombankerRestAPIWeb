import React, { useState, useEffect, createContext, useContext } from 'react';
import config, { API_VERSION } from '../config';
import { authApi } from '../api'; // Importiere den zentralen API-Client

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
      const storedToken = localStorage.getItem('authToken');
      if (storedToken) {
        try {
          // Verwende den zentralen API-Client
          const response = await authApi.status();
          
          if (response.status === 'success') {
            // Token ist gültig
            const storedUser = JSON.parse(localStorage.getItem('user'));
            setUser(storedUser);
            setToken(storedToken);
            setAuthenticated(true);
          } else {
            // Token ist ungültig, aus localStorage entfernen
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
          }
        } catch (err) {
          console.error('Fehler bei der Token-Überprüfung:', err);
          // Bei CORS-Fehlern spezifische Fehlermeldung
          if (err.message && err.message.includes('CORS')) {
            setError('CORS-Fehler: Probleme mit der API-Verbindung. Bitte kontaktieren Sie den Administrator.');
          }
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
      const response = await authApi.status();
      return response.status === 'success';
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
      
      console.log(`Versuche Login mit Benutzername: ${username}`);
      
      // Verwende den zentralen API-Client für Login
      const response = await authApi.login(username, password);
      
      if (response.status === 'success') {
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
      } else {
        throw new Error(response.error?.message || 'Anmeldung fehlgeschlagen');
      }
    } catch (error) {
      console.error('Fehler beim Login:', error);
      
      // Spezifische Fehlermeldungen je nach Fehlertyp
      if (error.message && error.message.includes('CORS')) {
        setError('CORS-Fehler: Probleme mit der API-Verbindung. Bitte kontaktieren Sie den Administrator.');
      } else {
        setError('Fehler bei der Anmeldung. Bitte überprüfen Sie Ihre Zugangsdaten.');
      }
      
      setLoading(false);
      return false;
    }
  };

  // Benutzer ausloggen
  const logout = async () => {
    try {
      if (token) {
        await authApi.logout();
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
export const useAuth = () => useContext(AuthContext);
