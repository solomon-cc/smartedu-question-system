
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Question, QuestionType, Subject, AttemptState } from '../../types';
import { api } from '../../services/api.ts';
import { REVERSE_TYPE_MAP } from '../../utils.ts';
import { X, ChevronRight, CheckCircle2, HelpCircle, Trophy, PlayCircle } from 'lucide-react';

interface PracticeSessionProps {
  language: 'zh' | 'en';
}

const PracticeSession: React.FC<PracticeSessionProps> = ({ language }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [queue, setQueue] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [attemptMap, setAttemptMap] = useState<Record<string, number>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isShowingFeedback, setIsShowingFeedback] = useState(false);
  const [isShowingCorrectAnswer, setIsShowingCorrectAnswer] = useState(false);
  const [showReinforcement, setShowReinforcement] = useState(false);
  const [finishedCount, setFinishedCount] = useState(0);
  const [totalInitial, setTotalInitial] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sessionDetails, setSessionDetails] = useState<any[]>([]);

  useEffect(() => {
    const homeworkId = searchParams.get('homeworkId');
    const subject = searchParams.get('subject') || undefined;
    const grade = searchParams.get('grade') ? parseInt(searchParams.get('grade')!) : undefined;

    const fetchQuestions = async () => {
      setLoading(true);
      try {
        let data: Question[] = [];
        if (homeworkId) {
          const hwList = await api.homework.list();
          const hw = hwList.find((h: any) => h.id === homeworkId);
          if (hw) {
            // Find the paper to get its questions
            const papers = await api.papers.list();
            const paper = papers.find((p: any) => p.id === hw.paperId);
            if (paper && paper.questions) {
              data = paper.questions;
            }
          }
        } else {
          data = await api.questions.list(subject, grade);
        }
        setQueue(data);
        setTotalInitial(data.length);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [searchParams]);

  const handleCompleteHomework = async () => {
    const homeworkId = searchParams.get('homeworkId');
    const subject = searchParams.get('subject') || (homeworkId ? '作业' : '自主练习');
    
    // Calculate stats
    let wrongCount = 0;
    Object.values(attemptMap).forEach(count => {
      if (count > 0) wrongCount += 1; // Count each question that had at least one mistake
    });

    try {
      // 1. Save History
      await api.history.create({
        type: homeworkId ? 'homework' : 'practice',
        name: homeworkId ? '家庭作业完成' : `${subject}练习`,
        nameEn: homeworkId ? 'Homework Finished' : `${subject} Practice`,
        correctCount: finishedCount,
        wrongCount: wrongCount,
        total: totalInitial.toString(),
        homeworkId: homeworkId || "",
        questions: sessionDetails // These are the detail records
      });

      // 2. Mark homework as complete if applicable
      if (homeworkId) {
        await api.homework.complete(homeworkId);
      }
    } catch (e) {
      console.error("Failed to save session results", e);
    }
    navigate('/');
  };

  const currentQuestion = queue[currentIdx];

  const handleAnswer = (val: string) => {
    if (isShowingFeedback || isShowingCorrectAnswer || selectedAnswer) return;
    setSelectedAnswer(val);
    
    const isCorrect = val === currentQuestion.answer;
    const currentAttempts = attemptMap[currentQuestion.id] || 0;

    if (isCorrect) {
      setFinishedCount(prev => prev + 1);
      
      // Record full detail for History review
      setSessionDetails(prev => [...prev, {
        id: currentQuestion.id,
        stem: currentQuestion.stemText,
        stemImage: currentQuestion.stemImage,
        options: currentQuestion.options,
        status: 'correct',
        answer: currentQuestion.answer,
        userAnswer: val,
        attempts: currentAttempts + 1
      }]);

      if ((finishedCount + 1) % 2 === 0) {
        setShowReinforcement(true);
        setTimeout(() => setShowReinforcement(false), 3000);
      }

      setTimeout(() => proceedToNext(true, false), 1200);
    } else {
      const nextAttemptCount = currentAttempts + 1;
      setAttemptMap(prev => ({ ...prev, [currentQuestion.id]: nextAttemptCount }));

      if (nextAttemptCount === 1) {
        // First wrong: requeue after 1.2s
        setTimeout(() => proceedToNext(false, true), 1200);
      } else if (nextAttemptCount === 2) {
        // Second wrong: show hint for 3s
        setIsShowingFeedback(true);
        setTimeout(() => {
          setIsShowingFeedback(false);
          proceedToNext(false, true);
        }, 3000);
      } else {
        // Third+ wrong: show correct answer for 3s
        setIsShowingCorrectAnswer(true);
        setTimeout(() => {
          setIsShowingCorrectAnswer(false);
          proceedToNext(false, true);
        }, 3000);
      }
    }
  };

  const proceedToNext = (wasCorrect: boolean, shouldRequeue: boolean = false) => {
    setSelectedAnswer(null);
    setIsShowingFeedback(false);
    setIsShowingCorrectAnswer(false);

    let nextQueue = [...queue];
    if (shouldRequeue) {
      // Requeue: remove current and push to end
      const q = nextQueue.splice(currentIdx, 1)[0];
      nextQueue.push(q);
      setQueue(nextQueue);
    } else {
      // Correct: remove from queue
      nextQueue.splice(currentIdx, 1);
      setQueue(nextQueue);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-xl font-bold dark:text-white">Loading...</div>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95">
        <div className="w-32 h-32 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-8 animate-bounce">
          <Trophy className="w-16 h-16 text-yellow-600" />
        </div>
        <h1 className="text-3xl font-bold dark:text-white mb-8">
          {language === 'zh' ? '太棒了！全部完成！' : 'Awesome! All Done!'}
        </h1>
        <button 
          onClick={handleCompleteHomework}
          className="px-10 py-4 bg-primary-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-600/20 active:scale-95 transition-transform"
        >
          {language === 'zh' ? '返回首页' : 'Go Home'}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col overflow-x-hidden">
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b dark:border-gray-800 px-4 py-4 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-6 h-6 dark:text-gray-300" />
          </button>
          <div className="flex-1 px-8">
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 shadow-[0_0_8px_rgba(14,165,233,0.5)] transition-all duration-700 ease-out"
                style={{ width: `${(finishedCount / totalInitial) * 100}%` }}
              />
            </div>
          </div>
          <span className="font-mono font-black text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-3 py-1 rounded-lg">
            {finishedCount}/{totalInitial}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
        <div className="w-full max-w-2xl">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl shadow-gray-200/50 dark:shadow-none overflow-hidden border dark:border-gray-800 animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-8 md:p-12 border-b dark:border-gray-800">
              <span className="inline-block px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-black tracking-wider uppercase mb-6">
                {currentQuestion.subject} · {REVERSE_TYPE_MAP[currentQuestion.type as string] || currentQuestion.type}
              </span>
              <h2 className="text-2xl md:text-3xl font-bold mb-8 dark:text-white leading-tight">
                {currentQuestion.stemText}
              </h2>
              {currentQuestion.stemImage && (
                <div className="rounded-[2rem] overflow-hidden border-4 border-gray-50 dark:border-gray-800 shadow-inner">
                  <img src={currentQuestion.stemImage} alt="Question Stem" className="w-full object-cover max-h-72" />
                </div>
              )}
            </div>

            {isShowingFeedback && (
              <div className="bg-amber-50 dark:bg-amber-900/10 p-6 flex items-start gap-4 animate-in slide-in-from-top duration-500 border-b dark:border-gray-700">
                <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-xl">
                  <HelpCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-amber-800 dark:text-amber-400 mb-1 tracking-wide">{language === 'zh' ? '老师的小纸条' : 'Teacher Hint'}</p>
                  <p className="text-amber-700 dark:text-amber-500/80 leading-relaxed">{currentQuestion.hint || (language === 'zh' ? '再仔细想想哦！' : 'Think again!')}</p>
                </div>
              </div>
            )}

            {isShowingCorrectAnswer && (
              <div className="bg-green-50 dark:bg-green-900/10 p-6 flex items-start gap-4 animate-in slide-in-from-top duration-500 border-b dark:border-gray-700">
                <div className="bg-green-100 dark:bg-green-900/40 p-2 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-green-800 dark:text-green-400 mb-1 tracking-wide">{language === 'zh' ? '正确答案是' : 'The correct answer is'}</p>
                  <p className="text-green-700 dark:text-green-500/80 text-xl font-black">{currentQuestion.answer}</p>
                </div>
              </div>
            )}

            <div className="p-8 md:p-12 bg-gray-50/30 dark:bg-gray-900/30">
               {currentQuestion.type === QuestionType.MULTIPLE_CHOICE && (
                 <div className={`grid gap-4 ${currentQuestion.options?.[0]?.image ? 'grid-cols-2' : 'grid-cols-1'}`}>
                   {currentQuestion.options?.filter((opt: any) => {
                     const optText = typeof opt === 'string' ? opt : opt.text;
                     const optImage = typeof opt === 'string' ? null : opt.image;
                     return (optText && optText.trim() !== '') || (optImage && optImage.trim() !== '');
                   }).map((opt, i) => {
                     const optText = typeof opt === 'string' ? opt : opt.text;
                     const optImage = typeof opt === 'string' ? null : opt.image;
                     const optValue = typeof opt === 'string' ? opt : opt.value;
                     
                     const isSelected = selectedAnswer === optValue;
                     const isCorrect = optValue === currentQuestion.answer;
                     return (
                       <button
                         key={i}
                         onClick={() => handleAnswer(optValue)}
                         disabled={!!selectedAnswer}
                         className={`
                           relative p-4 md:p-6 rounded-[1.5rem] transition-all duration-300 transform
                           ${isSelected 
                             ? (isCorrect ? 'bg-green-500 text-white scale-105 shadow-xl shadow-green-500/30' : 'bg-red-500 text-white scale-95 shadow-xl shadow-red-500/30')
                             : 'bg-white dark:bg-gray-800 hover:border-primary-500 border-2 border-transparent dark:text-white shadow-sm hover:scale-[1.02]'
                           }
                           ${optImage ? 'flex flex-col items-center gap-3' : 'flex justify-between items-center text-left'}
                         `}
                       >
                         {optImage ? (
                           <>
                             <img src={optImage} alt={`Option ${i}`} className="w-full h-32 object-cover rounded-xl mb-2" />
                             {optText && <span className="font-bold">{optText}</span>}
                           </>
                         ) : (
                           <span className="font-bold text-lg">{optText}</span>
                         )}
                         
                         {isSelected && (
                           <div className="absolute top-4 right-4 animate-in zoom-in duration-300">
                             {isCorrect ? <CheckCircle2 className="w-8 h-8" /> : <X className="w-8 h-8" />}
                           </div>
                         )}
                       </button>
                     );
                   })}
                 </div>
               )}

               {currentQuestion.type === QuestionType.CALCULATION && (
                 <div className="space-y-6">
                    <div className="relative">
                      <input 
                        type="text"
                        autoFocus
                        disabled={!!selectedAnswer}
                        placeholder={language === 'zh' ? '写下你的答案...' : 'Your answer...'}
                        className={`
                          w-full px-8 py-6 bg-white dark:bg-gray-800 border-4 rounded-[2rem] outline-none text-2xl font-black dark:text-white transition-all shadow-inner
                          ${selectedAnswer 
                            ? (selectedAnswer === currentQuestion.answer ? 'border-green-500' : 'border-red-500')
                            : 'border-transparent focus:border-primary-500 focus:shadow-primary-100/50'
                          }
                        `}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAnswer(e.currentTarget.value);
                        }}
                      />
                      {selectedAnswer && (
                        <div className="absolute right-6 top-1/2 -translate-y-1/2">
                           {selectedAnswer === currentQuestion.answer 
                             ? <CheckCircle2 className="w-10 h-10 text-green-500" />
                             : <X className="w-10 h-10 text-red-500" />
                           }
                        </div>
                      )}
                    </div>
                    {!selectedAnswer && (
                      <button 
                        onClick={() => {
                           const input = document.querySelector('input') as HTMLInputElement;
                           handleAnswer(input.value);
                        }}
                        className="w-full py-5 bg-primary-600 text-white rounded-[2rem] font-black text-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/30 active:scale-95 flex items-center justify-center gap-3"
                      >
                        {language === 'zh' ? '确定好了' : 'Ready'}
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    )}
                 </div>
               )}

               {currentQuestion.type === QuestionType.TRUE_FALSE && (
                 <div className="grid grid-cols-2 gap-6">
                   {['正确', '错误'].map(val => {
                     const isSelected = selectedAnswer === val;
                     const isCorrect = val === currentQuestion.answer;
                     return (
                       <button
                          key={val}
                          onClick={() => handleAnswer(val)}
                          disabled={!!selectedAnswer}
                          className={`
                            p-10 rounded-[2rem] font-black text-2xl transition-all border-4 shadow-sm
                            ${isSelected
                              ? (isCorrect ? 'bg-green-500 border-green-500 text-white scale-105' : 'bg-red-500 border-red-500 text-white scale-95')
                              : 'bg-white dark:bg-gray-800 border-transparent dark:text-white hover:border-primary-300'
                            }
                          `}
                       >
                         {val === '正确' ? '✅' : '❌'}
                         <div className="mt-2 text-base">
                           {val === '正确' ? (language === 'zh' ? '正确' : 'True') : (language === 'zh' ? '错误' : 'False')}
                         </div>
                       </button>
                     );
                   })}
                 </div>
               )}
            </div>
          </div>
        </div>
      </main>

      {showReinforcement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-500 p-6">
           <div className="bg-white dark:bg-gray-900 p-10 md:p-16 rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.3)] text-center flex flex-col items-center max-w-md w-full animate-in zoom-in-75 duration-500">
              <div className="relative">
                <div className="text-9xl mb-6 animate-bounce">🦖</div>
                <div className="absolute -top-4 -right-4 bg-yellow-400 text-xs font-black px-2 py-1 rounded-full animate-pulse">LEVEL UP!</div>
              </div>
              <h2 className="text-4xl font-black text-primary-600 dark:text-primary-400 mb-2">{language === 'zh' ? '超神啦！' : 'GODLIKE!'}</h2>
              <p className="text-gray-500 dark:text-gray-400 font-bold mb-8">{language === 'zh' ? '连续答对！送你一个大恐龙' : 'Chain combo! You got a Dino!'}</p>
              <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-[2rem] overflow-hidden flex items-center justify-center border-4 border-primary-500/20 group cursor-pointer shadow-inner">
                <PlayCircle className="w-16 h-16 text-primary-500 group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
              <p className="mt-6 text-sm text-gray-400 italic">奖励动画加载中...</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default PracticeSession;
