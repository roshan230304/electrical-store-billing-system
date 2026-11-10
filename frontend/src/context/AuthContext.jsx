import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('apexbill_token') || localStorage.getItem('vyapar_token'));
  const [business, setBusiness] = useState({
    business_name: 'Electrical Store',
    phone_number: '',
    gstin: '',
    email: '',
    state: '',
    business_address: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (token) {
          const res = await api.getMe();
          if (res.success) {
            setUser(res.user);
            if (res.user.business) {
              setBusiness(res.user.business);
            }
          } else {
            logout();
          }
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
    loadBusinessProfile();
  }, [token]);

  const loadBusinessProfile = async () => {
    try {
      const res = await api.getBusinessProfile();
      if (res.success && res.data) {
        setBusiness(res.data);
      }
    } catch (err) {
      console.error('Failed to load business profile:', err);
    }
  };

  const login = async (username, password) => {
    const res = await api.login(username, password);
    if (res.success) {
      localStorage.setItem('apexbill_token', res.token);
      localStorage.removeItem('vyapar_token');
      setToken(res.token);
      setUser(res.user);
      if (res.user.business) {
        setBusiness(res.user.business);
      }
      return { success: true };
    }
    return { success: false, message: res.message || 'Login failed' };
  };

  const logout = () => {
    localStorage.removeItem('apexbill_token');
    localStorage.removeItem('vyapar_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      business,
      loading,
      login,
      logout,
      refreshBusiness: loadBusinessProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
