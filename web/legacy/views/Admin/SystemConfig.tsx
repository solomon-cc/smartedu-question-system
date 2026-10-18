import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { Save, Settings, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Loading from '../../components/Loading';

const SystemConfig: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const [config, setConfig] = useState<any>({ 
    globalEnabled: true,
    excludeMistakesFromPractice: false,
    stages: {
      1: { nextWrong: 2, nextCorrect: 4, showAnswer: false, label: "Error" },
      2: { nextWrong: 3, nextCorrect: 4, showAnswer: true, label: "Retry (Ans)" },
      3: { nextWrong: 5, nextCorrect: 4, showAnswer: false, label: "Retry (No Ans)" },
      4: { nextWrong: 1, nextCorrect: 4, showAnswer: false, label: "Known" },
      5: { nextWrong: 5, nextCorrect: 5, showAnswer: false, label: "Difficult" }
    }
  });
  const [settings, setSettings] = useState<any>({ registrationEnabled: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const [res, setRes] = await Promise.all([
        api.admin.getConfig(),
        api.admin.getSettings()
      ]);
      if (res) setConfig(res);
      if (setRes) setSettings(setRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        api.admin.updateConfig(config),
        api.admin.updateSettings(settings)
      ]);
      setMsg(language === 'zh' ? '保存成功' : 'Saved successfully');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      console.error(e);
      setMsg(language === 'zh' ? '保存失败' : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateStage = (stageId: number, field: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      stages: {
        ...prev.stages,
        [stageId]: {
          ...prev.stages[stageId],
          [field]: value
        }
      }
    }));
  };

  if (loading) return <Loading />;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-2xl">
          <Settings className="w-8 h-8 text-primary-600" />
        </div>
        <div>
           <h2 className="text-2xl font-black dark:text-white">{language === 'zh' ? '系统配置' : 'System Configuration'}</h2>
           <p className="text-gray-500 font-bold">{language === 'zh' ? '全局错题处理逻辑设置' : 'Global Error Processing Logic Settings'}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 border dark:border-gray-700 shadow-sm space-y-8">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className={`w-14 h-8 rounded-full p-1 transition-colors cursor-pointer ${config.globalEnabled ? 'bg-green-500' : 'bg-gray-300'}`} onClick={() => setConfig({...config, globalEnabled: !config.globalEnabled})}>
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${config.globalEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
               </div>
               <span className="font-bold dark:text-white text-lg">
                 {language === 'zh' ? '启用错题逻辑' : 'Enable Error Logic'}
               </span>
            </div>
            
            <div className="flex items-center gap-4">
               <div className={`w-14 h-8 rounded-full p-1 transition-colors cursor-pointer ${config.excludeMistakesFromPractice ? 'bg-primary-500' : 'bg-gray-300'}`} onClick={() => setConfig({...config, excludeMistakesFromPractice: !config.excludeMistakesFromPractice})}>
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${config.excludeMistakesFromPractice ? 'translate-x-6' : 'translate-x-0'}`} />
               </div>
               <span className="font-bold dark:text-white text-lg">
                 {language === 'zh' ? '练习时不出现错题' : 'Exclude Mistakes in Practice'}
               </span>
            </div>

            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loading /> : <Save className="w-5 h-5" />}
              {language === 'zh' ? '保存设置' : 'Save Config'}
            </button>
         </div>

         {msg && (
           <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl flex items-center gap-2 font-bold animate-in slide-in-from-top-2">
             <CheckCircle2 className="w-5 h-5" /> {msg}
           </div>
         )}

         <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-3xl border dark:border-gray-700 space-y-6">
            <h3 className="font-black text-lg flex items-center gap-2 dark:text-white">
              <Settings className="w-5 h-5 text-primary-500" />
              {language === 'zh' ? '基础设置' : 'General Settings'}
            </h3>
            <div className="flex items-center gap-4">
               <div className={`w-14 h-8 rounded-full p-1 transition-colors cursor-pointer ${settings.registrationEnabled ? 'bg-green-500' : 'bg-gray-300'}`} onClick={() => setSettings({...settings, registrationEnabled: !settings.registrationEnabled})}>
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${settings.registrationEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
               </div>
               <span className="font-bold dark:text-white">
                 {language === 'zh' ? '开放用户注册 (手机号)' : 'Enable Public Registration (Phone)'}
               </span>
            </div>
         </div>

         <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-3xl border dark:border-gray-700 space-y-6">
            <h3 className="font-black text-lg flex items-center gap-2 dark:text-white">
              <Settings className="w-5 h-5 text-primary-500" />
              {language === 'zh' ? '逻辑流配置' : 'Flow Configuration'}
            </h3>
            
            <div className="grid gap-6">
              {[1, 2, 3, 4, 5].map(stageId => {
                const stage = config.stages?.[stageId] || {};
                let colorClass = 'bg-gray-100 text-gray-600';
                if (stageId === 1) colorClass = 'bg-red-100 text-red-600';
                if (stageId === 2) colorClass = 'bg-orange-100 text-orange-600';
                if (stageId === 3) colorClass = 'bg-yellow-100 text-yellow-600';
                if (stageId === 4) colorClass = 'bg-green-100 text-green-600';
                if (stageId === 5) colorClass = 'bg-purple-100 text-purple-600';

                return (
                  <div key={stageId} className="p-6 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="flex items-center gap-4 w-48 shrink-0">
                       <span className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shrink-0 ${colorClass}`}>
                         {stageId}
                       </span>
                       <div>
                         <input 
                           type="text" 
                           value={stage.label || ''}
                           onChange={(e) => updateStage(stageId, 'label', e.target.value)}
                           className="font-bold bg-transparent border-b border-gray-300 focus:border-primary-500 outline-none w-32 dark:text-white"
                         />
                       </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                       <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{language === 'zh' ? '如果再次错误 → 跳转至' : 'If Wrong → Go To'}</label>
                          <select 
                            value={stage.nextWrong || stageId}
                            onChange={(e) => updateStage(stageId, 'nextWrong', parseInt(e.target.value))}
                            className="p-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg font-bold dark:text-white"
                          >
                            {[1, 2, 3, 4, 5].map(i => <option key={i} value={i}>Stage {i}</option>)}
                          </select>
                       </div>

                       <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{language === 'zh' ? '如果答对 → 跳转至' : 'If Correct → Go To'}</label>
                          <select 
                            value={stage.nextCorrect || 4}
                            onChange={(e) => updateStage(stageId, 'nextCorrect', parseInt(e.target.value))}
                            className="p-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg font-bold dark:text-white"
                          >
                            {[1, 2, 3, 4, 5].map(i => <option key={i} value={i}>Stage {i}</option>)}
                          </select>
                       </div>

                       <div className="flex items-center gap-2 pt-4">
                          <input 
                            type="checkbox" 
                            checked={stage.showAnswer || false}
                            onChange={(e) => updateStage(stageId, 'showAnswer', e.target.checked)}
                            className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                          />
                          <label className="text-sm font-bold dark:text-gray-300">{language === 'zh' ? '显示答案提示' : 'Show Answer Hint'}</label>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
         </div>
      </div>
    </div>
  );
};

export default SystemConfig;
