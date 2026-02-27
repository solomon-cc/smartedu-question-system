
import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { Role } from '../types';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, BookOpen, Clock, BarChart2, PlusCircle, Settings, Users, ClipboardList, Sun, Moon, Languages, ShieldCheck, FileText, AlertTriangle, HelpCircle, User as UserIcon, LogOut } from 'lucide-react';
import { ProfileModal } from './ProfileModal';

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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const getMenuItems = () => {
    if (auth?.user?.role === Role.STUDENT) {
      return [
        { icon: Home, label: '首页', labelEn: 'Home', path: '/' },
        { icon: ClipboardList, label: '家庭作业', labelEn: 'Homework', path: '/homework' },
        { icon: Clock, label: '答题历史', labelEn: 'History', path: '/history' },
        { icon: AlertTriangle, label: '错题本', labelEn: 'Mistakes', path: '/wrong-book' },
        { icon: BarChart2, label: '统计分析', labelEn: 'Stats', path: '/stats' },
        { icon: HelpCircle, label: '帮助文档', labelEn: 'Help', path: '/help' },
      ];
    }
    if (auth?.user?.role === Role.TEACHER) {
      return [
        { icon: Home, label: '控制台', labelEn: 'Dashboard', path: '/' },
        { icon: Users, label: '学生管理', labelEn: 'Students', path: '/students' },
        { icon: BookOpen, label: '题目管理', labelEn: 'Questions', path: '/questions' },
        { icon: ClipboardList, label: '素材管理', labelEn: 'Resource Assets', path: '/resources' },
        { icon: ClipboardList, label: '试卷管理', labelEn: 'Papers', path: '/papers' },
        { icon: PlusCircle, label: '作业管理', labelEn: 'HW Management', path: '/assign' },
        { icon: Settings, label: '强化物管理', labelEn: 'Reinforcements', path: '/reinforcements' },
        { icon: HelpCircle, label: '帮助文档', labelEn: 'Help', path: '/help' },
      ];
    }
    if (auth?.user?.role === Role.ADMIN) {
      return [
        { icon: Home, label: '控制台', labelEn: 'Dashboard', path: '/' },
        { icon: Users, label: '用户管理', labelEn: 'Users', path: '/users' },
        { icon: ShieldCheck, label: '作业审计', labelEn: 'Homework Audit', path: '/admin/audit' },
        { icon: FileText, label: '审计日志', labelEn: 'Audit Logs', path: '/logs' },
        { icon: Settings, label: '系统配置', labelEn: 'System Config', path: '/admin/config' },
        { icon: Settings, label: '权限设置', labelEn: 'Permissions', path: '/permissions' },
        { icon: HelpCircle, label: '帮助文档', labelEn: 'Help', path: '/help' },
      ];
    }
    return [];
  };

  const menuItems = getMenuItems() || [];

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
        border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0 overflow-y-auto
      `}>
        <div className="p-6 flex justify-between items-center border-b dark:border-gray-700 shrink-0">
          <Link to="/" className="text-xl font-bold text-primary-600">一粒麦子</Link>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden">
            <X className="w-6 h-6 dark:text-gray-300" />
          </button>
        </div>

        <nav className="mt-6 px-4 space-y-2">
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
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900 h-screen overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shrink-0 shadow-sm z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 lg:hidden hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 dark:text-gray-300" />
            </button>
            <div className="hidden lg:block">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                {menuItems.find(item => item.path === location.pathname)?.label || '一粒麦子'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* User Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-gray-100 dark:border-gray-700 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate max-w-[100px]">
                    {auth?.user?.name || auth?.user?.username}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium">
                    {auth?.user?.role}
                  </p>
                </div>
              </button>

              {isUserMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 animate-in fade-in zoom-in duration-200 origin-top-right">
                    <button 
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsProfileOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      个人中心
                    </button>
                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                    <button 
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        auth?.logout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <ProfileModal 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={auth?.user}
        onUpdate={(updatedUser) => {
          auth?.updateUser({
            name: updatedUser.name
          });
        }}
      />
    </div>
  );
};

export default Layout;
