
import React, { useState, useEffect, useRef } from 'react';
import { PlayCircle, Image as ImageIcon, Plus, Trash2, X, UploadCloud, Info, CheckCircle, Users, Globe, UserCheck, Star, Zap, Gift, Trophy } from 'lucide-react';
import { api } from '../../services/api.ts';
import { Role } from '../../types';

const BUILTIN_ASSETS = [
  { id: 'dino', name: '快乐恐龙', nameEn: 'Happy Dino', icon: '🦕', color: 'bg-green-100 text-green-600' },
  { id: 'fireworks', name: '绚丽烟花', nameEn: 'Fireworks', icon: '🎆', color: 'bg-purple-100 text-purple-600' },
  { id: 'star', name: '超级星星', nameEn: 'Super Star', icon: '⭐', color: 'bg-yellow-100 text-yellow-600' },
  { id: 'trophy', name: '冠军奖杯', nameEn: 'Trophy', icon: '🏆', color: 'bg-blue-100 text-blue-600' },
  { id: 'rocket', name: '一飞冲天', nameEn: 'Rocket', icon: '🚀', color: 'bg-red-100 text-red-600' },
  { id: 'party', name: '庆祝时刻', nameEn: 'Party', icon: '🎉', color: 'bg-pink-100 text-pink-600' },
];

const Reinforcements: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewingItem, setPreviewingItem] = useState<any>(null);
  const [activeView, setActiveView] = useState<'global' | 'targeted'>('global');
  const [items, setItems] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formTarget, setFormTarget] = useState('ALL');
  const [assetType, setAssetType] = useState<'builtin' | 'upload'>('builtin');
  const [selectedBuiltin, setSelectedBuiltin] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reinforcementsData, studentsData] = await Promise.all([
        api.reinforcements.list(),
        api.students.list()
      ]);

      setItems(reinforcementsData.map((item: any) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        // If image field starts with 'data:', it's uploaded. If it matches a builtin ID, it's builtin.
        image: item.image, 
        size: '1.2 MB', // Mock
        color: 'bg-primary-500', // Mock
        target: item.condition === 'global' ? 'ALL' : item.condition
      })));

      setStudents(studentsData.map((u: any) => ({
        id: u.username, // Using username as ID for simplicity in this mock
        name: u.username
      })));

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedFile(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    let finalImage = '';
    
    if (assetType === 'builtin') {
      if (!selectedBuiltin) {
        alert(language === 'zh' ? '请选择一个动画' : 'Please select an animation');
        return;
      }
      finalImage = selectedBuiltin; // Store ID
    } else {
      if (!uploadedFile) {
        alert(language === 'zh' ? '请上传文件' : 'Please upload a file');
        return;
      }
      finalImage = uploadedFile;
    }

    try {
      await api.reinforcements.create({
          name: formName || (assetType === 'builtin' ? BUILTIN_ASSETS.find(b => b.id === selectedBuiltin)?.name : 'Custom Asset'),
          type: 'animation', 
          condition: formTarget === 'ALL' ? 'global' : formTarget,
          image: finalImage
      });
      setIsUploadModalOpen(false);
      fetchData();
      // Reset form
      setFormName('');
      setFormTarget('ALL');
      setAssetType('builtin');
      setSelectedBuiltin('');
      setUploadedFile(null);
    } catch (e) {
      console.error(e);
      alert('Failed to create');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(language === 'zh' ? '确定删除这个强化物资源吗？' : 'Delete this reinforcement?')) {
      try {
        await api.reinforcements.delete(id);
        fetchData();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const filteredItems = activeView === 'global' 
    ? items.filter(i => i.target === 'ALL')
    : items.filter(i => i.target !== 'ALL');

  const getIconForAsset = (item: any) => {
    // Check if it's a builtin asset
    const builtin = BUILTIN_ASSETS.find(b => b.id === item.image);
    if (builtin) {
      return <div className="text-6xl">{builtin.icon}</div>;
    }
    // Check if it's an uploaded image (data URI)
    if (item.image && item.image.startsWith('data:')) {
      return <img src={item.image} alt={item.name} className="w-full h-full object-cover" />;
    }
    // Fallback
    return <ImageIcon className="w-16 h-16 text-gray-300" />;
  };

  return (
    <div className="space-y-6 relative animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold dark:text-white">{language === 'zh' ? '强化物资源库' : 'Reinforcement Assets'}</h2>
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-primary-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-primary-500/30 hover:bg-primary-700 transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          {language === 'zh' ? '新增强化物' : 'Add Asset'}
        </button>
      </div>

      <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveView('global')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeView === 'global' ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-primary-400' : 'text-gray-500'}`}
        >
          <Globe className="w-4 h-4" />
          {language === 'zh' ? '全局通用' : 'Global'}
        </button>
        <button 
          onClick={() => setActiveView('targeted')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeView === 'targeted' ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-primary-400' : 'text-gray-500'}`}
        >
          <UserCheck className="w-4 h-4" />
          {language === 'zh' ? '定向配置' : 'Targeted'}
        </button>
      </div>

      <div className="bg-primary-50 dark:bg-primary-900/10 p-6 rounded-[2rem] border-2 border-primary-100 dark:border-primary-800 flex items-start gap-4 text-primary-600 dark:text-primary-400">
         <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
           <Info className="w-6 h-6 shrink-0" />
         </div>
         <div>
           <p className="font-bold text-lg mb-1">{language === 'zh' ? '个性化设置' : 'Personalization'}</p>
           <p className="text-sm opacity-80 leading-relaxed">
             {language === 'zh' ? '您可以为全班设置通用强化物，也可以针对特定学习动力的学生配置个性化奖励动画。' : 'Set universal reinforcements for the class or targeted rewards for specific students to boost motivation.'}
           </p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
           <div className="col-span-4 text-center py-10 text-gray-500">Loading assets...</div>
        ) : filteredItems.length === 0 ? (
           <div className="col-span-4 text-center py-10 text-gray-400">{language === 'zh' ? '暂无资源' : 'No assets found'}</div>
        ) : (
        filteredItems.map(item => (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-[2rem] overflow-hidden border dark:border-gray-700 group relative shadow-sm hover:shadow-2xl hover:translate-y-[-6px] transition-all duration-300">
             <div className="aspect-square bg-gray-50 dark:bg-gray-900 flex items-center justify-center relative overflow-hidden">
               <div className={`absolute inset-0 opacity-10 ${item.color}`}></div>
               {getIconForAsset(item)}
               
               <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <button 
                   onClick={() => setPreviewingItem(item)}
                   className="bg-white p-4 rounded-full shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:scale-110"
                 >
                    <PlayCircle className="w-8 h-8 text-primary-600 fill-primary-600/10" />
                 </button>
               </div>
             </div>
             <div className="p-6">
               <div className="flex justify-between items-start mb-2">
                 <h5 className="font-black text-sm dark:text-white truncate pr-2 uppercase tracking-wide">{item.name}</h5>
                 <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
               </div>
               <div className="flex items-center gap-1 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                  <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{item.type}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-2.5 h-2.5" />
                    {item.target === 'ALL' ? (language === 'zh' ? '全局' : 'Global') : item.target}
                  </span>
               </div>
             </div>
             <button 
                onClick={() => handleDelete(item.id)}
                className="absolute top-4 right-4 p-2 bg-white/90 dark:bg-gray-800/90 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-red-500 hover:text-white"
             >
               <Trash2 className="w-4 h-4" />
             </button>
          </div>
        )))}
      </div>

      {previewingItem && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500">
           {/* Decorative background elements */}
           <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div 
                  key={i}
                  className="absolute animate-bounce opacity-20"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    fontSize: `${Math.random() * 20 + 20}px`
                  }}
                >
                  {['✨', '🎈', '🎊', '🎉', '⭐'][Math.floor(Math.random() * 5)]}
                </div>
              ))}
           </div>

           <div className="w-full max-w-2xl text-center space-y-12 animate-in zoom-in-75 duration-500 relative">
              <div className="relative mx-auto w-72 h-72 bg-gradient-to-b from-primary-400/20 to-transparent rounded-full flex items-center justify-center">
                 <div className="absolute inset-0 bg-primary-500/10 blur-3xl rounded-full animate-pulse"></div>
                 <div className="text-[12rem] animate-bounce filter drop-shadow-[0_20px_50px_rgba(255,255,255,0.3)]">
                   {getIconForAsset(previewingItem)}
                 </div>
              </div>

              <div className="space-y-4">
                 <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-white to-yellow-200 tracking-tighter uppercase">
                   {language === 'zh' ? '太棒了！' : 'EXCELLENT!'}
                 </h2>
                 <p className="text-xl text-primary-200 font-bold tracking-widest uppercase opacity-80">
                   {previewingItem.name}
                 </p>
              </div>

              <div className="flex justify-center pt-8">
                 <button 
                  onClick={() => setPreviewingItem(null)} 
                  className="px-12 py-5 bg-white text-primary-900 rounded-full font-black uppercase tracking-widest shadow-[0_20px_50px_rgba(255,255,255,0.2)] hover:scale-110 active:scale-95 transition-all flex items-center gap-3"
                 >
                   <X className="w-6 h-6" />
                   {language === 'zh' ? '完成预览' : 'Done'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-300">
           <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 border dark:border-gray-700 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-10 border-b dark:border-gray-700 pb-6">
                 <h3 className="text-2xl font-black dark:text-white uppercase tracking-tight">{language === 'zh' ? '添加强化物' : 'Add Reinforcement'}</h3>
                 <button onClick={() => setIsUploadModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <X className="w-6 h-6 dark:text-gray-400" />
                 </button>
              </div>

              <div className="space-y-8">
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">{language === 'zh' ? '资源名称' : 'Asset Name'}</label>
                      <input 
                        type="text" 
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-xl border dark:border-gray-700 outline-none focus:ring-4 focus:ring-primary-500/20 font-bold"
                        placeholder={language === 'zh' ? '自定义名称 (选填)' : 'Custom Name (Optional)'}
                      />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">{language === 'zh' ? '投放对象' : 'Target Object'}</label>
                      <select 
                        value={formTarget}
                        onChange={(e) => setFormTarget(e.target.value)}
                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-xl border dark:border-gray-700 outline-none focus:ring-4 focus:ring-primary-500/20 font-bold"
                      >
                         <option value="ALL">{language === 'zh' ? '全局通用' : 'Global'}</option>
                         {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                   </div>
                 </div>
                 
                 <div>
                   <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-2xl mb-6 w-fit">
                      <button 
                        onClick={() => setAssetType('builtin')} 
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${assetType === 'builtin' ? 'bg-white dark:bg-gray-600 shadow text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        {language === 'zh' ? '内置动画' : 'Built-in'}
                      </button>
                      <button 
                        onClick={() => setAssetType('upload')} 
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${assetType === 'upload' ? 'bg-white dark:bg-gray-600 shadow text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        {language === 'zh' ? '自定义上传' : 'Upload'}
                      </button>
                   </div>

                   {assetType === 'builtin' ? (
                     <div className="grid grid-cols-3 gap-4">
                       {BUILTIN_ASSETS.map(asset => (
                         <div 
                           key={asset.id}
                           onClick={() => setSelectedBuiltin(asset.id)}
                           className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${selectedBuiltin === asset.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-transparent bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                         >
                            <div className="text-4xl">{asset.icon}</div>
                            <span className="text-xs font-bold dark:text-white">{language === 'zh' ? asset.name : asset.nameEn}</span>
                         </div>
                       ))}
                     </div>
                   ) : (
                     <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`group border-4 border-dashed rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-4 hover:border-primary-500 hover:bg-primary-50/20 transition-all cursor-pointer ${uploadedFile ? 'border-green-500 bg-green-50/20' : 'dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50'}`}
                     >
                        {uploadedFile ? (
                           <div className="flex flex-col items-center">
                              <img src={uploadedFile} alt="Preview" className="h-24 object-contain mb-4 rounded-lg" />
                              <p className="text-green-600 font-bold">{language === 'zh' ? '已选择文件' : 'File Selected'}</p>
                           </div>
                        ) : (
                           <>
                              <div className="bg-primary-100 dark:bg-primary-900/30 p-6 rounded-[2rem] group-hover:scale-110 transition-all shadow-sm">
                                 <UploadCloud className="w-10 h-10 text-primary-600" />
                              </div>
                              <div className="text-center">
                                 <p className="font-black dark:text-white text-lg">{language === 'zh' ? '点击上传 GIF/图片' : 'Click to Upload GIF/Image'}</p>
                                 <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Max 2MB</p>
                              </div>
                           </>
                        )}
                        <input 
                           ref={fileInputRef}
                           type="file" 
                           hidden 
                           accept="image/gif,image/jpeg,image/png"
                           onChange={handleFileUpload}
                        />
                     </div>
                   )}
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button onClick={() => setIsUploadModalOpen(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-[1.5rem] font-black uppercase tracking-widest">
                      {language === 'zh' ? '取消' : 'Cancel'}
                    </button>
                    <button 
                      onClick={handleCreate} 
                      className="flex-1 py-4 bg-primary-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-primary-500/30 hover:bg-primary-700 transition-all"
                    >
                      {language === 'zh' ? '确认添加' : 'Confirm'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Reinforcements;
