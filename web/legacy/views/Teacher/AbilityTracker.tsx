import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api.ts';
import { User, SkillTopic, AbilityRecord } from '../../types';
import Loading from '../../components/Loading';
import { Target, Users, CheckCircle, XCircle, Minus, Calendar, Filter, Settings, Plus, X, Edit2, Trash2, Printer, FileText, ChevronUp, ChevronDown } from 'lucide-react';

const AbilityTracker: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<User[]>([]);
  const [skills, setSkills] = useState<SkillTopic[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [abilityMatrix, setAbilityMatrix] = useState<AbilityRecord[]>([]);

  // Management Modal States
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [topicForm, setTopicForm] = useState({ id: '', name: '', subject: '数学', grade: 3 });
  const [objForm, setObjForm] = useState({ id: '', topicId: '', name: '', target: '' });
  const [isTopicFormOpen, setIsTopicFormOpen] = useState(false);
  const [isObjFormOpen, setIsObjFormOpen] = useState(false);

  // Report Modal States
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportComments, setReportComments] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsData, skillsData] = await Promise.all([
        api.students.list(),
        api.skills.list()
      ]);
      setStudents(studentsData);
      setSkills(skillsData);
      if (studentsData.length > 0 && !selectedStudentId) {
        setSelectedStudentId(studentsData[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch ability tracking data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      const fetchMatrix = async () => {
        try {
          const data = await api.ability.matrix(selectedStudentId);
          setAbilityMatrix(data);
        } catch (err) {
          console.error('Failed to fetch ability matrix', err);
        }
      };
      fetchMatrix();
    }
    const student = students.find(s => s.id === selectedStudentId);
    if (student) {
      setReportTitle(language === 'zh' ? `${student.username} 的能力追踪报告` : `Ability Report for ${student.username}`);
    }
  }, [selectedStudentId, students, language]);

  const getRecordStatus = (objectiveId: string) => {
    const record = abilityMatrix.find(r => r.objectiveId === objectiveId);
    if (!record) return 'none';
    return record.status === 'Y' ? 'pass' : 'fail';
  };

  const getAccuracy = (objectiveId: string) => {
    const record = abilityMatrix.find(r => r.objectiveId === objectiveId);
    return record ? `${record.accuracy.toFixed(0)}%` : '-';
  };

  const handlePrint = () => {
    window.print();
  };

  // ... (Skill Management Functions remain unchanged)
  const handleSaveTopic = async () => {
    try {
      if (topicForm.id) {
        await api.skills.updateTopic(topicForm.id, topicForm);
      } else {
        await api.skills.createTopic(topicForm);
      }
      setIsTopicFormOpen(false);
      fetchData();
    } catch (e) {
      alert("Failed to save topic");
    }
  };

  const handleMoveTopic = async (topicId: string, direction: 'up' | 'down') => {
    const currentIndex = skills.findIndex(t => t.id === topicId);
    if (currentIndex === -1) return;
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= skills.length) return;

    const newSkills = [...skills];
    const [moved] = newSkills.splice(currentIndex, 1);
    newSkills.splice(newIndex, 0, moved);
    
    setSkills(newSkills); // Local update for instant feel
    
    try {
      await api.request('/skills/order', 'PUT', { ids: newSkills.map(s => s.id) });
    } catch (err) {
      console.error(err);
      fetchData(); // Rollback on error
    }
  };

  const handleMoveObjective = async (topicId: string, objId: string, direction: 'up' | 'down') => {
    const topic = skills.find(t => t.id === topicId);
    if (!topic || !topic.objectives) return;
    
    const currentIndex = topic.objectives.findIndex(o => o.id === objId);
    if (currentIndex === -1) return;
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= topic.objectives.length) return;

    const newObjectives = [...topic.objectives];
    const [moved] = newObjectives.splice(currentIndex, 1);
    newObjectives.splice(newIndex, 0, moved);
    
    const newSkills = skills.map(t => t.id === topicId ? { ...t, objectives: newObjectives } : t);
    setSkills(newSkills);
    
    try {
      await api.request('/objectives/order', 'PUT', { topicId, ids: newObjectives.map(o => o.id) });
    } catch (err) {
      console.error(err);
      fetchData(); // Rollback
    }
  };

  const handleDeleteTopic = async (id: string) => {
    if (!confirm(language === 'zh' ? '确定删除这个大类吗？' : 'Delete this topic?')) return;
    try {
      await api.skills.deleteTopic(id);
      fetchData();
    } catch (e) {
      alert("Failed to delete topic");
    }
  };

  const handleSaveObjective = async () => {
    try {
      if (objForm.id) {
        await api.skills.updateObjective(objForm.id, objForm);
      } else {
        await api.skills.createObjective(objForm);
      }
      setIsObjFormOpen(false);
      fetchData();
    } catch (e) {
      alert("Failed to save objective");
    }
  };

  const handleDeleteObjective = async (id: string) => {
    if (!confirm(language === 'zh' ? '确定删除这个能力点吗？' : 'Delete this objective?')) return;
    try {
      await api.skills.deleteObjective(id);
      fetchData();
    } catch (e) {
      alert("Failed to delete objective");
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 relative pb-20">
      {/* Header & Student Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-[2rem] border dark:border-gray-700 shadow-sm">
        <div>
          <h2 className="text-2xl font-black dark:text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-primary-600" />
            {language === 'zh' ? '能力追踪矩阵' : 'Ability Matrix'}
          </h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
            {language === 'zh' ? '实时掌握学生知识点达成情况' : 'Real-time mastery tracking'}
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">{language === 'zh' ? '切换学生查看：' : 'Switch Student:'}</span>
          <div className="flex-1 md:flex-none flex items-center gap-3 bg-primary-50 dark:bg-primary-900/20 px-6 py-3.5 rounded-2xl border-2 border-primary-100 dark:border-primary-800 shadow-sm group focus-within:border-primary-500 transition-all min-w-[220px]">
            <Users className="w-5 h-5 text-primary-600" />
            <select 
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="bg-transparent border-none outline-none font-black text-lg dark:text-white flex-1 cursor-pointer appearance-none"
            >
              {students.map(s => (
                <option key={s.id} value={s.id} className="dark:bg-gray-800">{s.username}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-primary-600 group-focus-within:rotate-180 transition-transform" />
          </div>
        </div>
      </div>

      {/* Primary Actions Bar */}
      <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setIsReportOpen(true)}
            className="flex items-center justify-center gap-3 bg-primary-600 text-white p-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 active:scale-95 group"
          >
            <div className="p-2 bg-white/20 rounded-lg group-hover:rotate-12 transition-transform">
               <FileText className="w-5 h-5" />
            </div>
            {language === 'zh' ? '生成分析报告' : 'Create Report'}
          </button>
          
          <button 
            onClick={() => setIsManageOpen(true)}
            className="flex items-center justify-center gap-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:border-primary-500 border-2 border-transparent transition-all shadow-sm active:scale-95 group"
          >
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg group-hover:spin-slow transition-transform">
               <Settings className="w-5 h-5" />
            </div>
            {language === 'zh' ? '管理能力体系' : 'Manage System'}
          </button>
      </div>

      {/* Main Content: Matrix Data First */}
      <div className="space-y-6">
          {skills.map(topic => (
            <div key={topic.id} className="bg-white dark:bg-gray-800 rounded-[2.5rem] border dark:border-gray-700 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 px-8 py-5 border-b dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-black text-lg dark:text-white flex items-center gap-2">
                   <div className="w-2 h-6 bg-primary-500 rounded-full"></div>
                   {topic.name}
                </h3>
                <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full uppercase tracking-widest">{topic.subject}</span>
              </div>
              <div className="divide-y dark:divide-gray-700">
                {topic.objectives?.map(obj => {
                  const status = getRecordStatus(obj.id);
                  const acc = getAccuracy(obj.id);
                  
                  return (
                    <div key={obj.id} className="px-8 py-6 flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                      <div className="flex-1 pr-8">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Objective {obj.name}</span>
                        </div>
                        <p className="font-bold dark:text-gray-200 leading-relaxed">{obj.target}</p>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{language === 'zh' ? '达成率' : 'Accuracy'}</p>
                          <p className={`text-xl font-black ${status === 'pass' ? 'text-green-500' : status === 'fail' ? 'text-red-500' : 'text-gray-300'}`}>{acc}</p>
                        </div>
                        
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                          status === 'pass' ? 'bg-green-100 dark:bg-green-900/20 scale-110 shadow-lg shadow-green-500/10' : 
                          status === 'fail' ? 'bg-red-100 dark:bg-red-900/20' : 
                          'bg-gray-50 dark:bg-gray-700/50'
                        }`}>
                          {status === 'pass' ? <CheckCircle className="w-6 h-6 text-green-600" /> : 
                           status === 'fail' ? <XCircle className="w-6 h-6 text-red-600" /> : 
                           <Minus className="w-6 h-6 text-gray-300" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {skills.length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-[2.5rem] border dark:border-gray-700 shadow-sm">
              <Target className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 font-bold">{language === 'zh' ? '暂未配置能力点' : 'No ability objectives configured'}</p>
            </div>
          )}
      </div>

      {/* Bottom Info: Legend & Repetition */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10 border-t dark:border-gray-800">
          {/* Ability Legend */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700 shadow-sm">
            <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 mb-6 flex items-center gap-2 uppercase tracking-[0.2em]">
              {language === 'zh' ? '评估图例' : 'Matrix Legend'}
            </h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-black dark:text-white text-sm uppercase tracking-tight">{language === 'zh' ? '已掌握' : 'Mastered'}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{language === 'zh' ? '正确率 ≥ 80%' : 'Acc >= 80%'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-black dark:text-white text-sm uppercase tracking-tight">{language === 'zh' ? '未达标' : 'Need Work'}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{language === 'zh' ? '正确率 < 80%' : 'Acc < 80%'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-gradient-to-br from-primary-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-primary-500/20 relative overflow-hidden group">
             <div className="relative z-10">
                <Calendar className="w-10 h-10 mb-4 opacity-50 group-hover:rotate-12 transition-transform" />
                <h4 className="text-xl font-black mb-2 uppercase tracking-tight">{language === 'zh' ? '智能周期复习' : 'AI Spaced Repetition'}</h4>
                <p className="text-primary-100 text-sm font-bold leading-relaxed max-w-xl">
                  {language === 'zh' ? '系统已自动分析学生薄弱环节，并在布置作业时提供自动重复功能，帮助学生巩固已发现的知识漏洞。' : 'System analyzes weaknesses and offers automated repetition in assignments to bridge knowledge gaps.'}
                </p>
             </div>
             <div className="absolute right-[-20px] bottom-[-20px] text-white/5 text-9xl font-black rotate-12 select-none">RE-DO</div>
          </div>
      </div>

      {/* Skill Management Modal */}
      {isManageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-[2.5rem] shadow-2xl p-8 max-h-[90vh] flex flex-col border dark:border-gray-700">
              <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
                 <h3 className="text-2xl font-black dark:text-white flex items-center gap-2">
                   <Settings className="w-6 h-6 text-primary-600" />
                   {language === 'zh' ? '能力体系管理' : 'Skill Management'}
                 </h3>
                 <button onClick={() => setIsManageOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <X className="w-6 h-6 dark:text-gray-400" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-4 space-y-6">
                <button 
                  onClick={() => {
                    setTopicForm({ id: '', name: '', subject: '数学', grade: 3 });
                    setIsTopicFormOpen(true);
                  }}
                  className="w-full py-4 border-2 border-dashed border-primary-300 dark:border-primary-800 text-primary-600 dark:text-primary-400 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  {language === 'zh' ? '添加新的能力大类' : 'Add New Topic'}
                </button>

                {skills.map(topic => (
                  <div key={topic.id} className="bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-700 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <span className="text-xs font-black bg-blue-100 text-blue-600 px-2 py-1 rounded uppercase tracking-widest mr-2">{topic.subject}</span>
                        <h4 className="text-xl font-black dark:text-white inline">{topic.name}</h4>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 mr-2">
                          <button 
                            onClick={() => handleMoveTopic(topic.id, 'up')}
                            className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-white dark:hover:bg-gray-700 rounded-md transition-all"
                          ><ChevronUp className="w-4 h-4" /></button>
                          <button 
                            onClick={() => handleMoveTopic(topic.id, 'down')}
                            className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-white dark:hover:bg-gray-700 rounded-md transition-all"
                          ><ChevronDown className="w-4 h-4" /></button>
                        </div>
                        <button 
                          onClick={() => {
                            setTopicForm({ id: topic.id, name: topic.name, subject: topic.subject, grade: topic.grade });
                            setIsTopicFormOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                        ><Edit2 className="w-4 h-4" /></button>
                        <button 
                          onClick={() => handleDeleteTopic(topic.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        ><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>

                    <div className="space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                      {topic.objectives?.map(obj => (
                        <div key={obj.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-xl border dark:border-gray-700 group">
                          <div>
                            <span className="text-[10px] font-black text-gray-400 mr-2 uppercase">[{obj.name}]</span>
                            <span className="font-bold dark:text-gray-200">{obj.target}</span>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{language === 'zh' ? '能力点ID' : 'Objective ID'}:</span>
                              <code className="text-xs bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-2 py-1 rounded-lg font-mono border border-primary-100 dark:border-primary-800 select-all">
                                {obj.id}
                              </code>
                            </div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-700 p-0.5">
                              <button 
                                onClick={() => handleMoveObjective(topic.id, obj.id, 'up')}
                                className="p-1 text-gray-400 hover:text-primary-500 hover:bg-white dark:hover:bg-gray-800 rounded-md transition-all"
                              ><ChevronUp className="w-3.5 h-3.5" /></button>
                              <button 
                                onClick={() => handleMoveObjective(topic.id, obj.id, 'down')}
                                className="p-1 text-gray-400 hover:text-primary-500 hover:bg-white dark:hover:bg-gray-800 rounded-md transition-all"
                              ><ChevronDown className="w-3.5 h-3.5" /></button>
                            </div>
                            <button 
                              onClick={() => {
                                setObjForm({ id: obj.id, topicId: topic.id, name: obj.name, target: obj.target });
                                setIsObjFormOpen(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                            ><Edit2 className="w-4 h-4" /></button>
                            <button 
                              onClick={() => handleDeleteObjective(obj.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            ><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => {
                          setObjForm({ id: '', topicId: topic.id, name: '', target: '' });
                          setIsObjFormOpen(true);
                        }}
                        className="text-xs font-bold text-primary-600 mt-2 flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-3 h-3" />
                        {language === 'zh' ? '添加具体能力点' : 'Add Objective'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}

      {/* Topic Form Modal */}
      {isTopicFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl w-full max-w-md border dark:border-gray-700 shadow-xl">
            <h4 className="text-xl font-black mb-4 dark:text-white">{topicForm.id ? '编辑大类' : '新建大类'}</h4>
            <div className="space-y-4">
              <input 
                value={topicForm.name} 
                onChange={e => setTopicForm({...topicForm, name: e.target.value})}
                placeholder={language === 'zh' ? '大类名称 (如: 10以内加减法)' : 'Topic Name'}
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700 dark:text-white outline-none"
              />
              <input 
                value={topicForm.subject} 
                onChange={e => setTopicForm({...topicForm, subject: e.target.value})}
                placeholder={language === 'zh' ? '科目 (如: 数学)' : 'Subject'}
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700 dark:text-white outline-none"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsTopicFormOpen(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold">{language === 'zh' ? '取消' : 'Cancel'}</button>
              <button onClick={handleSaveTopic} className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-bold">{language === 'zh' ? '保存' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Objective Form Modal */}
      {isObjFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl w-full max-w-md border dark:border-gray-700 shadow-xl">
            <h4 className="text-xl font-black mb-4 dark:text-white">{objForm.id ? '编辑能力点' : '新建能力点'}</h4>
            <div className="space-y-4">
              <input 
                value={objForm.name} 
                onChange={e => setObjForm({...objForm, name: e.target.value})}
                placeholder={language === 'zh' ? '编号 (如: 1, 2, 3...)' : 'Identifier'}
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700 dark:text-white outline-none"
              />
              <textarea 
                value={objForm.target} 
                onChange={e => setObjForm({...objForm, target: e.target.value})}
                placeholder={language === 'zh' ? '具体目标 (如: 能熟练计算10以内的进位加法)' : 'Target Description'}
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700 dark:text-white outline-none h-24 resize-none"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsObjFormOpen(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold">{language === 'zh' ? '取消' : 'Cancel'}</button>
              <button onClick={handleSaveObjective} className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-bold">{language === 'zh' ? '保存' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
      {/* Report Preview & Print Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white print:static">
          <style>
            {`
              @media print {
                body * { visibility: hidden; }
                .print-area, .print-area * { visibility: visible; }
                .print-area { position: absolute; left: 0; top: 0; width: 100%; }
                .no-print { display: none !important; }
                @page { margin: 1.5cm; }
              }
            `}
          </style>
          <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-[2.5rem] shadow-2xl p-8 max-h-[90vh] flex flex-col border dark:border-gray-700 print:shadow-none print:border-none print:p-0 print:max-h-none print:w-full print:rounded-none">
            <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4 no-print">
              <h3 className="text-2xl font-black dark:text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                {language === 'zh' ? '报告预览与导出' : 'Report Preview'}
              </h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20"
                >
                  <Printer className="w-4 h-4" />
                  {language === 'zh' ? '打印 / 导出 PDF' : 'Print / Export'}
                </button>
                <button onClick={() => setIsReportOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <X className="w-6 h-6 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-4 space-y-8 scrollbar-thin print:overflow-visible print:pr-0">
              {/* Editable Fields in Preview (no-print) */}
              <div className="space-y-4 no-print bg-gray-50 dark:bg-gray-900 p-6 rounded-3xl border dark:border-gray-700">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">{language === 'zh' ? '报告参数修改' : 'Report Settings'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">{language === 'zh' ? '报告标题' : 'Title'}</label>
                    <input 
                      value={reportTitle}
                      onChange={e => setReportTitle(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">{language === 'zh' ? '教师评语' : 'Comments'}</label>
                    <textarea 
                      value={reportComments}
                      onChange={e => setReportComments(e.target.value)}
                      placeholder={language === 'zh' ? '在此输入教学建议或评估总结...' : 'Enter feedback...'}
                      className="w-full p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 dark:text-white h-12"
                    />
                  </div>
                </div>
              </div>

              {/* The Actual Report Area */}
              <div className="print-area bg-white p-8 rounded-xl border border-gray-100 shadow-sm space-y-8 text-gray-900">
                {/* Header */}
                <div className="flex justify-between items-start border-b-4 border-primary-600 pb-6">
                  <div>
                    <h1 className="text-3xl font-black text-primary-600 mb-2">{reportTitle}</h1>
                    <div className="flex gap-4 text-sm font-bold text-gray-500">
                      <span>{language === 'zh' ? '学生：' : 'Student: '} {students.find(s => s.id === selectedStudentId)?.username}</span>
                      <span>{language === 'zh' ? '日期：' : 'Date: '} {new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-gray-300">SMART EDU</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Ability Matrix System</div>
                  </div>
                </div>

                {/* Matrix Content */}
                <div className="space-y-6">
                  {skills.map(topic => (
                    <div key={topic.id} className="space-y-3">
                      <h3 className="text-lg font-black bg-gray-100 p-2 rounded-lg">{topic.name}</h3>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <th className="p-3 text-left border">{language === 'zh' ? '编号' : 'ID'}</th>
                            <th className="p-3 text-left border">{language === 'zh' ? '能力目标' : 'Objective'}</th>
                            <th className="p-3 text-center border">{language === 'zh' ? '正确率' : 'Accuracy'}</th>
                            <th className="p-3 text-center border">{language === 'zh' ? '状态' : 'Status'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topic.objectives?.map(obj => {
                            const status = getRecordStatus(obj.id);
                            const acc = getAccuracy(obj.id);
                            return (
                              <tr key={obj.id} className="text-sm font-bold border">
                                <td className="p-3 border w-20 text-center">{obj.name}</td>
                                <td className="p-3 border">{obj.target}</td>
                                <td className={`p-3 border w-24 text-center ${status === 'pass' ? 'text-green-600' : status === 'fail' ? 'text-red-600' : 'text-gray-300'}`}>
                                  {acc}
                                </td>
                                <td className="p-3 border w-24 text-center">
                                  {status === 'pass' ? '✅' : status === 'fail' ? '❌' : '➖'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>

                {/* Comments Section */}
                {reportComments && (
                  <div className="p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">{language === 'zh' ? '教师综合评语' : 'Teacher Comments'}</h4>
                    <p className="text-sm font-medium italic leading-relaxed text-gray-700 whitespace-pre-wrap">
                      "{reportComments}"
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="pt-12 flex justify-between items-end border-t border-gray-100 mt-12">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">{language === 'zh' ? '评估标准' : 'Evaluation Standard'}</p>
                    <p className="text-[8px] text-gray-400 leading-tight">
                      {language === 'zh' ? 'Y: 正确率 ≥ 80%，表示已掌握。 N: 正确率 < 80%，建议继续练习。' : 'Y: Acc >= 80% (Mastered). N: Acc < 80% (Needs practice).'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="w-32 h-px bg-gray-300 mb-2"></div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{language === 'zh' ? '教师签名' : 'Signature'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AbilityTracker;