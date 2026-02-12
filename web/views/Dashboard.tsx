
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../App';
import { Role, Subject } from '../types';
import { api } from '../services/api.ts';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, FileText, ChevronRight, BarChart2, Users, TrendingUp, Activity } from 'lucide-react';

interface DashboardProps {
  language: 'zh' | 'en';
}

const StudentDashboard: React.FC<DashboardProps> = ({ language }) => {
  const navigate = useNavigate();
  const [hwCount, setHwCount] = useState<number>(0);
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  useEffect(() => {
    api.homework.list().then(data => setHwCount(data.filter((h: any) => h.status === 'pending').length)).catch(console.error);
    api.history.list().then(data => setHistoryCount(data.length)).catch(console.error);
  }, []);

  const subjects = [
    { id: Subject.MATH, name: '数学', enName: 'Math', color: 'bg-blue-500', icon: '➗' },
    { id: Subject.LANGUAGE, name: '语言词汇', enName: 'Language', color: 'bg-green-500', icon: '🔤' },
    { id: Subject.READING, name: '阅读', enName: 'Reading', color: 'bg-purple-500', icon: '📖' },
    { id: Subject.LITERACY, name: '识字', enName: 'Literacy', color: 'bg-orange-500', icon: '🏮' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <section className="bg-primary-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-primary-600/20">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-4">{language === 'zh' ? '今日家庭作业' : "Today's Homework"}</h2>
          <p className="opacity-90 mb-6 max-w-md">
            {language === 'zh' ? `老师为你布置了 ${hwCount} 道新题目。加油！` : `${hwCount} new tasks assigned. Good luck!`}
          </p>
          <button 
            onClick={() => navigate('/practice')}
            className="bg-white text-primary-600 px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <PlayCircle className="w-5 h-5" />
            {language === 'zh' ? '开始作业' : 'Start Now'}
          </button>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] text-white/10 text-9xl font-bold rotate-12">
          HW
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold mb-4 dark:text-white">{language === 'zh' ? '按科目练习' : 'Practice by Subject'}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {subjects.map(s => (
            <div 
              key={s.id}
              className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:translate-y-[-4px] transition-all cursor-pointer group"
              onClick={() => setSelectedSubject(s.id)}
            >
              <div className={`${s.color} w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 text-white shadow-lg`}>
                {s.icon}
              </div>
              <h4 className="font-bold text-lg dark:text-white group-hover:text-primary-600">{language === 'zh' ? s.name : s.enName}</h4>
            </div>
          ))}
        </div>
      </section>

      {/* Grade Selection Modal */}
      {selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full animate-in zoom-in-95 relative">
              <button 
                onClick={() => setSelectedSubject(null)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <ChevronRight className="w-6 h-6 rotate-90" /> {/* Close icon substitute or simple X */}
              </button>
              <h3 className="text-xl font-black text-center mb-6 dark:text-white">
                {language === 'zh' ? '选择年级' : 'Select Grade'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                 {[1, 2, 3, 4, 5, 6].map(g => (
                   <button
                     key={g}
                     onClick={() => navigate(`/practice?subject=${selectedSubject}&grade=${g}`)}
                     className="py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 hover:bg-primary-500 hover:text-white dark:text-white font-black text-lg transition-all"
                   >
                     {g} {language === 'zh' ? '年级' : 'Grade'}
                   </button>
                 ))}
              </div>
           </div>
        </div>
      )}

      <section className="grid md:grid-cols-2 gap-4">
        <div 
          onClick={() => navigate('/history')}
          className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 flex justify-between items-center group cursor-pointer"
        >
          <div className="flex items-center gap-4">
             <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-2xl text-blue-600">
                <FileText className="w-6 h-6" />
             </div>
             <div>
                <h4 className="font-bold dark:text-white">{language === 'zh' ? '答题历史' : 'History'}</h4>
                <p className="text-xs text-gray-500">{historyCount} {language === 'zh' ? '条记录' : 'records'}</p>
             </div>
          </div>
          <ChevronRight className="text-gray-400 group-hover:translate-x-1 transition-transform" />
        </div>
        <div 
          onClick={() => navigate('/stats')}
          className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 flex justify-between items-center group cursor-pointer"
        >
          <div className="flex items-center gap-4">
             <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-2xl text-purple-600">
                <BarChart2 className="w-6 h-6" />
             </div>
             <div>
                <h4 className="font-bold dark:text-white">{language === 'zh' ? '统计分析' : 'Statistics'}</h4>
             </div>
          </div>
          <ChevronRight className="text-gray-400 group-hover:translate-x-1 transition-transform" />
        </div>
      </section>
    </div>
  );
};

const TeacherDashboard: React.FC<DashboardProps> = ({ language }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.teacher.stats().then(setStats).catch(console.error);
  }, []);

  if (!stats) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-4 space-y-6 animate-in slide-in-from-right-4 duration-500">
      <h1 className="text-2xl font-bold dark:text-white">{language === 'zh' ? '教师控制台' : 'Teacher Console'}</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm">
          <h3 className="text-gray-500 text-sm mb-1">{language === 'zh' ? '今日批改' : 'Today Corrected'}</h3>
          <p className="text-3xl font-bold dark:text-white">{stats.todayCorrected}</p>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm">
          <h3 className="text-gray-500 text-sm mb-1">{language === 'zh' ? '待布置作业' : 'Assignments Pending'}</h3>
          <p className="text-3xl font-bold dark:text-white">{stats.pendingAssignments}</p>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm">
          <h3 className="text-gray-500 text-sm mb-1">{language === 'zh' ? '学生正确率' : 'Accuracy Rate'}</h3>
          <p className="text-3xl font-bold dark:text-white text-green-500">{stats.accuracyRate * 100}%</p>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold dark:text-white">{language === 'zh' ? '快捷功能' : 'Quick Actions'}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
             <button onClick={() => navigate('/questions')} className="p-4 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-xl font-medium hover:bg-primary-100 transition-colors">
               题目库管理
             </button>
             <button onClick={() => navigate('/assign')} className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl font-medium hover:bg-blue-100 transition-colors">
               作业管理
             </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border dark:border-gray-700 shadow-sm">
          <h2 className="text-lg font-bold mb-4 dark:text-white">{language === 'zh' ? '最近作业情况' : 'Recent HW Status'}</h2>
          <div className="space-y-4">
            {stats.recentHomeworks?.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold">A</div>
                   <div>
                      <p className="font-bold dark:text-white">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.date}</p>
                   </div>
                 </div>
                 <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">{language === 'zh' ? '已完成' : 'Done'} {item.completed}/{item.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC<DashboardProps> = ({ language }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ accuracyTrend: any[], completionTrend: any[] } | null>(null);

  useEffect(() => {
    api.dashboard.stats().then(setStats).catch(console.error);
  }, []);

  // Mock data for trends (Fallback or mapped from API)
  const days = language === 'zh' ? ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // Map API data if available, otherwise fallback (or empty)
  const accuracyData = stats?.accuracyTrend?.map(s => s.value) || [65, 78, 82, 75, 88, 92, 85];
  const hwCompletionData = stats?.completionTrend?.map(s => s.value) || [45, 52, 60, 48, 70, 85, 78];

  return (
    <div className="p-4 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black dark:text-white">{language === 'zh' ? '系统管理中心' : 'Admin Center'}</h1>
        <div className="text-xs font-black uppercase tracking-widest text-gray-400 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full">
          {new Date().toLocaleDateString()}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div 
          onClick={() => navigate('/users')}
          className="p-8 bg-white dark:bg-gray-800 rounded-[2.5rem] border dark:border-gray-700 shadow-sm cursor-pointer hover:border-primary-400 transition-all group"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{language === 'zh' ? '平台总用户' : 'Total Users'}</h3>
              <p className="text-4xl font-black dark:text-white group-hover:text-primary-600 transition-colors">1,248</p>
              <p className="text-[10px] text-green-500 font-bold mt-2">+12% Since last month</p>
            </div>
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-2xl text-primary-600 group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8" />
            </div>
          </div>
        </div>
        <div 
          onClick={() => navigate('/stats')}
          className="p-8 bg-white dark:bg-gray-800 rounded-[2.5rem] border dark:border-gray-700 shadow-sm cursor-pointer hover:border-purple-400 transition-all group"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{language === 'zh' ? '全局答题量' : 'Global Questions'}</h3>
              <p className="text-4xl font-black dark:text-white group-hover:text-purple-600 transition-colors">45,892</p>
              <p className="text-[10px] text-purple-500 font-bold mt-2">Active now: 124 users</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl text-purple-600 group-hover:scale-110 transition-transform">
              <Activity className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Chart 1: Question Accuracy Curve */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] border dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-black dark:text-white uppercase tracking-tight">{language === 'zh' ? '做题正确率曲线' : 'Accuracy Trend'}</h3>
            </div>
            <span className="text-[10px] font-black text-gray-400">LAST 7 DAYS</span>
          </div>
          
          <div className="h-64 w-full relative group">
            <svg className="w-full h-full" viewBox="0 0 700 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gradient-acc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="50" x2="700" y2="50" stroke="currentColor" className="text-gray-100 dark:text-gray-700" strokeWidth="1" strokeDasharray="4" />
              <line x1="0" y1="100" x2="700" y2="100" stroke="currentColor" className="text-gray-100 dark:text-gray-700" strokeWidth="1" strokeDasharray="4" />
              <line x1="0" y1="150" x2="700" y2="150" stroke="currentColor" className="text-gray-100 dark:text-gray-700" strokeWidth="1" strokeDasharray="4" />
              
              {/* Area */}
              <path 
                d={`M 0 200 ${accuracyData.map((d, i) => `L ${(i * 700) / 6} ${200 - (d * 1.5)}`).join(' ')} L 700 200 Z`}
                fill="url(#gradient-acc)"
              />
              {/* Line */}
              <path 
                d={`M 0 ${200 - (accuracyData[0] * 1.5)} ${accuracyData.map((d, i) => `L ${(i * 700) / 6} ${200 - (d * 1.5)}`).join(' ')}`}
                fill="none" 
                stroke="#0ea5e9" 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="drop-shadow-lg"
              />
              {/* Dots */}
              {accuracyData.map((d, i) => (
                <circle 
                  key={i} 
                  cx={(i * 700) / 6} 
                  cy={200 - (d * 1.5)} 
                  r="5" 
                  fill="white" 
                  stroke="#0ea5e9" 
                  strokeWidth="3"
                  className="hover:r-8 transition-all cursor-pointer"
                />
              ))}
            </svg>
            <div className="flex justify-between mt-4">
              {days.map(d => <span key={d} className="text-[10px] font-black text-gray-400">{d}</span>)}
            </div>
          </div>
        </div>

        {/* Chart 2: Homework Completion Trend */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] border dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600">
                <BarChart2 className="w-5 h-5" />
              </div>
              <h3 className="font-black dark:text-white uppercase tracking-tight">{language === 'zh' ? '家庭作业完成趋势' : 'HW Completion'}</h3>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-[8px] font-bold text-gray-400">DONE</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                <span className="text-[8px] font-bold text-gray-400">ASSIGNED</span>
              </div>
            </div>
          </div>

          <div className="h-64 flex items-end justify-between gap-4">
            {hwCompletionData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full justify-end">
                <div className="w-full relative group">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                    {d}% Completed
                  </div>
                  {/* Background bar */}
                  <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-t-2xl relative overflow-hidden">
                    {/* Progress bar */}
                    <div 
                      className="absolute bottom-0 left-0 w-full bg-purple-600 rounded-t-2xl transition-all duration-1000 ease-out shadow-lg"
                      style={{ height: `${d}%` }}
                    >
                      <div className="absolute top-0 left-0 w-full h-4 bg-white/20 blur-sm"></div>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-black text-gray-400">{days[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-[3rem] p-8 border dark:border-gray-700 shadow-sm">
        <h2 className="text-lg font-black mb-6 dark:text-white uppercase tracking-tight">{language === 'zh' ? '实时系统日志' : 'Live System Logs'}</h2>
        <div className="space-y-4 max-h-64 overflow-y-auto pr-4 scrollbar-thin">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="flex gap-4 p-4 border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/30 rounded-2xl transition-colors">
               <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 shrink-0 animate-pulse"></div>
               <div className="flex-1">
                 <p className="text-sm font-medium dark:text-gray-200 leading-relaxed">
                   {i % 3 === 0 ? '教师 "teacher_zhang" 导出了本周统计报表' : i % 3 === 1 ? '系统完成了 10,000 道题目的缓存预热' : '发现 2 个重复题目项，已自动执行归档操作'}
                 </p>
                 <div className="flex justify-between mt-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">2024-03-2{i} 10:45:00</p>
                    <span className="text-[8px] font-black text-primary-500 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded uppercase">Success</span>
                 </div>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ language }) => {
  const auth = useContext(AuthContext);
  
  if (auth?.user?.role === Role.STUDENT) return <StudentDashboard language={language} />;
  if (auth?.user?.role === Role.TEACHER) return <TeacherDashboard language={language} />;
  return <AdminDashboard language={language} />;
};

export default Dashboard;
