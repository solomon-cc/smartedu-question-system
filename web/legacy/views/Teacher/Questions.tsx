import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, X, Image as ImageIcon, CheckCircle, Circle, CheckSquare, Square, Upload, Eye, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { api } from '../../services/api.ts';
import { Question, QuestionType } from '../../types.ts';
import { GRADE_MAP, REVERSE_GRADE_MAP, TYPE_MAP, REVERSE_TYPE_MAP, SUBJECTS } from '../../utils.ts';
import Loading from '../../components/Loading';

interface OptionRowProps {
  i: number;
  opt: { text: string; image?: string; value: string };
  formAnswer: string | string[];
  formType: string;
  language: string;
  handleToggleAnswer: (val: string) => void;
  setFormOptions: React.Dispatch<React.SetStateAction<{ text: string; image?: string; value: string }[]>>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'stem' | number) => void;
  formOptions: { text: string; image?: string; value: string }[];
  onCrop: (url: string, target: number) => void;
}

import ConfirmationModal from '../../components/ConfirmationModal';
import ImageCropper from '../../components/ImageCropper';

const ResourcePickerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  language: string;
}> = ({ isOpen, onClose, onSelect, language }) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await api.resources.list(1, 100, keyword);
      setResources(res.list || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchResources();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 border dark:border-gray-700 flex flex-col max-h-[80vh]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black dark:text-white uppercase">{language === 'zh' ? '从素材库选择' : 'Pick from Library'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 dark:text-gray-400" />
          </button>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchResources()}
            placeholder={language === 'zh' ? '搜索素材...' : 'Search resources...'}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
          />
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-4 p-2 custom-scrollbar">
          {loading ? (
            <div className="col-span-3 py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-gray-400">LOADING...</p>
            </div>
          ) : resources.length === 0 ? (
            <div className="col-span-3 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No assets found</div>
          ) : (
            resources.map(res => (
              <div 
                key={res.id} 
                onClick={() => { onSelect(res.url); onClose(); }}
                className="group cursor-pointer aspect-square bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden border-2 border-transparent hover:border-primary-500 transition-all relative"
              >
                {res.type === 'image' || res.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                   <img src={res.url} className="w-full h-full object-cover" alt={res.name} />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon className="w-8 h-8" /></div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-2 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                   <p className="text-[10px] text-white font-bold truncate">{res.name}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const OptionRow: React.FC<OptionRowProps & { openPicker: (idx: number) => void }> = ({ 
  i, opt, formAnswer, formType, language, handleToggleAnswer, setFormOptions, handleFileUpload, formOptions, openPicker, onCrop
}) => {
  const isCorrect = Array.isArray(formAnswer) ? formAnswer.includes(opt.value) : formAnswer === opt.value;
  const optionFileRef = useRef<HTMLInputElement>(null);

  return (
    <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 space-y-3">
       <div className="flex gap-3 items-center">
         <button 
           onClick={() => handleToggleAnswer(opt.value)}
           className={`p-2 rounded-lg transition-colors ${isCorrect ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}
         >
           {formType === '多选题' || formType === QuestionType.MULTIPLE_SELECT
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
           {language === 'zh' ? '上传图片' : 'Upload'}
         </button>
         <button 
           onClick={() => openPicker(i)}
           className="flex items-center gap-1 p-2 bg-blue-50 dark:bg-blue-900/20 text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 rounded-lg hover:bg-blue-100"
         >
           <FileText className="w-3 h-3" />
           {language === 'zh' ? '库选择' : 'Library'}
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
             <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onCrop(opt.image!, i)}
                  className="bg-blue-500 text-white rounded-full p-1 shadow-lg hover:bg-blue-600 transition-colors"
                  title={language === 'zh' ? '裁切' : 'Crop'}
                >
                  <Filter className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => {
                    const next = [...formOptions];
                    next[i].image = '';
                    setFormOptions(next);
                  }}
                  className="bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
             </div>
           </div>
         )}
       </div>
    </div>
  );
};

const Questions: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickAddAbilityOpen, setIsQuickAddAbilityOpen] = useState(false);
  const [quickAddForm, setQuickAddAbilityForm] = useState({ topicId: '', name: '', target: '' });
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [isTrialMode, setIsTrialMode] = useState(false);
  const [trialAnswer, setTrialAnswer] = useState<any>(null);
  const [trialSubmitted, setTrialSubmitted] = useState(false);
  
  const resetTrial = (q: Question | null) => {
    setPreviewQuestion(q);
    setIsTrialMode(false);
    setTrialAnswer(q?.type === QuestionType.MULTIPLE_SELECT ? [] : '');
    setTrialSubmitted(false);
  };

  const handleTrialSubmit = () => {
    setTrialSubmitted(true);
  };

  const isTrialCorrect = () => {
    if (!previewQuestion) return false;
    const standard = previewQuestion.answer;
    if (Array.isArray(trialAnswer)) {
      const current = [...trialAnswer].sort().join(',');
      return current === standard;
    }
    return trialAnswer === standard;
  };

  const handleQuickAddAbility = async () => {
    if (!quickAddForm.topicId || !quickAddForm.name || !quickAddForm.target) {
      alert(language === 'zh' ? '请填写完整能力点信息' : 'Please fill all fields');
      return;
    }
    try {
      const newObj = await api.skills.createObjective(quickAddForm);
      await fetchSkills();
      setFormObjectiveId(newObj.id);
      setIsQuickAddAbilityOpen(false);
      setQuickAddAbilityForm({ topicId: '', name: '', target: '' });
    } catch (e) {
      console.error(e);
      alert(language === 'zh' ? '添加失败' : 'Failed to add');
    }
  };
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  // Modal State for Alerts
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [isResourcePickerOpen, setIsResourcePickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'stem' | number>('stem');
  const [confirmationModalProps, setConfirmationModalProps] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'error' | 'confirm' | 'delete',
    onConfirm: () => {},
    confirmText: '',
    cancelText: '',
  });

  // ... (existing states)

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    
    const mcData = [
      { "科目": "数学", "年级": 3, "题干": "1+1=?", "题干图片URL": "", "答案": "B", "能力点ID": "从能力追踪管理中获取ID", "选项A": "1", "选项A图片URL": "", "选项B": "2", "选项B图片URL": "", "选项C": "3", "选项C图片URL": "", "选项D": "4", "选项D图片URL": "" }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mcData), "单选题");

    const msData = [
      { "科目": "数学", "年级": 3, "题干": "哪些是质数？", "题干图片URL": "", "答案": "A,B", "能力点ID": "", "选项A": "2", "选项A图片URL": "", "选项B": "3", "选项B图片URL": "", "选项C": "4", "选项C图片URL": "", "选项D": "6", "选项D图片URL": "" }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(msData), "多选题");

    const fbData = [
      { "科目": "数学", "年级": 3, "题干": "三角形内角和是___度", "题干图片URL": "", "答案": "180", "能力点ID": "" }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fbData), "填空题");

    const tfData = [
      { "科目": "数学", "年级": 3, "题干": "1是质数", "题干图片URL": "", "答案": "错误", "能力点ID": "" }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tfData), "判断题");

    XLSX.writeFile(wb, "question_template_v3.xlsx");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const workbook = new ExcelJS.Workbook();
    try {
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      const allFormatted: any[] = [];

      // Map headers to column indices (standardizing based on our template)
      const COL_MAP: Record<string, number> = {
        '科目': 1, '年级': 2, '题干': 3, '题干图片URL': 4, '答案': 5, '能力点ID': 6,
        '选项A': 7, '选项A图片URL': 8, '选项B': 9, '选项B图片URL': 10,
        '选项C': 11, '选项C图片URL': 12, '选项D': 13, '选项D图片URL': 14
      };

      workbook.eachSheet((worksheet) => {
        let type = QuestionType.MULTIPLE_CHOICE;
        if (worksheet.name === '多选题') type = QuestionType.MULTIPLE_SELECT;
        if (worksheet.name === '填空题') type = QuestionType.CALCULATION;
        if (worksheet.name === '判断题') type = QuestionType.TRUE_FALSE;

        // Extract images from this worksheet
        const images: any[] = [];
        worksheet.getImages().forEach((img) => {
          const imageObj = workbook.model.media.find((m, i) => i === (img as any).imageId);
          if (imageObj) {
            images.push({
              row: img.range.tl.row + 1, // ExcelJS is 0-indexed for TL
              col: img.range.tl.col + 1,
              base64: `data:image/${imageObj.extension};base64,${imageObj.buffer.toString('base64')}`
            });
          }
        });

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header

          const getVal = (colName: string) => row.getCell(COL_MAP[colName]).value?.toString() || "";
          const getImg = (colName: string) => {
             // 1. Check if there's a URL in the cell
             const url = getVal(colName);
             if (url && url.startsWith('http')) return url;
             // 2. Check if there's an embedded image over this cell
             const colIdx = COL_MAP[colName];
             const found = images.find(img => img.row === rowNumber && img.col === colIdx);
             return found ? found.base64 : "";
          };

          const options = [];
          if (type === QuestionType.MULTIPLE_CHOICE || type === QuestionType.MULTIPLE_SELECT) {
            if (getVal('选项A')) options.push({ text: getVal('选项A'), image: getImg('选项A图片URL'), value: "A" });
            if (getVal('选项B')) options.push({ text: getVal('选项B'), image: getImg('选项B图片URL'), value: "B" });
            if (getVal('选项C')) options.push({ text: getVal('选项C'), image: getImg('选项C图片URL'), value: "C" });
            if (getVal('选项D')) options.push({ text: getVal('选项D'), image: getImg('选项D图片URL'), value: "D" });
          }

          const subject = getVal('科目');
          const stemText = getVal('题干');
          const answer = getVal('答案');
          const isValid = !!(subject && stemText && answer);

          allFormatted.push({
            subject,
            grade: parseInt(getVal('年级')),
            type: type,
            stemText,
            stemImage: getImg('题干图片URL'),
            answer,
            options: options.length > 0 ? options : undefined,
            objectiveId: getVal('能力点ID'),
            isValid
          });
        });
      });

      setImportData(allFormatted);
    } catch (err) {
      console.error(err);
      setConfirmationModalProps({
        title: language === 'zh' ? '文件错误' : 'File Error',
        message: language === 'zh' ? '解析 Excel 文件失败，请确保格式正确并包含必要数据。' : 'Failed to parse Excel. Ensure format is correct.',
        type: 'error',
        language: language,
        onConfirm: () => setIsConfirmationModalOpen(false),
      });
      setIsConfirmationModalOpen(true);
    }
  };

  const confirmImport = async () => {
    try {
      await api.questions.bulkCreate(importData);
      setIsImportModalOpen(false);
      setImportData([]);
      if (page === 1) fetchQuestions(); else setPage(1);
      setConfirmationModalProps({
        title: language === 'zh' ? '导入成功' : 'Import Successful',
        message: language === 'zh' ? '题目已成功导入。' : 'Questions imported successfully.',
        type: 'success',
        language: language,
        onConfirm: () => setIsConfirmationModalOpen(false),
      });
      setIsConfirmationModalOpen(true);
    } catch (e) {
      console.error(e);
      setConfirmationModalProps({
        title: language === 'zh' ? '导入失败' : 'Import Failed',
        message: language === 'zh' ? '题目导入失败，请检查文件内容或重试。' : 'Failed to import questions. Please check file content or try again.',
        type: 'error',
        language: language,
        onConfirm: () => setIsConfirmationModalOpen(false),
      });
      setIsConfirmationModalOpen(true);
    }
  };

  // Form State
  // ... (keeping existing states)

  const handlePreviewCurrent = () => {
    const currentData: Question = {
      id: 'preview',
      subject: formSubject,
      grade: GRADE_MAP[formGrade] || 3,
      type: TYPE_MAP[formType] || QuestionType.MULTIPLE_CHOICE,
      stemText: formStem,
      stemImage: formStemImage,
      options: formOptions.filter(o => o.text.trim() !== '' || o.image),
      answer: Array.isArray(formAnswer) ? formAnswer.join(',') : formAnswer,
      objectiveId: formObjectiveId
    };
    resetTrial(currentData);
  };

  const handleResourceSelect = (url: string) => {
    setCropTarget(pickerTarget);
    setCroppingImage(url);
  };

  const openResourcePicker = (target: 'stem' | number) => {
    setPickerTarget(target);
    setIsResourcePickerOpen(true);
  };

  // Image Cropping States
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'stem' | number | string>('stem');
  const [importCropIndex, setImportCropIndex] = useState<number | null>(null);

  const onCropComplete = (croppedImage: string) => {
    if (importCropIndex !== null) {
      const nextData = [...importData];
      const target = cropTarget.toString();
      if (target === 'stem') {
        nextData[importCropIndex].stemImage = croppedImage;
      } else if (target.startsWith('opt_')) {
        const optIdx = parseInt(target.replace('opt_', ''));
        if (nextData[importCropIndex].options && nextData[importCropIndex].options[optIdx]) {
          nextData[importCropIndex].options[optIdx].image = croppedImage;
        }
      }
      setImportData(nextData);
      setImportCropIndex(null);
    } else {
      if (cropTarget === 'stem') {
        setFormStemImage(croppedImage);
      } else {
        const next = [...formOptions];
        next[cropTarget as number].image = croppedImage;
        setFormOptions(next);
      }
    }
    setCroppingImage(null);
  };

  // Load sticky settings from localStorage
  const getInitialField = (key: string, defaultValue: string) => {
    return localStorage.getItem(`sticky_${key}`) || defaultValue;
  };

  const [formSubject, setFormSubject] = useState(() => getInitialField('subject', '数学'));
  const [formGrade, setFormGrade] = useState(() => getInitialField('grade', '三年级'));
  const [formType, setFormType] = useState(() => getInitialField('type', '单选题'));
  const [formStem, setFormStem] = useState('');
  const [formStemImage, setFormStemImage] = useState('');
  const [formOptions, setFormOptions] = useState<{ text: string; image?: string; value: string }[]>([
    { text: '', image: '', value: 'A' }, 
    { text: '', image: '', value: 'B' }, 
    { text: '', image: '', value: 'C' }, 
    { text: '', image: '', value: 'D' }
  ]);
  const [formAnswer, setFormAnswer] = useState<string | string[]>('');
  const [formObjectiveId, setFormObjectiveId] = useState(() => getInitialField('objectiveId', ''));
  const [skills, setSkills] = useState<any[]>([]);

  // Update sticky settings
  useEffect(() => {
    localStorage.setItem('sticky_subject', formSubject);
  }, [formSubject]);

  useEffect(() => {
    localStorage.setItem('sticky_grade', formGrade);
  }, [formGrade]);

  useEffect(() => {
    localStorage.setItem('sticky_type', formType);
  }, [formType]);

  useEffect(() => {
    localStorage.setItem('sticky_objectiveId', formObjectiveId);
  }, [formObjectiveId]);

  const stemInputRef = useRef<HTMLInputElement>(null);

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.questions.list({ page, pageSize });
      setQuestions(res.list || []);
      setTotal(res.total);
    } catch (error: any) {
      console.error("Failed to fetch questions", error);
      setError(error.message || (language === 'zh' ? '获取题目失败，请检查网络或权限。' : 'Failed to fetch questions. Please check your network or permissions.'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSkills = async () => {
    try {
      const res = await api.skills.list();
      setSkills(res || []);
    } catch (error) {
      console.error("Failed to fetch skills", error);
    }
  };

  useEffect(() => {
    fetchQuestions();
    fetchSkills();
  }, [page]);

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
      
      if (q.type === QuestionType.MULTIPLE_SELECT || uiType === '多选题') {
          setFormAnswer(q.answer ? q.answer.split(',') : []);
      } else {
          setFormAnswer(q.answer);
      }
      setFormObjectiveId(q.objectiveId || '');
    } else {
      setEditingQuestion(null);
      // Keep sticky settings from state (which are initialized from localStorage)
      setFormStem('');
      setFormStemImage('');
      setFormOptions([{ text: '', image: '', value: 'A' }, { text: '', image: '', value: 'B' }, { text: '', image: '', value: 'C' }, { text: '', image: '', value: 'D' }]);
      if (formType === '多选题' || formType === QuestionType.MULTIPLE_SELECT) {
        setFormAnswer([]);
      } else {
        setFormAnswer('');
      }
      // setFormObjectiveId('') <- Removed this reset to keep sticky value
    }
    setIsModalOpen(true);
  };

  const handleToggleAnswer = (val: string) => {
    if (formType === '多选题' || formType === QuestionType.MULTIPLE_SELECT) {
      const current = Array.isArray(formAnswer) ? [...formAnswer] : (formAnswer ? [formAnswer as string] : []);
      if (current.includes(val)) {
        setFormAnswer(current.filter(v => v !== val));
      } else {
        setFormAnswer([...current, val].sort());
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
        setCropTarget(type);
        setCroppingImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formObjectiveId) {
      setConfirmationModalProps({
        title: language === 'zh' ? '验证失败' : 'Validation Error',
        message: language === 'zh' ? '请关联至少一个能力点，这是必填项。' : 'Please associate at least one ability objective. This is required.',
        type: 'error',
        language: language,
        onConfirm: () => setIsConfirmationModalOpen(false),
      });
      setIsConfirmationModalOpen(true);
      return;
    }

    const validOptions = formOptions.filter(opt => opt.text.trim() !== '' || (opt.image && opt.image.trim() !== ''));

    const questionData: Partial<Question> = {
      subject: formSubject,
      grade: GRADE_MAP[formGrade] || 3,
      type: TYPE_MAP[formType] || QuestionType.MULTIPLE_CHOICE,
      stemText: formStem,
      stemImage: formStemImage,
      options: ['单选题', '多选题', QuestionType.MULTIPLE_CHOICE, QuestionType.MULTIPLE_SELECT].includes(formType) ? validOptions : undefined,
      answer: Array.isArray(formAnswer) ? formAnswer.join(',') : formAnswer,
      objectiveId: formObjectiveId || undefined
    };

    try {
      if (editingQuestion) {
        await api.questions.update(editingQuestion.id, questionData);
        fetchQuestions(); // Stay on page for edit
      } else {
        await api.questions.create(questionData);
        if (page === 1) fetchQuestions(); else setPage(1); // Go to page 1 for new
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to save question", error);
      setConfirmationModalProps({
        title: language === 'zh' ? '保存失败' : 'Failed to Save',
        message: language === 'zh' ? '题目保存失败，请检查数据或重试。' : 'Failed to save question. Please check your data or try again.',
        type: 'error',
        language: language,
        onConfirm: () => setIsConfirmationModalOpen(false),
      });
      setIsConfirmationModalOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmationModalProps({
      title: language === 'zh' ? '确认删除' : 'Confirm Delete',
      message: language === 'zh' ? '确定删除这道题目吗？此操作不可逆。' : 'Are you sure you want to delete this question? This action cannot be undone.',
      type: 'delete',
      language: language,
      onConfirm: async () => {
        try {
          await api.questions.delete(id);
          fetchQuestions();
        } catch (error) {
          console.error("Failed to delete", error);
          setConfirmationModalProps({
            title: language === 'zh' ? '删除失败' : 'Delete Failed',
            message: language === 'zh' ? '删除题目失败，请重试。' : 'Failed to delete question. Please try again.',
            type: 'error',
            language: language,
            onConfirm: () => setIsConfirmationModalOpen(false),
          });
          setIsConfirmationModalOpen(true);
        }
      },
      cancelText: language === 'zh' ? '取消' : 'Cancel',
      confirmText: language === 'zh' ? '删除' : 'Delete',
    });
    setIsConfirmationModalOpen(true);
  };

  const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];

  return (
    <div className="space-y-6 relative animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold dark:text-white">{language === 'zh' ? '题目管理' : 'Question Bank'}</h2>
        <div className="flex gap-3">
          <button 
            onClick={downloadTemplate}
            className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-xl font-bold hover:bg-gray-200 transition-all border dark:border-gray-700"
          >
            <Upload className="w-4 h-4 rotate-180" />
            {language === 'zh' ? '下载模版' : 'Template'}
          </button>
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl font-bold hover:bg-blue-100 transition-all border border-blue-100 dark:border-blue-800"
          >
            <Upload className="w-4 h-4" />
            {language === 'zh' ? '一键导入' : 'Import'}
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/30"
          >
            <Plus className="w-5 h-5" />
            {language === 'zh' ? '添加新题' : 'New Question'}
          </button>
        </div>
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
          <Loading />
        ) : error ? (
          <div className="p-20 text-center animate-in fade-in zoom-in duration-300">
             <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <X className="w-10 h-10 text-red-600 dark:text-red-400" />
             </div>
             <h3 className="text-2xl font-black dark:text-white mb-2">
               {language === 'zh' ? '获取题目失败' : 'Fetch Failed'}
             </h3>
             <p className="text-gray-500 dark:text-gray-400 font-bold max-w-md mx-auto mb-8">
               {error}
             </p>
             <button 
               onClick={() => fetchQuestions()}
               className="px-10 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary-500/30 hover:bg-primary-700 transition-all active:scale-95"
             >
               {language === 'zh' ? '重试' : 'Retry'}
             </button>
          </div>
        ) : (
          questions.map((q, idx) => {
            return (
              <div key={q.id} className="p-6 border-b dark:border-gray-700 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/30 group transition-colors">
                <div className="flex-1">
                  <div className="flex gap-2 mb-3">
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[10px] font-black uppercase tracking-widest">{q.subject as string}</span>
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded text-[10px] font-black uppercase tracking-widest">{REVERSE_TYPE_MAP[q.type as string] || q.type}</span>
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-[10px] font-black uppercase tracking-widest">{REVERSE_GRADE_MAP[q.grade] || q.grade}</span>
                    {q.attempts !== undefined && q.attempts > 0 && (
                       <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded text-[10px] font-black uppercase tracking-widest">
                          {language === 'zh' ? `练习 ${q.attempts} 次` : `${q.attempts} Attempts`}
                       </span>
                    )}
                    {q.correctRate !== undefined && q.attempts !== undefined && q.attempts > 0 && (
                       <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                          q.correctRate > 80 ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
                          q.correctRate > 50 ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30' :
                          'bg-red-100 text-red-600 dark:bg-red-900/30'
                       }`}>
                          {language === 'zh' ? `正确率 ${q.correctRate.toFixed(1)}%` : `Acc ${q.correctRate.toFixed(1)}%`}
                       </span>
                    )}
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
                   <button onClick={() => resetTrial(q)} className="p-3 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-all">
                     <Eye className="w-5 h-5" />
                   </button>
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
        
        {total > pageSize && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t dark:border-gray-700 flex items-center justify-between">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              {language === 'zh' ? `共 ${total} 题` : `Total ${total}`}
            </div>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 rounded-lg border dark:border-gray-700 disabled:opacity-30 hover:bg-white dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-800"
              >
                <ChevronLeft className="w-4 h-4 dark:text-gray-300" />
              </button>
              <div className="flex items-center px-4 font-black dark:text-white text-sm">
                {page} / {Math.ceil(total / pageSize)}
              </div>
              <button
                disabled={page >= Math.ceil(total / pageSize)}
                onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-lg border dark:border-gray-700 disabled:opacity-30 hover:bg-white dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-800"
              >
                <ChevronRight className="w-4 h-4 dark:text-gray-300" />
              </button>
            </div>
          </div>
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
                       {SUBJECTS.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
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

                 <div className="grid grid-cols-2 gap-4">
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
                   <div>
                     <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">{language === 'zh' ? '关联能力点 (必填)' : 'Ability Objective (Required)'}</label>
                     <div className="flex gap-2">
                        <select 
                            value={formObjectiveId}
                            onChange={(e) => setFormObjectiveId(e.target.value)}
                            className="flex-1 p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                        >
                          <option value="">{language === 'zh' ? '-- 请选择 --' : '-- Select --'}</option>
                          {skills.map(topic => {
                            if (!topic.objectives || topic.objectives.length === 0) return null;
                            return (
                              <optgroup key={topic.id} label={`${topic.subject} - ${topic.name}`}>
                                {topic.objectives.map((obj: any) => (
                                  <option key={obj.id} value={obj.id}>[{obj.name}] {obj.target}</option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>
                        <button 
                          onClick={() => {
                            setQuickAddAbilityForm({ ...quickAddForm, topicId: skills[0]?.id || '' });
                            setIsQuickAddAbilityOpen(true);
                          }}
                          className="px-4 bg-primary-50 dark:bg-primary-900/30 text-primary-600 rounded-2xl border border-primary-100 dark:border-primary-800 hover:bg-primary-100 transition-all flex items-center justify-center"
                          title={language === 'zh' ? '快速添加能力点' : 'Quick Add Objective'}
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                     </div>
                   </div>
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
                        <button 
                          onClick={() => openResourcePicker('stem')}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-bold border border-blue-100 dark:border-blue-800 hover:bg-blue-100"
                        >
                          <FileText className="w-4 h-4" />
                          {language === 'zh' ? '从素材库选择' : 'Pick Library'}
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
                            <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button 
                                 onClick={() => { setCropTarget('stem'); setCroppingImage(formStemImage); }}
                                 className="bg-blue-500 text-white rounded-full p-1 shadow-lg hover:bg-blue-600 transition-colors"
                                 title={language === 'zh' ? '裁切' : 'Crop'}
                               >
                                 <Filter className="w-3 h-3" />
                               </button>
                               <button 
                                 onClick={() => setFormStemImage('')}
                                 className="bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                               >
                                 <X className="w-3 h-3" />
                               </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                 </div>

                 {['单选题', '多选题'].includes(formType) && (
                   <div className="space-y-4 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl border dark:border-gray-700">
                     <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">{language === 'zh' ? '选项与答案设置' : 'Options & Answers'}</label>
                     {formOptions.map((opt, i) => (
                       <OptionRow 
                         key={i} 
                         i={i} 
                         opt={opt} 
                         formAnswer={formAnswer} 
                         formType={formType} 
                         language={language} 
                         handleToggleAnswer={handleToggleAnswer}
                         setFormOptions={setFormOptions}
                         handleFileUpload={handleFileUpload}
                         formOptions={formOptions}
                         openPicker={openResourcePicker}
                         onCrop={(url, target) => { setCropTarget(target); setCroppingImage(url); }}
                       />
                     ))}
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
                      onClick={handlePreviewCurrent}
                      className="flex-1 py-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-blue-100"
                    >
                      {language === 'zh' ? '效果预览' : 'Preview'}
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

      {previewQuestion && (
        <div className="fixed inset-0 z-[110] bg-gray-50 dark:bg-gray-950 flex flex-col animate-in fade-in duration-300">
           {/* Header Simulation */}
           <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b dark:border-gray-800 px-4 py-4 sticky top-0 z-30">
              <div className="max-w-3xl mx-auto flex items-center justify-between">
                <button onClick={() => setPreviewQuestion(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <X className="w-6 h-6 dark:text-gray-300" />
                </button>
                <div className="flex-1 px-8">
                   <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit mx-auto">
                      <button 
                        onClick={() => setIsTrialMode(false)}
                        className={`px-6 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${!isTrialMode ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-white' : 'text-gray-400'}`}
                      >
                        {language === 'zh' ? '预览模式' : 'Preview'}
                      </button>
                      <button 
                        onClick={() => setIsTrialMode(true)}
                        className={`px-6 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${isTrialMode ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-white' : 'text-gray-400'}`}
                      >
                        {language === 'zh' ? '试做模式' : 'Trial Mode'}
                      </button>
                   </div>
                </div>
                <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-full flex items-center justify-center font-black text-primary-600 text-xs">
                   T
                </div>
              </div>
           </header>

           <main className="flex-1 overflow-y-auto p-4 md:p-12 flex flex-col items-center">
              <div className="w-full max-w-2xl">
                 <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl border dark:border-gray-800 overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                    {/* Question Card */}
                    <div className="p-10 md:p-16 border-b dark:border-gray-800">
                       <span className="inline-block px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-[10px] font-black tracking-widest uppercase mb-8">
                          {previewQuestion.subject} · {REVERSE_TYPE_MAP[previewQuestion.type as string] || previewQuestion.type}
                       </span>
                       <h2 className="text-3xl md:text-4xl font-bold mb-10 dark:text-white leading-tight">
                          {previewQuestion.stemText}
                       </h2>
                       {previewQuestion.stemImage && (
                          <div className="rounded-[2.5rem] overflow-hidden border-8 border-gray-50 dark:border-gray-800 shadow-inner group bg-white">
                             <img src={previewQuestion.stemImage} alt="Stem" className="w-full h-auto max-h-[400px] object-contain transition-transform group-hover:scale-105 duration-700 bg-white" />
                          </div>
                       )}
                    </div>

                    {/* Feedback Area */}
                    {isTrialMode && trialSubmitted && (
                       <div className={`p-8 flex items-center gap-6 animate-in slide-in-from-top duration-500 border-b dark:border-gray-800 ${isTrialCorrect() ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'}`}>
                          <div className={`p-4 rounded-2xl ${isTrialCorrect() ? 'bg-green-100 dark:bg-green-900/40 text-green-600' : 'bg-red-100 dark:bg-red-900/40 text-red-600'}`}>
                             {isTrialCorrect() ? <CheckCircle className="w-8 h-8" /> : <X className="w-8 h-8" />}
                          </div>
                          <div>
                             <p className={`text-xl font-black uppercase tracking-tighter ${isTrialCorrect() ? 'text-green-600' : 'text-red-600'}`}>
                                {isTrialCorrect() ? (language === 'zh' ? '回答正确！真棒' : 'AWESOME! CORRECT') : (language === 'zh' ? '回答错误，再想想' : 'WRONG! TRY AGAIN')}
                             </p>
                          </div>
                       </div>
                    )}

                    {/* Solutions Area (Static Mode) */}
                    {!isTrialMode && (
                       <div className="p-8 bg-primary-50 dark:bg-primary-900/10 border-b dark:border-gray-800 flex items-center gap-6">
                          <div className="bg-primary-100 dark:bg-primary-900/40 p-4 rounded-2xl text-primary-600">
                             <CheckCircle className="w-8 h-8" />
                          </div>
                          <div>
                             <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-1">{language === 'zh' ? '标准答案' : 'OFFICIAL SOLUTION'}</p>
                             <p className="text-2xl font-black text-primary-700 dark:text-primary-400">{previewQuestion.answer}</p>
                          </div>
                       </div>
                    )}

                    {/* Interaction Area */}
                    <div className="p-10 md:p-16 bg-gray-50/30 dark:bg-gray-900/30">
                       {/* Options Interaction */}
                       {previewQuestion.options && previewQuestion.options.length > 0 && (
                          <div className={`grid gap-6 ${previewQuestion.options?.[0]?.image ? 'grid-cols-2' : 'grid-cols-1'}`}>
                             {previewQuestion.options.map((o: any, i: number) => {
                                const val = o.value;
                                const text = o.text || val;
                                const isCorrect = previewQuestion.answer.split(',').includes(val);
                                const isSelected = Array.isArray(trialAnswer) ? trialAnswer.includes(val) : trialAnswer === val;
                                
                                let style = 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300';
                                
                                if (!isTrialMode) {
                                   if (isCorrect) style = 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 ring-4 ring-green-500/10';
                                } else {
                                   if (trialSubmitted) {
                                      if (isCorrect) style = 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 ring-4 ring-green-500/10';
                                      else if (isSelected) style = 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 ring-4 ring-red-500/10';
                                   } else if (isSelected) {
                                      style = 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 ring-4 ring-primary-500/10';
                                   }
                                }

                                return (
                                   <div 
                                      key={i} 
                                      onClick={() => {
                                         if (isTrialMode && !trialSubmitted) {
                                            if (previewQuestion.type === QuestionType.MULTIPLE_SELECT) {
                                               const next = Array.isArray(trialAnswer) ? [...trialAnswer] : [];
                                               if (next.includes(val)) setTrialAnswer(next.filter(v => v !== val));
                                               else setTrialAnswer([...next, val].sort());
                                            } else {
                                               setTrialAnswer(val);
                                            }
                                         }
                                      }}
                                      className={`group p-6 rounded-[2rem] border-4 transition-all cursor-pointer flex flex-col items-center text-center gap-4 ${style} ${!trialSubmitted && isTrialMode ? 'hover:translate-y-[-4px] hover:shadow-xl active:scale-95' : ''}`}
                                   >
                                      {o.image && (
                                         <div className="w-full aspect-video rounded-2xl overflow-hidden border dark:border-gray-700 shadow-sm mb-2 bg-white">
                                            <img src={o.image} className="w-full h-full object-contain bg-white" alt={val} />
                                         </div>
                                      )}
                                      <div className="flex items-center gap-4">
                                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-colors ${isSelected || (!isTrialMode && isCorrect) ? 'bg-current text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                            {val}
                                         </div>
                                         <span className="text-xl font-bold">{text}</span>
                                      </div>
                                   </div>
                                );
                             })}
                          </div>
                       )}

                       {/* Judgment Interaction */}
                       {previewQuestion.type === QuestionType.TRUE_FALSE && (
                          <div className="flex gap-6">
                             {['正确', '错误'].map(val => {
                                const isSelected = trialAnswer === val;
                                const isCorrect = previewQuestion.answer === val;
                                let style = 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400';
                                
                                if (!isTrialMode) {
                                   if (isCorrect) style = 'border-green-500 bg-green-50 text-green-600 ring-4 ring-green-500/10';
                                } else if (trialSubmitted) {
                                   if (isCorrect) style = 'border-green-500 bg-green-50 text-green-600 ring-4 ring-green-500/10';
                                   else if (isSelected) style = 'border-red-500 bg-red-50 text-red-600 ring-4 ring-red-500/10';
                                } else if (isSelected) {
                                   style = 'border-primary-500 bg-primary-50 text-primary-600 ring-4 ring-primary-500/10';
                                }

                                return (
                                   <button 
                                      key={val}
                                      onClick={() => isTrialMode && !trialSubmitted && setTrialAnswer(val)}
                                      className={`flex-1 py-10 rounded-[2.5rem] font-black text-2xl border-4 transition-all ${style} ${isTrialMode && !trialSubmitted ? 'hover:translate-y-[-4px] hover:shadow-xl active:scale-95' : ''}`}
                                   >
                                      {val === '正确' ? '✅ ' : '❌ '}{val}
                                   </button>
                                );
                             })}
                          </div>
                       )}

                       {/* Fill Blank Interaction */}
                       {previewQuestion.type === QuestionType.CALCULATION && (
                          <div className="space-y-6 text-center">
                             <input 
                                type="text" 
                                value={isTrialMode ? (trialAnswer || '') : previewQuestion.answer}
                                disabled={!isTrialMode || trialSubmitted}
                                onChange={(e) => setTrialAnswer(e.target.value)}
                                placeholder={language === 'zh' ? '点击输入你的答案...' : 'Click to answer...'}
                                className={`w-full p-8 rounded-[2.5rem] border-4 font-black text-3xl text-center outline-none transition-all ${
                                   !isTrialMode ? 'border-green-500 bg-green-50 text-green-600' :
                                   trialSubmitted ? (isTrialCorrect() ? 'border-green-500 bg-green-50 text-green-600' : 'border-red-500 bg-red-50 text-red-600') : 
                                   'border-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:text-white focus:border-primary-500 focus:ring-8 focus:ring-primary-500/10'
                                }`}
                             />
                          </div>
                       )}

                       {/* Submit Button Simulation */}
                       {isTrialMode && (
                          <div className="mt-12">
                             {!trialSubmitted ? (
                                <button 
                                   onClick={handleTrialSubmit}
                                   disabled={!trialAnswer || (Array.isArray(trialAnswer) && trialAnswer.length === 0)}
                                   className="w-full py-6 bg-primary-600 text-white rounded-[2rem] font-black text-xl uppercase tracking-[0.2em] shadow-2xl shadow-primary-500/40 hover:bg-primary-700 hover:translate-y-[-4px] transition-all active:scale-95 disabled:opacity-30 disabled:translate-y-0"
                                >
                                   {language === 'zh' ? '提交检查' : 'SUBMIT CHECK'}
                                </button>
                             ) : (
                                <div className="grid grid-cols-2 gap-6">
                                   <button 
                                      onClick={() => { setTrialSubmitted(false); setTrialAnswer(previewQuestion.type === QuestionType.MULTIPLE_SELECT ? [] : ''); }}
                                      className="py-6 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-[2rem] font-black text-xl uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
                                   >
                                      {language === 'zh' ? '重做一次' : 'RETRY'}
                                   </button>
                                   <button 
                                      onClick={() => setIsTrialMode(false)}
                                      className="py-6 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-[2rem] font-black text-xl uppercase tracking-widest hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-all active:scale-95"
                                   >
                                      {language === 'zh' ? '查看解析' : 'SOLUTION'}
                                   </button>
                                </div>
                             )}
                          </div>
                       )}
                    </div>
                 </div>
              </div>
           </main>
        </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-300">
           <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 border dark:border-gray-700">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-2xl font-black dark:text-white uppercase tracking-tight">{language === 'zh' ? '一键导入题目' : 'Bulk Import'}</h3>
                 <button onClick={() => setIsImportModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <X className="w-6 h-6 dark:text-gray-400" />
                 </button>
              </div>

              <div className="space-y-6">
                 {importData.length === 0 ? (
                   <div className="border-4 border-dashed border-gray-100 dark:border-gray-700 rounded-[2rem] p-12 text-center">
                     <Upload className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                     <p className="font-bold dark:text-gray-300 mb-2">{language === 'zh' ? '点击上传模版文件 (.xlsx)' : 'Upload Excel template'}</p>
                     <p className="text-xs text-gray-400 mb-6">{language === 'zh' ? '请确保文件格式符合下载的 Excel 模版' : 'Follow the downloaded Excel template format'}</p>
                     <input type="file" accept=".xlsx" onChange={handleImportFile} className="mx-auto" />
                   </div>
                 ) : (
                   <div className="space-y-4">
                      <p className="font-bold dark:text-white">{language === 'zh' ? `预览解析结果 (共 ${importData.length} 题)` : `Preview Results (${importData.length})`}</p>
                      <div className="max-h-80 overflow-y-auto space-y-2 border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 scrollbar-thin">
                         {importData.map((q, i) => (
                           <div key={i} className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 space-y-3 group">
                              <div className="flex items-center justify-between min-w-0">
                                 <div className="flex items-center gap-3 truncate">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${q.isValid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <div className="truncate">
                                       <span className="text-[10px] font-black text-primary-600 uppercase mr-2">[{q.subject}]</span>
                                       <span className="text-sm font-bold dark:text-gray-300">{q.stemText}</span>
                                    </div>
                                 </div>
                                 <button 
                                   onClick={() => setPreviewQuestion({ id: 'temp', ...q })}
                                   className="p-2 text-gray-400 hover:text-primary-600 transition-all"
                                 >
                                    <Eye className="w-4 h-4" />
                                 </button>
                              </div>

                              <div className="flex flex-wrap gap-3 pl-5">
                                 {/* Stem Image Preview & Crop */}
                                 {q.stemImage && (
                                   <div className="relative group/img">
                                      <img src={q.stemImage} className="w-12 h-12 object-cover rounded-lg border dark:border-gray-700" alt="stem" />
                                      <button 
                                        onClick={() => { setImportCropIndex(i); setCropTarget('stem'); setCroppingImage(q.stemImage); }}
                                        className="absolute inset-0 bg-black/40 text-white flex items-center justify-center rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                                      >
                                        <Filter className="w-3 h-3" />
                                      </button>
                                   </div>
                                 )}

                                 {/* Options Images Preview & Crop */}
                                 {q.options?.map((opt: any, optIdx: number) => opt.image && (
                                   <div key={optIdx} className="relative group/img">
                                      <img src={opt.image} className="w-12 h-12 object-cover rounded-lg border dark:border-gray-700" alt={opt.value} />
                                      <div className="absolute top-0 left-0 bg-primary-600 text-[8px] text-white px-1 rounded-br-lg font-bold">{opt.value}</div>
                                      <button 
                                        onClick={() => { setImportCropIndex(i); setCropTarget(`opt_${optIdx}`); setCroppingImage(opt.image); }}
                                        className="absolute inset-0 bg-black/40 text-white flex items-center justify-center rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                                      >
                                        <Filter className="w-3 h-3" />
                                      </button>
                                   </div>
                                 ))}
                              </div>
                           </div>
                         ))}
                      </div>
                      <div className="flex gap-3">
                         <button onClick={() => setImportData([])} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-2xl font-bold">{language === 'zh' ? '重新上传' : 'Reset'}</button>
                         <button 
                            onClick={confirmImport} 
                            disabled={importData.some(q => !q.isValid)}
                            className={`flex-1 py-4 text-white rounded-2xl font-bold shadow-lg transition-all ${importData.some(q => !q.isValid) ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-600 shadow-primary-500/20'}`}
                         >
                            {language === 'zh' ? '确认导入' : 'Confirm Import'}
                         </button>
                      </div>
                      {importData.some(q => !q.isValid) && (
                          <p className="text-center text-xs text-red-500 font-bold">
                            {language === 'zh' ? '部分题目校验未通过，请检查必填项' : 'Some questions failed validation. Please check required fields.'}
                          </p>
                      )}
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {isConfirmationModalOpen && (
        <ConfirmationModal
          isOpen={isConfirmationModalOpen}
          onClose={() => setIsConfirmationModalOpen(false)}
          {...confirmationModalProps}
        />
      )}

      <ResourcePickerModal 
        isOpen={isResourcePickerOpen}
        onClose={() => setIsResourcePickerOpen(false)}
        onSelect={handleResourceSelect}
        language={language}
      />

      {croppingImage && (
        <ImageCropper 
          image={croppingImage}
          onCropComplete={onCropComplete}
          onCancel={() => setCroppingImage(null)}
          aspect={16 / 9}
          language={language}
        />
      )}

      {isQuickAddAbilityOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] w-full max-w-md border dark:border-gray-700 shadow-2xl animate-in zoom-in-95 duration-300">
              <h4 className="text-xl font-black mb-6 dark:text-white uppercase tracking-tight">{language === 'zh' ? '快速添加能力点' : 'Quick Add Objective'}</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">{language === 'zh' ? '所属大类' : 'Select Topic'}</label>
                  <select 
                    value={quickAddForm.topicId}
                    onChange={e => setQuickAddAbilityForm({...quickAddForm, topicId: e.target.value})}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                  >
                    <option value="">{language === 'zh' ? '-- 请选择大类 --' : '-- Select Topic --'}</option>
                    {skills.map(t => <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">{language === 'zh' ? '能力点编号 (如: 1)' : 'Identifier (e.g. 1)'}</label>
                  <input 
                    value={quickAddForm.name} 
                    onChange={e => setQuickAddAbilityForm({...quickAddForm, name: e.target.value})}
                    placeholder="1"
                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">{language === 'zh' ? '具体能力描述' : 'Capability Description'}</label>
                  <textarea 
                    value={quickAddForm.target} 
                    onChange={e => setQuickAddAbilityForm({...quickAddForm, target: e.target.value})}
                    placeholder={language === 'zh' ? '如: 能熟练进行10以内加法' : 'e.g. Can master addition within 10'}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700 dark:text-white outline-none h-24 resize-none focus:ring-2 focus:ring-primary-500 font-bold"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setIsQuickAddAbilityOpen(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-2xl font-black uppercase tracking-widest">{language === 'zh' ? '取消' : 'Cancel'}</button>
                <button onClick={handleQuickAddAbility} className="flex-1 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary-500/20 active:scale-95">{language === 'zh' ? '确认添加' : 'Add Now'}</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Questions;