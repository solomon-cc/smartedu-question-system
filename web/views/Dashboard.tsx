
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../App';
import { Role, Subject } from '../types';
import { api } from '../services/api.ts';
import { SUBJECTS } from '../utils.ts';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, FileText, ChevronRight, BarChart2, Users, TrendingUp, Activity, Award, CheckCircle, X } from 'lucide-react';
import Loading from '../components/Loading';

interface DashboardProps {
  language: 'zh' | 'en';
}

const StudentDashboard: React.FC<DashboardProps> = ({ language }) => {
  const navigate = useNavigate();
  const [hwCount, setHwCount] = useState<number>(0);
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.homework.list().then(data => setHwCount(data.filter((h: any) => h.status === 'pending').length)),
      api.history.list().then(data => setHistoryCount(data.total))
    ])
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {hwCount > 0 && (
        <section className="bg-primary-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-primary-600/20">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-4">{language === 'zh' ? '今日学习概览' : "Today's Learning"}</h2>
            <p className="opacity-90 mb-6 max-w-md">
              {language === 'zh' ? `老师为你布置了 ${hwCount} 道新题目。加油！` : `${hwCount} new tasks assigned. Good luck!`}
            </p>
            <button 
              onClick={() => navigate('/homework')}
              className="bg-white text-primary-600 px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all flex items-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              {language === 'zh' ? '开始作业' : 'Start Now'}
            </button>
          </div>
          <div className="absolute right-[-20px] bottom-[-20px] text-white/10 text-9xl font-bold rotate-12">
            HW
          </div>
        </section>
      )}

      <section>
        <h3 className="text-xl font-bold mb-4 dark:text-white">{language === 'zh' ? '按科目练习' : 'Practice by Subject'}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SUBJECTS.map(s => (
            <div 
              key={s.id}
              className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:translate-y-[-4px] transition-all cursor-pointer group"
              onClick={() => setSelectedSubject(s.id as any)}
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

  if (!stats) return <Loading />;

  return (
    <div className="p-4 space-y-8 animate-in slide-in-from-right-4 duration-500">
      <h1 className="text-2xl font-bold dark:text-white">{language === 'zh' ? '教师控制台' : 'Teacher Console'}</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm">
          <h3 className="text-gray-500 text-sm mb-1">{language === 'zh' ? '今日布置作业' : 'Today Assigned'}</h3>
          <p className="text-3xl font-bold dark:text-white">{stats.todayAssigned || 0}</p>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm">
          <h3 className="text-gray-500 text-sm mb-1">{language === 'zh' ? '作业完成率' : 'Completion Rate'}</h3>
          <p className="text-3xl font-bold dark:text-white">{Math.round(stats.completionRate || 0)}%</p>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm">
          <h3 className="text-gray-500 text-sm mb-1">{language === 'zh' ? '学生正确率' : 'Accuracy Rate'}</h3>
          <p className="text-3xl font-bold dark:text-white text-green-500">{(stats.accuracyRate * 100).toFixed(1)}%</p>
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
              <div 
                key={i} 
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => navigate(`/assign?id=${item.id}`)}
              >
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold">A</div>
                   <div>
                      <p className="font-bold dark:text-white">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.date}</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">{language === 'zh' ? '已完成' : 'Done'} {item.completed}/{item.total}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                 </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Student Overview Section */}
      <section className="bg-white dark:bg-gray-800 rounded-[2rem] p-8 border dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-600" />
            {language === 'zh' ? '学生学习概览' : 'Student Overview'}
          </h2>
          <button 
            onClick={() => navigate('/students')}
            className="text-primary-600 text-sm font-bold flex items-center gap-1 hover:underline"
          >
            {language === 'zh' ? '查看全部学生' : 'View All Students'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {stats.studentSummaries?.map((student: any) => (
            <div 
              key={student.id}
              onClick={() => navigate('/students')}
              className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-6 border dark:border-gray-700 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary-500/20">
                  {student.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold dark:text-white group-hover:text-primary-600 transition-colors">{student.username}</h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">{language === 'zh' ? '学生' : 'Student'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase mb-1 tracking-tighter">{language === 'zh' ? '正确率' : 'Accuracy'}</p>
                    <p className={`text-xl font-black ${student.accuracy > 80 ? 'text-green-500' : student.accuracy > 60 ? 'text-primary-500' : 'text-amber-500'}`}>
                      {(student.accuracy || 0).toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-black uppercase mb-1 tracking-tighter">{language === 'zh' ? '作业完成' : 'HW Done'}</p>
                    <p className="text-xl font-black dark:text-white">
                      {student.hwCompleted} / {student.hwAssigned}
                    </p>
                  </div>
                </div>

                <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary-500 rounded-full transition-all duration-1000"
                    style={{ width: `${(student.hwCompleted / (student.hwAssigned || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const AdminDashboard: React.FC<DashboardProps> = ({ language }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ 
    accuracyTrend: any[], 
    completionTrend: any[],
    totalUsers: number,
    totalQuestions: number,
    onlineUsers: number
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);
  const [onlineUsersList, setOnlineUsersList] = useState<any[]>([]);
  const [loadingOnline, setLoadingOnline] = useState(false);

  const handleViewOnlineUsers = async () => {
    setIsOnlineModalOpen(true);
    setLoadingOnline(true);
    try {
      const list = await api.dashboard.onlineUsers();
      setOnlineUsersList(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOnline(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await api.dashboard.stats();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Real-time auto update every 5 seconds
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !stats) return <Loading />;

  const days = language === 'zh' ? ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const accuracyData = stats?.accuracyTrend?.length ? stats.accuracyTrend.map(s => s.value) : [0, 0, 0, 0, 0, 0, 0];
  const hwCompletionData = stats?.completionTrend?.length ? stats.completionTrend.map(s => s.value) : [0, 0, 0, 0, 0, 0, 0];

  return (
    <div className="p-4 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black dark:text-white">{language === 'zh' ? '控制台' : 'Admin Center'}</h1>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-full border border-green-100 dark:border-green-800 animate-pulse">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-[10px] font-black uppercase">{stats.onlineUsers} {language === 'zh' ? '人在线' : 'Online'}</span>
           </div>
           <div className="text-xs font-black uppercase tracking-widest text-gray-400 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full">
            {new Date().toLocaleDateString()}
           </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div 
          onClick={() => navigate('/users')}
          className="p-8 bg-white dark:bg-gray-800 rounded-[2.5rem] border dark:border-gray-700 shadow-sm cursor-pointer hover:border-primary-400 transition-all group"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{language === 'zh' ? '平台总用户' : 'Total Users'}</h3>
              <p className="text-4xl font-black dark:text-white group-hover:text-primary-600 transition-colors">{stats.totalUsers}</p>
            </div>
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-2xl text-primary-600 group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8" />
            </div>
          </div>
        </div>
        
        <div 
          onClick={handleViewOnlineUsers}
          className="p-8 bg-white dark:bg-gray-800 rounded-[2.5rem] border dark:border-gray-700 shadow-sm relative overflow-hidden group cursor-pointer hover:border-green-400 transition-all"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{language === 'zh' ? '实时在线' : 'Active Sessions'}</h3>
              <p className="text-4xl font-black text-green-500">{stats.onlineUsers}</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl text-green-600">
              <Activity className="w-8 h-8" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-green-500 animate-shimmer"></div>
        </div>

        <div 
          onClick={() => navigate('/stats')}
          className="p-8 bg-white dark:bg-gray-800 rounded-[2.5rem] border dark:border-gray-700 shadow-sm cursor-pointer hover:border-purple-400 transition-all group"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{language === 'zh' ? '全局题目量' : 'Global Questions'}</h3>
              <p className="text-4xl font-black dark:text-white group-hover:text-purple-600 transition-colors">{stats.totalQuestions}</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl text-purple-600 group-hover:scale-110 transition-transform">
              <BarChart2 className="w-8 h-8" />
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

        {/* Chart 2: Homework Completion Trend (Table + Bar + Curve) */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] border dark:border-gray-700 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600">
                <BarChart2 className="w-5 h-5" />
              </div>
              <h3 className="font-black dark:text-white uppercase tracking-tight">{language === 'zh' ? '家庭作业完成趋势' : 'HW Completion'}</h3>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-6">
            {/* Combo Chart */}
            <div className="h-48 w-full relative group">
               <svg className="w-full h-full" viewBox="0 0 700 200" preserveAspectRatio="none">
                  {/* Grid */}
                  <line x1="0" y1="50" x2="700" y2="50" stroke="currentColor" className="text-gray-100 dark:text-gray-700" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1="100" x2="700" y2="100" stroke="currentColor" className="text-gray-100 dark:text-gray-700" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1="150" x2="700" y2="150" stroke="currentColor" className="text-gray-100 dark:text-gray-700" strokeWidth="1" strokeDasharray="4" />

                  {/* Bars */}
                  {hwCompletionData.map((d, i) => {
                     const barHeight = (d / 100) * 180;
                     return (
                       <rect 
                         key={`bar-${i}`}
                         x={(i * 700 / 7) + 20} 
                         y={200 - barHeight} 
                         width={(700 / 7) - 40} 
                         height={barHeight} 
                         className="fill-purple-200 dark:fill-purple-900/50 hover:fill-purple-300 transition-colors" 
                         rx="4"
                       />
                     );
                  })}

                  {/* Curve Line */}
                  <path 
                    d={`M ${(0 * 700 / 7) + 50} ${200 - ((hwCompletionData[0] / 100) * 180)} ${hwCompletionData.map((d, i) => `L ${(i * 700 / 7) + 50} ${200 - ((d / 100) * 180)}`).join(' ')}`}
                    fill="none" 
                    stroke="#9333ea" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="drop-shadow-md"
                  />

                  {/* Dots */}
                  {hwCompletionData.map((d, i) => (
                    <circle 
                      key={`dot-${i}`}
                      cx={(i * 700 / 7) + 50} 
                      cy={200 - ((d / 100) * 180)} 
                      r="4" 
                      fill="white" 
                      stroke="#9333ea" 
                      strokeWidth="2"
                    />
                  ))}
               </svg>
            </div>

            {/* Data Table */}
            <div className="mt-auto">
               <div className="flex justify-between items-center mb-2 px-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{language === 'zh' ? '日期' : 'Date'}</span>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{language === 'zh' ? '完成率' : 'Rate'}</span>
               </div>
               <div className="space-y-1">
                  {days.map((d, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                       <span className="text-xs font-bold dark:text-gray-300">{d}</span>
                       <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                             <div className="h-full bg-purple-500 rounded-full" style={{ width: `${hwCompletionData[i]}%` }}></div>
                          </div>
                          <span className="text-xs font-black text-purple-600 w-8 text-right">{hwCompletionData[i]}%</span>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Online Users Modal */}
      {isOnlineModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 border dark:border-gray-700 animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-8 border-b dark:border-gray-700 pb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-2xl text-green-600">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black dark:text-white uppercase tracking-tight">
                  {language === 'zh' ? '实时在线用户' : 'Online Users'}
                </h3>
              </div>
              <button 
                onClick={() => setIsOnlineModalOpen(false)} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6 dark:text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {loadingOnline ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-black text-gray-400 uppercase tracking-widest text-xs">
                    {language === 'zh' ? '正在同步数据...' : 'Syncing Data...'}
                  </p>
                </div>
              ) : onlineUsersList.length === 0 ? (
                <div className="text-center py-20">
                  <Users className="w-16 h-16 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                  <p className="font-black text-gray-400 uppercase tracking-widest">
                    {language === 'zh' ? '暂无在线用户' : 'No users online'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {onlineUsersList.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border dark:border-gray-700 hover:border-primary-400 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600 font-black">
                          {u.name ? u.name[0] : (u.username ? u.username[0] : '?')}
                        </div>
                        <div>
                          <p className="font-black dark:text-white group-hover:text-primary-600 transition-colors">{u.name || u.username}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-md">
                              {u.role}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold tracking-tighter uppercase">ID: {u.id}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end text-green-500">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {language === 'zh' ? '正在活跃' : 'Active Now'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">
                          {new Date(u.lastActive * 1000).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t dark:border-gray-700">
              <button 
                onClick={() => setIsOnlineModalOpen(false)} 
                className="w-full py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
              >
                {language === 'zh' ? '关闭' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
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
