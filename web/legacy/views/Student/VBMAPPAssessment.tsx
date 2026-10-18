import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../App';
import { api } from '../../services/api.ts';
import { 
  LineChart, 
  Target, 
  ShieldAlert, 
  Zap, 
  CheckCircle2, 
  Calendar,
  ChevronRight,
  Plus,
  ArrowLeft,
  Info
} from 'lucide-react';

interface Assessment {
  id: string;
  studentId: string;
  assessorId: string;
  date: string;
  status: 'ongoing' | 'completed';
}

interface Score {
  id: string;
  assessmentId: string;
  area: 'milestone' | 'barrier' | 'transition';
  category: string;
  itemNumber: number;
  score: number;
}

const AssessmentView: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const auth = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view'); // 'history' or null (home)

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState<'home' | 'list' | 'detail'>('home');

  useEffect(() => {
    if (view === 'history') {
      setViewState('list');
      fetchAssessments();
    } else {
      setViewState('home');
    }
  }, [view]);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const data = await api.assessments.list(auth?.user?.id);
      setAssessments(data);
    } catch (error) {
      console.error("Fetch assessments error:", error);
    } finally {
      setLoading(false);
    }
  };

  const viewDetail = async (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setLoading(true);
    try {
      const data = await api.assessments.listScores(assessment.id);
      setScores(data);
      setViewState('detail');
    } catch (error) {
      console.error("Fetch scores error:", error);
    } finally {
      setLoading(false);
    }
  };

  const areas = [
    { id: 'milestone', name: language === 'zh' ? '里程碑评估' : 'Milestones', icon: <Target className="w-5 h-5" />, color: 'bg-green-500' },
    { id: 'barrier', name: language === 'zh' ? '障碍评估' : 'Barriers', icon: <ShieldAlert className="w-5 h-5" />, color: 'bg-red-500' },
    { id: 'transition', name: language === 'zh' ? '转衔评估' : 'Transition', icon: <Zap className="w-5 h-5" />, color: 'bg-blue-500' },
  ];

  if (viewState === 'detail' && selectedAssessment) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in slide-in-from-right-8 duration-500 pb-24">
        <button 
          onClick={() => setViewState('list')}
          className="flex items-center gap-2 text-gray-500 font-black hover:text-primary-600 transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          {language === 'zh' ? '返回列表' : 'Back'}
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 shadow-sm border dark:border-gray-700 mb-8">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black dark:text-white mb-2">{language === 'zh' ? '综合评估详情' : 'Assessment Detail'}</h2>
                <div className="flex items-center gap-4 text-sm font-bold text-gray-400">
                   <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {selectedAssessment.date}</span>
                   <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest ${selectedAssessment.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {selectedAssessment.status === 'completed' ? (language === 'zh' ? '已完成' : 'Completed') : (language === 'zh' ? '评估中' : 'Ongoing')}
                   </span>
                </div>
              </div>
              
              <div className="flex gap-4">
                 {areas.map(area => (
                   <div key={area.id} className="text-center">
                      <div className={`w-12 h-12 ${area.color} text-white rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg shadow-current/20`}>
                        {area.icon}
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-tighter dark:text-gray-300">{area.name}</p>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {areas.map(area => (
            <div key={area.id} className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 shadow-sm border dark:border-gray-700">
               <h3 className="text-lg font-black dark:text-white mb-6 flex items-center gap-2">
                  <span className={`w-2 h-6 ${area.color} rounded-full`}></span>
                  {area.name}
               </h3>
               
               <div className="space-y-3">
                 {scores.filter(s => s.area === area.id).length === 0 ? (
                   <div className="py-8 text-center text-gray-300 font-bold italic text-sm">
                      {language === 'zh' ? '暂无评分数据' : 'No score data'}
                   </div>
                 ) : (
                   scores.filter(s => s.area === area.id).map(score => (
                     <div key={score.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center font-black text-xs text-gray-400">
                              {score.itemNumber}
                           </div>
                           <p className="text-xs font-bold dark:text-gray-200">{score.category}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-lg font-black text-xs ${score.score >= 1 ? 'bg-green-500 text-white' : score.score > 0 ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                           {score.score}
                        </div>
                     </div>
                   ))
                 )}
               </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in duration-500 pb-24">
      <div className="flex items-center gap-4 mb-12">
        <div className="p-4 bg-green-500 text-white rounded-3xl shadow-xl shadow-green-100">
          <LineChart className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black dark:text-white">
            {language === 'zh' ? '认知发展评估' : 'Cognitive Dev Assessment'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-bold text-sm uppercase tracking-widest mt-1">
            {language === 'zh' ? '里程碑、障碍与转衔能力评估' : 'Milestone, barrier and transition assessment'}
          </p>
        </div>
      </div>

      {viewState === 'home' ? (
        <div className="max-w-3xl mx-auto text-center">
           <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-[3rem] p-10 md:p-16 text-white shadow-2xl shadow-green-200">
              <h2 className="text-3xl md:text-4xl font-black mb-8 leading-tight">{language === 'zh' ? '开启科学的进步之旅' : 'Scientific Path to Progress'}</h2>
              <div className="space-y-6 text-base md:text-lg font-bold text-green-50/90 leading-relaxed text-left">
                 <p className="border-l-4 border-white/30 pl-6 italic">{language === 'zh' ? '“每一个细微的进步，都值得被记录与见证。”' : '“Every small step forward deserves to be recorded and witnessed.”'}</p>
                 <p className="pt-4">{language === 'zh' ? '我们的认知发展评估体系，旨在通过多维度的观察记录，帮助您精准掌握孩子的当前发展水平，从而制定更具针对性的个性化教学计划。' : 'Our assessment system uses multi-dimensional observation to help you understand developmental levels and create targeted plans.'}</p>
                 
                 <div className="grid grid-cols-1 gap-4 mt-10">
                    {[
                      { label: language === 'zh' ? '里程碑评估：记录核心能力的关键节点' : 'Milestones: Recording core competencies', icon: <Target className="w-6 h-6" /> },
                      { label: language === 'zh' ? '障碍评估：识别阻碍进步的各类挑战' : 'Barriers: Identifying growth challenges', icon: <ShieldAlert className="w-6 h-6" /> },
                      { label: language === 'zh' ? '转衔评估：为未来的融合教育提供决策参考' : 'Transition: Reference for future integration', icon: <Zap className="w-6 h-6" /> }
                    ].map((item, i) => (
                      <div key={i} className="bg-white/10 p-5 rounded-[2rem] flex items-center gap-4 border border-white/10 backdrop-blur-sm">
                         <div className="p-3 bg-white/20 rounded-2xl">{item.icon}</div>
                         <span className="text-sm font-black">{item.label}</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
           
           <p className="mt-12 text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">
              {language === 'zh' ? '提示：点击下方“历史评估”查看过往报告' : 'Tip: Tap "History" below to view past reports'}
           </p>
        </div>
      ) : (
        <div className="space-y-6">
           <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black dark:text-white">{language === 'zh' ? '历史评估报告' : 'Assessment History'}</h2>
              <div className="px-4 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-full text-xs font-black uppercase tracking-widest">
                 {assessments.length} {language === 'zh' ? '份记录' : 'REPORTS'}
              </div>
           </div>
           
           {loading ? (
             <div className="py-20 text-center text-gray-300 font-black animate-pulse tracking-widest">
                {language === 'zh' ? '正在获取评估列表...' : 'LOADING REPORTS...'}
             </div>
           ) : assessments.length === 0 ? (
             <div className="bg-white dark:bg-gray-800 p-16 rounded-[3rem] border dark:border-gray-700 text-center shadow-inner">
                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                   <Info className="w-10 h-10 text-gray-200" />
                </div>
                <p className="text-gray-400 font-black text-lg">{language === 'zh' ? '暂无评估记录' : 'No assessments found.'}</p>
                <p className="text-gray-300 text-sm mt-2 font-bold">{language === 'zh' ? '当老师为您完成评估后，报告将出现在这里。' : 'Reports will appear here once teacher completes assessment.'}</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {assessments.map(a => (
                 <button
                    key={a.id}
                    onClick={() => viewDetail(a)}
                    className="w-full flex items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-[2rem] border-2 border-transparent hover:border-green-500 transition-all shadow-sm hover:shadow-xl group text-left"
                 >
                    <div className="flex items-center gap-5">
                       <div className="w-14 h-14 bg-green-50 dark:bg-green-900/30 text-green-600 rounded-[1.5rem] flex items-center justify-center font-black text-lg">
                          {a.date.split('-')[1]}
                          <span className="text-[10px] mx-0.5 opacity-40">/</span>
                          {a.date.split('-')[2]}
                       </div>
                       <div>
                          <p className="text-base font-black dark:text-white">{a.date} 综合评估</p>
                          <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${a.status === 'completed' ? 'text-green-500' : 'text-orange-500'}`}>
                             {a.status === 'completed' ? (language === 'zh' ? '已完成' : 'Completed') : (language === 'zh' ? '评估进行中' : 'Ongoing')}
                          </p>
                       </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-200 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
                 </button>
               ))}
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default AssessmentView;
