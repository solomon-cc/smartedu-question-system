
import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, Clock } from 'lucide-react';
import { api } from '../../services/api.ts';

const Stats: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.student.stats().then(setStats).catch(console.error);
  }, []);

  if (!stats) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold dark:text-white">{language === 'zh' ? '统计分析' : 'Statistics'}</h2>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800">
          <TrendingUp className="text-blue-600 mb-4" />
          <h4 className="text-sm text-gray-500">{language === 'zh' ? '平均正确率' : 'Avg. Accuracy'}</h4>
          <p className="text-3xl font-black text-blue-600">{stats.accuracy}</p>
        </div>
        <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-3xl border border-purple-100 dark:border-purple-800">
          <Clock className="text-purple-600 mb-4" />
          <h4 className="text-sm text-gray-500">{language === 'zh' ? '累计用时' : 'Total Time'}</h4>
          <p className="text-3xl font-black text-purple-600">{stats.time}</p>
        </div>
        <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-3xl border border-orange-100 dark:border-orange-800">
          <Award className="text-orange-600 mb-4" />
          <h4 className="text-sm text-gray-500">{language === 'zh' ? '获得成就' : 'Achievements'}</h4>
          <p className="text-3xl font-black text-orange-600">{stats.achievements}</p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700">
        <h3 className="font-bold mb-6 dark:text-white">{language === 'zh' ? '学习趋势' : 'Learning Trends'}</h3>
        <div className="flex items-end justify-between h-48 gap-2">
           {stats.trends.map((h: number, i: number) => (
             <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-primary-500 rounded-t-xl transition-all duration-1000"
                  style={{ height: `${h}%` }}
                ></div>
                <span className="text-[10px] text-gray-400">周{i+1}</span>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default Stats;
