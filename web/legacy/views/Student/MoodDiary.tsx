import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import { api } from '../../services/api.ts';
import { 
  Smile, 
  Frown, 
  Meh, 
  Laugh, 
  Angry, 
  Calendar, 
  MessageSquare, 
  Activity, 
  Brain, 
  Heart,
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  AlertCircle
} from 'lucide-react';

interface MoodDiaryEntry {
  id: string;
  date: string;
  mood: number;
  event: string;
  feeling: string;
  thought: string;
  physicalSensation: string;
  intensity: number;
}

const MoodDiaryView: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const auth = useContext(AuthContext);
  const [diaries, setDiaries] = useState<MoodDiaryEntry[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // New entry state
  const [newEntry, setNewEntry] = useState<Partial<MoodDiaryEntry>>({
    mood: 3,
    intensity: 5,
    event: '',
    feeling: '',
    thought: '',
    physicalSensation: '',
    date: new Date().toISOString().split('T')[0]
  });

  const moodIcons = [
    { value: 1, icon: <Angry className="w-10 h-10" />, color: 'text-red-500', bg: 'bg-red-50', label: language === 'zh' ? '糟糕' : 'Terrible' },
    { value: 2, icon: <Frown className="w-10 h-10" />, color: 'text-orange-500', bg: 'bg-orange-50', label: language === 'zh' ? '不好' : 'Bad' },
    { value: 3, icon: <Meh className="w-10 h-10" />, color: 'text-yellow-500', bg: 'bg-yellow-50', label: language === 'zh' ? '一般' : 'Okay' },
    { value: 4, icon: <Smile className="w-10 h-10" />, color: 'text-blue-500', bg: 'bg-blue-50', label: language === 'zh' ? '不错' : 'Good' },
    { value: 5, icon: <Laugh className="w-10 h-10" />, color: 'text-green-500', bg: 'bg-green-50', label: language === 'zh' ? '太棒了' : 'Great' },
  ];

  useEffect(() => {
    fetchDiaries();
  }, []);

  const fetchDiaries = async () => {
    try {
      const data = await api.moodDiaries.list(auth?.user?.id);
      setDiaries(data);
    } catch (error) {
      console.error("Fetch diaries error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.moodDiaries.create({
        ...newEntry,
        studentId: auth?.user?.id
      });
      setIsAdding(false);
      fetchDiaries();
      // Reset
      setNewEntry({
        mood: 3,
        intensity: 5,
        event: '',
        feeling: '',
        thought: '',
        physicalSensation: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error("Save diary error:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black dark:text-white flex items-center gap-3">
            <Heart className="w-8 h-8 text-pink-500" />
            {language === 'zh' ? '情绪日记' : 'Mood Diary'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-bold text-sm mt-1 uppercase tracking-widest">
            {language === 'zh' ? '倾听内心的声音' : 'Listen to your inner voice'}
          </p>
        </div>
        
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-pink-200 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            {language === 'zh' ? '记录心情' : 'Log Mood'}
          </button>
        )}
      </div>

      {isAdding ? (
        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl border dark:border-gray-700 overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
          <div className="p-8 space-y-8">
            {/* Mood Selector */}
            <div className="space-y-4">
              <label className="text-lg font-black dark:text-white block text-center">
                {language === 'zh' ? '你现在的感觉如何？' : 'How are you feeling now?'}
              </label>
              <div className="flex justify-between max-w-md mx-auto">
                {moodIcons.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setNewEntry({ ...newEntry, mood: m.value })}
                    className={`
                      flex flex-col items-center gap-2 p-4 rounded-2xl transition-all
                      ${newEntry.mood === m.value 
                        ? `${m.bg} ${m.color} scale-110 shadow-inner ring-2 ring-current` 
                        : 'text-gray-300 hover:text-gray-400 grayscale'
                      }
                    `}
                  >
                    {m.icon}
                    <span className="text-[10px] font-black uppercase tracking-wider">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Intensity Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-black dark:text-white">
                  {language === 'zh' ? '情绪强烈程度' : 'Intensity'}
                </label>
                <span className="text-pink-500 font-black">{newEntry.intensity}</span>
              </div>
              <input 
                type="range" 
                min="1" max="10" 
                value={newEntry.intensity}
                onChange={(e) => setNewEntry({ ...newEntry, intensity: parseInt(e.target.value) })}
                className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-pink-500"
              />
            </div>

            {/* Questions (CBT style) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-black dark:text-gray-300">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  {language === 'zh' ? '发生了什么事？' : 'What happened?'}
                </label>
                <textarea 
                  value={newEntry.event}
                  onChange={(e) => setNewEntry({ ...newEntry, event: e.target.value })}
                  placeholder={language === 'zh' ? '描述一下刚才发生的事情...' : 'Describe what happened...'}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-pink-500 min-h-[100px] text-sm font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-black dark:text-gray-300">
                  <Heart className="w-4 h-4 text-red-500" />
                  {language === 'zh' ? '你有什么感受？' : 'What are you feeling?'}
                </label>
                <textarea 
                  value={newEntry.feeling}
                  onChange={(e) => setNewEntry({ ...newEntry, feeling: e.target.value })}
                  placeholder={language === 'zh' ? '用词语描述你的情绪...' : 'Describe your feelings...'}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-pink-500 min-h-[100px] text-sm font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-black dark:text-gray-300">
                  <Brain className="w-4 h-4 text-purple-500" />
                  {language === 'zh' ? '你当时在想什么？' : 'What were you thinking?'}
                </label>
                <textarea 
                  value={newEntry.thought}
                  onChange={(e) => setNewEntry({ ...newEntry, thought: e.target.value })}
                  placeholder={language === 'zh' ? '你的脑海里浮现了什么想法？' : 'What thoughts came to mind?'}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-pink-500 min-h-[100px] text-sm font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-black dark:text-gray-300">
                  <Activity className="w-4 h-4 text-orange-500" />
                  {language === 'zh' ? '身体有什么感觉？' : 'Physical sensations?'}
                </label>
                <textarea 
                  value={newEntry.physicalSensation}
                  onChange={(e) => setNewEntry({ ...newEntry, physicalSensation: e.target.value })}
                  placeholder={language === 'zh' ? '比如：手心冒汗、心跳加快...' : 'E.g., sweaty palms, racing heart...'}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-pink-500 min-h-[100px] text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setIsAdding(false)}
                className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 dark:text-white rounded-2xl font-black hover:bg-gray-200 transition-all"
              >
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button 
                onClick={handleSave}
                className="flex-[2] py-4 bg-pink-500 text-white rounded-2xl font-black shadow-lg shadow-pink-200 hover:bg-pink-600 transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {language === 'zh' ? '保存日记' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {loading ? (
            <div className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest animate-pulse">
              {language === 'zh' ? '加载中...' : 'Loading...'}
            </div>
          ) : diaries.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 p-12 rounded-[2.5rem] text-center border dark:border-gray-700">
              <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-10 h-10 text-gray-200" />
              </div>
              <h3 className="text-xl font-black dark:text-white mb-2">
                {language === 'zh' ? '还没有心情记录' : 'No entries yet'}
              </h3>
              <p className="text-gray-400 font-medium max-w-xs mx-auto">
                {language === 'zh' ? '记录下你的第一条心情日记吧，让我们更好地了解你。' : 'Start your first mood diary entry to help us understand you better.'}
              </p>
            </div>
          ) : (
            diaries.map((d) => (
              <div key={d.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border dark:border-gray-700 hover:shadow-md transition-shadow group">
                <div className="flex items-start gap-6">
                  <div className={`
                    p-4 rounded-2xl shrink-0
                    ${moodIcons.find(m => m.value === d.mood)?.bg} 
                    ${moodIcons.find(m => m.value === d.mood)?.color}
                  `}>
                    {moodIcons.find(m => m.value === d.mood)?.icon}
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black dark:text-white">
                          {moodIcons.find(m => m.value === d.mood)?.label}
                        </span>
                        <div className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-wider">
                          {language === 'zh' ? '强度' : 'Int'} {d.intensity}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {d.date}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {d.event && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl space-y-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{language === 'zh' ? '事件' : 'Event'}</p>
                          <p className="text-sm font-medium dark:text-gray-200 line-clamp-2">{d.event}</p>
                        </div>
                      )}
                      {d.feeling && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl space-y-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{language === 'zh' ? '感受' : 'Feeling'}</p>
                          <p className="text-sm font-medium dark:text-gray-200 line-clamp-2">{d.feeling}</p>
                        </div>
                      )}
                    </div>
                    
                    {(d.mood <= 1 || d.intensity >= 9) && (
                      <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl w-fit">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          {language === 'zh' ? '极端情绪预警已同步至老师' : 'Teacher notified of extreme mood'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MoodDiaryView;
