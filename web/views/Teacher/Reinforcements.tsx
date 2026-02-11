
import React, { useState } from 'react';
import { PlayCircle, Image as ImageIcon, Plus, Trash2, X, UploadCloud, Info, CheckCircle, Users, Globe, UserCheck } from 'lucide-react';

const Reinforcements: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewingItem, setPreviewingItem] = useState<any>(null);
  const [activeView, setActiveView] = useState<'global' | 'targeted'>('global');
  
  const [items, setItems] = useState([
    { id: '1', name: '恐龙跳舞', type: 'animation', size: '2.4 MB', color: 'bg-green-500', target: 'ALL' },
    { id: '2', name: '礼花特效', type: 'video', size: '1.1 MB', color: 'bg-purple-500', target: 'ALL' },
    { id: '3', name: '奖励勋章动画', type: 'animation', size: '0.5 MB', color: 'bg-yellow-500', target: '王小明' },
    { id: '4', name: '超级点赞动画', type: 'animation', size: '1.8 MB', color: 'bg-blue-500', target: '李华' },
  ]);

  const students = ['王小明', '李华', '张三', '赵六'];

  const handleDelete = (id: string) => {
    if (confirm(language === 'zh' ? '确定删除这个强化物资源吗？' : 'Delete this reinforcement?')) {
      setItems(items.filter(i => i.id !== id));
    }
  };

  const filteredItems = activeView === 'global' 
    ? items.filter(i => i.target === 'ALL')
    : items.filter(i => i.target !== 'ALL');

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
        {filteredItems.map(item => (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-[2rem] overflow-hidden border dark:border-gray-700 group relative shadow-sm hover:shadow-2xl hover:translate-y-[-6px] transition-all duration-300">
             <div className="aspect-square bg-gray-50 dark:bg-gray-900 flex items-center justify-center relative overflow-hidden">
               <div className={`absolute inset-0 opacity-10 ${item.color}`}></div>
               {item.type === 'animation' ? <ImageIcon className="w-16 h-16 text-gray-300 group-hover:scale-110 transition-transform" /> : <PlayCircle className="w-16 h-16 text-gray-300 group-hover:scale-110 transition-transform" />}
               
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
        ))}
      </div>

      {previewingItem && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="w-full max-w-2xl text-center space-y-8 animate-in zoom-in-75 duration-500">
              <div className="relative mx-auto w-full aspect-video bg-gray-100 dark:bg-gray-900 rounded-[3rem] overflow-hidden border-8 border-white/10 shadow-2xl flex items-center justify-center">
                 <div className="text-center flex flex-col items-center gap-4">
                    <div className="text-9xl animate-bounce">✨</div>
                    <div className="flex gap-2">
                       <div className={`w-4 h-4 rounded-full animate-ping ${previewingItem.color}`}></div>
                       <h2 className="text-4xl font-black text-white tracking-widest uppercase">{language === 'zh' ? '播放预览' : 'PREVIEW'}</h2>
                    </div>
                 </div>
              </div>

              <div className="flex justify-center gap-6">
                 <button onClick={() => setPreviewingItem(null)} className="px-10 py-4 bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest border border-white/20 transition-all flex items-center gap-2">
                   <X className="w-6 h-6" />
                   {language === 'zh' ? '关闭' : 'Close'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-300">
           <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 border dark:border-gray-700">
              <div className="flex justify-between items-center mb-10 border-b dark:border-gray-700 pb-6">
                 <h3 className="text-2xl font-black dark:text-white uppercase tracking-tight">{language === 'zh' ? '上传并配置' : 'Upload & Config'}</h3>
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
                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-xl border dark:border-gray-700 outline-none focus:ring-4 focus:ring-primary-500/20 font-bold"
                        placeholder={language === 'zh' ? '例如：礼花动画' : 'e.g. Fireworks'}
                      />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">{language === 'zh' ? '投放对象' : 'Target Object'}</label>
                      <select className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-xl border dark:border-gray-700 outline-none focus:ring-4 focus:ring-primary-500/20 font-bold">
                         <option value="ALL">{language === 'zh' ? '全局通用' : 'Global'}</option>
                         {students.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                   </div>
                 </div>

                 <div className="group border-4 border-dashed dark:border-gray-700 rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-4 hover:border-primary-500 hover:bg-primary-50/20 transition-all cursor-pointer bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="bg-primary-100 dark:bg-primary-900/30 p-6 rounded-[2rem] group-hover:scale-110 transition-all shadow-sm">
                       <UploadCloud className="w-10 h-10 text-primary-600" />
                    </div>
                    <div className="text-center">
                       <p className="font-black dark:text-white text-lg">{language === 'zh' ? '点击或拖拽上传' : 'Click or Drop'}</p>
                       <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Lottie JSON, MP4, GIF</p>
                    </div>
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button onClick={() => setIsUploadModalOpen(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-[1.5rem] font-black uppercase tracking-widest">
                      {language === 'zh' ? '取消' : 'Cancel'}
                    </button>
                    <button onClick={() => setIsUploadModalOpen(false)} className="flex-1 py-4 bg-primary-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-primary-500/30 hover:bg-primary-700 transition-all">
                      {language === 'zh' ? '立即应用' : 'Apply Now'}
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
