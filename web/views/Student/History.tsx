
import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, ArrowLeft, FileText, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../services/api.ts';
import Loading from '../../components/Loading';

interface HistoryItem {
  id: string;
  type: 'exam' | 'practice' | 'homework';
  name: string;
  nameEn: string;
  date: string;
  score?: string;
  total?: string;
  correctCount?: number;
  wrongCount?: number;
  questions: any[];
}

const History: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(10);

  useEffect(() => {
    setLoading(true);
    api.history.list(page, pageSize)
      .then(res => {
        setHistory(res.list);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'exam': return language === 'zh' ? '考试' : 'Exam';
      case 'practice': return language === 'zh' ? '练习' : 'Practice';
      case 'homework': return language === 'zh' ? '作业' : 'Homework';
      default: return type;
    }
  };

  const getResultDisplay = (item: HistoryItem) => {
    const totalQuestions = parseInt(item.total || '0');
    const correct = item.correctCount || 0;
    const incorrect = totalQuestions - correct;

    return (
      <div className="flex gap-3 text-xs font-bold items-center">
        <span className="text-green-600 flex items-center gap-1">
          <CheckCircle2 className="w-4 h-4" /> {correct}
        </span>
        <span className="text-gray-300 dark:text-gray-600 text-sm">/</span>
        <span className="text-red-500 flex items-center gap-1">
          <XCircle className="w-4 h-4" /> {incorrect}
        </span>
      </div>
    );
  };

  if (selectedItem) {
    // ... (Keep details view mostly same, but maybe adjust header if needed. For now keeping it compatible)
    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <button 
          onClick={() => setSelectedItem(null)}
          className="flex items-center gap-2 text-primary-600 font-bold hover:underline"
        >
          <ArrowLeft className="w-5 h-5" />
          {language === 'zh' ? '返回列表' : 'Back to List'}
        </button>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-start mb-8 border-b dark:border-gray-700 pb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                 <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${selectedItem.type === 'exam' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                   {getTypeLabel(selectedItem.type)}
                 </span>
                 <h2 className="text-3xl font-black dark:text-white">{language === 'zh' ? selectedItem.name : selectedItem.nameEn}</h2>
              </div>
              <p className="text-gray-500 mt-2 flex items-center gap-2"><Clock className="w-4 h-4" /> {selectedItem.date}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 uppercase font-bold">{language === 'zh' ? '成绩 / 结果' : 'Result'}</p>
              <div className="mt-1 text-2xl">{getResultDisplay(selectedItem)}</div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="font-bold text-lg dark:text-white">{language === 'zh' ? '答题详情回顾' : 'Review Details'}</h3>
            {selectedItem.questions && selectedItem.questions.length > 0 ? selectedItem.questions.map((q, idx) => {
              const stemText = typeof q.stem === 'string' ? q.stem : q.stem?.text || '';
              return (
                <div key={idx} className="p-6 rounded-[2rem] bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 relative overflow-hidden group">
                   <div className={`absolute top-0 left-0 w-2 h-full ${q.status === 'correct' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                   <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-bold dark:text-white text-lg mb-4">{idx + 1}. {stemText}</p>
                        {(q.stemImage || q.stem?.image) && <img src={q.stemImage || q.stem?.image} className="w-48 h-24 object-cover rounded-xl mb-4 border dark:border-gray-700" alt="stem" />}
                        
                        {q.options && (
                          <div className="flex gap-4 mb-6 flex-wrap">
                             {q.options.map((opt: any, i: number) => (
                               <div key={i} className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700">
                                  {opt.image && <img src={opt.image} className="w-16 h-16 object-cover rounded-lg" />}
                                  <span className="text-[10px] font-bold dark:text-gray-300">{opt.text}</span>
                               </div>
                             ))}
                          </div>
                        )}
                      </div>
                      {q.status === 'correct' ? <CheckCircle className="text-green-500 w-6 h-6 shrink-0" /> : <XCircle className="text-red-500 w-6 h-6 shrink-0" />}
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-800">
                        <p className="text-[10px] text-green-600 font-black uppercase mb-1">{language === 'zh' ? '正确答案' : 'Correct'}</p>
                        <p className="text-green-700 dark:text-green-400 font-bold">{q.answer}</p>
                      </div>
                      <div className={`p-4 rounded-2xl border ${q.status === 'correct' ? 'bg-primary-50 dark:bg-primary-900/10 border-primary-100 dark:border-primary-800' : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800'}`}>
                        <p className={`text-[10px] font-black uppercase mb-1 ${q.status === 'correct' ? 'text-primary-600' : 'text-red-600'}`}>
                          {language === 'zh' ? '你的回答' : 'Your Answer'}
                        </p>
                        <p className={`font-bold ${q.status === 'correct' ? 'text-primary-700 dark:text-primary-400' : 'text-red-700 dark:text-red-400'}`}>
                          {q.userAnswer}
                        </p>
                      </div>
                   </div>
                </div>
              );
            }) : (
              <div className="text-center py-10 text-gray-400">
                {language === 'zh' ? '暂无详细答题记录' : 'No detailed records available'}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold dark:text-white">{language === 'zh' ? '答题历史' : 'History'}</h2>
      <div className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden border dark:border-gray-700 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">{language === 'zh' ? '类型' : 'Type'}</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">{language === 'zh' ? '名称' : 'Name'}</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">{language === 'zh' ? '日期' : 'Date'}</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">{language === 'zh' ? '成绩 / 结果' : 'Result'}</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">{language === 'zh' ? '操作' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={5}><Loading /></td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">{language === 'zh' ? '暂无记录' : 'No records'}</td></tr>
              ) : (
                history.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors group">
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${item.type === 'exam' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                      {getTypeLabel(item.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold dark:text-white group-hover:text-primary-600">{language === 'zh' ? item.name : item.nameEn}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 flex items-center gap-2"><Calendar className="w-4 h-4" /> {item.date}</td>
                  <td className="px-6 py-4">{getResultDisplay(item)}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setSelectedItem(item)}
                      className="flex items-center gap-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary-600 hover:text-white transition-all"
                    >
                      <FileText className="w-4 h-4" /> {language === 'zh' ? '详情' : 'Details'}
                    </button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {total > pageSize && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {language === 'zh' ? `共 ${total} 条记录` : `Total ${total} records`}
            </div>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 rounded-lg border dark:border-gray-700 disabled:opacity-30 hover:bg-white dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 dark:text-gray-300" />
              </button>
              <div className="flex items-center px-4 font-bold dark:text-white">
                {page} / {Math.ceil(total / pageSize)}
              </div>
              <button
                disabled={page >= Math.ceil(total / pageSize)}
                onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-lg border dark:border-gray-700 disabled:opacity-30 hover:bg-white dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronRight className="w-5 h-5 dark:text-gray-300" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
