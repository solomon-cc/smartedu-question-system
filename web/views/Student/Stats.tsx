
import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, Clock } from 'lucide-react';
import { api } from '../../services/api.ts';
import Loading from '../../components/Loading';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area
} from 'recharts';

const Stats: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.student.stats().then(setStats).catch(console.error);
  }, []);

  if (!stats) return <Loading />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold dark:text-white">{language === 'zh' ? '统计分析' : 'Statistics'}</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800">
          <TrendingUp className="text-blue-600 mb-4" />
          <h4 className="text-sm text-gray-500">{language === 'zh' ? '平均正确率' : 'Avg. Accuracy'}</h4>
          <p className="text-3xl font-black text-blue-600">{stats.accuracy || '0%'}</p>
        </div>
        <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-3xl border border-purple-100 dark:border-purple-800">
          <Clock className="text-purple-600 mb-4" />
          <h4 className="text-sm text-gray-500">{language === 'zh' ? '累计用时' : 'Total Time'}</h4>
          <p className="text-3xl font-black text-purple-600">{stats.time || '0h'}</p>
        </div>
      </div>
      
      {/* Panel 1: Practice Stats */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
           <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-xl text-orange-600">
             <TrendingUp className="w-5 h-5" />
           </div>
           <h3 className="font-bold dark:text-white text-lg">{language === 'zh' ? '自主练习趋势' : 'Practice Trends'}</h3>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={stats.practiceTrends || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                tickLine={false} 
                axisLine={false} 
                tick={{fontSize: 10, fill: '#9CA3AF'}} 
                tickFormatter={(val) => val.slice(5)} // Show MM-DD
              />
              <YAxis yAxisId="left" orientation="left" stroke="#F97316" tickLine={false} axisLine={false} tick={{fontSize: 10, fill: '#F97316'}} />
              <YAxis yAxisId="right" orientation="right" stroke="#3B82F6" tickLine={false} axisLine={false} tick={{fontSize: 10, fill: '#3B82F6'}} unit="%" />
              <Tooltip 
                contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} 
                itemStyle={{fontSize: '12px', fontWeight: 'bold'}}
              />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="count" name={language === 'zh' ? '练习题量' : 'Count'} fill="#ffedd5" stroke="#F97316" strokeWidth={3} />
              <Bar yAxisId="right" dataKey="accuracy" name={language === 'zh' ? '正确率' : 'Accuracy'} barSize={20} fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Panel 2: Homework Stats */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
           <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-xl text-purple-600">
             <Award className="w-5 h-5" />
           </div>
           <h3 className="font-bold dark:text-white text-lg">{language === 'zh' ? '家庭作业分析' : 'Homework Analysis'}</h3>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={stats.homeworkTrends || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                tickLine={false} 
                axisLine={false} 
                tick={{fontSize: 10, fill: '#9CA3AF'}} 
                tickFormatter={(val) => val.slice(5)} 
              />
              <YAxis yAxisId="left" orientation="left" stroke="#8B5CF6" tickLine={false} axisLine={false} tick={{fontSize: 10, fill: '#8B5CF6'}} />
              <YAxis yAxisId="right" orientation="right" stroke="#10B981" tickLine={false} axisLine={false} tick={{fontSize: 10, fill: '#10B981'}} unit="%" />
              <Tooltip 
                contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} 
                itemStyle={{fontSize: '12px', fontWeight: 'bold'}}
              />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="count" name={language === 'zh' ? '完成次数' : 'Completed'} fill="#f3e8ff" stroke="#8B5CF6" strokeWidth={3} />
              <Bar yAxisId="right" dataKey="accuracy" name={language === 'zh' ? '正确率' : 'Accuracy'} barSize={20} fill="#10B981" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Stats;
