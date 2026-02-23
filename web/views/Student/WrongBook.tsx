import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import Loading from '../../components/Loading';
import { AlertTriangle, Filter } from 'lucide-react';
import { SUBJECTS } from '../../utils.ts';

const WrongBook: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState('全部');

  useEffect(() => {
    setLoading(true);
    api.wrongBook.list()
      .then(setList)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 1: return language === 'zh' ? '错题 (Error)' : 'Error';
      case 2: return language === 'zh' ? '重试 (Answer)' : 'Retry (Ans)';
      case 3: return language === 'zh' ? '重试 (No Ans)' : 'Retry (No Ans)';
      case 5: return language === 'zh' ? '困难 (Difficult)' : 'Difficult';
      default: return 'Unknown';
    }
  };

  const filteredList = list.filter(item => {
    if (subjectFilter === '全部') return true;
    const subj = item.question?.subject;
    const target = SUBJECTS.find(s => s.name === subjectFilter || s.id === subjectFilter);
    if (!target) return subj === subjectFilter;
    return subj === target.name || subj === target.id;
  });

  if (loading) return <Loading />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
          <AlertTriangle className="text-red-500" />
          {language === 'zh' ? '错题本' : 'Mistakes Book'}
        </h2>
        
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border dark:border-gray-700">
          <Filter className="w-4 h-4 text-gray-400 ml-2" />
          <select 
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="bg-transparent text-sm font-bold dark:text-gray-200 outline-none pr-4"
          >
            <option value="全部">{language === 'zh' ? '全部科目' : 'All Subjects'}</option>
            {SUBJECTS.map(s => (
              <option key={s.id} value={s.name}>{language === 'zh' ? s.name : s.enName}</option>
            ))}
          </select>
        </div>
      </div>
      
      {filteredList.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700">
          {language === 'zh' ? '暂无符合条件的记录。' : 'No matching records found.'}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredList.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border dark:border-gray-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
               <div className={`absolute top-0 left-0 w-2 h-full ${item.status === 5 ? 'bg-purple-500' : 'bg-red-500'}`}></div>
               <div className="mb-4">
                 <div className="flex justify-between items-start mb-2">
                   <span className={`text-[10px] font-black uppercase px-2 py-1 rounded tracking-wider ${
                     item.status === 5 ? 'bg-purple-100 text-purple-600' : 'bg-red-100 text-red-600'
                   }`}>
                     {getStatusLabel(item.status)}
                   </span>
                   <span className="text-xs text-gray-400 font-bold">
                     {language === 'zh' ? `错误: ${item.errorCount}` : `Errors: ${item.errorCount}`}
                   </span>
                 </div>
                 <h3 className="font-bold text-lg dark:text-white line-clamp-3 mb-2">
                    {item.question?.stemText || 'Question Deleted'}
                 </h3>
               </div>
               
               {item.question?.stemImage && (
                 <img src={item.question.stemImage} className="w-full h-32 object-cover rounded-xl mb-4 border dark:border-gray-700" alt="stem" />
               )}

               <div className="flex justify-between items-center text-xs text-gray-400 mt-4 pt-4 border-t dark:border-gray-700">
                 <span>{language === 'zh' ? '更新于: ' : 'Updated: '}{item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : '-'}</span>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WrongBook;
