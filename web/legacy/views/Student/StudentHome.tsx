import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Gamepad2, 
  LineChart, 
  Heart, 
  ChevronRight,
  Sparkles,
  Target,
  BrainCircuit,
  Smile
} from 'lucide-react';

interface StudentHomeProps {
  language: 'zh' | 'en';
}

const StudentHome: React.FC<StudentHomeProps> = ({ language }) => {
  const navigate = useNavigate();

  const modules = [
    {
      id: 'skills',
      title: language === 'zh' ? '学业技能' : 'Academic Skills',
      description: language === 'zh' ? '练习课程知识，提升学习能力' : 'Practice skills and improve learning',
      icon: <BookOpen className="w-8 h-8" />,
      color: 'bg-blue-500',
      shadow: 'shadow-blue-200',
      path: '/skills',
      bgGradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'application',
      title: language === 'zh' ? '应用板块' : 'Application',
      description: language === 'zh' ? '场景模拟游戏，锻炼生活应用' : 'Scenario games for real-life application',
      icon: <Gamepad2 className="w-8 h-8" />,
      color: 'bg-purple-500',
      shadow: 'shadow-purple-200',
      path: '/application',
      bgGradient: 'from-purple-500 to-purple-600'
    },
    {
      id: 'assessment',
      title: language === 'zh' ? '认知发展' : 'Cognitive Dev',
      description: language === 'zh' ? '综合评估记录，见证点滴进步' : 'Comprehensive assessment and progress tracking',
      icon: <LineChart className="w-8 h-8" />,
      color: 'bg-green-500',
      shadow: 'shadow-green-200',
      path: '/assessment',
      bgGradient: 'from-green-500 to-green-600'
    },
    {
      id: 'mood',
      title: language === 'zh' ? '情绪日记' : 'Mood Diary',
      description: language === 'zh' ? '记录心情点滴，表达内心感受' : 'Record moods and express feelings',
      icon: <Heart className="w-8 h-8" />,
      color: 'bg-pink-500',
      shadow: 'shadow-pink-200',
      path: '/mood-diary',
      bgGradient: 'from-pink-500 to-pink-600'
    }
  ];

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-start pt-12 p-4 md:p-8 animate-in fade-in duration-700">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-black mb-2 dark:text-white">
            {language === 'zh' ? '你好，同学！' : 'Hello there!'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs">
            {language === 'zh' ? '开启今天的学习之旅' : 'Start your learning journey today'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:gap-8">
          {modules.map((m) => (
            <button
              key={m.id}
              onClick={() => navigate(m.path)}
              className={`
                group relative overflow-hidden p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] text-left transition-all duration-300
                hover:scale-[1.02] active:scale-[0.98]
                bg-gradient-to-br ${m.bgGradient} text-white
                shadow-xl ${m.shadow} hover:shadow-2xl
                aspect-square md:aspect-auto md:min-h-[200px]
              `}
            >
              <div className="relative z-10 flex flex-col h-full items-start justify-center">
                <div className="mb-4 p-3 md:p-4 bg-white/20 backdrop-blur-md rounded-xl md:rounded-2xl w-fit">
                  {React.cloneElement(m.icon as React.ReactElement, { className: "w-6 h-6 md:w-8 md:h-8" })}
                </div>
                
                <h3 className="text-xl md:text-3xl font-black flex items-center gap-2">
                  {m.title}
                  <ChevronRight className="w-4 h-4 md:w-6 md:h-6 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all hidden md:flex" />
                </h3>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentHome;
