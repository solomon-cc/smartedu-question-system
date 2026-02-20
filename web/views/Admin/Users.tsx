
import React, { useState, useEffect } from 'react';
import { UserPlus, MoreHorizontal, User as UserIcon, X, Search, Filter, Edit2, Trash2, CheckCircle, XCircle, Lock, Key } from 'lucide-react';
import { Role } from '../../types';
import { api } from '../../services/api.ts';

interface UserItem {
  id: string;
  name: string; // Map to username for now or add name field
  username?: string;
  role: Role;
  status: 'active' | 'inactive';
  lastLogin?: string; // Not in backend model yet
  password?: string;
  grade?: string;
}

const Users: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.admin.listUsers();
      // Map backend User to frontend UserItem
      const mapped = data.map((u: any) => ({
        id: u.id,
        name: u.username,
        username: u.username,
        role: u.role,
        status: u.status || 'active',
        lastLogin: '-', // Placeholder
        password: u.password // Backend shouldn't send password really but mock does
      }));
      setUsers(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<UserItem>>({
    name: '',
    role: Role.STUDENT,
    status: 'active',
    password: ''
  });

  const handleOpenModal = (user: UserItem | null = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({ ...user, name: user.name || user.username || '' });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        role: Role.STUDENT,
        status: 'active',
        password: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || (editingUser === null && !formData.password)) return;

    const payload = {
      username: formData.name,
      role: formData.role,
      status: formData.status,
      password: formData.password
    };

    try {
      if (editingUser) {
        await api.admin.updateUser(editingUser.id, payload);
      } else {
        await api.admin.createUser(payload);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Failed to save user", error);
      alert(language === 'zh' ? '保存失败' : 'Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(language === 'zh' ? '确定删除该用户吗？' : 'Are you sure you want to delete this user?')) {
      try {
        await api.admin.deleteUser(id);
        fetchUsers();
      } catch (error) {
        console.error("Failed to delete", error);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black dark:text-white uppercase tracking-tight">{language === 'zh' ? '用户账户管理' : 'User Accounts'}</h2>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-primary-500/30 hover:bg-primary-700 transition-all hover:scale-105 active:scale-95"
        >
          <UserPlus className="w-5 h-5" />
          {language === 'zh' ? '创建新用户' : 'Add User'}
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder={language === 'zh' ? '搜索姓名或UID...' : 'Search by name or UID...'}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 dark:text-white shadow-sm font-medium"
          />
        </div>
        <button className="px-6 py-2 border dark:border-gray-700 rounded-2xl flex items-center gap-2 bg-white dark:bg-gray-800 dark:text-white hover:bg-gray-50 transition-colors shadow-sm font-black text-xs uppercase tracking-widest">
          <Filter className="w-4 h-4 text-gray-500" />
          {language === 'zh' ? '筛选' : 'Filter'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[2rem] border dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
                <th className="px-8 py-5">{language === 'zh' ? '账户信息' : 'Account'}</th>
                <th className="px-8 py-5">{language === 'zh' ? '权限角色' : 'Role'}</th>
                <th className="px-8 py-5">{language === 'zh' ? '安全凭证' : 'Security'}</th>
                <th className="px-8 py-5">{language === 'zh' ? '当前状态' : 'Status'}</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {users.map(u => (
                <tr key={u.id} className="group hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-primary-600 font-black">
                        {u.name[0]}
                      </div>
                      <div>
                        <p className="font-black dark:text-white">{u.name}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">UID: {u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      u.role === Role.ADMIN ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' :
                      u.role === Role.TEACHER ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                      'bg-green-100 text-green-600 dark:bg-green-900/30'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Lock className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {u.password ? (language === 'zh' ? '已设置密码' : 'Password set') : (language === 'zh' ? '未设置' : 'No Pass')}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      {u.status === 'active' ? (
                        <span className="flex items-center gap-1.5 text-green-500 text-[10px] font-black uppercase tracking-widest">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {language === 'zh' ? '正常' : 'Active'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-red-500 text-[10px] font-black uppercase tracking-widest">
                          <XCircle className="w-3.5 h-3.5" />
                          {language === 'zh' ? '禁用' : 'Disabled'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenModal(u)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all"
                        title={language === 'zh' ? '编辑/重置密码' : 'Edit / Reset Password'}
                      >
                        <Key className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(u.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[3rem] shadow-2xl p-10 border dark:border-gray-700 animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-8 border-b dark:border-gray-700 pb-6">
                 <h3 className="text-2xl font-black dark:text-white uppercase tracking-tight">
                   {editingUser ? (language === 'zh' ? '管理凭据' : 'Credential Hub') : (language === 'zh' ? '创建新账户' : 'New Identity')}
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <X className="w-6 h-6 dark:text-gray-400" />
                 </button>
              </div>

              <div className="space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">{language === 'zh' ? '显示名称 / 登录名' : 'Display Name / Login'}</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl border dark:border-gray-700 outline-none focus:ring-4 focus:ring-primary-500/20 font-bold"
                      placeholder={language === 'zh' ? '请输入姓名' : 'Enter name'}
                    />
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                      {editingUser ? (language === 'zh' ? '重置密码 (留空则不修改)' : 'Reset Password (Leave blank to keep current)') : (language === 'zh' ? '初始密码' : 'Initial Password')}
                    </label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                      <input 
                        type="password" 
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl border dark:border-gray-700 outline-none focus:ring-4 focus:ring-primary-500/20 font-bold"
                        placeholder={language === 'zh' ? '输入密码' : 'Enter password'}
                      />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">{language === 'zh' ? '系统角色' : 'Role'}</label>
                        <select 
                           value={formData.role}
                           onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                           className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl border dark:border-gray-700 outline-none focus:ring-4 focus:ring-primary-500/20 font-bold"
                        >
                           <option value={Role.STUDENT}>{language === 'zh' ? '学生' : 'Student'}</option>
                           <option value={Role.TEACHER}>{language === 'zh' ? '教师' : 'Teacher'}</option>
                           <option value={Role.ADMIN}>{language === 'zh' ? '管理员' : 'Admin'}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">{language === 'zh' ? '账号状态' : 'Status'}</label>
                        <select 
                           value={formData.status}
                           onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                           className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-2xl border dark:border-gray-700 outline-none focus:ring-4 focus:ring-primary-500/20 font-bold"
                        >
                           <option value="active">{language === 'zh' ? '启用' : 'Active'}</option>
                           <option value="inactive">{language === 'zh' ? '锁定' : 'Disabled'}</option>
                        </select>
                    </div>
                 </div>

                 <div className="flex gap-4 pt-6 border-t dark:border-gray-700">
                    <button 
                      onClick={() => setIsModalOpen(false)} 
                      className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                    >
                      {language === 'zh' ? '取消' : 'Cancel'}
                    </button>
                    <button 
                      onClick={handleSave}
                      className="flex-1 py-4 bg-primary-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-primary-500/30 hover:bg-primary-700 transition-all active:scale-95"
                    >
                      {language === 'zh' ? (editingUser ? '确认更新' : '立即创建') : (editingUser ? 'Confirm Update' : 'Initialize')}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Users;
