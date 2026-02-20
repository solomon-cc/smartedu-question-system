
import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { Lock, User as UserIcon, AlertCircle } from 'lucide-react';

interface LoginProps {
  language: 'zh' | 'en';
}

const Login: React.FC<LoginProps> = ({ language }) => {
  const auth = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      if (auth) {
        const success = await auth.login(username, password);
        if (!success) {
          setError(true);
          setTimeout(() => setError(false), 3000);
        }
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-primary-950">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 transition-all relative overflow-hidden">
        {/* Decor */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-primary-600 mb-2 tracking-tight">SmartEdu</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {language === 'zh' ? '欢迎回来，请登录您的账户' : 'Welcome back, please log in'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-in slide-in-from-top-4 duration-300">
              <AlertCircle className="w-5 h-5" />
              <p className="text-xs font-bold uppercase tracking-wide">
                {language === 'zh' ? '用户名或密码错误' : 'Invalid username or password'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
              {language === 'zh' ? '用户名' : 'Username'}
            </label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl border dark:border-gray-700 dark:bg-gray-900 focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none font-bold dark:text-white"
                placeholder={language === 'zh' ? '输入您的名字' : 'Enter your name'}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
              {language === 'zh' ? '密码' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl border dark:border-gray-700 dark:bg-gray-900 focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none font-bold dark:text-white"
                placeholder={language === 'zh' ? '输入您的密码' : 'Enter your password'}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-primary-600/30 transition-all active:scale-[0.98] uppercase tracking-widest"
          >
            {language === 'zh' ? '立即登录' : 'Log In Now'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
