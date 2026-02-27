import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  ChevronRight, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Award, 
  BarChart2, 
  BookOpen, 
  History,
  TrendingUp,
  Mail,
  User as UserIcon,
  X,
  Info,
  PlayCircle,
  Trophy,
  Gamepad2
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { User } from '../../types';
import Loading from '../../components/Loading';
import { SUBJECTS } from '../../utils.ts';

const Students: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Detail View State
  const [viewingHistory, setViewingHistory] = useState<any>(null);
  const [viewingHomework, setViewingHomework] = useState<any>(null);
  const [viewingReinforcement, setViewingReinforcement] = useState<any>(null);
  const [viewingWrongBook, setViewingWrongBook] = useState(false);
  const [viewingHistoryList, setViewingHistoryList] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(10);
  const [historyFilterSubject, setHistoryFilterSubject] = useState('全部');
  const [historyFilterDate, setHistoryFilterDate] = useState('');
  const [wrongBook, setWrongBook] = useState<any[]>([]);
  
  // Wrong Book Filters
  const [wbSubjectFilter, setWbSubjectFilter] = useState('全部');
  const [wbErrorSort, setWbErrorSort] = useState<'desc' | 'asc'>('desc');

  const fetchHistoryList = async (studentId: string, page = 1) => {
    try {
      setHistoryPage(page);
      const res = await api.history.list(page, historyPageSize, undefined, studentId);
      setHistoryList(res.list || []);
      setHistoryTotal(res.total);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredWrongBook = wrongBook
    .filter(item => {
        if (wbSubjectFilter === '全部') return true;
        // Check both ID and Name to be safe, but usually it's one of them
        const subj = item.question?.subject;
        const target = SUBJECTS.find(s => s.name === wbSubjectFilter || s.id === wbSubjectFilter);
        if (!target) return subj === wbSubjectFilter;
        return subj === target.name || subj === target.id;
    })
    .sort((a, b) => wbErrorSort === 'desc' ? b.errorCount - a.errorCount : a.errorCount - b.errorCount);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoadingList(true);
    setError(null);
    try {
      const data = await api.students.list();
      setStudents(data);
      if (data.length > 0) {
        handleSelectStudent(data[0].id);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || '获取列表失败');
    } finally {
      setLoadingList(false);
    }
  };

  const handleSelectStudent = async (id: string) => {
    setSelectedStudent(id);
    setLoadingDetail(true);
    // Reset view states
    setViewingHistory(null); 
    setViewingHomework(null);
    setViewingReinforcement(null);
    setViewingWrongBook(false);
    setViewingHistoryList(false);
    setHistoryList([]);
    
    try {
      const [data, wrongData] = await Promise.all([
        api.students.getDetail(id),
        api.wrongBook.list(id)
      ]);
      setDetail(data);
      setWrongBook(wrongData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] gap-6 animate-in fade-in duration-500 relative">
      {/* Left List */}
      <div className="w-full lg:w-80 bg-white dark:bg-gray-800 rounded-[2rem] border dark:border-gray-700 flex flex-col overflow-hidden shadow-sm">
        <div className="p-6 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" />
            {language === 'zh' ? '学生列表' : 'Student List'}
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder={language === 'zh' ? '搜索学生...' : 'Search...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 text-sm dark:text-white"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {loadingList ? (
            <div className="py-10"><Loading /></div>
          ) : error ? (
            <div className="p-6 m-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 rounded-2xl">
              <div className="flex flex-col items-center text-center gap-3">
                <Info className="w-8 h-8 text-red-500" />
                <p className="text-xs font-bold text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
                <button 
                   onClick={fetchStudents}
                   className="mt-2 px-4 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-[10px] font-black uppercase rounded-lg hover:bg-red-200 transition-colors"
                >
                   {language === 'zh' ? '重试' : 'RETRY'}
                </button>
              </div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">{language === 'zh' ? '未找到学生' : 'No students'}</div>
          ) : (
            filteredStudents.map(s => (
              <button
                key={s.id}
                onClick={() => handleSelectStudent(s.id)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all mb-1 ${selectedStudent === s.id ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800' : 'hover:bg-gray-50 dark:hover:bg-gray-900 border-transparent'} border`}
              >
                <div className="flex items-center gap-3 text-left">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${selectedStudent === s.id ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    {s.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${selectedStudent === s.id ? 'text-primary-600' : 'dark:text-gray-200'}`}>{s.username}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">ID: {s.id}</p>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 ${selectedStudent === s.id ? 'text-primary-600' : 'text-gray-300'}`} />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Detail */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-[2rem] border dark:border-gray-700 overflow-hidden shadow-sm flex flex-col">
        {loadingDetail ? (
          <div className="flex-1 flex items-center justify-center"><Loading /></div>
        ) : !detail ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
             <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center">
                <UserIcon className="w-10 h-10" />
             </div>
             <p>{language === 'zh' ? '请从左侧选择一名学生查看详情' : 'Select a student to view details'}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8">
            {/* Header Info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b dark:border-gray-700">
               <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-primary-600 rounded-3xl flex items-center justify-center text-4xl font-black text-white shadow-xl shadow-primary-500/20">
                    {detail.student.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-3xl font-black dark:text-white mb-2">{detail.student.username}</h1>
                    <div className="flex flex-wrap gap-3">
                       <span className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-[10px] font-black uppercase tracking-widest rounded-lg">
                          {detail.student.role}
                       </span>
                       <span className="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-black uppercase tracking-widest rounded-lg">
                          Active
                       </span>
                    </div>
                  </div>
               </div>
               
               <div className="grid grid-cols-3 gap-4">
                  <div 
                    onClick={() => {
                        if (detail.student?.id) {
                           setViewingHistoryList(true);
                           fetchHistoryList(detail.student.id);
                        }
                    }}
                    className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-700 text-center cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{language === 'zh' ? '学习记录' : 'History'}</p>
                    <p className="text-xl font-bold dark:text-white">{(detail.history || []).length}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-700 text-center">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{language === 'zh' ? '专属强化' : 'Personalized'}</p>
                    <p className="text-xl font-bold dark:text-white">{(detail.reinforcements || []).length}</p>
                  </div>
                  <div 
                    onClick={() => setViewingWrongBook(true)}
                    className="p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-800/30 text-center cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-1">{language === 'zh' ? '错题本' : 'Mistakes'}</p>
                    <p className="text-xl font-bold text-red-600">{wrongBook.length}</p>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
               {/* Progress Chart */}
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                       <TrendingUp className="w-5 h-5 text-primary-600" />
                       {language === 'zh' ? '最近正确率趋势' : 'Accuracy Trend'}
                    </h3>
                  </div>
                  <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border dark:border-gray-700 h-48 flex items-end justify-between gap-1">
                     {(detail.progress || []).map((p: any, i: number) => (
                       <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                          <div 
                            className="w-full bg-primary-500 rounded-t-lg transition-all duration-500 group-hover:bg-primary-400" 
                            style={{ height: `${p.accuracy}%`, minHeight: p.accuracy > 0 ? '4px' : '0' }}
                          >
                             <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold">
                                {(p.accuracy || 0).toFixed(1)}%
                             </div>
                          </div>
                          <span className="text-[8px] text-gray-400 font-bold rotate-45 mt-2">{p.date}</span>
                       </div>
                     ))}
                  </div>
               </div>

               {/* Reinforcements */}
               <div className="space-y-4">
                  <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                     <Award className="w-5 h-5 text-orange-500" />
                     {language === 'zh' ? '专属强化配置' : 'Targeted Reinforcements'}
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                     {(!detail.reinforcements || detail.reinforcements.length === 0) ? (
                       <div className="p-10 bg-gray-50 dark:bg-gray-900 rounded-3xl border dark:border-gray-700 text-center text-gray-400 text-sm italic">
                         {language === 'zh' ? '未设置专属强化物' : 'No targeted reinforcements'}
                       </div>
                     ) : (
                       detail.reinforcements.map((r: any) => (
                         <div 
                            key={r.id} 
                            onClick={() => setViewingReinforcement(r)}
                            className="p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer hover:border-primary-400 hover:shadow-md transition-all group"
                         >
                            <div className="flex items-center gap-4">
                               <div className="text-2xl group-hover:scale-110 transition-transform">{r.type === 'game' ? '🎮' : '✨'}</div>
                               <div>
                                  <p className="font-bold text-sm dark:text-white">{r.name}</p>
                                  <p className="text-[10px] text-gray-400">{r.ruleType}: {r.ruleValue}</p>
                               </div>
                            </div>
                            <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${r.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                               {r.isActive ? 'Active' : 'Disabled'}
                            </span>
                         </div>
                       ))
                     )}
                  </div>
               </div>

               {/* Homework Progress */}
               <div className="space-y-4">
                  <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                     <BookOpen className="w-5 h-5 text-blue-500" />
                     {language === 'zh' ? '家庭作业状态' : 'Homework Status'}
                  </h3>
                  <div className="space-y-2">
                     {(!detail.homework || detail.homework.length === 0) ? (
                       <div className="p-10 bg-gray-50 dark:bg-gray-900 rounded-3xl border dark:border-gray-700 text-center text-gray-400 text-sm italic">
                         {language === 'zh' ? '无关联作业' : 'No homework records'}
                       </div>
                     ) : (
                       detail.homework.map((hw: any) => (
                         <div 
                            key={hw.id} 
                            onClick={() => setViewingHomework(hw)}
                            className="p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer hover:border-primary-400 hover:shadow-md transition-all"
                         >
                            <div className="flex-1">
                               <p className="font-bold text-sm dark:text-white truncate max-w-[200px]">{hw.name}</p>
                               <p className="text-[10px] text-gray-400">{hw.date}</p>
                            </div>
                            <div className="flex items-center gap-4">
                               {hw.status === 'completed' && (
                                 <div className="text-right">
                                    <p className="text-xs font-black text-primary-600">{hw.score}/{hw.total}</p>
                                    <p className="text-[8px] text-gray-400 uppercase tracking-widest">Score</p>
                                 </div>
                               )}
                               <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${hw.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                  {hw.status}
                               </span>
                            </div>
                         </div>
                       ))
                     )}
                  </div>
               </div>

               {/* Learning History */}
               <div className="space-y-4" id="history-list-section">
                  <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                     <History className="w-5 h-5 text-purple-500" />
                     {language === 'zh' ? '最近练习记录' : 'Recent Activity'}
                  </h3>
                  <div className="space-y-2">
                     {(!detail.history || detail.history.length === 0) ? (
                       <div className="p-10 bg-gray-50 dark:bg-gray-900 rounded-3xl border dark:border-gray-700 text-center text-gray-400 text-sm italic">
                         {language === 'zh' ? '无练习记录' : 'No recent activity'}
                       </div>
                     ) : (
                       detail.history.map((h: any) => (
                         <div 
                            key={h.id} 
                            onClick={() => setViewingHistory(h)}
                            className="p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer hover:border-primary-400 hover:shadow-md transition-all group"
                         >
                            <div className="flex items-center gap-4">
                               <div className={`p-2 rounded-xl ${h.type === 'homework' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                  {h.type === 'homework' ? <BookOpen className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                               </div>
                               <div>
                                  <p className="font-bold text-xs dark:text-white">{h.name}</p>
                                  <p className="text-[10px] text-gray-400">{h.date}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="text-right">
                                  <p className="text-xs font-black text-primary-600">{h.correctCount}/{h.total}</p>
                                  <p className="text-[8px] text-gray-400 text-center">{Math.round((h.correctCount/(parseInt(h.total) || 1))*100)}%</p>
                               </div>
                            </div>
                         </div>
                       ))
                     )}
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* All History List Modal */}
      {viewingHistoryList && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-300">
           <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-[2.5rem] shadow-2xl p-10 border dark:border-gray-700 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-8 border-b dark:border-gray-700 pb-6 shrink-0">
                 <h3 className="text-2xl font-black dark:text-white uppercase tracking-tight flex items-center gap-3">
                    <History className="w-6 h-6 text-purple-500" />
                    {language === 'zh' ? '全部练习记录' : 'All Practice History'}
                 </h3>
                 <div className="flex gap-4 items-center">
                    <select 
                      value={historyFilterSubject}
                      onChange={(e) => setHistoryFilterSubject(e.target.value)}
                      className="p-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg text-sm font-bold outline-none"
                    >
                       <option value="全部">{language === 'zh' ? '全部科目' : 'All Subjects'}</option>
                       {SUBJECTS.map(s => (
                         <option key={s.id} value={s.name}>{language === 'zh' ? s.name : s.enName}</option>
                       ))}
                    </select>
                    <input 
                      type="date"
                      value={historyFilterDate}
                      onChange={(e) => setHistoryFilterDate(e.target.value)}
                      className="p-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg text-sm font-bold outline-none dark:text-white"
                    />
                    <button onClick={() => setViewingHistoryList(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-6 h-6 dark:text-gray-400" />
                    </button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                 {historyList
                   .filter(h => {
                      if (historyFilterSubject === '全部') return true;
                      let match = false;
                      const target = SUBJECTS.find(s => s.name === historyFilterSubject || s.id === historyFilterSubject);
                      
                      // 1. Check questions array
                      if (h.questions && h.questions.length > 0) {
                          const subj = h.questions[0].subject;
                          if (!target) match = subj === historyFilterSubject;
                          else match = subj === target.name || subj === target.id;
                      }
                      
                      // 2. Robust name check (matches "MATH练习" or "数学练习")
                      if (!match) {
                          if (target) {
                              match = h.name.includes(target.name) || 
                                      h.name.toUpperCase().includes(target.id.toUpperCase()) ||
                                      (h.nameEn && h.nameEn.toUpperCase().includes(target.id.toUpperCase()));
                          } else {
                              match = h.name.includes(historyFilterSubject);
                          }
                      }
                      return match;
                   })
                   .filter(h => !historyFilterDate || h.date.startsWith(historyFilterDate))
                   .length === 0 ? (
                   <div className="py-20 text-center text-gray-400 italic">
                     {language === 'zh' ? '暂无符合条件的记录。' : 'No matching records found.'}
                   </div>
                 ) : (
                   historyList
                   .filter(h => {
                      if (historyFilterSubject === '全部') return true;
                      let match = false;
                      const target = SUBJECTS.find(s => s.name === historyFilterSubject || s.id === historyFilterSubject);

                      if (h.questions && h.questions.length > 0) {
                          const subj = h.questions[0].subject;
                          if (!target) match = subj === historyFilterSubject;
                          else match = subj === target.name || subj === target.id;
                      }
                      
                      if (!match) {
                          if (target) {
                              match = h.name.includes(target.name) || 
                                      h.name.toUpperCase().includes(target.id.toUpperCase()) ||
                                      (h.nameEn && h.nameEn.toUpperCase().includes(target.id.toUpperCase()));
                          } else {
                              match = h.name.includes(historyFilterSubject);
                          }
                      }
                      return match;
                   })
                   .filter(h => !historyFilterDate || h.date.startsWith(historyFilterDate))
                   .map((h) => (
                     <div 
                        key={h.id} 
                        onClick={() => setViewingHistory(h)}
                        className="p-4 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-between shadow-sm border dark:border-gray-700 cursor-pointer hover:border-primary-400 transition-all"
                     >
                        <div className="flex items-center gap-4">
                           <div className={`p-2 rounded-xl ${h.type === 'homework' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                              {h.type === 'homework' ? <BookOpen className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                           </div>
                           <div>
                              <p className="font-bold text-sm dark:text-white">{h.name}</p>
                              <p className="text-[10px] text-gray-400">{h.date}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="text-right">
                              <p className="text-xs font-black text-primary-600">{h.correctCount}/{h.total}</p>
                              <p className="text-[8px] text-gray-400 text-center">{Math.round((h.correctCount/(parseInt(h.total) || 1))*100)}%</p>
                           </div>
                           <ChevronRight className="w-4 h-4 text-gray-300" />
                        </div>
                     </div>
                   ))
                 )}
              </div>

              {historyTotal > historyPageSize && (
                <div className="p-4 border-t dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 rounded-b-[2.5rem] mt-4">
                   <button 
                     disabled={historyPage === 1}
                     onClick={() => fetchHistoryList(selectedStudent!, historyPage - 1)}
                     className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                   >
                     <ChevronRight className="w-5 h-5 rotate-180" />
                   </button>
                   <span className="text-xs font-bold text-gray-500">
                     {historyPage} / {Math.ceil(historyTotal / historyPageSize)}
                   </span>
                   <button 
                     disabled={historyPage >= Math.ceil(historyTotal / historyPageSize)}
                     onClick={() => fetchHistoryList(selectedStudent!, historyPage + 1)}
                     className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                   >
                     <ChevronRight className="w-5 h-5" />
                   </button>
                </div>
              )}
           </div>
        </div>
      )}

      {/* History Detail Modal */}
      {viewingHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-300">
           <div className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-[2.5rem] shadow-2xl p-10 border dark:border-gray-700 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-8 border-b dark:border-gray-700 pb-6 shrink-0">
                 <div>
                    <h3 className="text-2xl font-black dark:text-white uppercase tracking-tight flex items-center gap-3">
                       {viewingHistory.type === 'homework' ? <BookOpen className="w-6 h-6 text-blue-500" /> : <Clock className="w-6 h-6 text-purple-500" />}
                       {language === 'en' && viewingHistory.nameEn ? viewingHistory.nameEn : viewingHistory.name}
                    </h3>
                    <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">{viewingHistory.date}</p>
                 </div>
                 <button onClick={() => setViewingHistory(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <X className="w-6 h-6 dark:text-gray-400" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-4 space-y-6">
                 <div className="grid grid-cols-3 gap-4">
                    <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl text-center border dark:border-gray-700">
                       <p className="text-[10px] text-gray-400 font-black uppercase mb-1 tracking-widest">{language === 'zh' ? '总题数' : 'Total'}</p>
                       <p className="text-2xl font-black dark:text-white">{viewingHistory.total}</p>
                    </div>
                    <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-3xl text-center border border-green-100 dark:border-green-800/30">
                       <p className="text-[10px] text-green-600 font-black uppercase mb-1 tracking-widest">{language === 'zh' ? '正确数' : 'Correct'}</p>
                       <p className="text-2xl font-black text-green-600">{viewingHistory.correctCount}</p>
                    </div>
                    <div className="p-6 bg-primary-50 dark:bg-primary-900/20 rounded-3xl text-center border border-primary-100 dark:border-primary-800/30">
                       <p className="text-[10px] text-primary-600 font-black uppercase mb-1 tracking-widest">{language === 'zh' ? '正确率' : 'Score'}</p>
                       <p className="text-2xl font-black text-primary-600">{Math.round((viewingHistory.correctCount / (parseInt(viewingHistory.total) || 1)) * 100)}%</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="font-black text-sm dark:text-white uppercase tracking-wider flex items-center gap-2">
                       <Search className="w-4 h-4" />
                       {language === 'zh' ? '题目分析' : 'Question Analysis'}
                    </h4>
                    <div className="space-y-3">
                       {(viewingHistory.questions || []).map((q: any, idx: number) => (
                          <div key={idx} className={`p-6 rounded-[2rem] border-2 ${q.status === 'correct' ? 'border-green-100 bg-green-50/20 dark:border-green-900/20' : 'border-red-100 bg-red-50/20 dark:border-red-900/20'}`}>
                             <div className="flex justify-between items-start mb-4">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${q.status === 'correct' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                   {q.status === 'correct' ? (language === 'zh' ? '正确' : 'Correct') : (language === 'zh' ? '错误' : 'Wrong')}
                                </span>
                                <span className="text-[10px] text-gray-400 font-bold italic">{language === 'zh' ? '尝试次数' : 'Attempts'}: {q.attempts || 1}</span>
                             </div>
                             <p className="font-bold text-sm dark:text-white mb-4">{q.stem}</p>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
                                   <p className="text-[8px] text-gray-400 font-black uppercase mb-1">{language === 'zh' ? '学生答案' : 'Student Answer'}</p>
                                   <p className={`font-black ${q.status === 'correct' ? 'text-green-600' : 'text-red-600'}`}>{q.userAnswer}</p>
                                </div>
                                <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
                                   <p className="text-[8px] text-gray-400 font-black uppercase mb-1">{language === 'zh' ? '正确答案' : 'Correct Answer'}</p>
                                   <p className="font-black text-primary-600">{q.answer}</p>
                                </div>
                             </div>

                             {q.attemptLog && q.attemptLog.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-dashed dark:border-gray-700">
                                  <p className="text-[8px] text-gray-400 font-black uppercase mb-2 tracking-widest">{language === 'zh' ? '答题过程' : 'Attempt History'}</p>
                                  <div className="space-y-1">
                                    {q.attemptLog.map((log: any, i: number) => (
                                      <div key={i} className="flex items-center gap-2 text-[10px]">
                                         <span className="w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-500">
                                           {i + 1}
                                         </span>
                                         <span className={`font-mono font-bold ${log.isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                                           {log.answer}
                                         </span>
                                         <span className="text-gray-400">
                                           {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                                         </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                             )}
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Homework Detail Modal */}
      {viewingHomework && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-300">
           <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 border dark:border-gray-700">
              <div className="flex justify-between items-center mb-8 border-b dark:border-gray-700 pb-6">
                 <h3 className="text-2xl font-black dark:text-white uppercase tracking-tight flex items-center gap-3">
                    <BookOpen className="w-6 h-6 text-blue-500" />
                    {language === 'zh' ? '作业详情' : 'Homework Detail'}
                 </h3>
                 <button onClick={() => setViewingHomework(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <X className="w-6 h-6 dark:text-gray-400" />
                 </button>
              </div>

              <div className="space-y-8">
                 <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-[2.5rem] border dark:border-gray-700 flex items-center justify-between">
                    <div>
                       <h4 className="text-xl font-black dark:text-white mb-1">{viewingHomework.name}</h4>
                       <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{viewingHomework.date}</p>
                    </div>
                    <span className={`px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-sm ${viewingHomework.status === 'completed' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}`}>
                       {viewingHomework.status === 'completed' ? (language === 'zh' ? '已完成' : 'Completed') : (language === 'zh' ? '待完成' : 'Pending')}
                    </span>
                 </div>

                 {viewingHomework.status === 'completed' ? (
                    <div className="grid grid-cols-2 gap-6">
                       <div className="p-8 bg-primary-50 dark:bg-primary-900/20 rounded-[2rem] border border-primary-100 dark:border-primary-800 text-center">
                          <Trophy className="w-10 h-10 text-primary-600 mx-auto mb-4" />
                          <p className="text-[10px] text-primary-600 font-black uppercase mb-1">{language === 'zh' ? '最终得分' : 'Final Score'}</p>
                          <p className="text-4xl font-black text-primary-600">{viewingHomework.correctCount} / {viewingHomework.total}</p>
                       </div>
                       <div className="p-8 bg-gray-50 dark:bg-gray-900 rounded-[2rem] border dark:border-gray-700 flex flex-col justify-center text-center">
                          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-4" />
                          <p className="text-[10px] text-gray-400 font-black uppercase mb-1">{language === 'zh' ? '完成率' : 'Completion Rate'}</p>
                          <p className="text-4xl font-black dark:text-white">100%</p>
                       </div>
                    </div>
                 ) : (
                    <div className="p-12 bg-amber-50 dark:bg-amber-900/10 rounded-[2.5rem] border border-dashed border-amber-200 dark:border-amber-800/50 text-center space-y-4">
                       <Clock className="w-16 h-16 text-amber-500 mx-auto animate-pulse" />
                       <div>
                          <p className="text-xl font-black text-amber-800 dark:text-amber-400 uppercase tracking-tight">{language === 'zh' ? '尚未完成' : 'Pending Completion'}</p>
                          <p className="text-sm text-amber-700/60 dark:text-amber-500/60 font-bold">{language === 'zh' ? '学生目前还没有提交这份作业。' : 'The student has not finished this assignment yet.'}</p>
                       </div>
                    </div>
                 )}

                 <div className="flex justify-center">
                    <button 
                       onClick={() => setViewingHomework(null)}
                       className="px-10 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-full font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                    >
                       {language === 'zh' ? '关闭预览' : 'Close View'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Wrong Book Modal */}
      {viewingWrongBook && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-300">
           <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-[2.5rem] shadow-2xl p-10 border dark:border-gray-700 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-8 border-b dark:border-gray-700 pb-6 shrink-0">
                 <h3 className="text-2xl font-black dark:text-white uppercase tracking-tight flex items-center gap-3">
                    <span className="text-red-500">⚠</span>
                    {language === 'zh' ? '错题明细' : 'Mistakes Detail'}
                 </h3>
                 <div className="flex gap-4 items-center">
                    <select 
                      value={wbSubjectFilter}
                      onChange={(e) => setWbSubjectFilter(e.target.value)}
                      className="p-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg text-sm font-bold outline-none"
                    >
                       <option value="全部">{language === 'zh' ? '全部科目' : 'All Subjects'}</option>
                       {SUBJECTS.map(s => (
                         <option key={s.id} value={s.name}>{language === 'zh' ? s.name : s.enName}</option>
                       ))}
                    </select>
                    <select 
                      value={wbErrorSort}
                      onChange={(e) => setWbErrorSort(e.target.value as any)}
                      className="p-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg text-sm font-bold outline-none"
                    >
                       <option value="desc">{language === 'zh' ? '错误次数 ↓' : 'Errors Desc'}</option>
                       <option value="asc">{language === 'zh' ? '错误次数 ↑' : 'Errors Asc'}</option>
                    </select>
                    <button onClick={() => setViewingWrongBook(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-6 h-6 dark:text-gray-400" />
                    </button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 grid gap-4 grid-cols-1 md:grid-cols-2">
                 {filteredWrongBook.length === 0 ? (
                   <div className="col-span-full py-20 text-center text-gray-400 italic">
                     {language === 'zh' ? '暂无符合条件的错题记录。' : 'No matching mistakes found.'}
                   </div>
                 ) : (
                   filteredWrongBook.map((item) => (
                     <div key={item.id} className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border dark:border-gray-700 relative overflow-hidden">
                       <div className={`absolute top-0 left-0 w-2 h-full ${item.status === 5 ? 'bg-purple-500' : 'bg-red-500'}`}></div>
                       <div className="flex justify-between items-start mb-2">
                         <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded tracking-wider ${item.status === 5 ? 'bg-purple-100 text-purple-600' : 'bg-red-100 text-red-600'}`}>
                              {item.status === 5 ? (language === 'zh' ? '困难' : 'Difficult') : (language === 'zh' ? '出错' : 'Error')}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">{item.question?.subject}</span>
                         </div>
                         <span className="text-xs text-red-500 font-black">{language === 'zh' ? `错误 ${item.errorCount} 次` : `${item.errorCount} Errors`}</span>
                       </div>
                       <p className="font-bold dark:text-white mb-3 line-clamp-3">{item.question?.stemText}</p>
                       <div className="flex justify-between items-center mt-2 pt-2 border-t dark:border-gray-700">
                          <p className="text-[10px] text-gray-400">ID: {item.questionId}</p>
                          <p className="text-[10px] text-gray-400">{item.lastUpdated}</p>
                       </div>
                     </div>
                   ))
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Reinforcement Detail Modal */}
      {viewingReinforcement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-300">
           <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 border dark:border-gray-700 text-center">
              <div className="flex justify-end mb-4">
                 <button onClick={() => setViewingReinforcement(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <X className="w-6 h-6 dark:text-gray-400" />
                 </button>
              </div>

              <div className="relative mx-auto w-48 h-48 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mb-8">
                 <div className="text-8xl">{viewingReinforcement.type === 'game' ? '🎮' : viewingReinforcement.icon || '✨'}</div>
                 <div className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-xl border dark:border-gray-700">
                    {viewingReinforcement.type === 'game' ? <Gamepad2 className="w-6 h-6 text-purple-500" /> : <PlayCircle className="w-6 h-6 text-primary-500" />}
                 </div>
              </div>

              <div className="space-y-6">
                 <div>
                    <h3 className="text-3xl font-black dark:text-white uppercase tracking-tighter mb-2">{viewingReinforcement.name}</h3>
                    <p className="text-primary-600 font-black uppercase tracking-widest text-xs italic">"{viewingReinforcement.prompt || (language === 'zh' ? '继续加油！' : 'Keep going!')}"</p>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-700">
                       <p className="text-[10px] text-gray-400 font-black uppercase mb-1">{language === 'zh' ? '触发规则' : 'Trigger Rule'}</p>
                       <p className="font-bold dark:text-white">{viewingReinforcement.ruleType}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-700">
                       <p className="text-[10px] text-gray-400 font-black uppercase mb-1">{language === 'zh' ? '规则值 (N)' : 'Value (N)'}</p>
                       <p className="font-bold dark:text-white">{viewingReinforcement.ruleValue}</p>
                    </div>
                 </div>

                 <div className="p-6 bg-primary-50 dark:bg-primary-900/20 rounded-3xl border border-primary-100 dark:border-primary-800/50 flex items-start gap-3 text-left">
                    <Info className="w-5 h-5 text-primary-600 shrink-0" />
                    <p className="text-xs text-primary-700 dark:text-primary-400 font-medium leading-relaxed">
                       {language === 'zh' 
                         ? `该学生将根据当前的进度逻辑看到此强化物。目前状态为：${viewingReinforcement.isActive ? '已启用' : '已停用'}。`
                         : `This student will see this reinforcement based on their current progress logic. It is currently ${viewingReinforcement.isActive ? 'enabled and active' : 'disabled'}.`}
                    </p>
                 </div>

                 <button 
                    onClick={() => setViewingReinforcement(null)}
                    className="w-full py-5 bg-primary-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-primary-500/30 hover:bg-primary-700 transition-all active:scale-[0.98]"
                 >
                    {language === 'zh' ? '关闭预览' : 'Close Preview'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Students;
