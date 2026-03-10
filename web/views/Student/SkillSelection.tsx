import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.ts';
import { SUBJECTS, GRADES } from '../../utils.ts';
import { Book, ChevronRight, PlayCircle, Star, Brain, Filter, ArrowLeft, AlertTriangle, List } from 'lucide-react';
import Loading from '../../components/Loading';

interface SkillSelectionProps {
  language: 'zh' | 'en';
}

const SkillSelection: React.FC<SkillSelectionProps> = ({ language }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subject') || 'MATH');
  const [selectedGrade, setSelectedGrade] = useState(parseInt(searchParams.get('grade') || '1') || 1);
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingHwCount, setPendingHwCount] = useState(0);

  useEffect(() => {
    fetchSkills();
    fetchPendingHw();
  }, [selectedSubject, selectedGrade]);

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

      {/* Compact Header & Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
            <Brain className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-black dark:text-white">
              {language === 'zh' ? '技能练习' : 'Skill Practice'}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-x-auto no-scrollbar">
            {SUBJECTS.filter(s => s.id !== 'ALL').map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSubject(s.id)}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${selectedSubject === s.id ? 'bg-white dark:bg-gray-800 shadow-sm text-primary-600' : 'text-gray-500'}`}
              >
                {language === 'zh' ? s.name : s.enName}
              </button>
            ))}
          </div>

          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(parseInt(e.target.value) || 1)}
            className="px-3 py-1 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 text-[10px] font-bold outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            {GRADES.map(g => (
              <option key={g.id} value={g.id}>{language === 'zh' ? g.name : g.enName}</option>
            ))}
          </select>
        </div>
      </div>

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
