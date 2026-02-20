
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Clock, ArrowRight } from 'lucide-react';
import { api } from '../../services/api.ts';
import Loading from '../../components/Loading';

const Homework: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const navigate = useNavigate();
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.homework.list()
      .then(setHomeworkList)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold dark:text-white">{language === 'zh' ? '我的作业' : 'My Homework'}</h2>
      <div className="grid gap-4">
        {homeworkList.map(hw => (
          <div key={hw.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border dark:border-gray-700 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${hw.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-primary-100 text-primary-600'}`}>
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold dark:text-white">{hw.name}</h4>
                <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                  <span>{hw.total || 0} {language === 'zh' ? '道题' : 'Questions'}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {hw.endDate ? new Date(hw.endDate).toLocaleDateString() : (language === 'zh' ? '无期限' : 'No deadline')}</span>
                </div>
              </div>
            </div>
            {hw.status === 'pending' ? (
              <button 
                onClick={() => navigate(`/practice?homeworkId=${hw.id}`)}
                className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all"
              >
                {language === 'zh' ? '开始' : 'Start'}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-green-500 font-bold">{language === 'zh' ? '已完成' : 'Finished'}</span>
                <button 
                  onClick={() => navigate(`/practice?homeworkId=${hw.id}&mode=review`)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-primary-600 hover:text-white transition-all"
                >
                   {language === 'zh' ? '再次练习' : 'Re-practice'}
                </button>
              </div>
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
