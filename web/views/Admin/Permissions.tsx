
import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Shield, X, Check, Layout, BookOpen, ClipboardList, Settings, Database, FileText, BarChart, Eye, Cpu, AlertCircle, ShieldCheck, Users, HelpCircle } from 'lucide-react';
import { api } from '../../services/api';
import { Role } from '../../types';

interface ModulePermission {
  id: string;
  ui: boolean;   // View Access
  api: boolean;  // Interaction/Mutation Access
}

interface PermissionRole {
  role: string;
  roleEn: string;
  permissions: ModulePermission[];
  level: 'FULL' | 'PARTIAL' | 'RESTRICTED';
}

const ALL_MODULES = [
  { id: 'dashboard', label: '控制台', icon: Layout },
  { id: 'students', label: '学生管理', icon: Users },
  { id: 'questions', label: '题目管理', icon: BookOpen },
  { id: 'papers', label: '试卷管理', icon: ClipboardList },
  { id: 'assignments', label: '作业管理', icon: FileText },
  { id: 'reinforcements', label: '强化物管理', icon: Settings },
  { id: 'resources', label: '素材管理', icon: ClipboardList },
  { id: 'users', label: '用户管理', icon: Database },
  { id: 'homework_audit', label: '作业审计', icon: ShieldCheck },
  { id: 'audit_logs', label: '审计日志', icon: ShieldCheck },
  { id: 'stats', label: '统计报表', icon: BarChart },
  { id: 'help_docs', label: '帮助文档', icon: HelpCircle },
  { id: 'permissions', label: '权限设置', icon: Lock },
  { id: 'system_config', label: '系统配置', icon: Settings },
];

const Permissions: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const [roles, setRoles] = useState<PermissionRole[]>([
    { role: '管理员', roleEn: Role.ADMIN, permissions: [], level: 'RESTRICTED' },
    { role: '教师', roleEn: Role.TEACHER, permissions: [], level: 'RESTRICTED' },
    { role: '学生', roleEn: Role.STUDENT, permissions: [], level: 'RESTRICTED' },
  ]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const perms = await api.admin.listPermissions();
      const updatedRoles = roles.map(r => {
        const rolePerms = perms.filter(p => p.role === r.roleEn).map(p => ({
          id: p.moduleId,
          ui: p.uiAccess,
          api: p.apiAccess
        }));
        
        // Ensure all modules are present even if not in DB
        const fullPerms = ALL_MODULES.map(m => {
          const found = rolePerms.find(rp => rp.id === m.id);
          return found || { id: m.id, ui: false, api: false };
        });

        const uiCount = fullPerms.filter(p => p.ui).length;
        const level: 'FULL' | 'PARTIAL' | 'RESTRICTED' = uiCount >= 10 ? 'FULL' : (uiCount >= 5 ? 'PARTIAL' : 'RESTRICTED');

        return { ...r, permissions: fullPerms, level };
      });
      setRoles(updatedRoles);
    } catch (err) {
      console.error("Failed to fetch permissions", err);
    } finally {
      setLoading(false);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<PermissionRole | null>(null);

  const handleEdit = (p: PermissionRole) => {
    setEditingRole(JSON.parse(JSON.stringify(p))); // Deep copy
    setIsModalOpen(true);
  };

  const handleToggle = (moduleId: string, type: 'ui' | 'api') => {
    if (!editingRole) return;
    const newPerms = editingRole.permissions.map(p => {
      if (p.id === moduleId) {
        const newVal = !p[type];
        // Rules: API access usually implies UI visibility
        if (type === 'api' && newVal) {
          return { ...p, api: true, ui: true };
        }
        // Rules: Removing UI visibility usually removes API access
        if (type === 'ui' && !newVal) {
          return { ...p, ui: false, api: false };
        }
        return { ...p, [type]: newVal };
      }
      return p;
    });
    setEditingRole({ ...editingRole, permissions: newPerms });
  };

  const handleSave = async () => {
    if (!editingRole) return;
    
    // Optimistic update
    const uiCount = editingRole.permissions.filter(p => p.ui).length;
    const level: 'FULL' | 'PARTIAL' | 'RESTRICTED' = uiCount >= 10 ? 'FULL' : (uiCount >= 5 ? 'PARTIAL' : 'RESTRICTED');
    const newRoles = roles.map(r => r.role === editingRole.role ? { ...editingRole, level } : r);
    setRoles(newRoles);

    // Prepare for backend
    const allPerms: any[] = [];
    newRoles.forEach(r => {
      r.permissions.forEach(p => {
        allPerms.push({
          role: r.roleEn,
          moduleId: p.id,
          uiAccess: p.ui,
          apiAccess: p.api
        });
      });
    });

    try {
      await api.admin.updatePermissions(allPerms);
      setIsModalOpen(false);
    } catch (err) {
      alert("保存失败: " + err);
      // Refresh to revert
      fetchPermissions();
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-2xl">
          <Shield className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-black dark:text-white">{language === 'zh' ? '权限设置' : 'Permission Settings'}</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{language === 'zh' ? '精细化管理系统 UI 访问与 API 接口调用权限' : 'Granular control over UI access and API capabilities'}</p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-[2rem] border border-amber-100 dark:border-amber-800 flex items-start gap-4 mb-8">
        <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
        <div>
          <p className="font-bold text-amber-800 dark:text-amber-400 mb-1">{language === 'zh' ? '安全提示' : 'Security Tip'}</p>
          <p className="text-xs text-amber-700 dark:text-amber-500/80 leading-relaxed">
            {language === 'zh' ? '接口权限控制数据的增删改能力。开启接口权限前，请确保该角色具有相应的业务审计责任。' : 'API permissions control data mutations. Ensure the role has appropriate auditing responsibilities before enabling.'}
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {roles.map(p => (
          <div key={p.role} className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] border dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between shadow-sm hover:shadow-xl transition-all group">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-6">
                <h4 className="text-2xl font-black dark:text-white">{language === 'zh' ? p.role : p.roleEn}</h4>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  p.level === 'FULL' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
                  p.level === 'PARTIAL' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                  'bg-amber-100 text-amber-600 dark:bg-amber-900/30'
                }`}>
                  {p.level === 'FULL' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {p.level}
                </div>
              </div>
              <div className="flex gap-3 flex-wrap max-w-2xl">
                {p.permissions.filter(perm => perm.ui).map(perm => {
                  const mod = ALL_MODULES.find(am => am.id === perm.id);
                  return (
                    <div key={perm.id} className="group/tag flex items-center bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
                      <div className="px-3 py-2 flex items-center gap-2 border-r dark:border-gray-700">
                        {mod && <mod.icon className="w-3.5 h-3.5 text-primary-500" />}
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">{mod?.label}</span>
                      </div>
                      <div className="px-2 py-2 flex gap-1 bg-white/50 dark:bg-black/20">
                         <Eye className={`w-3 h-3 ${perm.ui ? 'text-blue-500' : 'text-gray-300'}`} />
                         <Cpu className={`w-3 h-3 ${perm.api ? 'text-red-500' : 'text-gray-300'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-8 md:mt-0 md:ml-8 shrink-0">
              <button 
                onClick={() => handleEdit(p)}
                className="w-full md:w-auto px-10 py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-500/20 hover:bg-primary-700 transition-all active:scale-95"
              >
                {language === 'zh' ? '管理权限' : 'MANAGE'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && editingRole && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-[3rem] shadow-2xl p-10 border dark:border-gray-700 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-8 border-b dark:border-gray-700 pb-6">
                 <div>
                   <h3 className="text-2xl font-black dark:text-white uppercase tracking-tight">
                     {language === 'zh' ? '角色授权配置' : 'Dual-Layer Authorization'}
                   </h3>
                   <p className="text-xs text-primary-600 font-bold tracking-widest uppercase mt-1">Role: {editingRole.roleEn}</p>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <X className="w-6 h-6 dark:text-gray-400" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
                 <div className="grid grid-cols-1 gap-4">
                   {ALL_MODULES.map(mod => {
                     const perm = editingRole.permissions.find(p => p.id === mod.id) || { ui: false, api: false };
                     return (
                       <div 
                         key={mod.id}
                         className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col sm:flex-row items-center justify-between gap-6 ${
                           perm.ui || perm.api 
                           ? 'border-primary-500/20 bg-primary-50/10 dark:bg-primary-900/5' 
                           : 'border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 opacity-60'
                         }`}
                       >
                         <div className="flex items-center gap-5 flex-1 w-full">
                           <div className={`p-4 rounded-2xl ${perm.ui ? 'bg-primary-600 text-white shadow-lg' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'}`}>
                             <mod.icon className="w-6 h-6" />
                           </div>
                           <div>
                             <p className="font-black text-sm uppercase tracking-widest dark:text-white">{mod.label}</p>
                             <p className="text-[8px] font-bold text-gray-400 uppercase">IDENTIFIER: {mod.id}</p>
                           </div>
                         </div>
                         
                         <div className="flex gap-4 w-full sm:w-auto">
                            {/* UI Permission Toggle */}
                            <button 
                              onClick={() => handleToggle(mod.id, 'ui')}
                              className={`flex-1 sm:w-32 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border-2 transition-all ${
                                perm.ui 
                                ? 'bg-blue-100 border-blue-500 text-blue-600 dark:bg-blue-900/30' 
                                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400'
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {language === 'zh' ? '界面可见' : 'UI ACCESS'}
                            </button>
                            
                            {/* API Permission Toggle */}
                            <button 
                              onClick={() => handleToggle(mod.id, 'api')}
                              className={`flex-1 sm:w-32 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border-2 transition-all ${
                                perm.api 
                                ? 'bg-red-100 border-red-500 text-red-600 dark:bg-red-900/30' 
                                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400'
                              }`}
                            >
                              <Cpu className="w-3.5 h-3.5" />
                              {language === 'zh' ? '接口读写' : 'API ACCESS'}
                            </button>
                         </div>
                       </div>
                     );
                   })}
                 </div>
              </div>

              <div className="pt-8 flex gap-4 border-t dark:border-gray-700 mt-6">
                 <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                 >
                   {language === 'zh' ? '放弃' : 'Discard'}
                 </button>
                 <button 
                  onClick={handleSave}
                  className="flex-1 py-4 bg-primary-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-primary-500/30 hover:bg-primary-700 transition-all active:scale-95"
                 >
                   {language === 'zh' ? '应用授权规则' : 'APPLY RULES'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Permissions;
