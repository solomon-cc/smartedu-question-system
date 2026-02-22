
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, User, Book, Search, CheckCircle2, LayoutGrid, FileCheck, ChevronRight, UserCircle, Clock, ArrowLeft, X } from 'lucide-react';
import { api } from '../../services/api.ts';
import { Role } from '../../types';
import Loading from '../../components/Loading';
import ConfirmationModal from '../../components/ConfirmationModal';

const Assign: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'assign' | 'status'>('assign');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedHw, setSelectedHw] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hwDetailsLoading, setHwDetailsLoading] = useState(false);
  
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
  const [deadline, setDeadline] = useState('');
  
  // New Filter State
  const [filterWrongBook, setFilterWrongBook] = useState(false);
  const [questionStats, setQuestionStats] = useState<Record<string, { attempts: number, accuracy: number, isWrong: boolean }>>({});

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch student specific question stats when students are selected
  useEffect(() => {
    if (selectedStudents.length > 0) {
      // Mock fetching stats for now as backend API for specific question stats per student group might be heavy
      // In real scenario, we would call an API like `api.stats.questions({ studentIds: selectedStudents })`
      // For this demo/integration, we will use what we have or simulate:
      // We can use `api.wrongBook.list(studentId)` for each student to identify "isWrong".
      
      const loadStats = async () => {
        const stats: Record<string, { attempts: number, accuracy: number, isWrong: boolean }> = {};
        
        // Fetch wrong book for ALL selected students to mark "isWrong" if ANY selected student has it wrong
        // This is a simplification. Ideally "isWrong" depends on if ALL or ANY have it.
        // Let's assume "isWrong" if ANY selected student has it in their wrong book.
        
        const wrongPromises = selectedStudents.map(id => api.wrongBook.list(id));
        const wrongLists = await Promise.all(wrongPromises);
        
        const wrongQIDs = new Set<string>();
        wrongLists.flat().forEach((w: any) => wrongQIDs.add(w.questionId));
        
        // Populate stats (mocking accuracy/attempts for visual demo as we don't have a direct API for Q-stats yet)
        // In a full implementation, backend should provide this.
        // We will mark "isWrong" based on the fetch.
        
        // We can iterate over papers -> questions to set state
        papers.forEach(p => {
          p.questions?.forEach((q: any) => {
             stats[q.id] = {
               attempts: Math.floor(Math.random() * 5), // Mock
               accuracy: Math.random() * 100, // Mock
               isWrong: wrongQIDs.has(q.id)
             };
          });
        });
        setQuestionStats(stats);
      };
      
      loadStats();
    } else {
      setQuestionStats({});
    }
  }, [selectedStudents, papers]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsData, papersData, hwData, historyData] = await Promise.all([
        api.students.list(),
        api.papers.list(),
        api.homework.list(),
        api.history.list(1, 1000) // Initial fetch
      ]);

      setHistoryRecords(historyData.list || []);

      setStudents(studentsData.map((u: any) => ({
        id: u.id,
        name: u.username,
        grade: '', 
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

  const handleAssign = async () => {
    if (!selectedPaperId || !deadline || selectedStudents.length === 0) return;
    
    const paper = papers.find(p => p.id === selectedPaperId);
    
    // Filter questions if enabled
    let questionsToAssign = paper?.questions || [];
    if (filterWrongBook && selectedStudents.length > 0) {
       questionsToAssign = questionsToAssign.filter((q: any) => questionStats[q.id]?.isWrong);
    }

    if (questionsToAssign.length === 0) {
       setConfirmationModalProps({
        title: language === 'zh' ? '无法发布' : 'Cannot Assign',
        message: language === 'zh' ? '所选筛选条件下没有题目可发布。' : 'No questions match the filter criteria.',
        type: 'warning',
        language: language,
        onConfirm: () => setIsConfirmationModalOpen(false),
      });
      setIsConfirmationModalOpen(true);
      return;
    }

    try {
      // We need to create a temporary paper or just assign these specific questions?
      // The current backend `AssignHomework` takes `paperId`. 
      // If we filter questions, we technically need a NEW paper ID or the backend needs to support a list of QIDs.
      // Current `AssignHomework` implementation in `handlers.go`:
      // h.PaperID ...
      // It doesn't seem to support overriding questions list easily without creating a new paper.
      // However, `Homework` struct has `PaperID`.
      // If we want to assign a SUBSET, we should probably create a dynamic paper or `PaperID` needs to be optional?
      // Looking at `AssignHomework` handler: it just saves the Homework struct.
      // It DOES NOT validate/copy questions from Paper to Homework.
      // But the Frontend `PracticeSession` fetches questions from `PaperID`.
      // So if we assign `PaperID`, the student gets ALL questions in that paper.
      
      // SOLUTION: Create a new temporary paper for this assignment if filtered.
      let finalPaperId = selectedPaperId;
      if (filterWrongBook) {
         const newPaperName = `${paper?.name} (错题筛选)`;
         const newPaper = await api.papers.create({
           name: newPaperName,
           questionIds: questionsToAssign.map((q: any) => q.id),
           total: questionsToAssign.length
         });
         finalPaperId = newPaper.id;
      }

      await api.homework.assign({
        paperId: finalPaperId,
        name: paper ? paper.name : 'Homework',
        classId: '3-1', // Mock class
        startDate: new Date().toISOString().split('T')[0],
        endDate: deadline,
        studentIds: selectedStudents // Backend needs to handle this (currently AssignHomework takes generic 'h')
      });
      setConfirmationModalProps({
        title: language === 'zh' ? '发布成功' : 'Assignment Success',
        message: language === 'zh' ? '家庭作业已成功发布给所选学生。' : 'Homework has been successfully assigned to selected students.',
        type: 'success',
        language: language,
        onConfirm: () => setIsConfirmationModalOpen(false),
      });
      setIsConfirmationModalOpen(true);
      setSelectedStudents([]);
      setDeadline('');
      fetchData(); // Refresh list
    } catch (e) {
      console.error(e);
      setConfirmationModalProps({
        title: language === 'zh' ? '发布失败' : 'Assignment Failed',
        message: language === 'zh' ? '发布家庭作业失败，请检查数据或重试。' : 'Failed to assign homework. Please check your data or try again.',
        type: 'error',
        language: language,
        onConfirm: () => setIsConfirmationModalOpen(false),
      });
      setIsConfirmationModalOpen(true);
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
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
                           <p className="text-[10px] text-gray-400">{s.grade}</p>
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
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
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
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700 space-y-8 shadow-sm h-fit">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-4 tracking-widest">
                <Book className="w-4 h-4 inline mr-1" /> {language === 'zh' ? '1. 选择试卷' : '1. Select Paper'}
              </label>
              <select 
                value={selectedPaperId}
                onChange={(e) => setSelectedPaperId(e.target.value)}
                className="w-full p-4 rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-4 focus:ring-primary-500/20 dark:text-white font-bold"
              >
                {papers.length === 0 && <option value="">{language === 'zh' ? '暂无试卷' : 'No Papers'}</option>}
                {papers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.total}题)</option>)}
              </select>

              {/* Question Preview & Stats */}
              {selectedPaperId && selectedStudents.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-700 max-h-60 overflow-y-auto">
                   <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">{language === 'zh' ? '题目预览' : 'Preview'}</h4>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={filterWrongBook} 
                          onChange={(e) => setFilterWrongBook(e.target.checked)}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                        />
                        <span className="text-xs font-bold text-red-500">{language === 'zh' ? '仅筛选错题' : 'Mistakes Only'}</span>
                      </label>
                   </div>
                   <div className="space-y-2">
                      {papers.find(p => p.id === selectedPaperId)?.questions?.map((q: any) => {
                        const stats = questionStats[q.id];
                        if (filterWrongBook && !stats?.isWrong) return null;
                        
                        return (
                          <div key={q.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                             <div className="flex items-center gap-2 overflow-hidden">
                                {stats?.isWrong && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-black rounded">WRONG</span>}
                                <span className="text-xs font-bold truncate dark:text-gray-300">{q.stemText}</span>
                             </div>
                             {stats && (
                               <div className="text-[10px] text-gray-400 flex items-center gap-2 shrink-0">
                                  <span>{language === 'zh' ? '做过' : 'Done'}: {stats.attempts}</span>
                                  <span className={stats.accuracy < 60 ? 'text-red-500' : 'text-green-500'}>{stats.accuracy.toFixed(0)}%</span>
                               </div>
                             )}
                          </div>
                        )
                      })}
                   </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-4 tracking-widest">
                <Send className="w-4 h-4 inline mr-1" /> {language === 'zh' ? '2. 设置截止日期' : '2. Set Deadline'}
              </label>
              <input 
                type="date" 
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full p-4 rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-4 focus:ring-primary-500/20 dark:text-white font-bold" 
              />
            </div>

            <div className="pt-4">
              <button 
                onClick={handleAssign}
                className="w-full py-5 bg-primary-600 text-white rounded-[2rem] font-black shadow-xl shadow-primary-600/20 flex items-center justify-center gap-2 hover:bg-primary-700 transition-all disabled:opacity-50" 
                disabled={selectedStudents.length === 0}
              >
                <Send className="w-6 h-6" />
                {language === 'zh' ? `确认发布 (已选 ${selectedStudents.length} 人)` : `Confirm Assign (${selectedStudents.length})`}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700 shadow-sm flex flex-col h-[500px]">
            <div className="flex justify-between items-center mb-6">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <User className="w-4 h-4" /> {language === 'zh' ? '选择执行学生' : 'Target Students'}
              </label>
              <button 
                onClick={() => setSelectedStudents(selectedStudents.length === students.length ? [] : students.map(s => s.id))}
                className="text-xs text-primary-600 font-bold hover:underline"
              >
                {selectedStudents.length === students.length ? (language === 'zh' ? '全不选' : 'Deselect All') : (language === 'zh' ? '全选' : 'Select All')}
              </button>
            </div>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder={language === 'zh' ? '输入学生名字...' : 'Search student...'}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl text-xs outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
               {students.length === 0 && <div className="text-center text-gray-400 mt-10">No students found</div>}
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
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${selectedStudents.includes(s.id) ? 'bg-primary-600 text-white shadow-lg' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                        {s.name[0]}
                     </div>
                     <div>
                       <p className="font-bold dark:text-white text-sm">{s.name}</p>
                       <p className="text-[10px] text-gray-400">{s.grade}</p>
                     </div>
                   </div>
                   {selectedStudents.includes(s.id) && <CheckCircle2 className="w-5 h-5 text-primary-600" />}
                 </button>
               ))}
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
    </div>
  );
};

export default Assign;
