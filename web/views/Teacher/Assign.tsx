
import React, { useState, useEffect } from 'react';
import { Send, User, Book, Search, CheckCircle2, LayoutGrid, FileCheck, ChevronRight, UserCircle, Clock, ArrowLeft } from 'lucide-react';
import { api } from '../../services/api.ts';
import { Role } from '../../types';

const Assign: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const [activeTab, setActiveTab] = useState<'assign' | 'status'>('assign');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedHw, setSelectedHw] = useState<any>(null);
  
  // Data State
  const [students, setStudents] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [historicalHw, setHistoricalHw] = useState<any[]>([]);
  
  // Form State
  const [selectedPaperId, setSelectedPaperId] = useState('');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersData, papersData, hwData] = await Promise.all([
        api.users.list(),
        api.papers.list(),
        api.homework.list()
      ]);

      setStudents(usersData.filter((u: any) => u.role === Role.STUDENT).map((u: any) => ({
        id: u.id,
        name: u.username, // Using username as name
        grade: '3-1', // Mock grade as user model doesn't have it yet
        completion: '0%' // Mock completion for now
      })));

      setPapers(papersData);
      
      setHistoricalHw(hwData.map((h: any) => ({
        id: h.id,
        title: h.name,
        date: h.startDate,
        total: h.total,
        submitted: h.completed
      })));

      if (papersData.length > 0) {
        setSelectedPaperId(papersData[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssign = async () => {
    if (!selectedPaperId || !deadline || selectedStudents.length === 0) return;
    
    const paper = papers.find(p => p.id === selectedPaperId);
    try {
      await api.homework.assign({
        paperId: selectedPaperId,
        name: paper ? paper.name : 'Homework',
        classId: '3-1', // Mock class
        startDate: new Date().toISOString().split('T')[0],
        endDate: deadline,
        studentIds: selectedStudents // Backend needs to handle this (currently AssignHomework takes generic 'h')
      });
      alert(language === 'zh' ? '发布成功' : 'Assigned successfully');
      setSelectedStudents([]);
      setDeadline('');
      fetchData(); // Refresh list
    } catch (e) {
      console.error(e);
      alert('Failed to assign');
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  if (selectedHw) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <button 
          onClick={() => setSelectedHw(null)}
          className="flex items-center gap-2 text-primary-600 font-bold hover:underline"
        >
          <ArrowLeft className="w-5 h-5" />
          {language === 'zh' ? '返回列表' : 'Back to List'}
        </button>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700">
          <h2 className="text-2xl font-black dark:text-white mb-2">{selectedHw.title}</h2>
          <p className="text-gray-500 mb-8 flex items-center gap-2"><Clock className="w-4 h-4" /> {selectedHw.date}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-700">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{language === 'zh' ? '提交人数' : 'Submitted'}</p>
               <p className="text-2xl font-black dark:text-white">{selectedHw.submitted} / {selectedHw.total}</p>
            </div>
            <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800">
               <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">{language === 'zh' ? '提交率' : 'Rate'}</p>
               <p className="text-2xl font-black text-green-600">{selectedHw.total > 0 ? Math.round((selectedHw.submitted / selectedHw.total) * 100) : 0}%</p>
            </div>
          </div>

          <div className="space-y-4">
             <h3 className="font-bold dark:text-white mb-4">{language === 'zh' ? '学生完成明细' : 'Student Detail'}</h3>
             <div className="divide-y dark:divide-gray-700">
                {students.map(s => (
                  <div key={s.id} className="py-4 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <UserCircle className="w-10 h-10 text-gray-300" />
                        <div>
                           <p className="font-bold dark:text-white">{s.name}</p>
                           <p className="text-[10px] text-gray-400">{s.grade}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className={`text-sm font-black ${s.completion === '100%' ? 'text-green-500' : s.completion === '0%' ? 'text-red-500' : 'text-amber-500'}`}>{s.completion}</p>
                        <p className="text-[10px] text-gray-400">{s.completion === '100%' ? (language === 'zh' ? '已完成' : 'Done') : (language === 'zh' ? '进行中' : 'In Progress')}</p>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col items-center gap-6 mb-8">
        <h2 className="text-3xl font-black dark:text-white">{language === 'zh' ? '作业管理中心' : 'HW Management'}</h2>
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-full max-w-md">
           <button 
            onClick={() => setActiveTab('assign')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'assign' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400' : 'text-gray-500'}`}
           >
             <LayoutGrid className="w-5 h-5" />
             {language === 'zh' ? '布置作业' : 'Assign'}
           </button>
           <button 
            onClick={() => setActiveTab('status')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'status' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400' : 'text-gray-500'}`}
           >
             <FileCheck className="w-5 h-5" />
             {language === 'zh' ? '完成情况' : 'Status'}
           </button>
        </div>
      </div>
      
      {activeTab === 'assign' ? (
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700 space-y-8 shadow-sm h-fit">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-4 tracking-widest">
                <Book className="w-4 h-4 inline mr-1" /> {language === 'zh' ? '1. 选择试卷' : '1. Select Paper'}
              </label>
              <select 
                value={selectedPaperId}
                onChange={(e) => setSelectedPaperId(e.target.value)}
                className="w-full p-4 rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-4 focus:ring-primary-500/20 dark:text-white font-bold"
              >
                {papers.length === 0 && <option value="">{language === 'zh' ? '暂无试卷' : 'No Papers'}</option>}
                {papers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-4 tracking-widest">
                <Send className="w-4 h-4 inline mr-1" /> {language === 'zh' ? '2. 设置截止日期' : '2. Set Deadline'}
              </label>
              <input 
                type="date" 
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full p-4 rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-4 focus:ring-primary-500/20 dark:text-white font-bold" 
              />
            </div>

            <div className="pt-4">
              <button 
                onClick={handleAssign}
                className="w-full py-5 bg-primary-600 text-white rounded-[2rem] font-black shadow-xl shadow-primary-600/20 flex items-center justify-center gap-2 hover:bg-primary-700 transition-all disabled:opacity-50" 
                disabled={selectedStudents.length === 0}
              >
                <Send className="w-6 h-6" />
                {language === 'zh' ? `确认发布 (已选 ${selectedStudents.length} 人)` : `Confirm Assign (${selectedStudents.length})`}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700 shadow-sm flex flex-col h-[500px]">
            <div className="flex justify-between items-center mb-6">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <User className="w-4 h-4" /> {language === 'zh' ? '选择执行学生' : 'Target Students'}
              </label>
              <button 
                onClick={() => setSelectedStudents(selectedStudents.length === students.length ? [] : students.map(s => s.id))}
                className="text-xs text-primary-600 font-bold hover:underline"
              >
                {selectedStudents.length === students.length ? (language === 'zh' ? '全不选' : 'Deselect All') : (language === 'zh' ? '全选' : 'Select All')}
              </button>
            </div>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder={language === 'zh' ? '输入学生名字...' : 'Search student...'}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl text-xs outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
               {students.length === 0 && <div className="text-center text-gray-400 mt-10">No students found</div>}
               {students.map(s => (
                 <button 
                  key={s.id}
                  onClick={() => toggleStudent(s.id)}
                  className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between text-left
                    ${selectedStudents.includes(s.id) 
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                      : 'border-transparent bg-gray-50 dark:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-700'}
                  `}
                 >
                   <div className="flex items-center gap-3">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${selectedStudents.includes(s.id) ? 'bg-primary-600 text-white shadow-lg' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                        {s.name[0]}
                     </div>
                     <div>
                       <p className="font-bold dark:text-white text-sm">{s.name}</p>
                       <p className="text-[10px] text-gray-400">{s.grade}</p>
                     </div>
                   </div>
                   {selectedStudents.includes(s.id) && <CheckCircle2 className="w-5 h-5 text-primary-600" />}
                 </button>
               ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border dark:border-gray-700 shadow-sm overflow-hidden">
           <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                 <tr className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-8 py-6">{language === 'zh' ? '作业标题' : 'Title'}</th>
                    <th className="px-8 py-6">{language === 'zh' ? '发布时间' : 'Date'}</th>
                    <th className="px-8 py-6">{language === 'zh' ? '完成进度' : 'Progress'}</th>
                    <th className="px-8 py-6"></th>
                 </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                 {historicalHw.length === 0 && (
                   <tr><td colSpan={4} className="px-8 py-6 text-center text-gray-400">{language === 'zh' ? '暂无作业记录' : 'No homeworks'}</td></tr>
                 )}
                 {historicalHw.map(hw => (
                   <tr key={hw.id} className="group hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                      <td className="px-8 py-6">
                        <p className="font-bold dark:text-white">{hw.title}</p>
                      </td>
                      <td className="px-8 py-6 text-sm text-gray-500">{hw.date}</td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                               <div 
                                className="h-full bg-primary-600 rounded-full" 
                                style={{ width: `${hw.total > 0 ? (hw.submitted/hw.total)*100 : 0}%` }}
                               ></div>
                            </div>
                            <span className="text-xs font-bold text-gray-500">{hw.submitted}/{hw.total}</span>
                         </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <button 
                          onClick={() => setSelectedHw(hw)}
                          className="flex items-center gap-1 ml-auto text-primary-600 font-bold text-sm hover:underline"
                         >
                            {language === 'zh' ? '详细数据' : 'Details'}
                            <ChevronRight className="w-4 h-4" />
                         </button>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
};

export default Assign;
