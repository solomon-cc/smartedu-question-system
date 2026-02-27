
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../App';
import { Lock, User as UserIcon, AlertCircle, UserPlus, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { api } from '../services/api.ts';

interface LoginProps {
  language: 'zh' | 'en';
}

const Login: React.FC<LoginProps> = ({ language }) => {
  const auth = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [error, setError] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [regEnabled, setRegEnabled] = useState(false);

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
      if (!regPhone || !regPassword || !regConfirmPassword) return;
      
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
        await api.auth.register(regPhone, regPassword);
        setSuccess(true);
        setTimeout(() => {
          setIsRegister(false);
          setSuccess(false);
          setUsername(regPhone);
          setPassword('');
          setRegPassword('');
          setRegConfirmPassword('');
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-primary-950">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 transition-all relative overflow-hidden">
        {/* Decor */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-primary-600 mb-2 tracking-tight">一粒麦子</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {isRegister 
              ? (language === 'zh' ? '创建您的学生账户' : 'Create your student account')
              : (language === 'zh' ? '欢迎回来，请登录您的账户' : 'Welcome back, please log in')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-in slide-in-from-top-4 duration-300">
              <AlertCircle className="w-5 h-5" />
              <p className="text-xs font-bold uppercase tracking-wide">
                {errMsg}
              </p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl flex items-center gap-3 text-green-600 dark:text-green-400 animate-in slide-in-from-top-4 duration-300">
              <CheckCircle2 className="w-5 h-5" />
              <p className="text-xs font-bold uppercase tracking-wide">
                {language === 'zh' ? '注册成功！正在跳转登录...' : 'Registration successful! Redirecting...'}
              </p>
            </div>
          )}

          {isRegister ? (
            <>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                  {language === 'zh' ? '手机号' : 'Phone Number'}
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-xl border dark:border-gray-700 dark:bg-gray-900 focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none font-bold dark:text-white"
                    placeholder={language === 'zh' ? '输入11位手机号' : 'Enter 11-digit phone number'}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                  {language === 'zh' ? '设置密码' : 'Set Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-xl border dark:border-gray-700 dark:bg-gray-900 focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none font-bold dark:text-white"
                    placeholder={language === 'zh' ? '输入您的密码' : 'Enter your password'}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                  {language === 'zh' ? '确认密码' : 'Confirm Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-xl border dark:border-gray-700 dark:bg-gray-900 focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none font-bold dark:text-white"
                    placeholder={language === 'zh' ? '再次输入密码' : 'Re-enter password'}
                    required
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 px-2">
                <input
                  type="checkbox"
                  id="privacy"
                  checked={agreedToPrivacy}
                  onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <label htmlFor="privacy" className="text-sm text-gray-500 dark:text-gray-400">
                  {language === 'zh' ? '我已阅读并同意' : 'I have read and agree to the '}
                  <button 
                    type="button" 
                    onClick={() => setShowPrivacyModal(true)}
                    className="text-primary-600 hover:underline"
                  >
                    {language === 'zh' ? '隐私政策' : 'Privacy Policy'}
                  </button>
                </label>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}

          <button
            type="submit"
            className="w-full py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-primary-600/30 transition-all active:scale-[0.98] uppercase tracking-widest flex items-center justify-center gap-2"
          >
            {isRegister ? (
              <>
                {language === 'zh' ? '立即注册' : 'Register Now'}
                <UserPlus className="w-5 h-5" />
              </>
            ) : (
              <>
                {language === 'zh' ? '立即登录' : 'Log In Now'}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {regEnabled && (
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError(false);
                setSuccess(false);
              }}
              className="text-sm font-bold text-gray-500 hover:text-primary-600 transition-colors"
            >
              {isRegister 
                ? (language === 'zh' ? '已有账户？去登录' : 'Already have an account? Log in')
                : (language === 'zh' ? '没有账户？注册新账户' : 'No account? Create one')}
            </button>
          </div>
        )}
      </div>

      {showPrivacyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-primary-50 dark:bg-primary-950/20">
              <h3 className="text-xl font-black text-primary-600">
                {language === 'zh' ? '隐私政策' : 'Privacy Policy'}
              </h3>
              <button 
                onClick={() => setShowPrivacyModal(false)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto prose dark:prose-invert max-w-none">
              {language === 'zh' ? (
                <div className="space-y-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  <p className="font-bold text-gray-900 dark:text-white">一粒麦子尊重您的隐私并致力于保护您的个人数据。</p>
                  <h4 className="font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider text-xs">1. 我们收集的信息</h4>
                  <p>为了提供核心服务，我们收集您的手机号作为唯一账号标识。在您答题过程中，系统会记录您的答题历史、正确率及错题数据，用于生成个性化学习报告。</p>
                  <h4 className="font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider text-xs">2. 信息的使用方式</h4>
                  <p>收集的数据仅用于评估学习进度、向老师反馈教学成果以及优化个性化题目推荐。我们绝不会将您的个人数据共享、出售或出租给任何第三方用于营销目的。</p>
                  <h4 className="font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider text-xs">3. 数据安全</h4>
                  <p>我们采用行业标准的加密技术和存储方案（JWT、数据库加密等）来确保您的数据安全。您的密码经过不可逆加密存储。</p>
                  <h4 className="font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider text-xs">4. 您的权利</h4>
                  <p>您可以随时通过系统查看您的学习数据。如需注销账号或删除个人信息，请联系系统管理员。</p>
                </div>
              ) : (
                <div className="space-y-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  <p className="font-bold text-gray-900 dark:text-white">SmartEdu respects your privacy and is committed to protecting your personal data.</p>
                  <h4 className="font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider text-xs">1. Information We Collect</h4>
                  <p>To provide core services, we collect your phone number as a unique account identifier. During practice, we record history, accuracy, and mistake data to generate personalized learning reports.</p>
                  <h4 className="font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider text-xs">2. How We Use Information</h4>
                  <p>Collected data is used solely for evaluating progress, providing feedback to teachers, and optimizing recommendations. We never share, sell, or rent your data to third parties for marketing.</p>
                  <h4 className="font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider text-xs">3. Data Security</h4>
                  <p>We use industry-standard encryption and storage (JWT, encrypted DB) to ensure data safety. Passwords are stored using irreversible encryption.</p>
                  <h4 className="font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider text-xs">4. Your Rights</h4>
                  <p>You can view your learning data anytime. To delete your account or personal info, please contact the administrator.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
              <button 
                onClick={() => {
                  setAgreedToPrivacy(true);
                  setShowPrivacyModal(false);
                }}
                className="px-8 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-600/20 transition-all active:scale-95"
              >
                {language === 'zh' ? '我已了解并同意' : 'I Understand & Agree'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
