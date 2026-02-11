import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, X, Image as ImageIcon, CheckCircle, Circle, CheckSquare, Square, Upload } from 'lucide-react';
import { api } from '../../services/api.ts';
import { Question, QuestionType } from '../../types.ts';
import { GRADE_MAP, REVERSE_GRADE_MAP, TYPE_MAP, REVERSE_TYPE_MAP } from '../../utils.ts';

const Questions: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formSubject, setFormSubject] = useState('数学');
  const [formGrade, setFormGrade] = useState('三年级');
  const [formType, setFormType] = useState('单选题');
  const [formStem, setFormStem] = useState('');
  const [formStemImage, setFormStemImage] = useState('');
  const [formOptions, setFormOptions] = useState<{ text: string; image?: string; value: string }[]>([
    { text: '', image: '', value: 'A' }, 
    { text: '', image: '', value: 'B' }, 
    { text: '', image: '', value: 'C' }, 
    { text: '', image: '', value: 'D' }
  ]);
  const [formAnswer, setFormAnswer] = useState<string | string[]>('');

  const stemInputRef = useRef<HTMLInputElement>(null);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const data = await api.questions.list();
      setQuestions(data);
    } catch (error) {
      console.error("Failed to fetch questions", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleOpenModal = (q: Question | null = null) => {
    if (q) {
      setEditingQuestion(q);
      setFormSubject(q.subject as string);
      setFormGrade(REVERSE_GRADE_MAP[q.grade] || '三年级');
      // Simple logic for type mapping back to UI
      const uiType = REVERSE_TYPE_MAP[q.type as string] || '单选题'; 
      setFormType(uiType);
      
      setFormStem(q.stemText);
      setFormStemImage(q.stemImage || '');
      setFormOptions(q.options?.map(o => ({ 
        text: o.text || '', 
        image: o.image || '', 
        value: o.value 
      })) || [{ text: '', image: '', value: 'A' }, { text: '', image: '', value: 'B' }, { text: '', image: '', value: 'C' }, { text: '', image: '', value: 'D' }]);
      
      // Handle answer parsing if needed (backend stores string)
      setFormAnswer(q.answer); 
    } else {
      setEditingQuestion(null);
      setFormSubject('数学');
      setFormGrade('三年级');
      setFormType('单选题');
      setFormStem('');
      setFormStemImage('');
      setFormOptions([{ text: '', image: '', value: 'A' }, { text: '', image: '', value: 'B' }, { text: '', image: '', value: 'C' }, { text: '', image: '', value: 'D' }]);
      setFormAnswer('');
    }
    setIsModalOpen(true);
  };

  const handleToggleAnswer = (val: string) => {
    if (formType === '多选题') {
      const current = Array.isArray(formAnswer) ? [...formAnswer] : (formAnswer ? [formAnswer as string] : []);
      // Logic for multi-select (not fully supported by backend string field yet unless JSON stringified, but simplifying here)
      // Assuming backend stores comma separated or JSON for multiple answers? 
      // Current backend model has Answer string.
      if (current.includes(val)) {
        setFormAnswer(current.filter(v => v !== val));
      } else {
        setFormAnswer([...current, val]);
      }
    } else {
      setFormAnswer(val);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'stem' | number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (type === 'stem') {
          setFormStemImage(result);
        } else {
          const next = [...formOptions];
          next[type].image = result;
          setFormOptions(next);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    const questionData: Partial<Question> = {
      subject: formSubject,
      grade: GRADE_MAP[formGrade] || 3,
      type: TYPE_MAP[formType] || QuestionType.MULTIPLE_CHOICE,
      stemText: formStem,
      stemImage: formStemImage,
      options: ['单选题', '多选题'].includes(formType) ? formOptions : undefined,
      answer: Array.isArray(formAnswer) ? formAnswer.join(',') : formAnswer
    };

    try {
      if (editingQuestion) {
        await api.questions.update(editingQuestion.id, questionData);
      } else {
        await api.questions.create(questionData);
      }
      setIsModalOpen(false);
      fetchQuestions();
    } catch (error) {
      console.error("Failed to save question", error);
      alert(language === 'zh' ? '保存失败' : 'Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(language === 'zh' ? '确定删除吗？' : 'Delete?')) {
      try {
        await api.questions.delete(id);
        fetchQuestions();
      } catch (error) {
        console.error("Failed to delete", error);
      }
    }
  };

  const subjects = ['数学', '语言词汇', '阅读', '识字'];
  const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];

  return (
    <div className="space-y-6 relative animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold dark:text-white">{language === 'zh' ? '题目管理' : 'Question Bank'}</h2>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/30"
        >
          <Plus className="w-5 h-5" />
          {language === 'zh' ? '添加新题' : 'New Question'}
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder={language === 'zh' ? '搜索题目内容或知识点...' : 'Search questions...'}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 dark:text-white shadow-sm"
          />
        </div>
        <button className="px-6 py-2 border dark:border-gray-700 rounded-2xl flex items-center gap-2 bg-white dark:bg-gray-800 dark:text-white hover:bg-gray-50 transition-colors shadow-sm">
          <Filter className="w-5 h-5 text-gray-500" />
          {language === 'zh' ? '筛选' : 'Filter'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden border dark:border-gray-700 shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          questions.map((q, idx) => {
            return (
              <div key={q.id} className="p-6 border-b dark:border-gray-700 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/30 group transition-colors">
                <div className="flex-1">
                  <div className="flex gap-2 mb-3">
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[10px] font-black uppercase tracking-widest">{q.subject as string}</span>
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded text-[10px] font-black uppercase tracking-widest">{REVERSE_TYPE_MAP[q.type as string] || q.type}</span>
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-[10px] font-black uppercase tracking-widest">{REVERSE_GRADE_MAP[q.grade] || q.grade}</span>
                  </div>
                  <div className="flex gap-4 items-start">
                    {q.stemImage && <img src={q.stemImage} className="w-20 h-20 object-cover rounded-xl border dark:border-gray-700" alt="stem" />}
                    <div>
                      <p className="dark:text-white font-bold text-lg mb-1">{idx + 1}. {q.stemText}</p>
                      <p className="text-xs text-green-600 font-bold">{language === 'zh' ? '答案' : 'Answer'}: {q.answer}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => handleOpenModal(q)} className="p-3 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-2xl transition-all">
                     <Edit2 className="w-5 h-5" />
                   </button>
                   <button onClick={() => handleDelete(q.id)} className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all">
                     <Trash2 className="w-5 h-5" />
                   </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-[2.5rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto border dark:border-gray-700">
              <div className="flex justify-between items-center mb-8 border-b dark:border-gray-700 pb-4 sticky top-0 bg-white dark:bg-gray-800 z-10">
                 <h3 className="text-2xl font-black dark:text-white">
                   {editingQuestion ? (language === 'zh' ? '编辑题目' : 'Edit Question') : (language === 'zh' ? '添加新题目' : 'Add New Question')}
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <X className="w-6 h-6 dark:text-gray-400" />
                 </button>
              </div>
              
              <div className="space-y-8">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                     <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">{language === 'zh' ? '所属科目' : 'Subject'}</label>
                     <select 
                        value={formSubject}
                        onChange={(e) => setFormSubject(e.target.value)}
                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                     >
                       {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">{language === 'zh' ? '对应年级' : 'Grade'}</label>
                     <select 
                        value={formGrade}
                        onChange={(e) => setFormGrade(e.target.value)}
                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                     >
                       {grades.map(g => <option key={g} value={g}>{g}</option>)}
                     </select>
                   </div>
                 </div>

                 <div>
                   <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">{language === 'zh' ? '题型选择' : 'Question Type'}</label>
                   <select 
                      value={formType}
                      onChange={(e) => { setFormType(e.target.value); setFormAnswer(e.target.value === '多选题' ? [] : ''); }}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                   >
                     <option value="单选题">单选题</option>
                     <option value="多选题">多选题</option>
                     <option value="填空题">填空题</option>
                     <option value="判断题">判断题</option>
                   </select>
                 </div>

                 <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">{language === 'zh' ? '题干描述' : 'Stem Text'}</label>
                      <textarea 
                        value={formStem}
                        onChange={(e) => setFormStem(e.target.value)}
                        className="w-full p-5 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl border dark:border-gray-700 outline-none h-24 font-medium focus:ring-2 focus:ring-primary-500"
                        placeholder={language === 'zh' ? '请输入清晰的题干内容...' : 'Type question stem...'}
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">{language === 'zh' ? '题干图片' : 'Stem Image'}</label>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => stemInputRef.current?.click()}
                          className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 dark:text-white rounded-xl font-bold border dark:border-gray-600 hover:bg-gray-200"
                        >
                          <Upload className="w-4 h-4" />
                          {language === 'zh' ? '点击上传' : 'Upload'}
                        </button>
                        <input 
                          ref={stemInputRef}
                          type="file" 
                          hidden 
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'stem')}
                        />
                        {formStemImage && (
                          <div className="relative group">
                            <img src={formStemImage} className="w-16 h-16 object-cover rounded-xl border dark:border-gray-700" />
                            <button 
                              onClick={() => setFormStemImage('')}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                 </div>

                 {['单选题', '多选题'].includes(formType) && (
                   <div className="space-y-4 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl border dark:border-gray-700">
                     <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">{language === 'zh' ? '选项与答案设置' : 'Options & Answers'}</label>
                     {formOptions.map((opt, i) => {
                       const isCorrect = Array.isArray(formAnswer) ? formAnswer.includes(opt.value) : formAnswer === opt.value;
                       const optionFileRef = React.useRef<HTMLInputElement>(null);
                       return (
                         <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 space-y-3">
                            <div className="flex gap-3 items-center">
                              <button 
                                onClick={() => handleToggleAnswer(opt.value)}
                                className={`p-2 rounded-lg transition-colors ${isCorrect ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}
                              >
                                {formType === '多选题' 
                                  ? (isCorrect ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />)
                                  : (isCorrect ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />)
                                }
                              </button>
                              <input 
                                type="text"
                                value={opt.text}
                                onChange={(e) => {
                                  const next = [...formOptions];
                                  next[i].text = e.target.value;
                                  next[i].value = e.target.value;
                                  setFormOptions(next);
                                }}
                                className="flex-1 p-2 border-b dark:border-gray-700 bg-transparent dark:text-white outline-none focus:border-primary-500 font-bold"
                                placeholder={`${language === 'zh' ? '选项文字' : 'Option Text'}`}
                              />
                            </div>
                            <div className="flex gap-2 items-center pl-10">
                              <button 
                                onClick={() => optionFileRef.current?.click()}
                                className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-gray-900 text-[10px] font-black uppercase text-gray-500 border dark:border-gray-700 rounded-lg hover:bg-gray-100"
                              >
                                <ImageIcon className="w-3 h-3" />
                                {language === 'zh' ? '上传图片' : 'Upload Image'}
                              </button>
                              <input 
                                ref={optionFileRef}
                                type="file" 
                                hidden 
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, i)}
                              />
                              {opt.image && (
                                <div className="relative group">
                                  <img src={opt.image} className="w-10 h-10 object-cover rounded shadow-sm border dark:border-gray-700" />
                                  <button 
                                    onClick={() => {
                                      const next = [...formOptions];
                                      next[i].image = '';
                                      setFormOptions(next);
                                    }}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                                  >
                                    <X className="w-2 h-2" />
                                  </button>
                                </div>
                              )}
                            </div>
                         </div>
                       );
                     })}
                   </div>
                 )}

                 {formType === '判断题' && (
                   <div className="flex gap-4">
                      {['正确', '错误'].map(val => (
                        <button 
                          key={val}
                          onClick={() => setFormAnswer(val)}
                          className={`flex-1 py-4 rounded-2xl font-black border-2 transition-all ${formAnswer === val ? 'bg-primary-600 border-primary-600 text-white shadow-lg' : 'bg-white dark:bg-gray-900 dark:text-white border-gray-100 dark:border-gray-700'}`}
                        >
                          {val}
                        </button>
                      ))}
                   </div>
                 )}

                 {formType === '填空题' && (
                   <div className="space-y-4">
                     <div>
                       <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">{language === 'zh' ? '标准答案' : 'Answer'}</label>
                       <input 
                          type="text" 
                          value={Array.isArray(formAnswer) ? '' : formAnswer}
                          onChange={(e) => setFormAnswer(e.target.value)}
                          className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-xl border dark:border-gray-700 outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                          placeholder={language === 'zh' ? '请输入答案内容' : 'Enter answer'}
                       />
                     </div>
                   </div>
                 )}

                 <div className="flex gap-4 pt-6 border-t dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-[1.5rem] font-black uppercase tracking-widest"
                    >
                      {language === 'zh' ? '取消' : 'Cancel'}
                    </button>
                    <button 
                      onClick={handleSave}
                      className="flex-1 py-4 bg-primary-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-primary-500/30 hover:bg-primary-700 transition-all"
                    >
                      {language === 'zh' ? '立即保存' : 'Save'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Questions;