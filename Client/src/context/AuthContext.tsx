import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  department: string;
  isAdmin: boolean;
  role: string;
}

interface AuthContextType {
  currentUser: User | null;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored token and user data on mount
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        console.log('Loaded user from storage:', user);
        setCurrentUser(user);
      } catch (err) {
        console.error('Error parsing stored user:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    setLoading(false);
  }, []);

  const login = async (user: User) => {
    console.log('Login called with user:', user);
    console.log('isAdmin value:', user.isAdmin, 'Type:', typeof user.isAdmin);
    console.log('role value:', user.role);
    
    // Ensure isAdmin is a boolean
    const userWithBooleanAdmin = {
      ...user,
      isAdmin: Number(user.isAdmin) === 1
    };
    
    console.log('Processed user data:', userWithBooleanAdmin);
    
    setCurrentUser(userWithBooleanAdmin);
    localStorage.setItem('user', JSON.stringify(userWithBooleanAdmin));
  };

  const logout = async () => {
    console.log('Logout called');
    setCurrentUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = {
    currentUser,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};