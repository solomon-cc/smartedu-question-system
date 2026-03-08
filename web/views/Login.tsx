
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../App';
import { Lock, User as UserIcon, AlertCircle, ArrowRight, CheckCircle2, X, Languages, GraduationCap, BookCheck, Star, Moon, Sun } from 'lucide-react';
import { api } from '../services/api.ts';

// 自定义手绘灯塔图标 - 确保永远可用且符合品牌感
const LighthouseIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 2l-3 3v2h6V5l-3-3z" />
    <path d="M9 7l-1 14h8l-1-14" />
    <path d="M9 11h6" />
    <path d="M9 15h6" />
    <path d="M12 2v2" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="M4 18l2-1" />
    <path d="M20 18l-2-1" />
  </svg>
);
// ... rest of imports and components remain the same

interface LoginProps {
  language: 'zh' | 'en';
  setLanguage: (lang: 'zh' | 'en') => void;
}

const Login: React.FC<LoginProps> = ({ language, setLanguage }) => {
  const auth = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [regPhone, setRegPhone] = useState('');
  const [regNickname, setRegNickname] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [error, setError] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [regEnabled, setRegEnabled] = useState(false);
  const currentHour = new Date().getHours();
  const isDay = currentHour >= 6 && currentHour < 18;

  useEffect(() => {
    api.config.getPublic().then(res => {
      setRegEnabled(res.registrationEnabled);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setSuccess(false);

    if (isRegister) {
      if (!regPhone || !regNickname || !regPassword || !regConfirmPassword) return;
      if (!agreedToPrivacy) {
        setError(true);
        setErrMsg(language === 'zh' ? '请先同意隐私政策' : 'Please agree to the privacy policy');
        return;
      }
      if (regPassword !== regConfirmPassword) {
        setError(true);
        setErrMsg(language === 'zh' ? '两次输入的密码不一致' : 'Passwords do not match');
        return;
      }
      try {
        await api.auth.register(regPhone, regNickname, regPassword);
        setSuccess(true);
        setTimeout(() => {
          setIsRegister(false);
          setSuccess(false);
          setUsername(regPhone);
          setPassword('');
        }, 1500);
      } catch (err: any) {
        setError(true);
        setErrMsg(err.message || 'Registration failed');
      }
    } else {
      if (username.trim() && password.trim()) {
        if (auth) {
          const ok = await auth.login(username, password);
          if (!ok) {
            setError(true);
            setErrMsg(language === 'zh' ? '用户名或密码错误' : 'Invalid username or password');
          }
        }
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-gray-950 overflow-hidden font-sans">
      {/* Brand Section - 左侧品牌区 */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary-600 p-20 flex-col justify-between overflow-hidden">
        {/* 背景装饰：数学几何网格 */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-white/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-primary-400/30 rounded-full blur-[100px]" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-20 animate-in fade-in slide-in-from-left-8 duration-700">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-2xl transform hover:rotate-6 transition-transform">
              <LighthouseIcon className="w-9 h-9 text-primary-600" />
            </div>
            <span className="text-4xl font-black text-white tracking-tighter">一粒麦子</span>
          </div>

          <div className="space-y-10 max-w-xl">
            <h2 className="text-6xl xl:text-7xl font-black text-white leading-[1.1] tracking-tight animate-in fade-in slide-in-from-left-12 duration-700 delay-100">
              {language === 'zh' ? '开启您的' : 'Unlock Your'} <br />
              <span className="text-primary-100 bg-clip-text">{language === 'zh' ? '智慧学习之旅' : 'Learning Potential'}</span>
            </h2>
            <p className="text-2xl text-primary-50 font-medium leading-relaxed opacity-90 animate-in fade-in slide-in-from-left-16 duration-700 delay-200">
              {language === 'zh' 
                ? '通过个性化学习方法与智慧技能分析，帮助每一位学生高效掌握知识点。' 
                : 'Helping every student master knowledge efficiently through personalized learning methods and smart skill analytics.'}
            </p>

            <div className="grid grid-cols-2 gap-8 pt-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <div className="flex items-start gap-5 p-6 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 hover:bg-white/15 transition-colors cursor-default">
                <div className="p-3 bg-white/20 rounded-xl">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="font-bold text-xl text-white">{language === 'zh' ? '智能题库' : 'AI Bank'}</div>
                  <div className="text-primary-100 opacity-80">{language === 'zh' ? '海量优质题目' : 'High-quality content'}</div>
                </div>
              </div>
              <div className="flex items-start gap-5 p-6 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 hover:bg-white/15 transition-colors cursor-default">
                <div className="p-3 bg-white/20 rounded-xl">
                  <BookCheck className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="font-bold text-xl text-white">{language === 'zh' ? '个性反馈' : 'Feedback'}</div>
                  <div className="text-primary-100 opacity-80">{language === 'zh' ? '精准掌握进度' : 'Track progress'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-white/50 text-sm font-medium">
          Powered by SmartEdu Analytics &copy; {new Date().getFullYear()}
        </div>
      </div>

      {/* Form Section - 右侧表单区 */}
      <div className="flex-1 flex flex-col relative bg-gray-50 dark:bg-gray-950 overflow-hidden transition-colors duration-500">
        {/* 背景装饰 (Visible on all devices, adjusted for mobile) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 text-gray-300 dark:text-gray-800/50">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-100/40 dark:bg-primary-900/30 rounded-full blur-3xl transition-colors" />
          
          <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.12] transition-opacity" 
            style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>

        {/* Top Actions */}
        <div className="relative z-20 px-6 py-4 lg:p-8 flex justify-between items-center lg:justify-end shrink-0">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/20">
              <LighthouseIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">一粒麦子</span>
          </div>
          
          <button 
            type="button"
            onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-md text-gray-700 dark:text-gray-300 text-sm font-bold hover:shadow-md transition-all border border-gray-100 dark:border-gray-800 group active:scale-95"
          >
            <Languages className="w-4 h-4 text-primary-600 group-hover:rotate-12 transition-transform" />
            {language === 'zh' ? 'English' : '中文'}
          </button>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center px-6 py-2 sm:p-20 overflow-hidden">
          {/* Form Card - 精简间距以确保一屏显示 */}
          <div className="w-full max-w-md mx-auto flex flex-col h-full max-h-[85vh] justify-between lg:justify-center lg:space-y-12 transition-all">
            {/* 顶部装饰：白昼太阳 / 夜晚星月 */}
            <div className="relative h-20 lg:h-24 flex items-center justify-center lg:justify-start overflow-visible -mb-4 lg:-mb-6">
              <div className="relative w-48 h-full">
                {isDay ? (
                  <>
                    <Sun className="absolute -top-4 left-6 w-16 h-16 text-orange-400 animate-[spin_20s_linear_infinite] drop-shadow-[0_0_15px_rgba(251,146,60,0.4)]" />
                    <div className="absolute top-0 left-4 w-20 h-20 bg-orange-400/20 rounded-full blur-2xl animate-pulse" />
                  </>
                ) : (
                  <>
                    <Star className="absolute -top-4 left-4 w-5 h-5 text-yellow-400 animate-pulse fill-yellow-400/20" />
                    <Moon className="absolute top-2 left-12 w-12 h-12 text-primary-200 dark:text-primary-800 -rotate-12 opacity-80" />
                    <Star className="absolute top-8 left-28 w-7 h-7 text-yellow-300 animate-bounce fill-yellow-300/20" style={{ animationDuration: '4s' }} />
                    <Star className="absolute -top-2 right-4 w-4 h-4 text-yellow-500 animate-pulse delay-700 fill-yellow-500/20" />
                    <Star className="absolute top-10 left-6 w-3 h-3 text-yellow-200 animate-pulse delay-300" />
                  </>
                )}
              </div>
            </div>

            <div className="text-center lg:text-left space-y-2 mb-4 lg:mb-0">
              <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                {isRegister 
                  ? (language === 'zh' ? '开启新篇章' : 'New Chapter')
                  : (language === 'zh' ? '欢迎回来' : 'Welcome Back')}
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-8 flex-1 lg:flex-none">
              {error && (
                <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-md border border-red-100 dark:border-red-900/50 p-3 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-in fade-in zoom-in duration-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p className="font-bold text-[11px] sm:text-sm leading-snug">{errMsg}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50/80 dark:bg-green-900/20 backdrop-blur-md border border-green-100 dark:border-green-900/50 p-3 rounded-2xl flex items-center gap-3 text-green-600 dark:text-green-400 animate-in fade-in zoom-in duration-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <p className="font-bold text-[11px] sm:text-sm leading-snug">
                    {language === 'zh' ? '注册成功！正在跳转登录...' : 'Success! Redirecting...'}
                  </p>
                </div>
              )}

              <div className="space-y-3 sm:space-y-5">
                {isRegister ? (
                  <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[40vh] px-1 py-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 ml-4 uppercase tracking-[0.2em]">{language === 'zh' ? '手机号' : 'Phone'}</label>
                      <div className="relative group">
                        <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                        <input
                          type="text"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          className="w-full pl-16 pr-6 py-3.5 sm:py-5 rounded-[20px] border-2 border-transparent bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm focus:bg-white dark:focus:bg-gray-800 focus:ring-8 focus:ring-primary-500/5 focus:border-primary-500 transition-all outline-none font-bold dark:text-white text-base"
                          placeholder="1xx xxxx xxxx"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 ml-4 uppercase tracking-[0.2em]">{language === 'zh' ? '昵称' : 'Nickname'}</label>
                      <div className="relative group">
                        <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                        <input
                          type="text"
                          value={regNickname}
                          onChange={(e) => setRegNickname(e.target.value)}
                          className="w-full pl-16 pr-6 py-3.5 sm:py-5 rounded-[20px] border-2 border-transparent bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm focus:bg-white dark:focus:bg-gray-800 focus:ring-8 focus:ring-primary-500/5 focus:border-primary-500 transition-all outline-none font-bold dark:text-white text-base"
                          placeholder={language === 'zh' ? '起个好听的名字' : 'Your nickname'}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 ml-4 uppercase tracking-[0.2em]">{language === 'zh' ? '设置密码' : 'Password'}</label>
                      <div className="relative group">
                        <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                        <input
                          type="password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full pl-16 pr-6 py-3.5 sm:py-5 rounded-[20px] border-2 border-transparent bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm focus:bg-white dark:focus:bg-gray-800 focus:ring-8 focus:ring-primary-500/5 focus:border-primary-500 transition-all outline-none font-bold dark:text-white text-base"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 ml-4 uppercase tracking-[0.2em]">{language === 'zh' ? '确认密码' : 'Confirm'}</label>
                      <div className="relative group">
                        <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                        <input
                          type="password"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          className="w-full pl-16 pr-6 py-3.5 sm:py-5 rounded-[20px] border-2 border-transparent bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm focus:bg-white dark:focus:bg-gray-800 focus:ring-8 focus:ring-primary-500/5 focus:border-primary-500 transition-all outline-none font-bold dark:text-white text-base"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 px-2 py-1">
                      <input
                        type="checkbox"
                        id="privacy"
                        checked={agreedToPrivacy}
                        onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                        className="mt-1 w-4 h-4 text-primary-600 rounded-lg border-gray-200 focus:ring-primary-500 cursor-pointer transition-colors"
                      />
                      <label htmlFor="privacy" className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium cursor-pointer leading-tight">
                        {language === 'zh' ? '我已认真阅读并同意' : 'I have read and agree to the '}
                        <button type="button" onClick={() => setShowPrivacyModal(true)} className="text-primary-600 dark:text-primary-400 hover:underline font-bold">
                          {language === 'zh' ? '隐私政策与用户协议' : 'Privacy Policy'}
                        </button>
                      </label>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 ml-4 uppercase tracking-[0.2em]">{language === 'zh' ? '用户名 / 手机号' : 'Username / Phone'}</label>
                      <div className="relative group">
                        <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full pl-16 pr-6 py-4 sm:py-5 rounded-[24px] border-2 border-transparent bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm focus:bg-white dark:focus:bg-gray-800 focus:ring-8 focus:ring-primary-500/5 focus:border-primary-500 transition-all outline-none font-bold dark:text-white text-base sm:text-lg"
                          placeholder={language === 'zh' ? '输入用户名或手机号' : 'Username or Phone'}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-4">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">{language === 'zh' ? '密码' : 'Password'}</label>
                      </div>
                      <div className="relative group">
                        <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-16 pr-6 py-4 sm:py-5 rounded-[24px] border-2 border-transparent bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm focus:bg-white dark:focus:bg-gray-800 focus:ring-8 focus:ring-primary-500/5 focus:border-primary-500 transition-all outline-none font-bold dark:text-white text-base sm:text-lg"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-4 sm:py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-[20px] font-black text-lg shadow-lg shadow-primary-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative z-10">
                  {isRegister ? (language === 'zh' ? '立即创建账号' : 'Create Account') : (language === 'zh' ? '立即登录' : 'Sign In')}
                </span>
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 relative z-10 group-hover:translate-x-2 transition-transform duration-300" />
              </button>
            </form>

            {regEnabled && (
              <div className="text-center pt-4 mb-2 lg:mb-0">
                <button
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError(false);
                    setSuccess(false);
                  }}
                  className="w-full py-3 rounded-xl bg-gray-100/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95 text-xs"
                >
                  {isRegister 
                    ? (language === 'zh' ? '已经有账号了？' : 'Already have an account?') 
                    : (language === 'zh' ? '还没有加入我们？' : 'Not a member yet?')}
                  <span className="text-primary-600 dark:text-primary-400 ml-2">{isRegister ? (language === 'zh' ? '去登录' : 'Sign In') : (language === 'zh' ? '立即创建账号' : 'Join Now')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPrivacyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border dark:border-gray-700">
            <div className="p-8 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">{language === 'zh' ? '隐私政策与用户协议' : 'Privacy Policy'}</h3>
              <button onClick={() => setShowPrivacyModal(false)} className="p-3 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="p-10 overflow-y-auto prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 leading-relaxed">
              {/* 隐私政策内容省略... (保持之前的一致) */}
              <div className="space-y-6">
                <p className="font-bold text-gray-900 dark:text-white text-lg">一粒麦子尊重您的隐私并致力于保护您的个人数据。</p>
                <div className="space-y-2">
                  <h4 className="font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest text-sm">1. 信息收集</h4>
                  <p>我们收集手机号作为唯一标识，记录答题数据用于生成个性化学习报告。</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest text-sm">2. 数据使用</h4>
                  <p>仅用于学习评估和优化推荐，绝不向第三方共享您的个人隐私。</p>
                </div>
              </div>
            </div>
            <div className="p-8 border-t dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end">
              <button 
                onClick={() => { setAgreedToPrivacy(true); setShowPrivacyModal(false); }}
                className="px-10 py-4 bg-primary-600 text-white rounded-2xl font-black hover:bg-primary-700 shadow-xl shadow-primary-600/20 transition-all active:scale-95"
              >
                {language === 'zh' ? '同意并继续' : 'Agree & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
