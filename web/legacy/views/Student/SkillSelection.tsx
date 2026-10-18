import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.ts';
import { SUBJECTS, GRADES } from '../../utils.ts';
import { Book, ChevronRight, PlayCircle, Brain, AlertTriangle, ClipboardList, X, ChevronDown, CheckCircle2, ChevronLeft } from 'lucide-react';
import Loading from '../../components/Loading';

interface SkillSelectionProps {
  language: 'zh' | 'en';
}

const SkillSelection: React.FC<SkillSelectionProps> = ({ language }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subject') || 'MATH');
  const [selectedGrade, setSelectedGrade] = useState(parseInt(searchParams.get('grade') || '1') || 1);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [skills, setSkills] = useState<any[]>([]);
  const [gradeStats, setGradeStats] = useState<{ grade: number; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingHwCount, setPendingHwCount] = useState(0);

  useEffect(() => {
    fetchSkills();
    fetchPendingHw();
  }, [selectedSubject, selectedGrade]);

  useEffect(() => {
    fetchGradeStats();
  }, [selectedSubject]);

  const fetchGradeStats = async () => {
    setLoadingGrades(true);
    try {
      const data = await api.questions.gradeStats(selectedSubject);
      setGradeStats(data);
    } catch (e) {
      console.error("Fetch grade stats error:", e);
    } finally {
      setLoadingGrades(false);
    }
  };

  const fetchPendingHw = async () => {
    try {
      const data = await api.homework.list();
      const count = data.filter((h: any) => h.status === 'pending').length;
      setPendingHwCount(count);
    } catch (e) {
      console.error("Fetch HW error:", e);
    }
  };

  const fetchSkills = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.skills.questions({ subject: selectedSubject, grade: selectedGrade });
      console.log("Skills with questions loaded:", data);
      setSkills(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error("Fetch skills error:", e);
      setError(e.message || (language === 'zh' ? '加载失败' : 'Load failed'));
    } finally {
      setLoading(false);
    }
  };

  const startPractice = (questionId: string) => {
    navigate(`/practice?subject=${selectedSubject}&grade=${selectedGrade}&questionId=${questionId}`);
  };

  const startObjectivePractice = (objectiveId: string) => {
    navigate(`/practice?subject=${selectedSubject}&grade=${selectedGrade}&objectiveId=${objectiveId}`);
  };

  const getStemText = (q: any) => {
    if (!q) return language === 'zh' ? '未知题目' : 'Unknown';
    
    // Try all possible field names
    let text = q.stemText || q.stem_text || (q.stem && q.stem.text ? q.stem.text : (typeof q.stem === 'string' ? q.stem : ''));
    
    if (text && typeof text === 'string') {
      // If it looks like JSON, try to parse it
      if (text.startsWith('{') || text.startsWith('[')) {
        try {
          const parsed = JSON.parse(text);
          return parsed.text || parsed.content || text;
        } catch (e) {
          return text;
        }
      }
      return text;
    }
    
    return language === 'zh' ? '题目内容' : 'Question content';
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-[1600px] mx-auto p-2 md:p-4">
      {/* Pending Homework Alert */}
      {pendingHwCount > 0 && (
        <div 
          onClick={() => navigate('/homework')}
          className="bg-primary-600 text-white p-4 rounded-2xl shadow-lg shadow-primary-500/20 flex items-center justify-between cursor-pointer hover:bg-primary-700 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black">{language === 'zh' ? `你有 ${pendingHwCount} 份待完成的作业` : `You have ${pendingHwCount} pending assignments`}</p>
              <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest">{language === 'zh' ? '点击前往查看详情' : 'Click to view details'}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </div>
      )}

      {/* Super Compact Header */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border dark:border-gray-700 sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-gray-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <Brain className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-sm font-black dark:text-white whitespace-nowrap">
            {language === 'zh' ? '技能练习' : 'Skills'}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Subject Trigger */}
          <button
            onClick={() => setIsSubjectModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-[10px] font-black border dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all group"
          >
            <span className="text-primary-600 dark:text-primary-400">
               {language === 'zh' ? SUBJECTS.find(s => s.id === selectedSubject)?.name : SUBJECTS.find(s => s.id === selectedSubject)?.enName}
            </span>
            <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-primary-500 transition-colors" />
          </button>

          {/* Grade Trigger */}
          <button
            onClick={() => setIsGradeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-[10px] font-black border dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all group"
          >
            <span className="text-primary-600 dark:text-primary-400">
              {language === 'zh' ? GRADES.find(g => g.id === selectedGrade)?.name : GRADES.find(g => g.id === selectedGrade)?.enName}
            </span>
            <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-primary-500 transition-colors" />
          </button>
        </div>
      </div>

      {/* Subject Selection Modal */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
           <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-2xl max-w-sm w-full animate-in zoom-in-95 relative border dark:border-gray-700">
              <button 
                onClick={() => setIsSubjectModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6 dark:text-gray-400" />
              </button>
              
              <div className="text-center mb-6">
                <h3 className="text-xl font-black dark:text-white">
                  {language === 'zh' ? '选择学习科目' : 'Select Subject'}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 {SUBJECTS.filter(s => s.id !== 'ALL').map(s => {
                   const isSelected = selectedSubject === s.id;
                   return (
                     <button
                       key={s.id}
                       onClick={() => {
                         setSelectedSubject(s.id);
                         setIsSubjectModalOpen(false);
                       }}
                       className={`
                         group relative py-6 rounded-2xl font-black transition-all flex flex-col items-center gap-2 border-2
                         ${isSelected 
                           ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-600 dark:text-primary-400' 
                           : 'bg-gray-50 dark:bg-gray-900 border-transparent hover:border-primary-200 dark:hover:border-primary-800 dark:text-white active:scale-95'
                         }
                       `}
                     >
                       <span className="text-3xl">{s.icon}</span>
                       <span className="text-[11px] uppercase tracking-wider">
                         {language === 'zh' ? s.name : s.enName}
                       </span>
                       
                       {isSelected && (
                         <div className="absolute top-2 right-2">
                           <CheckCircle2 className="w-4 h-4 text-primary-500" />
                         </div>
                       )}
                     </button>
                   );
                 })}
              </div>
           </div>
        </div>
      )}

      {/* Grade Selection Modal */}
      {isGradeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
           <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2rem] shadow-2xl max-w-sm w-full animate-in zoom-in-95 relative border dark:border-gray-700">
              <button 
                onClick={() => setIsGradeModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6 dark:text-gray-400" />
              </button>
              
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">
                  {SUBJECTS.find(s => s.id === selectedSubject)?.icon}
                </div>
                <h3 className="text-xl font-black dark:text-white">
                  {language === 'zh' ? '选择对应年级' : 'Select Grade'}
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">
                   {language === 'zh' ? SUBJECTS.find(s => s.id === selectedSubject)?.name : SUBJECTS.find(s => s.id === selectedSubject)?.enName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 {GRADES.map(g => {
                   const stat = gradeStats.find(s => s.grade === g.id);
                   const count = stat ? stat.count : 0;
                   const isDisabled = !loadingGrades && count === 0;
                   const isSelected = selectedGrade === g.id;
                   
                   return (
                     <button
                       key={g.id}
                       disabled={isDisabled}
                       onClick={() => {
                         setSelectedGrade(g.id);
                         setIsGradeModalOpen(false);
                       }}
                       className={`
                         group relative py-4 rounded-2xl font-black transition-all flex flex-col items-center gap-1 border-2
                         ${isSelected 
                           ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-600 dark:text-primary-400 shadow-sm' 
                           : isDisabled 
                             ? 'bg-gray-50/50 dark:bg-gray-900/50 text-gray-300 dark:text-gray-700 border-transparent cursor-not-allowed grayscale' 
                             : 'bg-gray-50 dark:bg-gray-900 border-transparent hover:border-primary-200 dark:hover:border-primary-800 dark:text-white active:scale-95'
                         }
                       `}
                     >
                       <span className="text-xl">{g.id}</span>
                       <span className="text-[9px] uppercase tracking-tighter opacity-60">
                         {language === 'zh' ? `${g.id}年级` : `Grade ${g.id}`}
                       </span>
                       
                       {isSelected && (
                         <div className="absolute top-2 right-2">
                           <CheckCircle2 className="w-3.5 h-3.5 text-primary-500 animate-in zoom-in duration-300" />
                         </div>
                       )}
                       
                       {!isDisabled && count > 0 && !isSelected && (
                         <span className="absolute top-2 right-2 text-[8px] font-black bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded-full group-hover:bg-primary-500 group-hover:text-white transition-colors">
                           {count}
                         </span>
                       )}
                     </button>
                   );
                 })}
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed dark:border-gray-700 text-center">
                <p className="text-[9px] text-gray-400 font-bold leading-relaxed">
                  {language === 'zh' 
                    ? '提示：灰色年级目前暂无题目。' 
                    : 'Tip: Grayed out grades have no questions yet.'}
                </p>
              </div>
           </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loading /></div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl text-center border border-red-100 dark:border-red-800">
           <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
           <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
           <button onClick={fetchSkills} className="mt-3 px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all">
             {language === 'zh' ? '重试' : 'Retry'}
           </button>
        </div>
      ) : skills.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl text-center border dark:border-gray-700 shadow-sm">
           <Book className="w-12 h-12 text-gray-200 mx-auto mb-4" />
           <p className="text-sm font-black text-gray-400">{language === 'zh' ? '该科目年级下暂无技能点' : 'No skills found.'}</p>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 xl:columns-3 2xl:columns-4 gap-4 space-y-4">
          {skills.map((topic, topicIdx) => (
            <div key={topic.id} className="break-inside-avoid bg-white dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow mb-4">
              <div className="flex items-center gap-2 mb-3 border-b dark:border-gray-700 pb-2">
                <span className="w-6 h-6 bg-primary-600 text-white rounded-md flex items-center justify-center font-black text-[10px] shrink-0">
                  {String.fromCharCode(65 + topicIdx)}
                </span>
                <h3 className="text-sm font-black dark:text-white truncate" title={topic.name}>
                  {topic.name}
                </h3>
              </div>

              <div className="space-y-4">
                {topic.objectives?.map((obj: any, objIdx: number) => (
                  <div key={obj.id} className="space-y-1.5">
                    <div className="flex items-start justify-between group gap-2">
                      <div className="flex items-start gap-1.5 flex-1 min-w-0">
                        <span className="text-[10px] font-black text-primary-600/40 group-hover:text-primary-600 transition-colors pt-0.5">
                          {objIdx + 1}
                        </span>
                        <h4 className="text-[11px] font-bold dark:text-gray-200 group-hover:text-primary-600 transition-colors leading-tight line-clamp-2" title={`${obj.name} ${obj.target}`}>
                          {obj.target || obj.name}
                        </h4>
                      </div>
                      <button 
                        onClick={() => startObjectivePractice(obj.id)}
                        className="p-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 rounded-full hover:scale-110 transition-all shrink-0"
                        title={language === 'zh' ? '开始本组练习' : 'Start practice'}
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="grid gap-1 pl-4">
                      {obj.questions?.map((q: any) => (
                        <button
                          key={q.id}
                          onClick={() => startPractice(q.id)}
                          className="text-left text-[10px] px-2 py-1.5 bg-gray-50 dark:bg-gray-900/50 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 text-gray-500 dark:text-gray-400 rounded-lg font-medium transition-all line-clamp-1 border border-transparent hover:border-primary-200 dark:hover:border-primary-800"
                          title={getStemText(q)}
                        >
                          {getStemText(q)}
                        </button>
                      ))}
                      {(!obj.questions || obj.questions.length === 0) && (
                        <span className="text-[9px] text-gray-400 italic pl-1">{language === 'zh' ? '暂无题目' : 'No questions'}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SkillSelection;
