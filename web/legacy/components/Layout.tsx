
import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { Role } from '../types';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, BookOpen, Clock, BarChart2, PlusCircle, Target, Settings, Users, ClipboardList, Sun, Moon, Languages, ShieldCheck, FileText, AlertTriangle, HelpCircle, User as UserIcon, LogOut, Lock, Heart } from 'lucide-react';
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
    // 1. Define the module registry with default settings
    const registry: Record<string, any> = {
      'dashboard': { icon: Home, label: '首页', labelEn: 'Home', path: '/' },
      'skills_practice': { icon: Target, label: '开始练习', labelEn: 'Practice', path: '/skills' },
      'skills_homework': { icon: ClipboardList, label: '家庭作业', labelEn: 'Homework', path: '/homework' },
      'skills_history': { icon: Clock, label: '答题历史', labelEn: 'History', path: '/history' },
      'skills_wrongbook': { icon: AlertTriangle, label: '错题本', labelEn: 'Mistakes', path: '/wrong-book' },
      'skills_stats': { icon: BarChart2, label: '数据分析', labelEn: 'Stats', path: '/stats' },
      
      'application_games': { icon: Target, label: '场景游戏', labelEn: 'Games', path: '/application' },
      'assessment_history': { icon: ClipboardList, label: '历史评估', labelEn: 'History', path: '/assessment?view=history' },
      'mood_diary': { icon: Heart, label: '情绪日记', labelEn: 'Diary', path: '/mood-diary' },
      
      'students': { icon: Users, label: '学生管理', labelEn: 'Students', path: '/students' },
      'questions': { icon: BookOpen, label: '题目管理', labelEn: 'Questions', path: '/questions' },
      'resources': { icon: ClipboardList, label: '素材管理', labelEn: 'Resource Assets', path: '/resources' },
      'papers': { icon: ClipboardList, label: '试卷管理', labelEn: 'Papers', path: '/papers' },
      'assignments': { icon: PlusCircle, label: '作业管理', labelEn: 'Assignments', path: '/assign' },
      'ability_tracking': { icon: Target, label: '能力追踪', labelEn: 'Ability Tracking', path: '/ability-tracking' },
      'reinforcements': { icon: Settings, label: '强化物管理', labelEn: 'Reinforcements', path: '/reinforcements' },
      'users': { icon: Users, label: '用户管理', labelEn: 'Users', path: '/users' },
      'homework_audit': { icon: ShieldCheck, label: '作业审计', labelEn: 'Homework Audit', path: '/admin/audit' },
      'audit_logs': { icon: ShieldCheck, label: '审计日志', labelEn: 'Audit Logs', path: '/logs' },
      'system_config': { icon: Settings, label: '系统配置', labelEn: 'System Config', path: '/admin/config' },
      'permissions': { icon: Lock, label: '权限设置', labelEn: 'Permissions', path: '/permissions' },
      'help_docs': { icon: HelpCircle, label: '帮助文档', labelEn: 'Help', path: '/help' },
      'stats': { icon: BarChart2, label: '统计分析', labelEn: 'Stats', path: '/stats' },
    };

    // 2. Identify Current Sub-system for Students
    if (auth?.user?.role === Role.STUDENT) {
      const path = location.pathname;
      
      // Home Page - No bottom nav needed or show main categories
      if (path === '/' || path === '') {
        return []; 
      }

      // Determine Sub-system
      let subSystem = '';
      if (path.startsWith('/skills') || path === '/homework' || path === '/history' || path === '/wrong-book' || path === '/stats') {
        subSystem = 'skills';
      } else if (path.startsWith('/application')) {
        subSystem = 'application';
      } else if (path.startsWith('/assessment')) {
        subSystem = 'assessment';
      } else if (path.startsWith('/mood-diary')) {
        subSystem = 'mood';
      }

      // Build Sub-menu based on ParentID from permissions
      if (auth?.permissions) {
        return [
          { id: 'dashboard', ...registry.dashboard }, // Always have a Home button
          ...auth.permissions
            .filter(p => p.parentId === subSystem && p.uiAccess)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(p => ({ id: p.moduleId, ...registry[p.moduleId] }))
        ].filter(item => item.icon); // Ensure we have icons
      }
    }

    // 3. Fallback for Teacher/Admin (Sidebar logic)
    let candidateItems: any[] = [];
    if (auth?.user?.role === Role.TEACHER) {
      candidateItems = [
        { id: 'dashboard', ...registry.dashboard },
        { id: 'students', ...registry.students },
        { id: 'questions', ...registry.questions },
        { id: 'papers', ...registry.papers },
        { id: 'assignments', ...registry.assignments },
        { id: 'ability_tracking', ...registry.ability_tracking },
        { id: 'reinforcements', ...registry.reinforcements },
        { id: 'resources', ...registry.resources },
        { id: 'help_docs', ...registry.help_docs },
      ];
    } else {
      // Admin
      candidateItems = [
        { id: 'dashboard', ...registry.dashboard },
        { id: 'users', ...registry.users },
        { id: 'permissions', ...registry.permissions },
        { id: 'system_config', ...registry.system_config },
        { id: 'audit_logs', ...registry.audit_logs },
        { id: 'homework_audit', ...registry.homework_audit },
      ];
    }

    if (auth?.permissions) {
      return candidateItems.filter(item => {
        const perm = auth.permissions.find(p => p.moduleId === item.id);
        return perm ? perm.uiAccess : true; // Default true for legacy
      });
    }

    return candidateItems;
  };

  const menuItems = getMenuItems() || [];
  const isPractice = location.pathname.startsWith('/practice');
  const showBottomNav = auth?.user?.role === Role.STUDENT && location.pathname !== '/' && location.pathname !== '' && !isPractice;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Only for Non-Students or large screens) */}
      {(auth?.user?.role !== Role.STUDENT || !showBottomNav) && (
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
              const isActive = location.pathname === item.path || (item.path === '/' && (location.pathname === '' || location.pathname === '/'));
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
          <div className="p-4 border-t dark:border-gray-700 space-y-3 shrink-0 mt-auto">
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
                className="flex items-center justify-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors dark:text-white"
              >
                <Languages className="w-4 h-4" />
                {language === 'zh' ? 'Language: English' : '语言: 中文'}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header - Hide for students in sub-systems to save space, but show for dashboard and non-students */}
        {(!showBottomNav || location.pathname === '/' || location.pathname === '') && (
          <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shrink-0 shadow-sm z-30">
            <div className="flex items-center gap-4">
              {auth?.user?.role !== Role.STUDENT && (
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 lg:hidden hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Menu className="w-6 h-6 dark:text-gray-300" />
                </button>
              )}
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                {menuItems.find(item => item.path === location.pathname)?.label || '一粒麦子'}
              </h2>
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
                    <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 animate-in fade-in zoom-in duration-200 origin-top-right">
                      <button 
                        onClick={() => { setIsUserMenuOpen(false); setIsProfileOpen(true); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-gray-400" />
                        个人中心
                      </button>
                      <button 
                        onClick={() => { setIsUserMenuOpen(false); auth?.logout(); }}
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
        )}

        <main className={`flex-1 overflow-y-auto scroll-smooth ${showBottomNav ? 'pb-16' : ''}`}>
          <div className="p-4 lg:p-6 min-h-full">
            {children}
          </div>
        </main>

        {/* Bottom Navigation for Students in Sub-systems */}
        {showBottomNav && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-t dark:border-gray-700 h-14 flex items-center justify-around px-2 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            {menuItems.map((item, idx) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={idx}
                  to={item.path}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all duration-300 ${isActive ? 'text-primary-600' : 'text-gray-400'}`}
                >
                  <div className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-primary-50 dark:bg-primary-900/30' : ''}`}>
                    <item.icon className={`w-5 h-5 ${isActive ? 'animate-in zoom-in-75' : ''}`} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-tight truncate max-w-[64px]">
                    {language === 'zh' ? item.label : item.labelEn}
                  </span>
                </Link>
              );
            })}
          </nav>
        )}
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
