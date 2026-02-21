import React, { useState, useEffect, createContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User } from './types';
import { api } from './services/api.ts';
import { isTokenExpired } from './utils.ts';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import PracticeSession from './views/Student/PracticeSession';
import Homework from './views/Student/Homework';
import History from './views/Student/History';
import Stats from './views/Student/Stats';
import Questions from './views/Teacher/Questions';
import Papers from './views/Teacher/Papers';
import Assign from './views/Teacher/Assign';
import Reinforcements from './views/Teacher/Reinforcements';
import Resources from './views/Teacher/Resources';
import Users from './views/Admin/Users';
import Permissions from './views/Admin/Permissions';
import AuditLogs from './views/Admin/AuditLogs';
import HomeworkAudit from './views/Admin/HomeworkAudit';
import Layout from './components/Layout';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>('light');
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');

  const getEffectiveDarkMode = (mode: 'light' | 'dark' | 'auto') => {
    if (mode === 'auto') {
      const hour = new Date().getHours();
      return hour >= 18 || hour < 6; // Dark mode from 6 PM to 6 AM
    }
    return mode === 'dark';
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'auto';
    
    if (savedTheme) {
      setThemeMode(savedTheme);
    }

    if (savedUser) {
      try {
         const parsed = JSON.parse(savedUser);
         if (isTokenExpired(parsed.token)) {
           localStorage.removeItem('user');
           setUser(null);
         } else {
           setUser(parsed);
         }
      } catch (e) {
         localStorage.removeItem('user');
      }
    }
  }, []);

  useEffect(() => {
    const effectiveDark = getEffectiveDarkMode(themeMode);
    if (effectiveDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', themeMode);
  }, [themeMode]);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const { user, token } = await api.auth.login(username, password);
      const userWithToken = { ...user, token };
      setUser(userWithToken);
      localStorage.setItem('user', JSON.stringify(userWithToken));
      return true;
    } catch (error) {
      console.error("Login failed", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const effectiveDarkMode = getEffectiveDarkMode(themeMode);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <HashRouter>
        <div className={`min-h-screen ${effectiveDarkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
          <Routes>
            <Route path="/login" element={!user ? <Login language={language} /> : <Navigate to="/" />} />
            
            <Route element={user ? (
              <Layout 
                language={language} 
                setLanguage={setLanguage} 
                themeMode={themeMode} 
                setThemeMode={setThemeMode}
              >
                <Routes>
                  <Route path="/" element={<Dashboard language={language} />} />
                  <Route path="/homework" element={<Homework language={language} />} />
                  <Route path="/history" element={<History language={language} />} />
                  <Route path="/stats" element={<Stats language={language} />} />
                  <Route path="/questions" element={<Questions language={language} />} />
                  <Route path="/papers" element={<Papers language={language} />} />
                  <Route path="/assign" element={<Assign language={language} />} />
                  <Route path="/reinforcements" element={<Reinforcements language={language} />} />
                  <Route path="/resources" element={<Resources language={language} />} />
                  <Route path="/users" element={<Users language={language} />} />
                  <Route path="/logs" element={<AuditLogs language={language} />} />
                  <Route path="/permissions" element={<Permissions language={language} />} />
                  <Route path="/admin/audit" element={<HomeworkAudit language={language} />} />
                </Routes>
              </Layout>
            ) : <Navigate to="/login" />}>
              <Route path="*" />
            </Route>

            <Route path="/practice" element={user?.role === 'STUDENT' ? <PracticeSession language={language} /> : <Navigate to="/" />} />
          </Routes>
        </div>
      </HashRouter>
    </AuthContext.Provider>
  );
};

export default App;