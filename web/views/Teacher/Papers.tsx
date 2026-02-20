
import React, { useState, useEffect } from 'react';
import { FileText, Plus, MoreVertical, X, Check, Search, Eye, BookOpen, Trash2, Edit } from 'lucide-react';
import { api } from '../../services/api.ts';
import { Question } from '../../types.ts';
import { REVERSE_TYPE_MAP } from '../../utils.ts';
import Loading from '../../components/Loading';

const Papers: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [subjectFilter, setSubjectFilter] = useState('全部');
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  
  const [papers, setPapers] = useState<any[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [paperTitle, setPaperTitle] = useState('');
  const [editingPaperId, setEditingPaperId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [papersData, questionsData] = await Promise.all([
        api.papers.list(),
        api.questions.list()
      ]);
      setPapers(papersData);
      setAvailableQuestions(questionsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModalForCreate = () => {
    setEditingPaperId(null);
    setPaperTitle('');
    setSelectedIds([]);
    setIsPaperModalOpen(true);
  };

  const handleOpenModalForEdit = (p: any) => {
    setEditingPaperId(p.id);
    setPaperTitle(p.name);
    if (p.questions) {
      setSelectedIds(p.questions.map((q: any) => q.id));
    } else if (p.questionIds) {
      setSelectedIds(p.questionIds);
    }
    setIsPaperModalOpen(true);
  };

  const handleCreatePaper = async () => {
    if (!paperTitle.trim() || saving) return;
    try {
      setSaving(true);
      const payload = {
        name: paperTitle,
        questionIds: selectedIds,
        total: selectedIds.length
      };

      if (editingPaperId) {
        await api.papers.update(editingPaperId, payload);
      } else {
        await api.papers.create(payload);
      }

      setIsPaperModalOpen(false);
      await fetchData();
      setPaperTitle('');
      setSelectedIds([]);
      setEditingPaperId(null);
    } catch (e) {
      alert(editingPaperId ? 'Failed to update paper' : 'Failed to create paper');
    } finally {
      setSaving(false);
    }
  };
  
  // TODO: Add Update Paper Logic (Backend doesn't have UpdatePaper yet, so mocking edit for now or just alert)
  // For now, let's implement Delete since backend might not support update either (checking handlers.go... no UpdatePaper)
  // I'll add Delete support here if API supports it (checking api.ts... no delete paper method)
  // Wait, I need to check api.ts for delete paper support.

  const handleDeletePaper = async (id: string) => {
    if (confirm(language === 'zh' ? '确定要删除这份试卷吗？' : 'Are you sure you want to delete this paper?')) {
      try {
        await api.papers.delete(id);
        fetchData();
      } catch (e) {
        alert(language === 'zh' ? '删除失败' : 'Failed to delete');
      }
    }
  };

  const filteredQuestions = availableQuestions
    .filter(q => !selectedIds.includes(q.id))
    .filter(q => subjectFilter === '全部' || q.subject === subjectFilter);

  const selectedQuestions = availableQuestions.filter(q => selectedIds.includes(q.id));

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };


  return (
    <div className="space-y-6 relative animate-in fade-in duration-500" onClick={() => setMenuOpenId(null)}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold dark:text-white">{language === 'zh' ? '试卷管理' : 'Paper Library'}</h2>
        <button 
          onClick={handleOpenModalForCreate}
          className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary-500/30 hover:bg-primary-700 transition-all"
        >
          <Plus className="w-5 h-5" />
          {language === 'zh' ? '创建试卷' : 'Create Paper'}
        </button>
      </div>

      {loading ? <Loading /> : (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {papers.length === 0 && (
          <div className="col-span-3 text-center py-20 bg-white dark:bg-gray-800 rounded-[3rem] border-2 border-dashed dark:border-gray-700">
            <div className="bg-gray-50 dark:bg-gray-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-black dark:text-white mb-2">{language === 'zh' ? '暂无试卷' : 'No papers yet'}</h3>
            <p className="text-gray-400 font-bold mb-8 max-w-xs mx-auto">
              {language === 'zh' 
                ? (availableQuestions.length > 0 ? `题库已有 ${availableQuestions.length} 道题目，快来组卷吧！` : '还没有试卷，先去题目管理添加题目吧！')
                : (availableQuestions.length > 0 ? `You have ${availableQuestions.length} questions ready. Create your first paper!` : 'Start by adding questions to your bank first.')}
            </p>
            <button 
              onClick={handleOpenModalForCreate}
              className="bg-primary-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-primary-500/30 hover:bg-primary-700 transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {language === 'zh' ? '立即创建' : 'Create Now'}
            </button>
          </div>
        )}
        {papers.map(p => (
          <div key={p.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border dark:border-gray-700 shadow-sm relative group hover:shadow-xl hover:translate-y-[-4px] transition-all">
            <div className="bg-primary-50 dark:bg-primary-900/20 w-14 h-14 rounded-2xl flex items-center justify-center text-primary-600 mb-6">
              <FileText className="w-8 h-8" />
            </div>
            
            <div className="absolute top-6 right-6">
                <button 
                  onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === p.id ? null : p.id); }}
                  className="text-gray-400 hover:text-primary-600 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {menuOpenId === p.id && (
                  <div className="absolute right-0 top-10 bg-white dark:bg-gray-800 shadow-xl rounded-2xl border dark:border-gray-700 p-2 min-w-[120px] z-10 animate-in fade-in zoom-in-95 duration-200">
                    <button onClick={() => handleOpenModalForEdit(p)} className="w-full text-left px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                       <Edit className="w-4 h-4" /> Edit
                    </button>
                    <button onClick={() => handleDeletePaper(p.id)} className="w-full text-left px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-bold text-red-500 flex items-center gap-2">
                       <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                )}
            </div>

            <h4 className="font-black text-lg dark:text-white mb-2 leading-tight">{p.name}</h4>
            <div className="flex justify-between text-xs text-gray-400 mt-6 font-bold uppercase tracking-widest">
              <span>{p.total || 0} {language === 'zh' ? '道题目' : 'Questions'}</span>
              <span>{p.used || 0} {language === 'zh' ? '次下发' : 'Assigned'}</span>
            </div>
            <div className="mt-8 flex gap-2">
               <button onClick={() => handleOpenModalForEdit(p)} className="flex-1 py-3 text-xs font-black bg-gray-50 dark:bg-gray-700 rounded-xl dark:text-gray-300 hover:bg-primary-600 hover:text-white transition-all uppercase">
                 {language === 'zh' ? '编辑' : 'Edit'}
               </button>
               <button onClick={() => handleDeletePaper(p.id)} className="flex-1 py-3 text-xs font-black bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all uppercase">
                 {language === 'zh' ? '下线' : 'Delete'}
               </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {isPaperModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-300">
           <div className="bg-white dark:bg-gray-800 w-full max-w-5xl rounded-[3rem] shadow-2xl p-10 max-h-[92vh] flex flex-col border dark:border-gray-700">
              <div className="flex justify-between items-center mb-8 border-b dark:border-gray-700 pb-6">
                 <h3 className="text-3xl font-black dark:text-white">
                   {editingPaperId 
                     ? (language === 'zh' ? '修改试卷' : 'Update Paper')
                     : (language === 'zh' ? '组卷配置' : 'Paper Configuration')}
                 </h3>
                 <button onClick={() => setIsPaperModalOpen(false)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <X className="w-6 h-6 dark:text-gray-400" />
                 </button>
              </div>
              
              <div className="space-y-8 flex-1 overflow-y-auto pr-4">
                 <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-3 tracking-widest">{language === 'zh' ? '试卷名称' : 'Paper Title'}</label>
                    <input 
                      type="text" 
                      value={paperTitle}
                      onChange={(e) => setPaperTitle(e.target.value)}
                      className="w-full p-5 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-[1.5rem] border dark:border-gray-700 outline-none focus:ring-4 focus:ring-primary-500/20 font-bold text-lg"
                      placeholder={language === 'zh' ? '例如：2024春季摸底卷' : 'e.g. Mid-term Exam'}
                    />
                 </div>

                 <div className="grid lg:grid-cols-2 gap-8 h-[500px]">
                    {/* Available List */}
                    <div className="flex flex-col border dark:border-gray-700 rounded-[2rem] p-6 bg-gray-50/50 dark:bg-gray-900/30">
                       <div className="flex justify-between items-center mb-6">
                          <h4 className="font-black dark:text-white flex items-center gap-2"><BookOpen className="w-5 h-5" /> {language === 'zh' ? '可选题目' : 'Available Bank'}</h4>
                          <select 
                            value={subjectFilter}
                            onChange={(e) => setSubjectFilter(e.target.value)}
                            className="text-xs p-2 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 outline-none font-bold"
                          >
                             <option value="全部">全部科目</option>
                             <option value="数学">数学</option>
                             <option value="语文">语文</option>
                             <option value="英语">英语</option>
                          </select>
                       </div>
                       <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                          {filteredQuestions.length > 0 ? filteredQuestions.map(q => {
                            return (
                              <div key={q.id} className="p-4 rounded-2xl flex items-center justify-between shadow-sm bg-white dark:bg-gray-800 border border-transparent hover:border-primary-500 transition-all">
                                 <div className="flex-1">
                                    <div className="flex gap-2 mb-1">
                                       <span className="text-[8px] font-black uppercase text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-1.5 py-0.5 rounded">{q.subject}</span>
                                       <span className="text-[8px] font-black uppercase text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{REVERSE_TYPE_MAP[q.type as string] || q.type}</span>
                                    </div>
                                    <p className="text-xs font-bold dark:text-gray-200 truncate pr-4">{q.stemText}</p>
                                 </div>
                                 <div className="flex gap-1">
                                    <button onClick={() => setPreviewQuestion(q)} className="p-2 text-gray-400 hover:text-primary-600 transition-colors">
                                       <Eye className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => toggleSelection(q.id)}
                                      className="px-3 py-1 bg-primary-600 text-white rounded-lg text-[10px] font-black hover:bg-primary-700"
                                    >
                                       {language === 'zh' ? '添加' : 'Add'}
                                    </button>
                                 </div>
                              </div>
                            );
                          }) : (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                              <Search className="w-8 h-8 opacity-20 mb-2" />
                              <p className="text-xs">{language === 'zh' ? '暂无可添加题目' : 'No more questions to add'}</p>
                            </div>
                          )}
                       </div>
                    </div>

                    {/* Selected List */}
                    <div className="flex flex-col border dark:border-gray-700 rounded-[2rem] p-6 bg-primary-50/10 dark:bg-primary-900/5">
                       <h4 className="font-black mb-6 dark:text-white flex items-center gap-2"><Check className="w-5 h-5 text-green-500" /> {language === 'zh' ? `已选题目 (${selectedIds.length})` : `Chosen (${selectedIds.length})`}</h4>
                       <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                          {selectedQuestions.map((q, i) => {
                            return (
                              <div key={q.id} className="p-4 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-between shadow-md border dark:border-gray-700 animate-in slide-in-from-right-2">
                                 <div className="flex-1 min-w-0">
                                    <div className="flex gap-2 mb-1">
                                       <span className="text-[8px] font-black text-primary-600">#{i+1}</span>
                                       <span className="text-[8px] font-black uppercase text-gray-400">{q.subject} · {REVERSE_TYPE_MAP[q.type as string] || q.type}</span>
                                    </div>
                                    <p className="text-xs font-bold dark:text-white truncate">{q.stemText}</p>
                                 </div>
                                 <div className="flex gap-2 shrink-0">
                                    <button onClick={() => setPreviewQuestion(q)} className="p-2 text-gray-400 hover:text-primary-600">
                                       <Eye className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => toggleSelection(q.id)} className="text-red-500 hover:text-red-700 p-1">
                                       <X className="w-4 h-4" />
                                    </button>
                                 </div>
                              </div>
                            );
                          })}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="pt-8 flex gap-4 border-t dark:border-gray-700">
                 <button onClick={() => setIsPaperModalOpen(false)} className="px-10 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-[1.5rem] font-black uppercase tracking-widest transition-colors">
                   {language === 'zh' ? '放弃' : 'Discard'}
                 </button>
                 <button 
                   onClick={handleCreatePaper} 
                   disabled={saving}
                   className={`flex-1 py-4 text-white rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl transition-all ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-600 shadow-primary-500/30 hover:bg-primary-700'}`}
                 >
                   {saving ? (
                     <>
                       <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                       {language === 'zh' ? '保存中...' : 'Saving...'}
                     </>
                   ) : (
                     <>
                       <Check className="w-6 h-6" />
                       {language === 'zh' ? '保存并下发' : 'Finalize'}
                     </>
                   )}
                 </button>
              </div>
           </div>
        </div>
      )}

      {previewQuestion && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in zoom-in-95">
           <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 relative border dark:border-gray-700 max-h-[90vh] overflow-y-auto">
              <button onClick={() => setPreviewQuestion(null)} className="absolute top-6 right-6 p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-red-500 hover:text-white transition-all">
                 <X className="w-5 h-5" />
              </button>
              <div className="mb-6">
                <span className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {previewQuestion.subject} · {previewQuestion.type}
                </span>
              </div>
              {previewQuestion.stemImage && <img src={previewQuestion.stemImage} className="w-full h-40 object-cover rounded-2xl mb-4 border dark:border-gray-700" alt="stem" />}
              <h3 className="text-xl font-black dark:text-white mb-8 leading-relaxed">
                {previewQuestion.stemText}
              </h3>
              {previewQuestion.options && (
                <div className="space-y-3 mb-8">
                   {previewQuestion.options.map((o: any, i: number) => {
                     const optText = typeof o === 'string' ? o : (o.text || o.value || '');
                     const optImage = typeof o === 'object' ? o.image : undefined;
                     const isCorrect = previewQuestion.answer.includes(typeof o === 'string' ? o : o.value);
                     return (
                       <div key={i} className={`p-4 rounded-xl border-2 font-bold text-sm ${isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'border-gray-100 dark:border-gray-700 dark:text-gray-300'}`}>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-400">{String.fromCharCode(65 + i)}.</span>
                            {optImage && <img src={optImage} className="w-10 h-10 object-cover rounded" />}
                            <span>{optText}</span>
                          </div>
                       </div>
                     );
                   })}
                </div>
              )}
              <div className="p-6 bg-primary-50 dark:bg-primary-900/10 rounded-2xl border-2 border-primary-200 dark:border-primary-800">
                 <p className="text-[10px] font-black text-primary-600 uppercase mb-1 tracking-widest">{language === 'zh' ? '解析与答案' : 'Solution'}</p>
                 <p className="text-primary-700 dark:text-primary-400 font-black text-lg">{previewQuestion.answer}</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Papers;
