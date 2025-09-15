import React, { useState, useEffect, useMemo } from 'react';
import type { QuizQuestion } from '../types';
import Loader from './Loader';
import QuestionMarkIcon from './icons/QuestionMarkIcon';
import MarkdownRenderer from './MarkdownRenderer';
import QuantitySelector from './QuantitySelector';

interface QuizTabProps {
  quiz: QuizQuestion[];
  isLoading: boolean;
  error: string | null;
  onGenerate: () => void;
  onAnalyze: (quiz: QuizQuestion[], userAnswers: Record<number, string | null>) => Promise<string>;
  loadingMessage?: string;
  numQuestions: number;
  onNumQuestionsChange: (num: number) => void;
  isAdaptive?: boolean;
  onToggleAdaptive?: (v: boolean) => void;
}

const DonutChart: React.FC<{
  correct: number;
  incorrect: number;
  skipped: number;
  size?: number;
  strokeWidth?: number;
}> = ({ correct, incorrect, skipped, size = 180, strokeWidth = 20 }) => {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const total = correct + incorrect + skipped;
  if (total === 0) return null;

  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  const correctPercent = (correct / total) * 100;
  const incorrectPercent = (incorrect / total) * 100;

  const correctStroke = (circumference * correctPercent) / 100;
  const incorrectStroke = (circumference * incorrectPercent) / 100;

  const correctOffset = 0;
  const incorrectOffset = -correctStroke;
  const skippedOffset = -(correctStroke + incorrectStroke);

  useEffect(() => {
    let animationFrameId: number;
    let startTimestamp: number | null = null;
    const duration = 1200; // Animation duration in ms
    const finalPercent = Math.round(correctPercent);

    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Ease-out cubic function for a smooth stop
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentPercent = Math.floor(easedProgress * finalPercent);
      setAnimatedPercent(currentPercent);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [correctPercent]);


  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {correct > 0 && <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#16a34a"
          strokeWidth={strokeWidth}
          strokeDasharray={`${correctStroke} ${circumference}`}
          strokeDashoffset={correctOffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />}
        {incorrect > 0 && <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#dc2626"
          strokeWidth={strokeWidth}
          strokeDasharray={`${incorrectStroke} ${circumference}`}
          strokeDashoffset={incorrectOffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ transitionDelay: '200ms'}}
        />}
        {skipped > 0 && <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#6b7280"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference - (correctStroke + incorrectStroke)} ${circumference}`}
          strokeDashoffset={skippedOffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
           style={{ transitionDelay: '400ms'}}
        />}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold text-white">{animatedPercent}%</span>
        <span className="text-sm text-gray-400">Correct</span>
      </div>
    </div>
  );
};


const QuizTab: React.FC<QuizTabProps> = ({ quiz, isLoading, error, onGenerate, onAnalyze, loadingMessage, numQuestions, onNumQuestionsChange, isAdaptive = false, onToggleAdaptive }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string | null>>({});
  const [showResults, setShowResults] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [analysisLoadingMessage, setAnalysisLoadingMessage] = useState('');

  useEffect(() => {
    setCurrentIndex(0);
    setUserAnswers({});
    setShowResults(false);
    setAnalysis(null);
    setIsAnalysisLoading(false);
    setAnalysisLoadingMessage('');
  }, [quiz]);
  
  useEffect(() => {
      if (showResults && quiz.length > 0 && !analysis && !isAnalysisLoading) {
          const fetchAnalysis = async () => {
              setIsAnalysisLoading(true);
              setAnalysisLoadingMessage('AI is analyzing your results...');
              try {
                  const result = await onAnalyze(quiz, userAnswers);
                  setAnalysis(result);
              } catch (e) {
                  console.error("Failed to fetch quiz analysis", e);
                  setAnalysis("Sorry, I was unable to generate feedback for your quiz results at this time.");
              } finally {
                  setIsAnalysisLoading(false);
                  setAnalysisLoadingMessage('');
              }
          };
          fetchAnalysis();
      }
  }, [showResults, quiz, userAnswers, analysis, isAnalysisLoading, onAnalyze]);

  const { correctCount, incorrectCount, skippedCount } = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    
    const answeredKeys = Object.keys(userAnswers);
    answeredKeys.forEach(keyStr => {
        const key = parseInt(keyStr, 10);
        const answer = userAnswers[key];
        if (answer === quiz[key].correctAnswer) {
            correct++;
        } else if (answer !== null) {
            incorrect++;
        }
    });

    const totalAnswered = answeredKeys.length;
    const skipped = quiz.length - totalAnswered;
    
    return { 
        correctCount: correct,
        incorrectCount: incorrect,
        skippedCount: skipped,
    };
  }, [quiz, userAnswers]);


  const handleAnswerSelect = (option: string) => {
    if (userAnswers[currentIndex] !== undefined) return;
    setUserAnswers(prev => ({ ...prev, [currentIndex]: option }));
  };

  const handleSkip = () => {
      if (userAnswers[currentIndex] !== undefined) return;
      setUserAnswers(prev => ({ ...prev, [currentIndex]: null }));
      
      if (currentIndex < quiz.length - 1) {
          setCurrentIndex(currentIndex + 1);
      } else {
          setShowResults(true);
      }
  };

  const handleNext = () => {
    if (currentIndex < quiz.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  
  const handleReview = () => {
      setShowResults(false);
      setCurrentIndex(0);
  }

  if (isLoading) {
    return (
        <div className="flex-grow flex items-center justify-center h-full p-6">
            <div className="text-center">
                <p className="text-lg font-semibold text-purple-300 mb-2">{loadingMessage || 'Generating Your Quiz...'}</p>
                <p className="text-gray-400">The AI is crafting questions to test your knowledge.</p>
                <div className="mt-6"><Loader /></div>
            </div>
        </div>
    );
  }

  if (quiz.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-6">
        <QuestionMarkIcon className="w-24 h-24 mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">Challenge Yourself!</h3>
        <p className="max-w-md mb-6">Generate a multiple-choice quiz based on your study materials to see how much you've learned.</p>
        <button
          onClick={onGenerate}
          className="py-3 px-8 rounded-lg text-lg font-semibold transition-all duration-300 ease-in-out transform focus:outline-none focus:ring-4 focus:ring-purple-500/50 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 hover:opacity-90"
        >
          Generate Quiz
        </button>
        <QuantitySelector
            id="quiz-quantity"
            label="Number of Questions"
            value={numQuestions}
            onChange={onNumQuestionsChange}
            options={[5, 10, 15, 20]}
            className="mt-6"
        />
        <div className="mt-4 flex items-center justify-center gap-2 text-white/80">
          <label className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-lg">
            <input type="checkbox" checked={Boolean(isAdaptive)} onChange={(e) => onToggleAdaptive && onToggleAdaptive(e.target.checked)} />
            Adaptive mode
          </label>
        </div>
         {error && (
            <div className="text-center bg-red-500/20 p-4 rounded-lg mt-8 border border-red-500/30">
              <p className="text-red-400 font-semibold">An Error Occurred</p>
              <p className="text-red-300 mt-1">{error}</p>
            </div>
        )}
      </div>
    );
  }

  if (showResults) {
    const totalQuestions = quiz.length;
    return (
        <div className="flex flex-col h-full">
           <div className="flex-grow overflow-y-auto text-center p-6">
                <h3 className="text-3xl font-bold text-white mb-4">Quiz Results</h3>
                
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 my-8">
                    <DonutChart correct={correctCount} incorrect={incorrectCount} skipped={skippedCount} />
                    <div className="flex flex-col gap-4 text-left">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-green-600"></div>
                            <div>
                                <p className="font-bold text-lg text-white">{correctCount} Correct</p>
                                <p className="text-sm text-gray-400">{totalQuestions > 0 ? ((correctCount / totalQuestions) * 100).toFixed(0) : 0}%</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-red-600"></div>
                            <div>
                                <p className="font-bold text-lg text-white">{incorrectCount} Incorrect</p>
                                <p className="text-sm text-gray-400">{totalQuestions > 0 ? ((incorrectCount / totalQuestions) * 100).toFixed(0) : 0}%</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-gray-500"></div>
                            <div>
                                <p className="font-bold text-lg text-white">{skippedCount} Skipped</p>
                                <p className="text-sm text-gray-400">{totalQuestions > 0 ? ((skippedCount / totalQuestions) * 100).toFixed(0) : 0}%</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-black/20 border border-white/10 p-6 rounded-2xl text-left">
                    <h4 className="text-xl font-bold text-purple-400 mb-4">AI Feedback & Analysis</h4>
                    {isAnalysisLoading && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader message={analysisLoadingMessage || 'AI is analyzing your results...'} />
                        </div>
                    )}
                    {analysis && <MarkdownRenderer content={analysis} />}
                </div>
            </div>
             <div className="flex-shrink-0 px-6 pb-6 pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                 <button
                    onClick={handleReview}
                    className="w-full sm:w-auto px-8 py-3 rounded-lg font-semibold bg-white/5 text-white hover:bg-white/10 transition-colors"
                >
                    Review Quiz
                </button>
                <button
                    onClick={onGenerate}
                    className="w-full sm:w-auto py-3 px-8 rounded-lg font-semibold transition-all bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white"
                >
                    Generate New Quiz
                </button>
            </div>
        </div>
    );
  }

  const currentQuestion = quiz[currentIndex];
  const selectedAnswer = userAnswers[currentIndex];
  const isAnswered = selectedAnswer !== undefined;

  return (
    <div className="flex flex-col h-full">
        <div className="flex-grow overflow-y-auto p-6">
            <p className="text-lg font-semibold text-purple-400 text-center mb-4">Question {currentIndex + 1} of {quiz.length}</p>
            <div className="bg-black/20 border border-white/10 p-6 rounded-2xl mb-6 min-h-[100px] flex items-center justify-center">
                <p className="text-xl font-bold text-white text-center">{currentQuestion.question}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options.map((option, i) => {
                    const isCorrect = option === currentQuestion.correctAnswer;
                    const isSelected = option === selectedAnswer;
                    let buttonClass = 'bg-white/5 hover:bg-white/10 border-white/10';
                    if (isAnswered) {
                        if (isCorrect) {
                            buttonClass = 'bg-green-500/30 border-green-500';
                        } else if (isSelected && !isCorrect) {
                            buttonClass = 'bg-red-500/30 border-red-500';
                        } else {
                            buttonClass = 'bg-white/5 border-white/10 opacity-60';
                        }
                    }

                    return (
                        <button
                        key={i}
                        onClick={() => handleAnswerSelect(option)}
                        disabled={isAnswered}
                        className={`w-full p-4 rounded-lg text-left text-lg font-medium text-white transition-all duration-300 ease-in-out focus:outline-none disabled:cursor-not-allowed border ${buttonClass}`}
                        >
                        {option}
                        </button>
                    );
                })}
            </div>

            {isAnswered && selectedAnswer !== null && (
                 <div className="mt-6 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30 animate-fade-in">
                    <h4 className="font-bold text-purple-300 mb-2">Explanation:</h4>
                    <p className="text-purple-200">{currentQuestion.explanation}</p>
                 </div>
            )}
        </div>

        <div className="flex-shrink-0 px-6 pb-6 pt-4">
            <div className="flex items-center justify-between w-full">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="px-6 py-2 rounded-lg font-semibold bg-white/5 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                >
                  Previous
                </button>
                
                {!isAnswered && (
                     <button
                        onClick={handleSkip}
                        className="px-6 py-2 rounded-lg font-semibold bg-white/5 text-white hover:bg-white/10 transition-colors"
                    >
                        Skip
                    </button>
                )}

                <button
                  onClick={handleNext}
                  disabled={!isAnswered}
                  className="px-8 py-3 rounded-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white disabled:bg-gray-700/50 disabled:text-gray-400 disabled:cursor-not-allowed hover:opacity-90 transition-all"
                >
                  {currentIndex === quiz.length - 1 ? 'Finish Quiz' : 'Next Question'}
                </button>
            </div>
        </div>
         <style>{`
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in {
                animation: fadeIn 0.5s ease-out forwards;
            }
        `}</style>
    </div>
  );
};

export default QuizTab;
