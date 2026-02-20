
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import Loading from '../../components/Loading';
import { ShieldCheck, Search, Filter, Calendar, User, X } from 'lucide-react';

const AuditLogs: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [filterAction, setFilterAction] = useState('ALL');
  const [searchUser, setSearchUser] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.admin.logs();
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionColor = (action: string) => {
    if (action.includes('LOGIN')) return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
    if (action.includes('CREATE')) return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    if (action.includes('DELETE')) return 'text-red-600 bg-red-50 dark:bg-red-900/20';
    if (action.includes('ASSIGN') || action.includes('FINISH')) return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
    return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
  };

  const actionTypes = [
    { value: 'ALL', label: language === 'zh' ? '全部类型' : 'All Types' },
    { value: 'LOGIN', label: language === 'zh' ? '登录授权' : 'Login' },
    { value: 'CREATE', label: language === 'zh' ? '创建操作' : 'Create' },
    { value: 'UPDATE', label: language === 'zh' ? '更新操作' : 'Update' },
    { value: 'DELETE', label: language === 'zh' ? '删除操作' : 'Delete' },
    { value: 'ASSIGN', label: language === 'zh' ? '下发作业' : 'Assign' },
    { value: 'PRACTICE', label: language === 'zh' ? '练习动态' : 'Practice' },
  ];

  const filteredLogs = logs.filter(log => {
    const matchAction = filterAction === 'ALL' || log.action.includes(filterAction);
    const matchUser = log.username.toLowerCase().includes(searchUser.toLowerCase());
    
    // Simple date string comparison (assuming timestamp format "YYYY-MM-DD HH:MM:SS")
    const logDate = log.timestamp.split(' ')[0];
    const matchStart = !startDate || logDate >= startDate;
    const matchEnd = !endDate || logDate <= endDate;

    return matchAction && matchUser && matchStart && matchEnd;
  });

  const clearFilters = () => {
    setFilterAction('ALL');
    setSearchUser('');
    setStartDate('');
    setEndDate('');
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black dark:text-white flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-primary-600" />
          {language === 'zh' ? '系统审计日志' : 'System Audit Logs'}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={clearFilters}
            className="px-4 py-2 text-gray-400 hover:text-red-500 font-bold text-xs transition-colors flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            {language === 'zh' ? '清空筛选' : 'Clear'}
          </button>
          <button 
            onClick={fetchLogs}
            className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold text-xs hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/30"
          >
            {language === 'zh' ? '刷新数据' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border dark:border-gray-700 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">{language === 'zh' ? '操作类型' : 'Action Type'}</label>
          <select 
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full p-3 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-xl border dark:border-gray-700 outline-none focus:ring-2 focus:ring-primary-500 font-bold text-sm"
          >
            {actionTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">{language === 'zh' ? '搜索用户' : 'Search User'}</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              placeholder={language === 'zh' ? '用户名...' : 'Username...'}
              className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-xl border dark:border-gray-700 outline-none focus:ring-2 focus:ring-primary-500 font-bold text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">{language === 'zh' ? '开始日期' : 'Start Date'}</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-xl border dark:border-gray-700 outline-none focus:ring-2 focus:ring-primary-500 font-bold text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">{language === 'zh' ? '结束日期' : 'End Date'}</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-xl border dark:border-gray-700 outline-none focus:ring-2 focus:ring-primary-500 font-bold text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 border dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="space-y-4">
           {filteredLogs.length > 0 ? [...filteredLogs].reverse().map((log, i) => (
             <div key={i} className="flex items-start gap-4 p-5 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border dark:border-gray-700 hover:border-primary-300 transition-colors animate-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 30}ms` }}>
                <div className={`px-4 py-1.5 rounded-lg text-[10px] font-black shrink-0 ${getActionColor(log.action)}`}>
                  {log.action}
                </div>
                <div className="flex-1 min-w-0">
                   <div className="flex justify-between items-center mb-1">
                      <span className="text-base font-bold dark:text-white">{log.username}</span>
                      <span className="text-xs text-gray-400 font-mono bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm">{log.timestamp}</span>
                   </div>
                   <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{log.details}</p>
                </div>
             </div>
           )) : (
             <div className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest">
                {language === 'zh' ? '未找到符合条件的日志' : 'No matching logs found'}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
