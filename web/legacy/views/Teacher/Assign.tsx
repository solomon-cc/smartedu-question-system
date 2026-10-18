import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Send, User, Book, Search, CheckCircle2, LayoutGrid, FileCheck, ChevronRight, UserCircle, Clock, ArrowLeft, X, PlayCircle, Brain, Layers, Eye } from 'lucide-react';
import { api } from '../../services/api.ts';
import { Role, QuestionType } from '../../types';
import Loading from '../../components/Loading';
import ConfirmationModal from '../../components/ConfirmationModal';
import { SUBJECTS, GRADES } from '../../utils.ts';

const Assign: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'assign' | 'status'>('assign');
  const [selectionMode, setSelectionMode] = useState<'paper' | 'skill'>('skill');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [selectedHw, setSelectedHw] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hwDetailsLoading, setHwDetailsLoading] = useState(false);
  
  // Preview State
  const [previewQuestion, setPreviewQuestion] = useState<any>(null);

  // Skill Mode State
  const [skillSubject, setSkillSubject] = useState('MATH');
  const [skillGrade, setSkillGrade] = useState(1);
  const [skills, setSkills] = useState<any[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);

  // Modal State for Alerts
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationModalProps, setConfirmationModalProps] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'error' | 'confirm' | 'delete',
    onConfirm: () => {},
    confirmText: '',
    cancelText: '',
  });
  // Data State
  const [students, setStudents] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [historicalHw, setHistoricalHw] = useState<any[]>([]);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [viewingRecord, setViewingRecord] = useState<any>(null);
  
  // Form State
  const [selectedPaperId, setSelectedPaperId] = useState('');
  const [homeworkName, setHomeworkName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [repeatInterval, setRepeatInterval] = useState<'none' | 'daily' | '3days' | 'weekly' | 'monthly'>('none');
  
  // New Filter State
  const [filterWrongBook, setFilterWrongBook] = useState(false);
  const [questionStats, setQuestionStats] = useState<Record<string, { attempts: number, accuracy: number, isWrong: boolean }>>({});

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectionMode === 'skill') {
      fetchSkills();
    }
  }, [selectionMode, skillSubject, skillGrade]);

  const fetchSkills = async () => {
    setSkillsLoading(true);
    try {
      const data = await api.skills.questions({ subject: skillSubject, grade: skillGrade });
      setSkills(data);
    } catch (e) {
      console.error(e);
    } finally {
      setSkillsLoading(false);
    }
  };

  // Fetch student specific question stats when students are selected
  useEffect(() => {
    if (selectedStudents.length > 0) {
      const loadStats = async () => {
        const stats: Record<string, { attempts: number, accuracy: number, isWrong: boolean }> = {};
        const wrongPromises = selectedStudents.map(id => api.wrongBook.list(id));
        const wrongLists = await Promise.all(wrongPromises);
        
        const wrongQIDs = new Set<string>();
        wrongLists.flat().forEach((w: any) => wrongQIDs.add(w.questionId));
        
        const allQuestions: any[] = [];
        if (selectionMode === 'skill') {
          skills.forEach(t => t.objectives?.forEach((o: any) => o.questions?.forEach((q: any) => allQuestions.push(q))));
        } else {
          papers.forEach(p => p.questions?.forEach((q: any) => allQuestions.push(q)));
        }

        allQuestions.forEach(q => {
           stats[q.id] = {
             attempts: q.attempts || 0,
             accuracy: q.correctRate || 0,
             isWrong: wrongQIDs.has(q.id)
           };
        });
        setQuestionStats(stats);
      };
      
      loadStats();
    } else {
      setQuestionStats({});
    }
  }, [selectedStudents, papers, skills, selectionMode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsData, papersData, hwData, historyData] = await Promise.all([
        api.students.list(),
        api.papers.list(),
        api.homework.list(),
        api.history.list(1, 1000)
      ]);

      setHistoryRecords(historyData.list || []);

      setStudents(studentsData.map((u: any) => ({
        id: u.id,
        name: u.username,
        completion: '0%'
      })));

      setPapers(papersData);
      
      setHistoricalHw(hwData.map((h: any) => ({
        id: h.id,
        title: h.name,
        date: h.startDate,
        total: h.total,
        submitted: h.completed,
        studentIds: h.studentIds || []
      })));

      const autoOpenId = searchParams.get('id');
      if (autoOpenId) {
        const target = hwData.find((h: any) => h.id === autoOpenId);
        if (target) {
          setActiveTab('status');
          setSelectedHw({
            id: target.id,
            title: target.name,
            date: target.startDate,
            total: target.total,
            submitted: target.completed,
            studentIds: target.studentIds || []
          });
        }
      }

      if (papersData.length > 0) {
        setSelectedPaperId(papersData[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStemText = (q: any) => {
    if (q.stemText) return q.stemText;
    if (typeof q.stem === 'string') {
      try {
        const parsed = JSON.parse(q.stem);
        if (parsed && parsed.text) return parsed.text;
        return q.stem;
      } catch (e) {
        return q.stem;
      }
    }
    if (q.stem && q.stem.text) return q.stem.text;
    return language === 'zh' ? '题目内容' : 'Question content';
  };

  const handleAssign = async () => {
    if ((selectionMode === 'paper' && !selectedPaperId) || (selectionMode === 'skill' && selectedQuestions.length === 0) || !deadline || selectedStudents.length === 0) return;
    
    let finalQuestionIds: string[] = [];
    let name = homeworkName || (language === 'zh' ? '自主作业' : 'Homework');

    if (selectionMode === 'paper') {
      const paper = papers.find(p => p.id === selectedPaperId);
      finalQuestionIds = paper?.questions?.map((q: any) => q.id) || [];
      name = paper?.name || name;
    } else {
      finalQuestionIds = selectedQuestions;
    }

    if (filterWrongBook && selectedStudents.length > 0) {
       finalQuestionIds = finalQuestionIds.filter((qid: string) => questionStats[qid]?.isWrong);
    }

    if (finalQuestionIds.length === 0) {
       setConfirmationModalProps({
        title: language === 'zh' ? '无法发布' : 'Cannot Assign',
        message: language === 'zh' ? '所选筛选条件下没有题目可发布。' : 'No questions match the filter criteria.',
        type: 'warning',
        onConfirm: () => setIsConfirmationModalOpen(false),
        confirmText: 'OK', cancelText: ''
      });
      setIsConfirmationModalOpen(true);
      return;
    }

    try {
      await api.homework.assign({
        name: name,
        classId: '3-1', 
        startDate: new Date().toISOString().split('T')[0],
        endDate: deadline,
        studentIds: selectedStudents,
        questionIds: finalQuestionIds,
        repeatInterval: repeatInterval
      });
      setConfirmationModalProps({
        title: language === 'zh' ? '发布成功' : 'Assignment Success',
        message: language === 'zh' ? '家庭作业已成功发布。' : 'Homework has been successfully assigned.',
        type: 'success',
        onConfirm: () => setIsConfirmationModalOpen(false),
        confirmText: 'OK', cancelText: ''
      });
      setIsConfirmationModalOpen(true);
      setSelectedStudents([]);
      setSelectedQuestions([]);
      setDeadline('');
      fetchData();
    } catch (e) {
      console.error(e);
      setConfirmationModalProps({
        title: language === 'zh' ? '发布失败' : 'Assignment Failed',
        message: language === 'zh' ? '发布家庭作业失败。' : 'Failed to assign homework.',
        type: 'error',
        onConfirm: () => setIsConfirmationModalOpen(false),
        confirmText: 'OK', cancelText: ''
      });
      setIsConfirmationModalOpen(true);
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleQuestion = (id: string) => {
    setSelectedQuestions(prev => 
      prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]
    );
  };

  const startTrial = () => {
    let qIds = "";
    if (selectionMode === 'skill') {
      qIds = selectedQuestions.join(',');
    } else {
      const paper = papers.find(p => p.id === selectedPaperId);
      qIds = paper?.questions?.map((q: any) => q.id).join(',') || "";
    }
    if (!qIds) return;
    window.open(`/#/practice?questionIds=${qIds}&trial=true`, '_blank');
  };

  if (viewingRecord) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <button 
          onClick={() => setViewingRecord(null)}
          className="flex items-center gap-2 text-primary-600 font-bold hover:underline"
        >
          <ArrowLeft className="w-5 h-5" />
          {language === 'zh' ? '返回作业明细' : 'Back to Detail'}
        </button>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700">
          <div className="flex justify-between items-center mb-8 border-b dark:border-gray-700 pb-6">
            <h2 className="text-2xl font-black dark:text-white">{viewingRecord.studentName} {language === 'zh' ? '的答题记录' : 'History'}</h2>
            <div className="text-right">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{language === 'zh' ? '完成时间' : 'Finished At'}</p>
              <p className="font-bold dark:text-white">{viewingRecord.date}</p>
            </div>
          </div>

          <div className="space-y-6">
            {viewingRecord.questions?.map((q: any, idx: number) => {
               const stemText = typeof q.stem === 'string' ? q.stem : q.stem?.text || '';
               return (
                <div key={idx} className="p-6 rounded-[2rem] bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 relative overflow-hidden">
                   <div className={`absolute top-0 left-0 w-2 h-full ${q.status === 'correct' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                   <div className="flex justify-between items-start mb-4">
                      <p className="font-bold dark:text-white text-lg">{idx + 1}. {stemText}</p>
                      {q.status === 'correct' ? <CheckCircle2 className="text-green-500 w-6 h-6" /> : <X className="text-red-500 w-6 h-6" />}
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-800">
                        <p className="text-[10px] text-green-600 font-black mb-1">{language === 'zh' ? '正确答案' : 'Correct'}</p>
                        <p className="text-green-700 dark:text-green-400 font-bold">{q.answer}</p>
                      </div>
                      <div className={`p-4 rounded-2xl border ${q.status === 'correct' ? 'bg-primary-50 dark:bg-primary-900/10 border-primary-100 dark:border-primary-800' : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800'}`}>
                        <p className={`text-[10px] font-black mb-1 ${q.status === 'correct' ? 'text-primary-600' : 'text-red-600'}`}>{language === 'zh' ? '回答' : 'Answer'}</p>
                        <p className={`font-bold ${q.status === 'correct' ? 'text-primary-700 dark:text-primary-400' : 'text-red-700 dark:text-red-400'}`}>{q.userAnswer}</p>
                      </div>
                   </div>
                </div>
               );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (selectedHw) {
    const hwHistory = historyRecords.filter(h => String(h.homeworkId) === String(selectedHw.id));
    const targetStudentIds = selectedHw.studentIds || [];

    const enrichedStudents = students
      .filter(s => targetStudentIds.includes(String(s.id)))
      .map(s => {
        const record = hwHistory.find(h => String(h.studentId) === String(s.id));
        let completion = '0%';
        if (record) {
          const total = parseInt(record.total) || 1;
          const answered = (record.correctCount || 0) + (record.wrongCount || 0);
          completion = Math.round((answered / total) * 100) + '%';
        }
        return {
          ...s,
          completion: completion,
          isDone: !!record,
          rawRecord: record
        };
      });

    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <button 
          onClick={() => setSelectedHw(null)}
          className="flex items-center gap-2 text-primary-600 font-bold hover:underline"
        >
          <ArrowLeft className="w-5 h-5" />
          {language === 'zh' ? '返回列表' : 'Back to List'}
        </button>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700">
          <h2 className="text-2xl font-black dark:text-white mb-2">{selectedHw.title}</h2>
          <p className="text-gray-500 mb-8 flex items-center gap-2"><Clock className="w-4 h-4" /> {selectedHw.date}</p>
          
          {hwDetailsLoading ? <Loading /> : (
          <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-700">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{language === 'zh' ? '提交人数' : 'Submitted'}</p>
               <p className="text-2xl font-black dark:text-white">{enrichedStudents.filter(s => s.isDone).length} / {targetStudentIds.length}</p>
            </div>
            <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800">
               <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">{language === 'zh' ? '提交率' : 'Rate'}</p>
               <p className="text-2xl font-black text-green-600">{targetStudentIds.length > 0 ? Math.round((enrichedStudents.filter(s => s.isDone).length / targetStudentIds.length) * 100) : 0}%</p>
            </div>
          </div>

          <div className="space-y-4">
             <h3 className="font-bold dark:text-white mb-4">{language === 'zh' ? '学生完成明细' : 'Student Detail'}</h3>
             <div className="divide-y dark:divide-gray-700">
                {enrichedStudents.map(s => (
                  <div key={s.id} className="py-4 flex items-center justify-between group">
                     <div className="flex items-center gap-3">
                        <UserCircle className="w-10 h-10 text-gray-300" />
                        <div>
                           <p className="font-bold dark:text-white">{s.name}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-6">
                        <div className="text-right">
                           <p className={`text-sm font-black ${s.isDone ? 'text-green-500' : 'text-red-500'}`}>{s.completion}</p>
                           <p className="text-[10px] text-gray-400">{s.isDone ? (language === 'zh' ? '已完成' : 'Done') : (language === 'zh' ? '待完成' : 'Pending')}</p>
                        </div>
                        {s.isDone && (
                          <button 
                            onClick={() => setViewingRecord({ ...s.rawRecord, studentName: s.name })}
                            className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-400 hover:text-primary-600 transition-all"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        )}
                     </div>
                  </div>
                ))}
             </div>
          </div>
          </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col items-center gap-6 mb-8">
        <h2 className="text-3xl font-black dark:text-white">{language === 'zh' ? '作业管理' : 'HW Management'}</h2>
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-full max-w-md">
           <button 
            onClick={() => setActiveTab('assign')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'assign' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400' : 'text-gray-500'}`}
           >
             <LayoutGrid className="w-5 h-5" />
             {language === 'zh' ? '布置作业' : 'Assign'}
           </button>
           <button 
            onClick={() => setActiveTab('status')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'status' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400' : 'text-gray-500'}`}
           >
             <FileCheck className="w-5 h-5" />
             {language === 'zh' ? '完成情况' : 'Status'}
           </button>
        </div>
      </div>
      
      {loading ? <Loading /> : activeTab === 'assign' ? (
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700 shadow-sm">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black dark:text-white flex items-center gap-2">
                    <Brain className="w-6 h-6 text-primary-600" />
                    {language === 'zh' ? '第一步：选择题目' : 'Step 1: Select Questions'}
                  </h3>
                  <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
                    <button 
                      onClick={() => setSelectionMode('skill')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectionMode === 'skill' ? 'bg-white dark:bg-gray-800 shadow-sm text-primary-600' : 'text-gray-500'}`}
                    >
                      {language === 'zh' ? '技能练习选题' : 'Skill Tree'}
                    </button>
                    <button 
                      onClick={() => setSelectionMode('paper')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectionMode === 'paper' ? 'bg-white dark:bg-gray-800 shadow-sm text-primary-600' : 'text-gray-500'}`}
                    >
                      {language === 'zh' ? '按试卷选题' : 'By Paper'}
                    </button>
                  </div>
               </div>

               {selectionMode === 'paper' ? (
                 <div className="space-y-6">
                   <div className="flex gap-2 items-center">
                    <select 
                        value={selectedPaperId}
                        onChange={(e) => setSelectedPaperId(e.target.value)}
                        className="flex-1 p-4 rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-4 focus:ring-primary-500/20 dark:text-white font-bold"
                      >
                        {papers.length === 0 && <option value="">{language === 'zh' ? '暂无试卷' : 'No Papers'}</option>}
                        {papers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.total}题)</option>)}
                      </select>
                      {selectedPaperId && (
                        <button 
                          onClick={() => {
                            const p = papers.find(pp => pp.id === selectedPaperId);
                            if (p && p.questions && p.questions.length > 0) {
                              setPreviewQuestion(p.questions[0]);
                            }
                          }}
                          className="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-primary-600 transition-all flex items-center gap-2 font-bold"
                        >
                          <Eye className="w-5 h-5" />
                          <span className="hidden md:inline">{language === 'zh' ? '预览题目' : 'Preview'}</span>
                        </button>
                      )}
                   </div>
                 </div>
               ) : (
                 <div className="space-y-6">
                    <div className="flex flex-wrap gap-4 mb-6">
                       <select 
                         value={skillSubject}
                         onChange={(e) => setSkillSubject(e.target.value)}
                         className="p-3 rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold outline-none"
                       >
                         {SUBJECTS.filter(s => s.id !== 'ALL').map(s => <option key={s.id} value={s.id}>{language === 'zh' ? s.name : s.enName}</option>)}
                       </select>
                       <select 
                         value={skillGrade}
                         onChange={(e) => setSkillGrade(parseInt(e.target.value))}
                         className="p-3 rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold outline-none"
                       >
                         {GRADES.map(g => <option key={g.id} value={g.id}>{language === 'zh' ? g.name : g.enName}</option>)}
                       </select>
                    </div>

                    {skillsLoading ? <Loading /> : (
                      <div className="grid md:grid-cols-2 gap-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                         {skills.map(topic => (
                           <div key={topic.id} className="space-y-3">
                              <h4 className="font-black text-sm text-primary-600 border-l-4 border-primary-600 pl-2">{topic.name}</h4>
                              <div className="space-y-2">
                                {topic.objectives?.map((obj: any) => (
                                  <div key={obj.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                                     <p className="text-xs font-bold mb-2 dark:text-gray-300">{obj.name}</p>
                                     <div className="flex flex-wrap gap-2">
                                        {obj.questions?.map((q: any, idx: number) => {
                                          const isSelected = selectedQuestions.includes(q.id);
                                          const stats = questionStats[q.id];
                                          return (
                                            <div key={q.id} className="flex items-center gap-1 group/q">
                                              <button
                                                onClick={() => toggleQuestion(q.id)}
                                                className={`
                                                  flex-1 px-3 py-2 rounded-xl text-[10px] font-bold transition-all border text-left truncate
                                                  ${isSelected 
                                                    ? 'bg-primary-600 text-white border-primary-600 shadow-md scale-[1.02]' 
                                                    : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-100 dark:border-gray-700 hover:border-primary-300'}
                                                  ${stats?.isWrong ? 'ring-2 ring-red-500 ring-offset-1' : ''}
                                                `}
                                                title={getStemText(q)}
                                              >
                                                {getStemText(q)}
                                              </button>
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setPreviewQuestion(q);
                                                }}
                                                className="p-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all opacity-0 group-hover/q:opacity-100"
                                              >
                                                <Eye className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          );
                                        })}
                                     </div>
                                  </div>
                                ))}
                              </div>
                           </div>
                         ))}
                      </div>
                    )}
                 </div>
               )}
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700 shadow-sm grid md:grid-cols-2 gap-8">
               <div className="space-y-6">
                  <h3 className="text-xl font-black dark:text-white flex items-center gap-2">
                    <Clock className="w-6 h-6 text-primary-600" />
                    {language === 'zh' ? '第二步：设置详情' : 'Step 2: Settings'}
                  </h3>
                  
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">{language === 'zh' ? '作业名称 (可选)' : 'Homework Name'}</label>
                    <input 
                      type="text" 
                      value={homeworkName}
                      onChange={(e) => setHomeworkName(e.target.value)}
                      placeholder={language === 'zh' ? '例：第一单元复习' : 'Review Unit 1'}
                      className="w-full p-4 rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">{language === 'zh' ? '截止日期' : 'Deadline'}</label>
                    <input 
                      type="date" 
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full p-4 rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold outline-none" 
                    />
                  </div>
               </div>

               <div className="space-y-6">
                  <h3 className="text-xl font-black dark:text-white flex items-center gap-2">
                    <Layers className="w-6 h-6 text-primary-600" />
                    {language === 'zh' ? '第三步：额外选项' : 'Step 3: Options'}
                  </h3>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">{language === 'zh' ? '重复周期' : 'Repeat Interval'}</label>
                    <select 
                      value={repeatInterval}
                      onChange={(e) => setRepeatInterval(e.target.value as any)}
                      className="w-full p-4 rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold outline-none"
                    >
                      <option value="none">{language === 'zh' ? '不重复' : 'No Repeat'}</option>
                      <option value="daily">{language === 'zh' ? '每天' : 'Daily'}</option>
                      <option value="3days">{language === 'zh' ? '每3天' : 'Every 3 Days'}</option>
                      <option value="weekly">{language === 'zh' ? '每周' : 'Weekly'}</option>
                      <option value="monthly">{language === 'zh' ? '每月' : 'Monthly'}</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                     <button 
                       onClick={startTrial}
                       disabled={selectionMode === 'skill' ? selectedQuestions.length === 0 : !selectedPaperId}
                       className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 hover:bg-amber-600 transition-all disabled:opacity-50"
                     >
                       <PlayCircle className="w-5 h-5" />
                       {language === 'zh' ? '试做模式' : 'Trial Mode'}
                     </button>
                     <button 
                        onClick={handleAssign}
                        disabled={selectedStudents.length === 0 || (selectionMode === 'skill' && selectedQuestions.length === 0) || (selectionMode === 'paper' && !selectedPaperId)}
                        className="flex-[2] py-4 bg-primary-600 text-white rounded-2xl font-black shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2 hover:bg-primary-700 transition-all disabled:opacity-50"
                     >
                        <Send className="w-5 h-5" />
                        {language === 'zh' ? '立即发布' : 'Assign Now'}
                     </button>
                  </div>
               </div>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700 shadow-sm flex flex-col h-[700px] sticky top-8">
            <div className="flex justify-between items-center mb-6">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <User className="w-4 h-4" /> {language === 'zh' ? '选择学生' : 'Select Students'}
              </label>
              <button 
                onClick={() => setSelectedStudents(selectedStudents.length === students.length ? [] : students.map(s => s.id))}
                className="text-xs text-primary-600 font-bold hover:underline"
              >
                {selectedStudents.length === students.length ? (language === 'zh' ? '全不选' : 'None') : (language === 'zh' ? '全选' : 'All')}
              </button>
            </div>
            
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder={language === 'zh' ? '搜索学生...' : 'Search...'}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
               {students.map(s => (
                 <button 
                  key={s.id}
                  onClick={() => toggleStudent(s.id)}
                  className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between text-left
                    ${selectedStudents.includes(s.id) 
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                      : 'border-transparent bg-gray-50 dark:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-700'}
                  `}
                 >
                   <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${selectedStudents.includes(s.id) ? 'bg-primary-600 text-white shadow-lg' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                        {s.name[0]}
                     </div>
                     <div>
                       <p className="font-bold dark:text-white text-sm">{s.name}</p>
                     </div>
                   </div>
                   {selectedStudents.includes(s.id) && <CheckCircle2 className="w-5 h-5 text-primary-600" />}
                 </button>
               ))}
            </div>

            <div className="mt-6 pt-6 border-t dark:border-gray-700">
               <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{language === 'zh' ? '所选汇总' : 'Summary'}</span>
                  <span className="text-xs font-black text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded-lg">
                    {selectedStudents.length} {language === 'zh' ? '人' : 'Students'}
                  </span>
               </div>
               <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{language === 'zh' ? '已选题目' : 'Questions'}</span>
                  <span className="text-xs font-black text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
                    {selectionMode === 'skill' ? selectedQuestions.length : (papers.find(p => p.id === selectedPaperId)?.total || 0)} {language === 'zh' ? '题' : 'Items'}
                  </span>
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border dark:border-gray-700 shadow-sm overflow-hidden">
           <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                 <tr className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-8 py-6">{language === 'zh' ? '作业标题' : 'Title'}</th>
                    <th className="px-8 py-6">{language === 'zh' ? '发布时间' : 'Date'}</th>
                    <th className="px-8 py-6">{language === 'zh' ? '完成进度' : 'Progress'}</th>
                    <th className="px-8 py-6"></th>
                 </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                 {historicalHw.length === 0 && (
                   <tr><td colSpan={4} className="px-8 py-6 text-center text-gray-400">{language === 'zh' ? '暂无作业记录' : 'No homeworks'}</td></tr>
                 )}
                 {historicalHw.map(hw => (
                   <tr key={hw.id} className="group hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                      <td className="px-8 py-6">
                        <p className="font-bold dark:text-white">{hw.title}</p>
                      </td>
                      <td className="px-8 py-6 text-sm text-gray-500">{hw.date}</td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                               <div 
                                className="h-full bg-primary-600 rounded-full" 
                                style={{ width: `${hw.total > 0 ? (hw.submitted/hw.total)*100 : 0}%` }}
                               ></div>
                            </div>
                            <span className="text-xs font-bold text-gray-500">{hw.submitted}/{hw.total} {language === 'zh' ? '人' : 'Students'}</span>
                         </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <button 
                          onClick={() => setSelectedHw(hw)}
                          className="flex items-center gap-1 ml-auto text-primary-600 font-bold text-sm hover:underline"
                         >
                            {language === 'zh' ? '详细数据' : 'Details'}
                            <ChevronRight className="w-4 h-4" />
                         </button>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {isConfirmationModalOpen && (
        <ConfirmationModal
          isOpen={isConfirmationModalOpen}
          onClose={() => setIsConfirmationModalOpen(false)}
          {...confirmationModalProps}
        />
      )}

      {/* Question Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 md:p-10 border dark:border-gray-700 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-6 shrink-0">
                 <h3 className="text-xl font-black dark:text-white uppercase tracking-tight flex items-center gap-3">
                    <Eye className="w-6 h-6 text-primary-600" />
                    {language === 'zh' ? '题目预览' : 'Question Preview'}
                 </h3>
                 <button onClick={() => setPreviewQuestion(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <X className="w-6 h-6 dark:text-gray-400" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-8 py-4">
                 <div>
                    <span className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
                       {previewQuestion.subject} · {previewQuestion.type}
                    </span>
                    <h4 className="text-2xl font-bold dark:text-white mb-6 leading-relaxed">
                       {getStemText(previewQuestion)}
                    </h4>
                    {previewQuestion.stemImage && (
                       <div className="rounded-3xl overflow-hidden border-4 border-gray-50 dark:border-gray-800 bg-white shadow-inner mb-8">
                          <img src={previewQuestion.stemImage} alt="stem" className="w-full h-auto max-h-60 object-contain bg-white" />
                       </div>
                    )}
                 </div>

                 {previewQuestion.type === QuestionType.MULTIPLE_CHOICE && previewQuestion.options && (
                    <div className="grid gap-4">
                       {previewQuestion.options.map((opt: any, i: number) => {
                          const optText = typeof opt === 'string' ? opt : opt.text;
                          const optImage = typeof opt === 'string' ? null : opt.image;
                          const optValue = typeof opt === 'string' ? opt : opt.value;
                          const isCorrect = previewQuestion.answer.includes(optValue);
                          
                          return (
                             <div 
                                key={i} 
                                className={`p-5 rounded-2xl border-2 transition-all flex items-center gap-4 ${isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800'}`}
                             >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${isCorrect ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                   {optValue || String.fromCharCode(65 + i)}
                                </div>
                                <div className="flex-1 flex flex-col gap-2">
                                   {optImage && <img src={optImage} className="w-32 h-20 object-contain bg-white rounded-lg border dark:border-gray-700" alt="option" />}
                                   {optText && <p className={`font-bold ${isCorrect ? 'text-green-700 dark:text-green-400' : 'dark:text-white'}`}>{optText}</p>}
                                </div>
                                {isCorrect && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                             </div>
                          );
                       })}
                    </div>
                 )}

                 {previewQuestion.type === QuestionType.INPUT && (
                   <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border-2 border-green-100 dark:border-green-800/30">
                      <p className="text-xs font-black text-green-600 uppercase tracking-widest mb-2">{language === 'zh' ? '正确答案' : 'Correct Answer'}</p>
                      <p className="text-xl font-bold text-green-700 dark:text-green-400">{previewQuestion.answer}</p>
                   </div>
                 )}
              </div>
              
              <div className="mt-8 pt-6 border-t dark:border-gray-700">
                 <button 
                    onClick={() => setPreviewQuestion(null)}
                    className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/30"
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

export default Assign;
