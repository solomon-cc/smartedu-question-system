import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Trash2, Edit2, Copy, Eye, X, UploadCloud, Globe, Lock, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api.ts';
import { Resource } from '../../types.ts';
import Loading from '../../components/Loading';

const Resources: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Resource[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const pageSize = 12;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingId] = useState<Resource | null>(null);
  const [previewItem, setPreviewItem] = useState<Resource | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formVisibility, setFormVisibility] = useState<'public' | 'personal'>('public');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, [page, keyword]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.resources.list(page, pageSize, keyword);
      setItems(data.list || []);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert(language === 'zh' ? '文件大小不能超过 20MB' : 'File size exceeds 20MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedFile(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      alert(language === 'zh' ? '请输入素材名称' : 'Please enter resource name');
      return;
    }

    const payload = {
      name: formName,
      visibility: formVisibility,
      tags: formTags,
      url: uploadedFile,
      type: 'image'
    };

    try {
      if (editingItem) {
        await api.resources.update(editingItem.id, payload);
      } else {
        if (!uploadedFile) {
          alert(language === 'zh' ? '请选择图片上传' : 'Please upload an image');
          return;
        }
        await api.resources.create(payload);
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (e) {
      alert('Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(language === 'zh' ? '确定删除该素材吗？' : 'Delete this resource?')) {
      try {
        await api.resources.delete(id);
        fetchData();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormName('');
    setFormVisibility('public');
    setFormTags([]);
    setTagInput('');
    setUploadedFile(null);
  };

  const openEdit = (item: Resource) => {
    setEditingId(item);
    setFormName(item.name);
    setFormVisibility(item.visibility);
    setFormTags(item.tags || []);
    setUploadedFile(item.url);
    setIsModalOpen(true);
  };

  const addTag = () => {
    if (tagInput.trim() && !formTags.includes(tagInput.trim())) {
      setFormTags([...formTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormTags(formTags.filter(t => t !== tag));
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopyFeedback(url);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold dark:text-white">{language === 'zh' ? '素材管理' : 'Resource Assets'}</h2>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              placeholder={language === 'zh' ? '搜索名称或标签...' : 'Search name or tags...'}
              className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:text-white"
            />
          </div>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary-500/30 hover:bg-primary-700 transition-all hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            {language === 'zh' ? '上传素材' : 'Upload Asset'}
          </button>
        </div>
      </div>

      <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-2xl flex items-center gap-3 text-primary-600 dark:text-primary-400 text-sm">
        <Globe className="w-5 h-5" />
        <p>{language === 'zh' ? '您可以上传图片素材并复制链接用于题目题干或选项。单个文件最大支持 20MB。' : 'Upload images and copy links for question stems or options. Max size 20MB.'}</p>
      </div>

      {loading ? <Loading /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {items.map(item => (
              <div key={item.id} className="group relative bg-white dark:bg-gray-800 rounded-3xl overflow-hidden border dark:border-gray-700 shadow-sm hover:shadow-xl transition-all">
                <div className="aspect-square bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
                    <div className="flex gap-2">
                      <button onClick={() => setPreviewItem(item)} className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-md transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => copyLink(item.url)} className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-md transition-colors relative">
                        {copyFeedback === item.url ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(item)} className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-md transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded-lg backdrop-blur-md transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold dark:text-white truncate mb-1">{item.name}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.tags?.map(tag => (
                      <span key={tag} className="text-[8px] bg-primary-50 dark:bg-primary-900/30 text-primary-600 px-1.5 py-0.5 rounded-full font-bold">#{tag}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.createdAt.split(' ')[0]}</span>
                    {item.visibility === 'public' ? <Globe className="w-3 h-3 text-blue-400" /> : <Lock className="w-3 h-3 text-amber-400" />}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex items-center justify-center gap-4 pt-8">
              <button 
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="p-2 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700 disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5 dark:text-white" />
              </button>
              <span className="font-bold dark:text-white text-sm">{page} / {Math.ceil(total / pageSize)}</span>
              <button 
                disabled={page >= Math.ceil(total / pageSize)}
                onClick={() => setPage(page + 1)}
                className="p-2 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700 disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5 dark:text-white" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Upload/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 border dark:border-gray-700">
            <div className="flex justify-between items-center mb-8 border-b dark:border-gray-700 pb-4">
              <h3 className="text-2xl font-black dark:text-white uppercase tracking-tight">
                {editingItem ? (language === 'zh' ? '编辑素材' : 'Edit Asset') : (language === 'zh' ? '上传素材' : 'Upload Asset')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X className="w-6 h-6 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              {!editingItem && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`group border-4 border-dashed rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 hover:border-primary-500 hover:bg-primary-50/20 transition-all cursor-pointer ${uploadedFile ? 'border-green-500 bg-green-50/20' : 'dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50'}`}
                >
                  {uploadedFile ? (
                    <img src={uploadedFile} alt="Preview" className="max-h-40 object-contain rounded-xl" />
                  ) : (
                    <>
                      <UploadCloud className="w-12 h-12 text-gray-300 group-hover:text-primary-500 transition-colors" />
                      <p className="text-sm font-bold text-gray-400">{language === 'zh' ? '点击选择图片 (Max 20MB)' : 'Click to select image'}</p>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" hidden accept="image/jpeg,image/png,image/gif" onChange={handleFileUpload} />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">{language === 'zh' ? '素材名称' : 'Asset Name'}</label>
                <input 
                  type="text" 
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-xl border dark:border-gray-700 outline-none focus:ring-4 focus:ring-primary-500/20 font-bold"
                  placeholder={language === 'zh' ? '例如：勾股定理示意图' : 'e.g. Math Diagram'}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">{language === 'zh' ? '标签' : 'Tags'}</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {formTags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/40 text-primary-600 rounded-lg text-xs font-bold">
                      {tag}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTag()}
                    className="flex-1 p-3 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-xl border dark:border-gray-700 outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    placeholder={language === 'zh' ? '输入标签按回车添加' : 'Type tag and press enter'}
                  />
                  <button onClick={addTag} className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold text-xs uppercase">Add</button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">{language === 'zh' ? '可见性范围' : 'Visibility'}</label>
                <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
                  <button 
                    onClick={() => setFormVisibility('public')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${formVisibility === 'public' ? 'bg-white dark:bg-gray-600 shadow text-primary-600 dark:text-white' : 'text-gray-500'}`}
                  >
                    <Globe className="w-4 h-4" /> {language === 'zh' ? '全部老师可见' : 'All Teachers'}
                  </button>
                  <button 
                    onClick={() => setFormVisibility('personal')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${formVisibility === 'personal' ? 'bg-white dark:bg-gray-600 shadow text-primary-600 dark:text-white' : 'text-gray-500'}`}
                  >
                    <Lock className="w-4 h-4" /> {language === 'zh' ? '仅个人可见' : 'Personal Only'}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-[1.5rem] font-black uppercase tracking-widest text-xs">{language === 'zh' ? '取消' : 'Cancel'}</button>
                <button onClick={handleSave} className="flex-1 py-4 bg-primary-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary-500/30 hover:bg-primary-700">{language === 'zh' ? '确认保存' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <button onClick={() => setPreviewItem(null)} className="absolute top-6 right-6 p-3 text-white/60 hover:text-white transition-colors">
            <X className="w-8 h-8" />
          </button>
          <div className="max-w-4xl w-full flex flex-col items-center gap-6">
            <img src={previewItem.url} alt={previewItem.name} className="max-h-[70vh] rounded-2xl shadow-2xl object-contain" />
            <div className="text-center space-y-4">
              <h4 className="text-2xl font-black text-white">{previewItem.name}</h4>
              <div className="flex flex-wrap justify-center gap-2">
                {previewItem.tags?.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-white/10 text-white/80 rounded-full text-xs font-bold">#{tag}</span>
                ))}
              </div>
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{previewItem.url}</p>
              <button 
                onClick={() => copyLink(previewItem.url)}
                className="mt-4 px-8 py-3 bg-white text-primary-900 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform"
              >
                {copyFeedback === previewItem.url ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                {language === 'zh' ? '复制素材链接' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Resources;