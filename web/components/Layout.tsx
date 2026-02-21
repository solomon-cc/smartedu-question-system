
import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { Role } from '../types';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, BookOpen, Clock, BarChart2, PlusCircle, Settings, Users, ClipboardList, Sun, Moon, Languages, ShieldCheck, FileText } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  language: 'zh' | 'en';
  setLanguage: (lang: 'zh' | 'en') => void;
  themeMode: 'light' | 'dark' | 'auto';
  setThemeMode: (mode: 'light' | 'dark' | 'auto') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, language, setLanguage, themeMode, setThemeMode }) => {
  const auth = useContext(AuthContext);
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const getMenuItems = () => {
    if (auth?.user?.role === Role.STUDENT) {
      return [
        { icon: Home, label: '首页', labelEn: 'Home', path: '/' },
        { icon: ClipboardList, label: '家庭作业', labelEn: 'Homework', path: '/homework' },
        { icon: Clock, label: '答题历史', labelEn: 'History', path: '/history' },
        { icon: BarChart2, label: '统计分析', labelEn: 'Stats', path: '/stats' },
      ];
    }
    if (auth?.user?.role === Role.TEACHER) {
      return [
        { icon: Home, label: '控制台', labelEn: 'Dashboard', path: '/' },
        { icon: BookOpen, label: '题目管理', labelEn: 'Questions', path: '/questions' },
        { icon: ClipboardList, label: '素材管理', labelEn: 'Resource Assets', path: '/resources' },
        { icon: ClipboardList, label: '试卷管理', labelEn: 'Papers', path: '/papers' },
        { icon: PlusCircle, label: '作业管理', labelEn: 'HW Management', path: '/assign' },
        { icon: Settings, label: '强化物管理', labelEn: 'Reinforcements', path: '/reinforcements' },
      ];
    }
    if (auth?.user?.role === Role.ADMIN) {
      return [
        { icon: Home, label: '控制台', labelEn: 'Dashboard', path: '/' },
        { icon: Users, label: '用户管理', labelEn: 'Users', path: '/users' },
        { icon: ShieldCheck, label: '作业审计', labelEn: 'Homework Audit', path: '/admin/audit' },
        { icon: FileText, label: '审计日志', labelEn: 'Audit Logs', path: '/logs' },
        { icon: Settings, label: '权限设置', labelEn: 'Permissions', path: '/permissions' },
      ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 h-screen w-64 bg-white dark:bg-gray-800 transform transition-transform duration-300 z-50
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0
      `}>
        <div className="p-6 flex justify-between items-center border-b dark:border-gray-700 shrink-0">
          <Link to="/" className="text-xl font-bold text-primary-600">一粒麦子</Link>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden">
            <X className="w-6 h-6 dark:text-gray-300" />
          </button>
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-2 overflow-y-auto scrollbar-thin">
          {menuItems.map((item, idx) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={idx}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 
                  ${isActive 
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400'}
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{language === 'zh' ? item.label : item.labelEn}</span>
              </Link>
            );
          })}
        </nav>

        {/* Action Controls in Sidebar Bottom */}
        <div className="p-4 border-t dark:border-gray-700 space-y-3 shrink-0">
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
              className="flex items-center justify-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors dark:text-white"
            >
              <Languages className="w-4 h-4" />
              {language === 'zh' ? 'Language: English' : '语言: 中文'}
            </button>
            
            <div className="flex bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-1">
               <button 
                 onClick={() => setThemeMode('light')}
                 className={`flex-1 flex justify-center py-1 rounded-md transition-all ${themeMode === 'light' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600' : 'text-gray-400'}`}
                 title="Light Mode"
               >
                 <Sun className="w-4 h-4" />
               </button>
               <button 
                 onClick={() => setThemeMode('dark')}
                 className={`flex-1 flex justify-center py-1 rounded-md transition-all ${themeMode === 'dark' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600' : 'text-gray-400'}`}
                 title="Dark Mode"
               >
                 <Moon className="w-4 h-4" />
               </button>
               <button 
                 onClick={() => setThemeMode('auto')}
                 className={`flex-1 flex justify-center py-1 rounded-md text-[10px] font-bold transition-all ${themeMode === 'auto' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600' : 'text-gray-400'}`}
                 title="Auto"
               >
                 {language === 'zh' ? '自动' : 'AUTO'}
               </button>
            </div>
          </div>
          <button 
            onClick={auth?.logout}
            className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition-colors text-sm font-bold"
          >
            退出登录
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900 h-screen">
        <header className="h-16 lg:hidden flex items-center px-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Menu className="w-6 h-6 dark:text-gray-300" />
          </button>
          <span className="ml-4 font-bold text-primary-600">一粒麦子</span>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
