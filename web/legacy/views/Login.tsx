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
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-gray-950 overflow-hidden font-sans text-gray-900 dark:text-gray-100">
      <style>{`
        @keyframes meteor-diagonal {
          0% { transform: translate(0, 0) rotate(-45deg); opacity: 0; }
          10% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translate(-1200px, 1200px) rotate(-45deg); opacity: 0; }
        }
        @keyframes comet-diagonal {
          0% { transform: translate(0, 0) rotate(-45deg) scale(1.2); opacity: 0; }
          5% { opacity: 0.8; }
          80% { opacity: 0.8; }
          100% { transform: translate(-800px, 800px) rotate(-45deg) scale(0.6); opacity: 0; }
        }
        .meteor-container { position: absolute; inset: 0; pointer-events: none; z-index: 1; overflow: hidden; }
        .meteor { 
          position: absolute; 
          width: 200px; 
          height: 2px; 
          background: linear-gradient(90deg, #fff, transparent); 
          filter: drop-shadow(0 0 8px rgba(255,255,255,0.9)); 
          animation: meteor-diagonal 3s linear infinite; 
          transform-origin: left center;
          transform: rotate(-45deg);
          opacity: 0;
        }
        .comet { 
          position: absolute; 
          width: 300px; 
          height: 4px; 
          background: linear-gradient(90deg, rgba(186, 230, 253, 0.7), transparent); 
          filter: drop-shadow(0 0 12px rgba(186, 230, 253, 0.5)); 
          animation: comet-diagonal 15s ease-in-out infinite; 
          transform-origin: left center; 
          transform: rotate(-45deg);
          opacity: 0;
        }
        .comet::before { content: ""; position: absolute; left: 0; top: -2px; width: 8px; height: 8px; background: #fff; border-radius: 50%; box-shadow: 0 0 20px 4px #fff; }
        .dark .brand-dark-blend { background: linear-gradient(135deg, #0f172a 0%, #020617 100%); }
      `}</style>
      
      {/* Brand Section - 左侧品牌区 (Compact Optimization) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary-600 dark:brand-dark-blend p-8 xl:p-12 flex-col justify-center overflow-hidden transition-all duration-700 border-r dark:border-gray-800/50">
        <div className="absolute inset-0 opacity-10 dark:opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        {!isDay && (
          <div className="meteor-container">
            <div className="meteor" style={{ top: '0%', left: '80%', animationDelay: '0s' }} />
            <div className="meteor" style={{ top: '20%', left: '100%', animationDelay: '5s', animationDuration: '4s' }} />
            <div className="comet" style={{ top: '-10%', left: '90%', animationDelay: '10s' }} />
          </div>
        )}

        <div className="relative z-10 space-y-6 xl:space-y-10">
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-8 duration-700">
            <div className="w-10 h-10 xl:w-12 xl:h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-2xl transform hover:rotate-6 transition-transform">
              <LighthouseIcon className="w-6 h-6 xl:w-8 xl:h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="text-2xl xl:text-3xl font-black text-white tracking-tighter">一粒麦子</span>
          </div>

          <div className="space-y-4 xl:space-y-6 max-w-xl">
            <h2 className="text-3xl xl:text-5xl 2xl:text-6xl font-black text-white leading-[1.1] tracking-tight animate-in fade-in slide-in-from-left-12 duration-700 delay-100">
              {language === 'zh' ? '开启您的' : 'Unlock Your'} <br />
              <span className="text-primary-100 dark:text-primary-400 bg-clip-text">{language === 'zh' ? '智慧学习之旅' : 'Learning Potential'}</span>
            </h2>
            <p className="text-base xl:text-lg text-primary-50 dark:text-gray-400 font-medium leading-relaxed opacity-90 animate-in fade-in slide-in-from-left-16 duration-700 delay-200">
              {language === 'zh' 
                ? '通过个性化学习方法与智慧技能分析，帮助每一位学生高效掌握知识点。' 
                : 'Helping every student master knowledge efficiently through personalized learning methods and smart skill analytics.'}
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <div className="flex items-start gap-3 p-3 xl:p-4 bg-white/10 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-white/10 hover:bg-white/15 dark:hover:bg-white/10 transition-colors cursor-default">
                <div className="p-1.5 bg-white/20 dark:bg-primary-500/20 rounded-xl">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-sm xl:text-base text-white">{language === 'zh' ? '智能题库' : 'AI Bank'}</div>
                  <div className="text-[10px] xl:text-xs text-primary-100 dark:text-primary-400 opacity-70">{language === 'zh' ? '海量优质题目' : 'High-quality content'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 xl:p-4 bg-white/10 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-white/10 hover:bg-white/15 dark:hover:bg-white/10 transition-colors cursor-default">
                <div className="p-1.5 bg-white/20 dark:bg-primary-500/20 rounded-xl">
                  <BookCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-sm xl:text-base text-white">{language === 'zh' ? '个性反馈' : 'Feedback'}</div>
                  <div className="text-[10px] xl:text-xs text-primary-100 dark:text-primary-400 opacity-70">{language === 'zh' ? '精准掌握进度' : 'Track progress'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-6 xl:bottom-8 xl:left-12 z-10 text-white/50 text-[10px] font-medium">
          Powered by SmartEdu Analytics &copy; {new Date().getFullYear()}
        </div>
      </div>

      {/* Form Section - 右侧表单区 (Compact Optimization) */}
      <div className="flex-1 flex flex-col relative bg-gray-50 dark:bg-gray-950 overflow-auto lg:overflow-hidden transition-colors duration-500">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 text-gray-300 dark:text-gray-800/50">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-100/40 dark:bg-primary-900/30 rounded-full blur-3xl transition-colors" />
          <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.12] transition-opacity" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>

        <div className="meteor-container opacity-60">
          <div className="meteor" style={{ top: '0%', left: '70%', animationDelay: '2s' }} />
          <div className="meteor" style={{ top: '25%', left: '90%', animationDelay: '7s' }} />
          <div className="comet" style={{ top: '10%', left: '80%', animationDelay: '4s' }} />
        </div>

        {/* Top Actions */}
        <div className="relative z-20 px-6 py-4 lg:px-8 lg:py-6 flex justify-between items-center lg:justify-end shrink-0">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-lg">
              <LighthouseIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black text-gray-900 dark:text-white tracking-tighter">一粒麦子</span>
          </div>
          <button 
            type="button" 
            onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-md text-gray-700 dark:text-gray-300 text-xs font-bold border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all active:scale-95"
          >
            <Languages className="w-3.5 h-3.5 text-primary-600" />
            {language === 'zh' ? 'English' : '中文'}
          </button>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center px-6 py-4 lg:px-12 xl:px-20 lg:py-6">
          <div className="w-full max-w-md mx-auto flex flex-col justify-center transition-all">
            {/* 顶部装饰 (仅登录显示, 压缩高度) */}
            {!isRegister && (
              <div className="relative h-12 lg:h-14 flex items-center justify-center lg:justify-start overflow-visible mb-1">
                <div className="relative w-40 h-full">
                  {isDay ? (
                    <>
                      <Sun className="absolute -top-4 left-4 w-10 h-10 text-orange-400 animate-[spin_20s_linear_infinite]" />
                      <div className="absolute top-0 left-2 w-12 h-12 bg-orange-400/20 rounded-full blur-2xl animate-pulse" />
                    </>
                  ) : (
                    <>
                      <Star className="absolute -top-3 left-2 w-3 h-3 text-yellow-400 animate-pulse fill-yellow-400/20" />
                      <Moon className="absolute top-1 left-8 w-8 h-8 text-primary-200 dark:text-primary-800 -rotate-12 opacity-80" />
                      <Star className="absolute top-4 left-20 w-4 h-4 text-yellow-300 animate-bounce" />
                    </>
                  )}
                </div>
              </div>
            )}

            {!isRegister && (
              <div className="text-center lg:text-left space-y-0.5 mb-4 xl:mb-6">
                <h1 className="text-3xl xl:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                  {language === 'zh' ? '欢迎回来' : 'Welcome Back'}
                </h1>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 xl:space-y-4">
              {error && (
                <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-100 dark:border-red-900/50 p-2.5 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <p className="font-bold text-[10px] xl:text-xs">{errMsg}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50/80 dark:bg-green-900/20 backdrop-blur-sm border border-green-100 dark:border-green-900/50 p-2.5 rounded-xl flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <p className="font-bold text-[10px] xl:text-xs">{language === 'zh' ? '注册成功！' : 'Success!'}</p>
                </div>
              )}

              <div className="space-y-3 xl:space-y-4">
                {isRegister ? (
                  <div className="grid grid-cols-1 gap-2 xl:gap-3">
                    {/* Registration Fields */}
                    {[
                      { id: 'phone', label: language === 'zh' ? '手机号' : 'Phone', val: regPhone, set: setRegPhone, ph: '1xx xxxx xxxx', type: 'text', icon: UserIcon },
                      { id: 'nickname', label: language === 'zh' ? '昵称' : 'Nickname', val: regNickname, set: setRegNickname, ph: language === 'zh' ? '起个好听的名字' : 'Nickname', type: 'text', icon: UserIcon },
                      { id: 'pw', label: language === 'zh' ? '密码' : 'Password', val: regPassword, set: setRegPassword, ph: '••••••••', type: 'password', icon: Lock },
                      { id: 'cpw', label: language === 'zh' ? '确认' : 'Confirm', val: regConfirmPassword, set: setRegConfirmPassword, ph: '••••••••', type: 'password', icon: Lock }
                    ].map(field => (
                      <div key={field.id} className="space-y-0.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-3">{field.label}</label>
                        <div className="relative group">
                          <field.icon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                          <input
                            type={field.type}
                            value={field.val}
                            onChange={(e) => field.set(e.target.value)}
                            className="w-full pl-14 pr-5 py-2.5 xl:py-3 rounded-2xl border-2 border-transparent bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm focus:bg-white focus:border-primary-500 transition-all outline-none font-bold text-sm"
                            placeholder={field.ph}
                            required
                          />
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex items-start gap-2 px-2 py-0.5">
                      <input type="checkbox" id="privacy" checked={agreedToPrivacy} onChange={(e) => setAgreedToPrivacy(e.target.checked)} className="mt-0.5 w-3.5 h-3.5 text-primary-600 rounded cursor-pointer" />
                      <label htmlFor="privacy" className="text-[9px] xl:text-[10px] text-gray-500 font-medium cursor-pointer leading-tight">
                        {language === 'zh' ? '我已同意' : 'I agree to '}
                        <button type="button" onClick={() => setShowPrivacyModal(true)} className="text-primary-600 font-bold">{language === 'zh' ? '隐私政策' : 'Privacy Policy'}</button>
                      </label>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">{language === 'zh' ? '用户名 / 手机号' : 'User / Phone'}</label>
                      <div className="relative group">
                        <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full pl-16 pr-6 py-4 xl:py-4.5 rounded-[20px] border-2 border-transparent bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm focus:bg-white focus:border-primary-500 transition-all outline-none font-bold text-base xl:text-lg"
                          placeholder={language === 'zh' ? '输入用户名或手机号' : 'User or Phone'}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">{language === 'zh' ? '密码' : 'Password'}</label>
                      <div className="relative group">
                        <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-16 pr-6 py-4 xl:py-4.5 rounded-[20px] border-2 border-transparent bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm focus:bg-white focus:border-primary-500 transition-all outline-none font-bold text-base xl:text-lg"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button type="submit" className="w-full py-4 xl:py-4.5 bg-primary-600 hover:bg-primary-700 text-white rounded-[18px] font-black text-base xl:text-lg shadow-lg shadow-primary-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                <span>{isRegister ? (language === 'zh' ? '立即创建' : 'Create') : (language === 'zh' ? '立即登录' : 'Sign In')}</span>
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
            </form>

            {regEnabled && (
              <div className="text-center pt-3 xl:pt-4">
                <button
                  onClick={() => { setIsRegister(!isRegister); setError(false); setSuccess(false); }}
                  className="w-full py-2.5 rounded-xl bg-gray-100/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 transition-all text-[10px] xl:text-xs"
                >
                  {isRegister ? (language === 'zh' ? '已有账号？' : 'Have account?') : (language === 'zh' ? '还没有加入？' : 'New here?')}
                  <span className="text-primary-600 ml-2">{isRegister ? (language === 'zh' ? '去登录' : 'Sign In') : (language === 'zh' ? '立即创建' : 'Join Now')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPrivacyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <h3 className="text-xl font-black">{language === 'zh' ? '隐私政策' : 'Privacy Policy'}</h3>
              <button onClick={() => setShowPrivacyModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8 overflow-y-auto text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
              <p className="font-bold mb-4">一粒麦子尊重您的隐私。</p>
              <p>1. 信息收集：收集手机号作为唯一标识。</p>
              <p>2. 数据使用：仅用于学习评估和优化推荐。</p>
            </div>
            <div className="p-6 border-t dark:border-gray-700 bg-gray-50/50 flex justify-end">
              <button onClick={() => { setAgreedToPrivacy(true); setShowPrivacyModal(false); }} className="px-8 py-3 bg-primary-600 text-white rounded-xl font-black hover:bg-primary-700 transition-all">
                {language === 'zh' ? '同意并继续' : 'Agree'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
