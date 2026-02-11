
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Clock, ArrowRight } from 'lucide-react';
import { api } from '../../services/api.ts';

const Homework: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const navigate = useNavigate();
  const [homeworkList, setHomeworkList] = useState<any[]>([]);

  useEffect(() => {
    api.homework.list().then(setHomeworkList).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold dark:text-white">{language === 'zh' ? '我的作业' : 'My Homework'}</h2>
      <div className="grid gap-4">
        {homeworkList.map(hw => (
          <div key={hw.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border dark:border-gray-700 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${hw.status === 'done' ? 'bg-green-100 text-green-600' : 'bg-primary-100 text-primary-600'}`}>
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold dark:text-white">{hw.title}</h4>
                <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                  <span>{hw.count || 0} {language === 'zh' ? '道题' : 'Questions'}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(hw.deadline || hw.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            {hw.status === 'pending' ? (
              <button 
                onClick={() => navigate('/practice')}
                className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all"
              >
                {language === 'zh' ? '开始' : 'Start'}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <span className="text-green-500 font-bold">{language === 'zh' ? '已完成' : 'Finished'}</span>
            )}
          </div>
        ))}
        {homeworkList.length === 0 && (
          <div className="text-center p-12 text-gray-400">
            {language === 'zh' ? '暂无作业' : 'No homework assigned'}
          </div>
        )}
      </div>
    </div>
  );
};

export default Homework;
