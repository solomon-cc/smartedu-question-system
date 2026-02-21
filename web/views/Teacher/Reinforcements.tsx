import React, { useState, useEffect, useRef } from 'react';
import { PlayCircle, Image as ImageIcon, Plus, Trash2, X, UploadCloud, Info, CheckCircle, Users, Globe, UserCheck, Star, Zap, Gift, Trophy, Edit2, Clock, Gamepad2 } from 'lucide-react';
import { api } from '../../services/api.ts';
import { Role } from '../../types';
import Loading from '../../components/Loading';

import ConfirmationModal from '../../components/ConfirmationModal';

const BUILTIN_ASSETS = [
  { id: 'dino', name: '快乐恐龙', nameEn: 'Happy Dino', icon: '🦕', color: 'bg-green-100 text-green-600' },
  { id: 'fireworks', name: '绚丽烟花', nameEn: 'Fireworks', icon: '🎆', color: 'bg-purple-100 text-purple-600' },
  { id: 'star', name: '超级星星', nameEn: 'Super Star', icon: '⭐', color: 'bg-yellow-100 text-yellow-600' },
  { id: 'trophy', name: '冠军奖杯', nameEn: 'Trophy', icon: '🏆', color: 'bg-blue-100 text-blue-600' },
  { id: 'rocket', name: '一飞冲天', nameEn: 'Rocket', icon: '🚀', color: 'bg-red-100 text-red-600' },
  { id: 'party', name: '庆祝时刻', nameEn: 'Party', icon: '🎉', color: 'bg-pink-100 text-pink-600' },
];

const BUILTIN_GAMES = [
  { id: 'reaction', name: '反应力测试', nameEn: 'Reaction Test', icon: '⚡', color: 'bg-amber-100 text-amber-600', desc: '测试你的反应速度' },
  { id: 'memory', name: '记忆翻牌', nameEn: 'Memory Cards', icon: '🎴', color: 'bg-blue-100 text-blue-600', desc: '找出相同的卡片' },
  { id: 'math', name: '极速算术', nameEn: 'Quick Math', icon: '🧮', color: 'bg-green-100 text-green-600', desc: '快速回答简单的算术题' },
  { id: 'clicker', name: '疯狂点击', nameEn: 'Speed Clicker', icon: '👆', color: 'bg-red-100 text-red-600', desc: '5秒内点击尽可能多次' },
  { id: 'simon', name: '记忆序列', nameEn: 'Simon Says', icon: '🎹', color: 'bg-purple-100 text-purple-600', desc: '记住并重复颜色序列' },
  { id: 'breath', name: '深呼吸', nameEn: 'Deep Breath', icon: '🌬️', color: 'bg-cyan-100 text-cyan-600', desc: '跟随指引放松呼吸' },
];

const Reinforcements: React.FC<{ language: 'zh' | 'en', themeMode: 'light' | 'dark' | 'auto' }> = ({ language, themeMode }) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewingItem, setPreviewingItem] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formName, setFormName] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formDuration, setFormDuration] = useState('3');
  const [isGlobal, setIsGlobal] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [targetStudentIds, setTargetStudentIds] = useState<string[]>([]);
  const [ruleType, setRuleType] = useState<'fixed' | 'correct_count' | 'average'>('fixed');
  const [ruleValue, setRuleValue] = useState(2);
  const [assetType, setAssetType] = useState<'builtin' | 'upload' | 'game'>('builtin');
  const [selectedBuiltin, setSelectedBuiltin] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal State for Alerts
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationModalProps, setConfirmationModalProps] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'error' | 'confirm' | 'delete',
    onConfirm: () => {},
    confirmText: '',
    cancelText: '',
  });

  const getEffectiveDarkMode = () => {
    if (themeMode === 'auto') {
      const hour = new Date().getHours();
      return hour >= 18 || hour < 6;
    }
    return themeMode === 'dark';
  };

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
        ...item,
        size: '1.2 MB', 
        color: item.isGlobal ? 'bg-primary-500' : 'bg-orange-500'
      })));

      setStudents(studentsData.map((u: any) => ({
        id: u.id, 
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

  const handleCreateOrUpdate = async () => {
    let finalImage = '';
    
    if (assetType === 'builtin' || assetType === 'game') {
      if (!selectedBuiltin) {
        setConfirmationModalProps({
          title: language === 'zh' ? '选择错误' : 'Selection Error',
          message: language === 'zh' ? '请选择一个项目' : 'Please select an item',
          type: 'warning',
          language: language,
          onConfirm: () => setIsConfirmationModalOpen(false),
        });
        setIsConfirmationModalOpen(true);
        return;
      }
      finalImage = selectedBuiltin;
    } else {
      if (!uploadedFile) {
        setConfirmationModalProps({
          title: language === 'zh' ? '文件错误' : 'File Error',
          message: language === 'zh' ? '请上传文件' : 'Please upload a file',
          type: 'warning',
          language: language,
          onConfirm: () => setIsConfirmationModalOpen(false),
        });
        setIsConfirmationModalOpen(true);
        return;
      }
      finalImage = uploadedFile;
    }

    let defaultName = 'Custom Asset';
    if (assetType === 'builtin') defaultName = BUILTIN_ASSETS.find(b => b.id === selectedBuiltin)?.name || defaultName;
    if (assetType === 'game') defaultName = BUILTIN_GAMES.find(b => b.id === selectedBuiltin)?.name || defaultName;

    const payload = {
        name: formName || defaultName,
        type: assetType === 'game' ? 'game' : 'animation', 
        isGlobal: isGlobal,
        isActive: isActive,
        targetStudentIds: isGlobal ? [] : targetStudentIds,
        ruleType: ruleType,
        ruleValue: ruleValue,
        image: finalImage,
        prompt: formPrompt,
        duration: assetType === 'game' ? 0 : (parseInt(formDuration) || 3) // Games ignore duration
    };

    try {
      if (editingId) {
          await api.reinforcements.update(editingId, payload);
      } else {
          await api.reinforcements.create(payload);
      }
      setIsUploadModalOpen(false);
      fetchData();
      resetForm();
    } catch (e) {
      console.error(e);
      setConfirmationModalProps({
        title: language === 'zh' ? '保存失败' : 'Failed to Save',
        message: language === 'zh' ? '强化物保存失败，请检查数据或重试。' : 'Failed to save reinforcement. Please check your data or try again.',
        type: 'error',
        language: language,
        onConfirm: () => setIsConfirmationModalOpen(false),
      });
      setIsConfirmationModalOpen(true);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormPrompt('');
    setFormDuration('3');
    setIsGlobal(true);
    setIsActive(true);
    setTargetStudentIds([]);
    setRuleType('fixed');
    setRuleValue(2);
    setAssetType('builtin');
    setSelectedBuiltin('');
    setUploadedFile(null);
    setEditingId(null);
  }

  const handleOpenEdit = (item: any) => {
      setEditingId(item.id);
      setFormName(item.name);
      setFormPrompt(item.prompt || '');
      setFormDuration(String(item.duration || 3));
      setIsGlobal(item.isGlobal);
      setIsActive(item.isActive !== false); // Default true if undefined
      setTargetStudentIds(item.targetStudentIds || []);
      setRuleType(item.ruleType || 'fixed');
      setRuleValue(item.ruleValue || 2);
      
      const isBuiltin = BUILTIN_ASSETS.some(b => b.id === item.image);
      const isGame = item.type === 'game';
      
      if (isGame) {
        setAssetType('game');
        setSelectedBuiltin(item.image);
        setUploadedFile(null);
      } else if (isGame) {
        setAssetType('game');
        setSelectedBuiltin(item.image);
        setUploadedFile(null);
      } else if (isBuiltin) {
        setAssetType('builtin');
        setSelectedBuiltin(item.image);
        setUploadedFile(null);
      } else {
        setAssetType('upload');
        setUploadedFile(item.image);
        setSelectedBuiltin('');
      }
      setIsUploadModalOpen(true);
  };

  const handleToggleActive = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    try {
      await api.reinforcements.update(item.id, {
        ...item,
        isActive: !item.isActive
      });
      fetchData();
    } catch (err) {
      console.error(err);
      setConfirmationModalProps({
        title: language === 'zh' ? '操作失败' : 'Operation Failed',
        message: language === 'zh' ? '切换强化物状态失败，请重试。' : 'Failed to toggle reinforcement status. Please try again.',
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
      message: language === 'zh' ? '确定删除这个强化物资源吗？此操作不可逆。' : 'Are you sure you want to delete this reinforcement? This action cannot be undone.',
      type: 'delete',
      language: language,
      onConfirm: async () => {
        try {
          await api.reinforcements.delete(id);
          fetchData();
        } catch (e) {
          console.error(e);
          setConfirmationModalProps({
            title: language === 'zh' ? '删除失败' : 'Delete Failed',
            message: language === 'zh' ? '删除强化物失败，请重试。' : 'Failed to delete reinforcement. Please try again.',
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

  const getIconForAsset = (item: any) => {
    if (item.type === 'game') {
        const game = BUILTIN_GAMES.find(g => g.id === item.image);
        return <div className="text-6xl">{game?.icon || '🎮'}</div>;
    }
    const builtin = BUILTIN_ASSETS.find(b => b.id === item.image);
    if (builtin) {
      return <div className="text-6xl">{builtin.icon}</div>;
    }
    if (item.image && item.image.startsWith('http')) {
      return <img src={item.image} alt={item.name} className="w-full h-full object-cover" />;
    }
    if (item.image && item.image.startsWith('data:')) {
      return <img src={item.image} alt={item.name} className="w-full h-full object-cover" />;
    }
    return <ImageIcon className="w-16 h-16 text-gray-300" />;
  };

  const getRuleLabel = (type: string, value: number) => {
    switch (type) {
      case 'fixed': return language === 'zh' ? `每 ${value} 题出现` : `Every ${value} Qs`;
      case 'correct_count': return language === 'zh' ? `每答对 ${value} 题出现` : `Every ${value} Correct`;
      case 'average': return language === 'zh' ? `平均每 ${value} 题概率出现` : `Avg every ${value} Qs`;
      default: return type;
    }
  }

  const getRuleDescription = (type: string, value: number) => {
    switch (type) {
      case 'fixed': return language === 'zh' ? `效果：学生每完成 ${value} 道练习题（无论对错），系统将弹出一次该奖励。` : `Effect: Reward pops up every ${value} questions answered (correct or wrong).`;
      case 'correct_count': return language === 'zh' ? `效果：学生每积累答对 ${value} 道练习题，系统将弹出一次该奖励。` : `Effect: Reward pops up every ${value} correct answers accumulated.`;
      case 'average': 
        const prob = Math.round((1/value)*100);
        return language === 'zh' ? `效果：随机概率触发。平均每 ${value} 题出现一次（当前触发几率为 ${prob}%）。适合制造惊喜感。` : `Effect: Random trigger. On average appears every ${value} questions (current chance: ${prob}%). Great for surprises.`;
      default: return '';
    }
  }

  const effectiveDark = getEffectiveDarkMode();

  return (
    <div className="space-y-6 relative animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold dark:text-white">{language === 'zh' ? '强化物管理' : 'Reinforcement Management'}</h2>
        <button 
          onClick={() => {
            resetForm();
            setIsUploadModalOpen(true);
          }}
          className="bg-primary-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-primary-500/30 hover:bg-primary-700 transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          {language === 'zh' ? '新增强化物' : 'Add Asset'}
        </button>
      </div>

      <div className="bg-primary-50 dark:bg-primary-900/10 p-6 rounded-[2rem] border-2 border-primary-100 dark:border-primary-800 flex items-start gap-4 text-primary-600 dark:text-primary-400">
         <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
           <Zap className="w-6 h-6 shrink-0" />
         </div>
         <div>
           <p className="font-bold text-lg mb-1">{language === 'zh' ? '管理说明' : 'Management Note'}</p>
           <p className="text-sm opacity-80 leading-relaxed">
             {language === 'zh' ? '在此管理所有的强化物奖励及其出现规则。您可以设置全局通用的奖励，也可以为特定学生配置专属的激励逻辑。' : 'Manage all reinforcement rewards and their trigger rules here. You can set global rewards or configure exclusive motivation logic for specific students.'}
           </p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
           <div className="col-span-4"><Loading /></div>
        ) : items.length === 0 ? (
           <div className="col-span-4 text-center py-10 text-gray-400">{language === 'zh' ? '暂无资源' : 'No assets found'}</div>
        ) : (
        items.map(item => (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-[2rem] overflow-hidden border dark:border-gray-700 group relative shadow-sm hover:shadow-2xl hover:translate-y-[-6px] transition-all duration-300">
             <div className="aspect-square bg-gray-50 dark:bg-gray-900 flex items-center justify-center relative overflow-hidden">
               <div className={`absolute inset-0 opacity-10 ${item.color}`}></div>
               {getIconForAsset(item)}
               
               <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <button 
                   onClick={() => setPreviewingItem(item)}
                   className="bg-white p-4 rounded-full shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:scale-110"
                 >
                    {item.type === 'game' ? <Gamepad2 className="w-8 h-8 text-primary-600 fill-primary-600/10" /> : <PlayCircle className="w-8 h-8 text-primary-600 fill-primary-600/10" />}
                 </button>
               </div>
             </div>
             <div className="p-6">
               <div className="flex justify-between items-start mb-2">
                 <h5 className="font-black text-sm dark:text-white truncate pr-2 uppercase tracking-wide">{item.name}</h5>
                 <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
               </div>
               <div className="flex flex-col gap-2">
                 <div className="flex items-center gap-1 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                    <span className={`bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded ${item.type === 'game' ? 'text-purple-600 bg-purple-50' : ''}`}>{item.type === 'game' ? 'GAME' : 'ANIM'}</span>
                    <span>·</span>
                    {item.type !== 'game' && (
                        <>
                        <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {item.duration}s
                        </span>
                        <span>·</span>
                        </>
                    )}
                    <span className="flex items-center gap-1">
                      {item.isGlobal ? <Globe className="w-2.5 h-2.5" /> : <Users className="w-2.5 h-2.5" />}
                      {item.isGlobal ? (language === 'zh' ? '全局' : 'Global') : (language === 'zh' ? '定向' : 'Targeted')}
                    </span>
                    <span>·</span>
                    <button 
                      onClick={(e) => handleToggleActive(e, item)}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all ${item.isActive !== false ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      title={language === 'zh' ? (item.isActive !== false ? '点击停用' : '点击启用') : (item.isActive !== false ? 'Click to deactivate' : 'Click to activate')}
                    >
                      {item.isActive !== false ? <CheckCircle className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                      {item.isActive !== false ? (language === 'zh' ? '启用' : 'On') : (language === 'zh' ? '停用' : 'Off')}
                    </button>
                 </div>
                 <div className="text-[10px] text-primary-600 font-bold bg-primary-50 dark:bg-primary-950/20 px-2 py-1 rounded-lg border border-primary-100 dark:border-primary-900/50 w-fit">
                   {getRuleLabel(item.ruleType, item.ruleValue)}
                 </div>
               </div>
             </div>
             <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button 
                  onClick={() => handleOpenEdit(item)}
                  className="p-2 bg-white/90 dark:bg-gray-800/90 text-primary-500 rounded-xl shadow-sm hover:bg-primary-500 hover:text-white"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="p-2 bg-white/90 dark:bg-gray-800/90 text-red-500 rounded-xl shadow-sm hover:bg-red-500 hover:text-white"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
             </div>
          </div>
        )))}
      </div>

      {previewingItem && (
        <div className={`fixed inset-0 z-[120] flex items-center justify-center p-6 backdrop-blur-2xl animate-in fade-in duration-500 ${effectiveDark ? 'bg-black/95' : 'bg-white/95'}`}>
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
                 <div className={`text-[12rem] animate-bounce filter ${effectiveDark ? 'drop-shadow-[0_20px_50px_rgba(255,255,255,0.3)]' : 'drop-shadow-[0_20px_50px_rgba(0,0,0,0.2)]'}`}>
                   {getIconForAsset(previewingItem)}
                 </div>
              </div>

              <div className="space-y-4">
                 <h2 className={`text-6xl font-black tracking-tighter uppercase ${effectiveDark ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-white to-yellow-200' : 'text-primary-600'}`}>
                   {previewingItem.prompt || (language === 'zh' ? '太棒了！' : 'EXCELLENT!')}
                 </h2>
                 <p className={`text-xl font-bold tracking-widest uppercase opacity-80 ${effectiveDark ? 'text-primary-200' : 'text-primary-900'}`}>
                   {previewingItem.name}
                 </p>
                 {previewingItem.type === 'game' && (
                     <p className="text-sm font-bold opacity-60">(Game Preview Placeholder)</p>
                 )}
              </div>

              <div className="flex justify-center pt-8">
                 <button 
                  onClick={() => setPreviewingItem(null)} 
                  className={`px-12 py-5 rounded-full font-black uppercase tracking-widest shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:scale-110 active:scale-95 transition-all flex items-center gap-3 ${effectiveDark ? 'bg-white text-primary-900' : 'bg-primary-600 text-white'}`}
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
           <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 border dark:border-gray-700 max-h-[95vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-10 border-b dark:border-gray-700 pb-6">
                 <h3 className="text-2xl font-black dark:text-white uppercase tracking-tight">
                    {editingId 
                      ? (language === 'zh' ? '编辑强化物' : 'Edit Reinforcement') 
                      : (language === 'zh' ? '添加强化物' : 'Add Reinforcement')}
                 </h3>
                 <button onClick={() => setIsUploadModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <X className="w-6 h-6 dark:text-gray-400" />
                 </button>
              </div>

              <div className="space-y-6">
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
                   <div className="flex flex-col">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">{language === 'zh' ? '适用范围' : 'Scope'}</label>
                      <div className="flex gap-2">
                        <div className="flex flex-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
                          <button 
                            onClick={() => setIsGlobal(true)}
                            className={`flex-1 py-3 text-xs font-black rounded-lg transition-all ${isGlobal ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-white' : 'text-gray-400'}`}
                          >
                            {language === 'zh' ? '全局通用' : 'Global'}
                          </button>
                          <button 
                            onClick={() => setIsGlobal(false)}
                            className={`flex-1 py-3 text-xs font-black rounded-lg transition-all ${!isGlobal ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-white' : 'text-gray-400'}`}
                          >
                            {language === 'zh' ? '定向学生' : 'Targeted'}
                          </button>
                        </div>
                        
                        <button 
                          onClick={() => setIsActive(!isActive)}
                          className={`w-24 flex flex-col items-center justify-center rounded-xl font-black text-xs transition-all ${isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
                        >
                          <div className={`w-8 h-4 rounded-full p-0.5 mb-1 transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                             <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${isActive ? 'translate-x-4' : 'translate-x-0'}`}></div>
                          </div>
                          {isActive ? (language === 'zh' ? '已启用' : 'Active') : (language === 'zh' ? '已停用' : 'Inactive')}
                        </button>
                      </div>
                   </div>
                 </div>

                 {!isGlobal && (
                   <div className="animate-in slide-in-from-top duration-300 space-y-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">{language === 'zh' ? '选择学生 (可多选)' : 'Select Students (Multi-select)'}</label>
                      <div className="flex flex-wrap gap-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700 max-h-32 overflow-y-auto">
                        {students.map(s => {
                          const selected = targetStudentIds.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              onClick={() => setTargetStudentIds(prev => selected ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selected ? 'bg-primary-600 text-white shadow-md' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300'}`}
                            >
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                   </div>
                 )}

                 <div className="p-6 bg-primary-50/50 dark:bg-primary-900/10 rounded-3xl border border-primary-100 dark:border-primary-800 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-primary-600 uppercase mb-3 tracking-widest">{language === 'zh' ? '触发规则' : 'Trigger Rule'}</label>
                        <select 
                          value={ruleType}
                          onChange={(e) => setRuleType(e.target.value as any)}
                          className="w-full p-4 bg-white dark:bg-gray-900 dark:text-white rounded-xl border dark:border-gray-700 outline-none focus:ring-4 focus:ring-primary-500/20 font-bold"
                        >
                          <option value="fixed">{language === 'zh' ? '固定题数' : 'Every N Questions'}</option>
                          <option value="correct_count">{language === 'zh' ? '答对数量' : 'Every N Correct'}</option>
                          <option value="average">{language === 'zh' ? '平均概率' : 'Average Interval'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-primary-600 uppercase mb-3 tracking-widest">{language === 'zh' ? '规则值 (N)' : 'Rule Value (N)'}</label>
                        <input 
                          type="number" 
                          min="1"
                          value={ruleValue}
                          onChange={(e) => setRuleValue(parseInt(e.target.value) || 1)}
                          className="w-full p-4 bg-white dark:bg-gray-900 dark:text-white rounded-xl border dark:border-gray-700 outline-none focus:ring-4 focus:ring-primary-500/20 font-bold"
                        />
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-primary-700 dark:text-primary-400 bg-white/50 dark:bg-gray-800/50 p-3 rounded-xl border border-primary-100/50 dark:border-primary-900/30">
                       <Info className="w-4 h-4 shrink-0 mt-0.5" />
                       <p className="font-medium leading-relaxed">{getRuleDescription(ruleType, ruleValue)}</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className={assetType === 'game' ? 'col-span-2' : 'flex-1'}>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">{language === 'zh' ? '奖励提示词' : 'Reinforcement Prompt'}</label>
                        <input 
                          type="text" 
                          value={formPrompt}
                          onChange={(e) => setFormPrompt(e.target.value)}
                          className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-xl border dark:border-gray-700 outline-none focus:ring-4 focus:ring-primary-500/20 font-bold"
                          placeholder={language === 'zh' ? '输入赞美语' : 'Enter praise text'}
                        />
                    </div>
                    {assetType !== 'game' && (
                        <div className="w-32">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">{language === 'zh' ? '持续时间 (秒)' : 'Duration (s)'}</label>
                            <input 
                            type="number" 
                            min="1"
                            max="10"
                            value={formDuration}
                            onChange={(e) => setFormDuration(e.target.value)}
                            className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-xl border dark:border-gray-700 outline-none focus:ring-4 focus:ring-primary-500/20 font-bold"
                            />
                        </div>
                    )}
                 </div>
                 
                 <div>
                   <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-2xl mb-4 w-fit">
                      <button 
                        onClick={() => setAssetType('builtin')} 
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${assetType === 'builtin' ? 'bg-white dark:bg-gray-600 shadow text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        {language === 'zh' ? '内置动画' : 'Built-in'}
                      </button>
                      <button 
                        onClick={() => setAssetType('game')} 
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${assetType === 'game' ? 'bg-white dark:bg-gray-600 shadow text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        {language === 'zh' ? '小游戏' : 'Mini Game'}
                      </button>
                      <button 
                        onClick={() => setAssetType('upload')} 
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${assetType === 'upload' ? 'bg-white dark:bg-gray-600 shadow text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        {language === 'zh' ? '自定义上传' : 'Upload'}
                      </button>
                   </div>

                   {assetType === 'builtin' && (
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
                   )}

                   {assetType === 'game' && (
                     <div className="grid grid-cols-3 gap-4">
                       {BUILTIN_GAMES.map(game => (
                         <div 
                           key={game.id}
                           onClick={() => setSelectedBuiltin(game.id)}
                           className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 text-center ${selectedBuiltin === game.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-transparent bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                         >
                            <div className="text-4xl">{game.icon}</div>
                            <span className="text-xs font-bold dark:text-white">{language === 'zh' ? game.name : game.nameEn}</span>
                            <span className="text-[10px] text-gray-400 leading-tight">{game.desc}</span>
                         </div>
                       ))}
                     </div>
                   )}

                   {assetType === 'upload' && (
                     <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`group border-4 border-dashed rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-4 hover:border-primary-500 hover:bg-primary-50/20 transition-all cursor-pointer ${uploadedFile ? 'border-green-500 bg-green-50/20' : 'dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50'}`}
                     >
                        {uploadedFile ? (
                           <div className="flex flex-col items-center">
                              <img src={uploadedFile} alt="Preview" className="h-20 object-contain mb-2 rounded-lg" />
                              <p className="text-green-600 font-bold text-xs">{language === 'zh' ? '已选择文件' : 'File Selected'}</p>
                           </div>
                        ) : (
                           <>
                              <div className="bg-primary-100 dark:bg-primary-900/30 p-4 rounded-[1.5rem] group-hover:scale-110 transition-all shadow-sm">
                                 <UploadCloud className="w-8 h-8 text-primary-600" />
                              </div>
                              <div className="text-center">
                                 <p className="font-black dark:text-white text-base">{language === 'zh' ? '点击上传 GIF/图片' : 'Click to Upload GIF/Image'}</p>
                                 <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-widest">Max 2MB</p>
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
                    <button onClick={() => setIsUploadModalOpen(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-[1.5rem] font-black uppercase tracking-widest transition-all hover:bg-gray-200">
                      {language === 'zh' ? '取消' : 'Cancel'}
                    </button>
                    <button 
                      onClick={handleCreateOrUpdate} 
                      className="flex-1 py-4 bg-primary-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-primary-500/30 hover:bg-primary-700 transition-all hover:scale-105 active:scale-95"
                    >
                      {language === 'zh' ? (editingId ? '确认修改' : '确认添加') : (editingId ? 'Update' : 'Confirm')}
                    </button>
                 </div>
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
    </div>
  );
};

export default Reinforcements;
