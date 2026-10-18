
import React, { useContext } from 'react';
import { AuthContext } from '../App';
import { Role } from '../types';
import { 
  HelpCircle, 
  Home, 
  ClipboardList, 
  Clock, 
  AlertTriangle, 
  BarChart2, 
  Users, 
  BookOpen, 
  PlusCircle, 
  Settings, 
  ShieldCheck, 
  FileText 
} from 'lucide-react';

interface HelpProps {
  language: 'zh' | 'en';
}

const Help: React.FC<HelpProps> = ({ language }) => {
  const auth = useContext(AuthContext);
  const role = auth?.user?.role;

  const renderStudentHelp = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <Home className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold dark:text-white">
            {language === 'zh' ? '首页 (Dashboard)' : 'Home'}
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'zh' 
            ? '您的学习中心。在这里，您可以快速查看最近的作业、最近的练习历史以及近期的正确率统计。' 
            : 'Your learning hub. View recent homework, practice history, and performance trends at a glance.'}
        </p>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <ClipboardList className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold dark:text-white">
            {language === 'zh' ? '家庭作业 (Homework)' : 'Homework'}
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'zh' 
            ? '列出老师为您布置的所有作业。点击“去练习”开始答题。完成后，老师会看到您的成绩。' 
            : 'List of all assignments from your teacher. Click "Practice" to start. Results are shared with your teacher.'}
        </p>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <Clock className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold dark:text-white">
            {language === 'zh' ? '答题历史 (History)' : 'History'}
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'zh' 
            ? '回顾您完成的每一份作业。您可以查看得分、答题时长，并点击“详情”来回顾每一道题的对错。' 
            : 'Review completed homework. Check scores, duration, and click "Details" to see each question.'}
        </p>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold dark:text-white">
            {language === 'zh' ? '错题本 (Mistakes)' : 'Wrong Book'}
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'zh' 
            ? '系统会自动收集您答错的题目。您可以在这里针对性地进行再次练习，直到掌握这些知识点。' 
            : 'Wrong answers are automatically collected here. Practice specifically on these items to master the content.'}
        </p>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <BarChart2 className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold dark:text-white">
            {language === 'zh' ? '统计分析 (Stats)' : 'Stats'}
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'zh' 
            ? '通过图表展示您的学习趋势、正确率变化和知识点掌握情况。帮助您更好地了解自己的学习状态。' 
            : 'Visual reports of your learning trends and accuracy. Understand your learning progress through data.'}
        </p>
      </section>
    </div>
  );

  const renderTeacherHelp = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <Users className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold dark:text-white">
            {language === 'zh' ? '学生管理 (Students)' : 'Students'}
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'zh' 
            ? '查看您班级下的学生列表。您可以查看每位学生的学习进度、作业完成情况和错题分布。' 
            : 'Manage your students. View individual progress, homework completion status, and common mistakes.'}
        </p>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <BookOpen className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold dark:text-white">
            {language === 'zh' ? '题目管理 (Questions)' : 'Questions'}
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'zh' 
            ? '在这里录入新题目、维护现有题库。支持文字、图片和音频形式的题目。' 
            : 'Create and maintain the question bank. Supports text, image, and audio content.'}
        </p>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <ClipboardList className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold dark:text-white">
            {language === 'zh' ? '试卷管理 (Papers)' : 'Papers'}
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'zh' 
            ? '将题库中的题目组合成试卷。您可以预设试卷的结构，方便后续快速布置作业。' 
            : 'Assemble questions into papers. Create predefined structures for quick assignment later.'}
        </p>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <PlusCircle className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold dark:text-white">
            {language === 'zh' ? '布置作业 (Assign)' : 'Assign'}
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'zh' 
            ? '将试卷布置给指定的学生。您可以设定开始时间和截止时间，系统会自动分发。' 
            : 'Assign papers to specific students. Set start and end dates for automatic distribution.'}
        </p>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <Settings className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold dark:text-white">
            {language === 'zh' ? '强化物管理 (Reinforcements)' : 'Reinforcements'}
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'zh' 
            ? '设置学生答对题目时的奖励动画或反馈。有趣的强化物能显著提高学生的学习动力。' 
            : 'Configure reward animations or feedback for correct answers to boost student motivation.'}
        </p>
      </section>
    </div>
  );

  const renderAdminHelp = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <Users className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold dark:text-white">
            {language === 'zh' ? '用户管理 (Users)' : 'Users'}
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'zh' 
            ? '管理系统中所有的账号，包括学生、老师和管理员。您可以创建、禁用账号或重置密码。' 
            : 'Manage all accounts. Create, disable, or reset passwords for students, teachers, and admins.'}
        </p>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold dark:text-white">
            {language === 'zh' ? '作业审计 (Homework Audit)' : 'Homework Audit'}
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'zh' 
            ? '审查所有布置的作业和完成情况。确保教学过程的质量和合规性。' 
            : 'Review all assigned homework and completions to ensure quality and compliance.'}
        </p>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <FileText className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold dark:text-white">
            {language === 'zh' ? '审计日志 (Audit Logs)' : 'Audit Logs'}
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'zh' 
            ? '记录系统中发生的关键操作，如登录、删除、权限变更等。用于追溯问题和安全审计。' 
            : 'Track critical operations like login, deletion, and permission changes for security auditing.'}
        </p>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <Settings className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold dark:text-white">
            {language === 'zh' ? '系统配置 (System Config)' : 'System Config'}
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'zh' 
            ? '设置系统的基础运行参数，如是否允许开放注册、站点名称、备案信息等。' 
            : 'Configure base parameters like public registration, site name, and footer info.'}
        </p>
      </section>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-primary-600 rounded-2xl shadow-lg shadow-primary-500/30">
          <HelpCircle className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            {language === 'zh' ? '帮助文档' : 'Help Documentation'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {language === 'zh' ? '了解系统的功能以及如何使用它们' : 'Learn about system features and how to use them'}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border dark:border-gray-700">
        {role === Role.STUDENT && renderStudentHelp()}
        {role === Role.TEACHER && renderTeacherHelp()}
        {role === Role.ADMIN && renderAdminHelp()}
      </div>

      <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
        <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2">
          {language === 'zh' ? '需要更多帮助？' : 'Need more help?'}
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          {language === 'zh' 
            ? '如果您在使用过程中遇到任何问题，请联系您的老师或系统管理员进行咨询。' 
            : 'If you encounter any issues, please contact your teacher or system administrator.'}
        </p>
      </div>
    </div>
  );
};

export default Help;
