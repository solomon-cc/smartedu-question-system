import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import Loading from '../../components/Loading';
import { Search, ChevronRight, ClipboardList, BookOpen, X, User, Calendar, CheckCircle2, HelpCircle } from 'lucide-react';

const StudentHomeworks: React.FC<{ language: 'zh' | 'en'; filter: string }> = ({ language, filter }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    api.admin.homeworks()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = data.filter(d => 
    d.name.toLowerCase().includes(filter.toLowerCase()) || 
    d.teacherName.toLowerCase().includes(filter.toLowerCase()) || 
    d.className.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden border dark:border-gray-700 shadow-sm animate-in fade-in duration-300">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr className="text-xs font-black text-gray-400 uppercase tracking-widest">
              <th className="px-6 py-4">{language === 'zh' ? '作业名称' : 'Homework'}</th>
              <th className="px-6 py-4">{language === 'zh' ? '发布教师' : 'Teacher'}</th>
              <th className="px-6 py-4">{language === 'zh' ? '完成进度' : 'Progress'}</th>
              <th className="px-6 py-4">{language === 'zh' ? '状态' : 'Status'}</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                  {language === 'zh' ? '暂无数据' : 'No records found'}
                </td>
              </tr>
            )}
            {filtered.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                <td className="px-6 py-4 font-bold dark:text-white">{item.name}</td>
                <td className="px-6 py-4 text-sm dark:text-gray-300">{item.teacherName}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary-600 rounded-full" 
                        style={{ width: `${item.total > 0 ? (item.completed/item.total)*100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-gray-500">{item.completed}/{item.total}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => setSelectedItem(item)}
                    className="text-gray-400 hover:text-primary-600 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 border dark:border-gray-700 relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="absolute top-0 left-0 w-full h-2 bg-primary-600"></div>
            <button onClick={() => setSelectedItem(null)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <X className="w-6 h-6 dark:text-gray-400" />
            </button>
            
            <div className="mb-8 shrink-0">
              <span className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
                Homework Details
              </span>
              <h3 className="text-3xl font-black dark:text-white leading-tight">{selectedItem.name}</h3>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                <div className="grid grid-cols-2 gap-6 mb-10">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <User className="w-3 h-3" /> Teacher
                    </p>
                    <p className="font-bold dark:text-gray-200">{selectedItem.teacherName}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Assigned Date
                    </p>
                    <p className="font-bold dark:text-gray-200">{selectedItem.startDate}</p>
                </div>
                </div>

                <div className="p-8 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border dark:border-gray-700 mb-8">
                <div className="flex justify-between items-end mb-4">
                    <h4 className="font-black dark:text-white text-sm uppercase tracking-widest">Completion Progress</h4>
                    <span className="text-2xl font-black text-primary-600">{selectedItem.total > 0 ? Math.round((selectedItem.completed / selectedItem.total) * 100) : 0}%</span>
                </div>
                <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                    className="h-full bg-primary-600 rounded-full transition-all duration-1000" 
                    style={{ width: `${selectedItem.total > 0 ? (selectedItem.completed / selectedItem.total) * 100 : 0}%` }}
                    ></div>
                </div>
                </div>

                {selectedItem.results && selectedItem.results.length > 0 && (
                <div className="space-y-4">
                    <h4 className="font-black dark:text-white text-sm uppercase tracking-widest px-2">Student Submissions</h4>
                    <div className="space-y-3">
                    {selectedItem.results.map((res: any, idx: number) => (
                        <StudentResultItem key={idx} res={res} language={language} />
                    ))}
                    </div>
                </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StudentResultItem: React.FC<{ res: any; language: 'zh' | 'en' }> = ({ res, language }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 font-bold">
            {(res.studentName || 'U')[0].toUpperCase()}
          </div>
          <div className="text-left">
            <p className="font-bold dark:text-white text-sm">{res.studentName}</p>
            <p className="text-[10px] text-gray-400">{res.date}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-black text-primary-600">{res.correctCount}/{res.total}</span>
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>
      
      {expanded && (
        <div className="p-4 border-t dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 space-y-4">
          {res.questions?.map((q: any, i: number) => (
            <div key={i} className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Question #{i+1}</p>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${q.status === 'correct' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {q.status === 'correct' ? (language === 'zh' ? '正确' : 'Correct') : (language === 'zh' ? '错误' : 'Wrong')}
                </span>
              </div>
              <p className="font-bold dark:text-white text-sm mb-3">{q.stem}</p>
              {q.options && q.options.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                    {q.options.map((opt: any, oi: number) => {
                    const optText = typeof opt === 'string' ? opt : opt.text;
                    const optVal = typeof opt === 'string' ? opt : opt.value;
                    const isUserAnswer = q.userAnswer === optVal || (typeof q.userAnswer === 'string' && q.userAnswer.split(',').includes(optVal));
                    const isCorrectAnswer = q.answer === optVal || (typeof q.answer === 'string' && q.answer.split(',').includes(optVal));
                    
                    return (
                        <div 
                        key={oi} 
                        className={`p-2 px-3 rounded-lg text-[11px] flex items-center justify-between border-2 transition-all ${
                            isCorrectAnswer ? 'bg-green-50 border-green-500/30 text-green-700 dark:bg-green-900/20' : 
                            isUserAnswer ? 'bg-red-50 border-red-500/30 text-red-700 dark:bg-red-900/20' : 
                            'bg-white dark:bg-gray-900 border-transparent dark:text-gray-400'
                        }`}
                        >
                        <span className="font-bold">{String.fromCharCode(65+oi)}. {optText}</span>
                        {isUserAnswer && <span className="text-[8px] font-black uppercase opacity-60 ml-2">{language === 'zh' ? '学生选择' : 'USER'}</span>}
                        </div>
                    );
                    })}
                </div>
              ) : (
                <div className="flex gap-3 text-[11px]">
                  <div className="flex-1 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                    <p className="text-[8px] font-black text-green-600 uppercase mb-1">Standard</p>
                    <p className="font-bold text-green-700 dark:text-green-400">{q.answer}</p>
                  </div>
                  <div className="flex-1 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-700">
                    <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Student Choice</p>
                    <p className={`font-bold ${q.status === 'correct' ? 'text-green-600' : 'text-red-600'}`}>{q.userAnswer}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StudentPractices: React.FC<{ language: 'zh' | 'en'; filter: string }> = ({ language, filter }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    api.admin.practices()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = data.filter(d => 
    d.studentName.toLowerCase().includes(filter.toLowerCase()) || 
    d.name.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden border dark:border-gray-700 shadow-sm animate-in fade-in duration-300">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr className="text-xs font-black text-gray-400 uppercase tracking-widest">
              <th className="px-6 py-4">{language === 'zh' ? '学生姓名' : 'Student'}</th>
              <th className="px-6 py-4">{language === 'zh' ? '练习内容' : 'Activity'}</th>
              <th className="px-6 py-4">{language === 'zh' ? '完成时间' : 'Date'}</th>
              <th className="px-6 py-4">{language === 'zh' ? '正确率' : 'Accuracy'}</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                  {language === 'zh' ? '暂无数据' : 'No records found'}
                </td>
              </tr>
            )}
            {filtered.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                <td className="px-6 py-4 font-bold dark:text-white">{item.studentName}</td>
                <td className="px-6 py-4 text-sm dark:text-gray-300">{item.name}</td>
                <td className="px-6 py-4 text-xs text-gray-500">{item.date}</td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-blue-600">{item.accuracy}</span>
                  <span className="text-[10px] text-gray-400 ml-2">({item.score})</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => setSelectedItem(item)}
                    className="text-gray-400 hover:text-primary-600 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 border dark:border-gray-700 relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
            <button onClick={() => setSelectedItem(null)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <X className="w-6 h-6 dark:text-gray-400" />
            </button>
            
            <div className="mb-8 shrink-0">
              <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
                Practice Result
              </span>
              <h3 className="text-3xl font-black dark:text-white leading-tight">{selectedItem.name}</h3>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                <div className="grid grid-cols-2 gap-6 mb-10">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <User className="w-3 h-3" /> Student
                    </p>
                    <p className="font-bold dark:text-gray-200">{selectedItem.studentName}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Completion Time
                    </p>
                    <p className="font-bold dark:text-gray-200">{selectedItem.date}</p>
                </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-3xl border border-green-100 dark:border-green-800 flex items-center gap-4">
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl text-green-600 shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Accuracy</p>
                    <p className="text-2xl font-black dark:text-white">{selectedItem.accuracy}</p>
                    </div>
                </div>
                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800 flex items-center gap-4">
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl text-blue-600 shadow-sm">
                    <HelpCircle className="w-6 h-6" />
                    </div>
                    <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Score</p>
                    <p className="text-2xl font-black dark:text-white">{selectedItem.score}</p>
                    </div>
                </div>
                </div>

                <div className="space-y-4">
                <h4 className="font-black dark:text-white text-sm uppercase tracking-widest px-2">Question Details</h4>
                <div className="space-y-4 pr-2">
                    {selectedItem.questions?.map((q: any, i: number) => (
                    <div key={i} className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-[2rem] border dark:border-gray-700">
                        <div className="flex justify-between items-start mb-4">
                        <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-[10px] font-black text-gray-400 border dark:border-gray-700">
                            #{i+1}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${q.status === 'correct' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {q.status === 'correct' ? (language === 'zh' ? '正确' : 'Correct') : (language === 'zh' ? '错误' : 'Wrong')}
                        </span>
                        </div>
                        <p className="font-bold dark:text-white text-lg mb-6 leading-tight">{q.stem}</p>
                        
                        {q.options ? (
                        <div className="grid grid-cols-1 gap-3">
                            {q.options.map((opt: any, oi: number) => {
                            const optText = typeof opt === 'string' ? opt : opt.text;
                            const optVal = typeof opt === 'string' ? opt : opt.value;
                            const isUserAnswer = q.userAnswer === optVal || (typeof q.userAnswer === 'string' && q.userAnswer.split(',').includes(optVal));
                            const isCorrectAnswer = q.answer === optVal || (typeof q.answer === 'string' && q.answer.split(',').includes(optVal));

                            return (
                                <div key={oi} className={`p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${
                                isCorrectAnswer ? 'bg-green-50 border-green-500/30 text-green-700' : 
                                isUserAnswer ? 'bg-red-50 border-red-500/30 text-red-700' : 
                                'bg-white dark:bg-gray-800 border-transparent dark:text-gray-300 shadow-sm'
                                }`}>
                                <span className="font-bold text-sm">{String.fromCharCode(65+oi)}. {optText}</span>
                                {isUserAnswer && <span className="text-[8px] font-black uppercase opacity-60">{language === 'zh' ? '学生选择' : 'USER CHOICE'}</span>}
                                </div>
                            );
                            })}
                        </div>
                        ) : (
                        <div className="flex gap-4">
                            <div className="flex-1 p-4 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700">
                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Standard</p>
                            <p className="font-bold text-green-600">{q.answer}</p>
                            </div>
                            <div className="flex-1 p-4 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700">
                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Student</p>
                            <p className={`font-bold ${q.status === 'correct' ? 'text-green-600' : 'text-red-600'}`}>{q.userAnswer}</p>
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
    </div>
  );
};

const HomeworkAudit: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const [activeTab, setActiveTab] = useState<'homework' | 'practice'>('homework');
  const [filter, setFilter] = useState('');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-black dark:text-white uppercase tracking-tight">{language === 'zh' ? '作业审计中心' : 'Homework Audit'}</h2>
        
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab('homework')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'homework' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <ClipboardList className="w-4 h-4" />
            {language === 'zh' ? '作业完成情况' : 'Homeworks'}
          </button>
          <button 
            onClick={() => setActiveTab('practice')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'practice' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <BookOpen className="w-4 h-4" />
            {language === 'zh' ? '学生练习情况' : 'Practices'}
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input 
          type="text" 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={language === 'zh' ? '搜索关键字...' : 'Search by keyword...'}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border-2 dark:border-gray-700 rounded-[1.5rem] outline-none focus:border-primary-500 shadow-sm font-bold"
        />
      </div>

      {activeTab === 'homework' ? (
        <StudentHomeworks language={language} filter={filter} />
      ) : (
        <StudentPractices language={language} filter={filter} />
      )}
    </div>
  );
};

export default HomeworkAudit;