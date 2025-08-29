import React, { useState, useCallback, useEffect } from 'react';
import type { GradeLevel, Message, WebSource, StudyDocument, Flashcard, QuizQuestion } from './types';
import { AI_MODELS } from './constants';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import GradeSelector from './components/GradeSelector';
import ContentInput from './components/ContentInput';
import StudyGuideOutput from './components/StudyGuideOutput';
import ThemeToggle from './components/ThemeToggle';
import StudyTimer from './components/StudyTimer';
import SettingsModal from './components/SettingsModal';
import ImportExportModal from './components/ImportExportModal';
import SettingsIcon from './components/icons/SettingsIcon';
import DownloadIcon from './components/icons/DownloadIcon';
import { generateInitialChatMessage, generateKeyTopics, sendMessage, SafetyError, generateFlashcards, generateQuiz, extractTextFromContent, getModelInfo, generateInitialChatMessageWithDeepThink, generateKeyTopicsWithDeepThink, analyzeQuizResults, sendMessageWithDeepThink } from './services/aiService';
import ElevatedAILogo from './components/icons/ElevatedAILogo';
import Loader from './components/Loader';
import MarkdownRenderer from './components/MarkdownRenderer';
import ListIcon from './components/icons/ListIcon';
import ChatBubbleIcon from './components/icons/ChatBubbleIcon';
import CardStackIcon from './components/icons/CardStackIcon';
import QuestionMarkIcon from './components/icons/QuestionMarkIcon';
import BetaModal from './components/BetaModal';
import SafetyModal from './components/SafetyModal';
import WebSources from './components/WebSources';
import FlashcardsTab from './components/FlashcardsTab';
import QuizTab from './components/QuizTab';
import TextExtractorModal from './components/TextExtractorModal';
import MagicWandIcon from './components/icons/MagicWandIcon';
import CollaborationSettingsModal from './components/CollaborationSettingsModal';
import InfoIcon from './components/icons/InfoIcon';
import AIInfoModal from './components/AIInfoModal';

type DocumentStatus = 'ready' | 'processing' | 'error';
type ActiveTab = 'topics' | 'chat' | 'flashcards' | 'quiz';

interface TabButtonProps {
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ isActive, onClick, children }) => (
    <button
        onClick={onClick}
        className={`flex-shrink-0 whitespace-nowrap flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 text-sm sm:text-lg font-semibold transition-all duration-300 rounded-t-lg min-h-[44px] ${
            isActive
                ? 'bg-white/5 text-white'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
        }`}
        role="tab"
        aria-selected={isActive}
    >
        {children}
    </button>
);

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // remove "data:mime/type;base64," prefix
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
};

const DEEP_THINK_PROGRESS_MESSAGES: Record<string, string> = {
    'Phase 1/3: Devising initial plan...': "The AI is creating a step-by-step roadmap to construct the most comprehensive and well-structured answer for you.",
    'Phase 2/3: Critiquing the plan...': "The AI is now reviewing its own plan, identifying potential flaws and looking for opportunities to improve its approach.",
    'Phase 3/3: Synthesizing final answer...': "The AI is combining your request, its plan, and the critique to generate the final, polished response."
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </ThemeProvider>
  );
};

const AppContent: React.FC = () => {
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [collaborationModels, setCollaborationModels] = useState({
    planner: 'gemini-2.5-flash',
    synthesizer: 'gemini-2.5-flash',
  });
  const [isCollaborationModalOpen, setIsCollaborationModalOpen] = useState(false);
  const [isCurrentModelKeySet, setIsCurrentModelKeySet] = useState(true); // Always true since no API keys required
  const [messages, setMessages] = useState<Message[]>([]);
  const [keyTopics, setKeyTopics] = useState<string | null>(null);
  const [keyTopicsSources, setKeyTopicsSources] = useState<WebSource[] | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [numFlashcards, setNumFlashcards] = useState(10);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [numQuizQuestions, setNumQuizQuestions] = useState(10);
  const [isFlashcardsLoading, setIsFlashcardsLoading] = useState(false);
  const [flashcardLoadingMessage, setFlashcardLoadingMessage] = useState('');
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizLoadingMessage, setQuizLoadingMessage] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('topics');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingSubMessage, setLoadingSubMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChatActive, setIsChatActive] = useState(false);
  const [isBetaModalOpen, setIsBetaModalOpen] = useState(true);
  const [safetyModalInfo, setSafetyModalInfo] = useState<{isOpen: boolean, reason: string | null}>({ isOpen: false, reason: null });
  const [isExtractorModalOpen, setIsExtractorModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isAIInfoModalOpen, setIsAIInfoModalOpen] = useState(false);


  // No API key checking needed in mock version

  const handleCloseBetaModal = () => {
    setIsBetaModalOpen(false);
  };





  const handleAddPastedText = useCallback((content: string) => {
    setDocuments(prevDocs => {
      const doc = { name: 'Pasted Text', content };
      let finalName = doc.name;
      const pastedCount = prevDocs.filter(d => d.name.startsWith('Pasted Text')).length;
      if (pastedCount > 0) {
        finalName = `Pasted Text ${pastedCount + 1}`;
      }
      
      let counter = 2;
      let uniqueName = finalName;
      while(prevDocs.some(d => d.name === uniqueName)) {
        uniqueName = `${finalName} (${counter++})`;
      }

      const newDoc: StudyDocument = {
          id: Date.now(),
          name: uniqueName,
          content: content,
          status: 'ready',
      };
      return [...prevDocs, newDoc];
    });
  }, []);

  const handleFilesSelected = useCallback((files: File[]) => {
      const getUniqueName = (name: string, docs: StudyDocument[]): string => {
        let finalName = name;
        let counter = 2;
        while(docs.some(d => d.name === finalName)) {
            const extensionMatch = name.match(/\.([^.]+)$/);
            if (extensionMatch) {
                const baseName = name.substring(0, name.lastIndexOf('.'));
                finalName = `${baseName} (${counter++}).${extensionMatch[1]}`;
            } else {
                finalName = `${name} (${counter++})`;
            }
        }
        return finalName;
    };


      files.forEach(async file => {
          const placeholder: StudyDocument = {
              id: Date.now() + Math.random(),
              name: file.name,
              content: '',
              status: 'processing' as DocumentStatus
          };

          setDocuments(prev => [...prev, placeholder]);

          try {
              let content = '';
              const fileType = file.type;
              
              const isTextFile = fileType.startsWith('text/') || file.name.endsWith('.md');
              const isComplexFile = fileType.startsWith('image/') ||
                                    fileType === 'application/pdf' ||
                                    fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

              if (isTextFile) {
                  content = await file.text();
              } else if (isComplexFile) {
                  const base64Data = await fileToBase64(file);
                  // Use a specific model that supports file extraction
                  content = await extractTextFromContent({ mimeType: fileType, data: base64Data }, 'gemini-2.5-flash');
              } else {
                  console.warn(`Unsupported file type: ${fileType} for file ${file.name}, or current model does not support this type. Skipping.`);
                  setDocuments(prev => prev.filter(d => d.id !== placeholder.id));
                  return;
              }

              setDocuments(prev => {
                  const finalName = getUniqueName(file.name, prev.filter(d => d.id !== placeholder.id));
                  return prev.map(d => d.id === placeholder.id ? { ...d, name: finalName, content, status: 'ready' as DocumentStatus } : d)
              });

          } catch (err) {
              console.error("Error processing file:", err);
              if (err instanceof SafetyError) {
                setSafetyModalInfo({ isOpen: true, reason: err.message });
              }
              setDocuments(prev => prev.map(d => d.id === placeholder.id ? { ...d, status: 'error' as DocumentStatus } : d));
          }
      });
  }, [selectedModel]);


  const handleRemoveDocument = useCallback((idToRemove: number) => {
    setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== idToRemove));
  }, []);

  const handleStartSession = useCallback(async () => {
    setError(null);
    if (documents.some(d => d.status !== 'ready') || !selectedGrade) {
      setError("Please wait for all materials to finish processing and select a grade level.");
      return;
    }
    if (documents.length === 0) {
      setError("Please provide your study material.");
      return;
    }

    const isAdvancedModel = selectedModel === 'ai-advanced-analysis';

    setIsLoading(true);
    setLoadingMessage(isAdvancedModel ? "Initiating Advanced Session..." : "Preparing your session...");
    setLoadingSubMessage(isAdvancedModel ? '' : "The AI is analyzing your documents and preparing the initial summary and key topics.");
    
    setMessages([]);
    setKeyTopics(null);
    setKeyTopicsSources(null);
    setFlashcards([]);
    setQuiz([]);
    setIsChatActive(false);

    const onProgress = (message: string) => {
        setLoadingMessage(message);
        if (isAdvancedModel && DEEP_THINK_PROGRESS_MESSAGES[message]) {
            setLoadingSubMessage(DEEP_THINK_PROGRESS_MESSAGES[message]);
        }
    };

    try {
        const readyDocs = documents.filter(d => d.status === 'ready');
        if (!selectedGrade) return; // Should not happen due to guard clause
        
        const [initialMessageResponse, topicsResponse] = isAdvancedModel
            ? await Promise.all([
                generateInitialChatMessageWithDeepThink(readyDocs, selectedGrade, collaborationModels, onProgress),
                generateKeyTopicsWithDeepThink(readyDocs, selectedGrade, collaborationModels, onProgress)
              ])
            : await Promise.all([
                generateInitialChatMessage(readyDocs, selectedGrade, selectedModel),
                generateKeyTopics(readyDocs, selectedGrade, selectedModel)
              ]);
        
        setMessages([{ role: 'model', text: initialMessageResponse.text, sources: initialMessageResponse.sources }]);
        setKeyTopics(topicsResponse.text);
        setKeyTopicsSources(topicsResponse.sources);

        setIsChatActive(true);
        setActiveTab('topics');
    } catch (err: unknown) {
      if (err instanceof SafetyError) {
        setSafetyModalInfo({ isOpen: true, reason: err.message });
      } else {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
      setLoadingSubMessage('');
    }
  }, [documents, selectedGrade, selectedModel, isCurrentModelKeySet, collaborationModels]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (isLoading || !selectedGrade) return;

    const isAdvancedModel = selectedModel === 'ai-advanced-analysis';
    
    setIsLoading(true);
    setLoadingMessage("Thinking...");
    setError(null);
    const updatedMessages: Message[] = [...messages, { role: 'user', text: message }];
    setMessages(updatedMessages);

    try {
      const readyDocs = documents.filter(d => d.status === 'ready');
      const response = isAdvancedModel
        ? await sendMessageWithDeepThink(messages, message, readyDocs, selectedGrade, collaborationModels)
        : await sendMessage(messages, message, readyDocs, selectedGrade, selectedModel);
        
      setMessages([...updatedMessages, { role: 'model', text: response.text, sources: response.sources }]);
    } catch (err: unknown) {
        if (err instanceof SafetyError) {
          setSafetyModalInfo({ isOpen: true, reason: err.message });
          // Revert message list if user prompt was blocked
          setMessages(messages);
        } else {
          const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred sending your message.";
          setError(errorMessage);
          setMessages(updatedMessages);
        }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [messages, isLoading, documents, selectedGrade, selectedModel, collaborationModels]);

  const handleGenerateFlashcards = useCallback(async () => {
    const readyDocs = documents.filter(d => d.status === 'ready');
    if (!selectedGrade || readyDocs.length === 0) return;
    
    setIsFlashcardsLoading(true);
    setError(null);
    setFlashcardLoadingMessage('Preparing to generate flashcards...');
    try {
      const onProgress = (message: string) => setFlashcardLoadingMessage(message);
      const generated = await generateFlashcards(readyDocs, selectedGrade, selectedModel, onProgress, numFlashcards);
      setFlashcards(generated);
    } catch (err) {
      if (err instanceof SafetyError) {
        setSafetyModalInfo({ isOpen: true, reason: err.message });
      } else {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred generating flashcards.";
        setError(errorMessage);
      }
    } finally {
      setIsFlashcardsLoading(false);
      setFlashcardLoadingMessage('');
    }
  }, [documents, selectedGrade, selectedModel, numFlashcards]);

  const handleGenerateQuiz = useCallback(async () => {
    const readyDocs = documents.filter(d => d.status === 'ready');
    if (!selectedGrade || readyDocs.length === 0) return;
    
    setIsQuizLoading(true);
    setError(null);
    setQuizLoadingMessage('Preparing to generate quiz...');
    try {
      const onProgress = (message: string) => setQuizLoadingMessage(message);
      const generated = await generateQuiz(readyDocs, selectedGrade, selectedModel, onProgress, numQuizQuestions);
      setQuiz(generated);
    } catch (err) {
      if (err instanceof SafetyError) {
        setSafetyModalInfo({ isOpen: true, reason: err.message });
      } else {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred generating the quiz.";
        setError(errorMessage);
      }
    } finally {
      setIsQuizLoading(false);
      setQuizLoadingMessage('');
    }
  }, [documents, selectedGrade, selectedModel, numQuizQuestions]);

  const handleQuizAnalysis = useCallback(async (quiz: QuizQuestion[], userAnswers: Record<number, string | null>): Promise<string> => {
    if (!selectedGrade) return "Cannot analyze results without a grade level.";
    
    return await analyzeQuizResults(quiz, userAnswers, documents, selectedGrade, selectedModel);
  }, [documents, selectedGrade, selectedModel]);

  const handleResetSession = () => {
      setIsChatActive(false);
      setMessages([]);
      setDocuments([]);
      setSelectedGrade(null);
      setError(null);
      setIsLoading(false);
      setLoadingMessage('');
      setLoadingSubMessage('');
      setKeyTopics(null);
      setKeyTopicsSources(null);
      setFlashcards([]);
      setIsFlashcardsLoading(false);
      setFlashcardLoadingMessage('');
      setQuiz([]);
      setIsQuizLoading(false);
      setQuizLoadingMessage('');
      setActiveTab('topics');
  }

  // Import handlers
  const handleImportDocuments = useCallback((importedDocs: StudyDocument[]) => {
    setDocuments(prevDocs => {
      const newDocs = importedDocs.map(doc => ({
        ...doc,
        id: Date.now() + Math.random(), // Ensure unique IDs
        status: 'ready' as const
      }));
      return [...prevDocs, ...newDocs];
    });
  }, []);

  const handleImportFlashcards = useCallback((importedFlashcards: Flashcard[]) => {
    setFlashcards(prevCards => [...prevCards, ...importedFlashcards]);
  }, []);

  const handleImportQuiz = useCallback((importedQuiz: QuizQuestion[]) => {
    setQuiz(prevQuiz => [...prevQuiz, ...importedQuiz]);
  }, []);

  const handleImportGradeLevel = useCallback((grade: GradeLevel) => {
    if (!selectedGrade) {
      setSelectedGrade(grade);
    }
  }, [selectedGrade]);

  const canStart = documents.length > 0 && documents.every(d => d.status === 'ready') && selectedGrade !== null && !isLoading;

  return (
    <div className="min-h-screen bg-[#0D0B14] text-white font-sans p-2 sm:p-4 lg:p-8 relative overflow-hidden">
      <ThemeToggle />
      <StudyTimer isActive={isChatActive} />
      
      {/* Settings Button */}
      <button
        onClick={() => setIsSettingsModalOpen(true)}
        className="fixed top-2 sm:top-4 left-2 sm:left-4 z-50 p-2 sm:p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full shadow-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-500/50 min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Open settings"
        title="Customize Interface"
      >
        <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
      </button>

      {/* Import/Export Button */}
      <button
        onClick={() => setIsImportExportModalOpen(true)}
        className="fixed top-16 sm:top-20 left-2 sm:left-4 z-50 p-2 sm:p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full shadow-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-500/50 min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Import/Export data"
        title="Import & Export"
      >
        <DownloadIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
      </button>

      {/* AI Info Button */}
      <button
        onClick={() => setIsAIInfoModalOpen(true)}
        className="fixed top-2 sm:top-4 right-2 sm:right-4 z-50 p-2 sm:p-3 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 backdrop-blur-sm border border-purple-400/30 rounded-full shadow-lg hover:bg-purple-600/30 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-500/50 group min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Learn how our AI works"
        title="How Our AI Works"
      >
        <InfoIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-200 group-hover:text-white transition-colors" />
        
        {/* Animated Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Pulse Ring */}
        <div className="absolute inset-0 border-2 border-purple-400/30 rounded-full animate-pulse"></div>
      </button>

      <div className="aurora-background">
        <div className="aurora-shape aurora-shape-1"></div>
        <div className="aurora-shape aurora-shape-2"></div>
        <div className="aurora-shape aurora-shape-3"></div>
      </div>

      <BetaModal isOpen={isBetaModalOpen} onClose={handleCloseBetaModal} />
      <SafetyModal 
        isOpen={safetyModalInfo.isOpen}
        reason={safetyModalInfo.reason}
        onClose={() => setSafetyModalInfo({ isOpen: false, reason: null })}
      />
      <TextExtractorModal
        isOpen={isExtractorModalOpen}
        onClose={() => setIsExtractorModalOpen(false)}
      />
       <CollaborationSettingsModal
        isOpen={isCollaborationModalOpen}
        onClose={() => setIsCollaborationModalOpen(false)}
        currentSelection={collaborationModels}
        onSave={setCollaborationModels}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
      <ImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        documents={documents}
        flashcards={flashcards}
        quiz={quiz}
        gradeLevel={selectedGrade}
        onImportDocuments={handleImportDocuments}
        onImportFlashcards={handleImportFlashcards}
        onImportQuiz={handleImportQuiz}
        onImportGradeLevel={handleImportGradeLevel}
      />
      <AIInfoModal
        isOpen={isAIInfoModalOpen}
        onClose={() => setIsAIInfoModalOpen(false)}
      />

      <button
          onClick={() => setIsExtractorModalOpen(true)}
          className="group fixed bottom-4 sm:bottom-8 left-2 sm:left-4 lg:left-8 z-30 p-3 sm:p-4 bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 text-white rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500/50 animate-entry border border-purple-500/20 min-h-[44px] min-w-[44px]"
          style={{ animationDelay: '1s' }}
          aria-label="Extract text from PDF with AI"
          title="AI PDF Analyzer - Extract text from any PDF"
      >
          {/* Button Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          {/* Icon Container */}
          <div className="relative flex items-center justify-center">
            <MagicWandIcon className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform duration-200" />
            
            {/* Animated Pulse Ring */}
            <div className="absolute inset-0 w-5 h-5 sm:w-6 sm:h-6 border-2 border-purple-300/50 rounded-full animate-pulse"></div>
          </div>
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-gray-900/90 backdrop-blur-sm text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border border-purple-500/20">
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900/90"></div>
            PDF Text Extractor
          </div>
      </button>

      <div className="container mx-auto max-w-7xl relative z-10 px-2 sm:px-4">
        <div className="lg:flex lg:flex-col lg:justify-center lg:min-h-screen">
            <header 
              className="text-center mb-8 sm:mb-12 animate-entry"
              style={{ animationDelay: '0.2s' }}
            >
              <div className="inline-flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
                <ElevatedAILogo className="w-12 h-12 sm:w-16 sm:h-16" showText={false} />
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
                  Elevated <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">AI</span>
                  <div className="inline-flex items-center gap-2 ml-1 sm:ml-3">
                  </div>
                </h1>
              </div>
              <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-400 max-w-2xl mx-auto px-2">
                Upload your notes or paste text to elevate your study sessions with a personal AI tutor.
              </p>
            </header>

            <main className="grid grid-cols-1 gap-6 sm:gap-8 justify-items-center">
              <div 
                className="relative z-10 flex flex-col gap-4 sm:gap-6 lg:gap-8 p-3 sm:p-4 lg:p-6 bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl animate-entry w-full max-w-4xl"
                style={{ animationDelay: '0.4s' }}
              >
                <ContentInput 
                  documents={documents}
                  onAddPastedText={handleAddPastedText} 
                  onFilesSelected={handleFilesSelected}
                  onRemoveDocument={handleRemoveDocument}
                  isSessionActive={isChatActive}
                  selectedModel={selectedModel}
                  onSelectModel={setSelectedModel}
                  isCurrentModelKeySet={isCurrentModelKeySet}
                  onConfigureCollaboration={() => setIsCollaborationModalOpen(true)}
                />
                <GradeSelector selectedGrade={selectedGrade} onSelectGrade={setSelectedGrade} isDisabled={isChatActive} />
                

                
                {!isChatActive ? (
                    <div className="flex flex-col">
                         <button
                            onClick={handleStartSession}
                            disabled={!canStart}
                            className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl text-base sm:text-lg font-semibold transition-all duration-300 ease-in-out transform focus:outline-none focus:ring-4 focus:ring-purple-500/50 flex items-center justify-center gap-2 min-h-[44px] ${canStart ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 shadow-lg shadow-purple-600/30' : 'bg-gray-700/50 cursor-not-allowed text-gray-400 border border-white/10'}`}
                        >
                            {selectedModel === 'ai-advanced-analysis' && <ElevatedAILogo className="w-5 h-5 sm:w-6 sm:h-6" showText={false} />}
                            <span>
                                {selectedModel === 'ai-advanced-analysis' ? 'Start Advanced Session' : 'Start Session'}
                            </span>
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleResetSession}
                        className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl text-base sm:text-lg font-semibold transition-all duration-300 ease-in-out transform focus:outline-none focus:ring-4 focus:ring-red-500/50 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 min-h-[44px]"
                    >
                        New Session
                    </button>
                )}
              </div>
              <div 
                className="h-full animate-entry w-full"
                style={{ animationDelay: '0.6s' }}
              >
                <div className="w-full h-full min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                  {isLoading && !isChatActive ? (
                    <div className="flex-grow flex items-center justify-center p-3 sm:p-4">
                        <Loader message={loadingMessage} subMessage={loadingSubMessage} />
                    </div>
                  ) : !isChatActive ? (
                    <div className="p-4 sm:p-6 flex flex-col items-center justify-center h-full text-center text-gray-500">
                        <ElevatedAILogo className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mb-4" showText={false} />
                        <p className="text-lg sm:text-xl font-medium">Your interactive study session will appear here.</p>
                        <p className="text-sm sm:text-base">Just add your material, select a grade, and start the chat!</p>
                    </div>
                  ) : (
                    <>  
                        <div className="p-3 sm:p-4 lg:p-6 pb-0 flex-shrink-0">
                            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Your Study Session</h2>
                            <div className="border-b border-white/10">
                                <div className="flex items-center gap-1 sm:gap-2 -mb-px overflow-x-auto hide-scrollbar" role="tablist">
                                    <TabButton isActive={activeTab === 'topics'} onClick={() => setActiveTab('topics')}>
                                        <ListIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        <span className="hidden xs:inline">Key Topics</span>
                                        <span className="xs:hidden">Topics</span>
                                    </TabButton>
                                    <TabButton isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')}>
                                        <ChatBubbleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        <span className="hidden xs:inline">Chat Session</span>
                                        <span className="xs:hidden">Chat</span>
                                    </TabButton>
                                    <TabButton isActive={activeTab === 'flashcards'} onClick={() => setActiveTab('flashcards')}>
                                        <CardStackIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        <span>Flashcards</span>
                                    </TabButton>
                                    <TabButton isActive={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')}>
                                        <QuestionMarkIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        <span>Quiz</span>
                                    </TabButton>
                                </div>
                            </div>
                        </div>
                        <div className="flex-grow overflow-y-auto" role="tabpanel">
                            {activeTab === 'topics' && (
                                <div className="p-3 sm:p-4 lg:p-6">
                                    <MarkdownRenderer content={keyTopics || ''} />
                                    {keyTopicsSources && keyTopicsSources.length > 0 && (
                                        <WebSources sources={keyTopicsSources} />
                                    )}
                                </div>
                            )}
                            {activeTab === 'chat' && (
                                <div className="p-3 sm:p-4 lg:p-6 h-full">
                                    <StudyGuideOutput 
                                        messages={messages} 
                                        isLoading={isLoading} 
                                        error={error} 
                                        isChatActive={isChatActive}
                                        onSendMessage={handleSendMessage}
                                    />
                                </div>
                            )}
                             {activeTab === 'flashcards' && (
                                <div className="p-3 sm:p-4 lg:p-6 h-full">
                                   <FlashcardsTab
                                      flashcards={flashcards}
                                      onGenerate={handleGenerateFlashcards}
                                      isLoading={isFlashcardsLoading}
                                      loadingMessage={flashcardLoadingMessage}
                                      error={error}
                                      numFlashcards={numFlashcards}
                                      onNumFlashcardsChange={setNumFlashcards}
                                   />
                                </div>
                            )}
                             {activeTab === 'quiz' && (
                               <QuizTab
                                  quiz={quiz}
                                  onGenerate={handleGenerateQuiz}
                                  isLoading={isQuizLoading}
                                  loadingMessage={quizLoadingMessage}
                                  error={error}
                                  onAnalyze={handleQuizAnalysis}
                                  numQuestions={numQuizQuestions}
                                  onNumQuestionsChange={setNumQuizQuestions}
                               />
                            )}
                        </div>
                    </>
                  )}
                   {error && !isChatActive && (
                      <div className="p-3 sm:p-4 lg:p-6">
                        <div className="text-center bg-red-500/20 p-3 sm:p-4 rounded-lg border border-red-500/30">
                          <p className="text-red-400 font-semibold text-sm sm:text-base">An Error Occurred</p>
                          <p className="text-red-300 mt-1 text-xs sm:text-sm">{error}</p>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </main>
            
            <footer 
                className="text-center mt-8 sm:mt-12 lg:mt-16 text-gray-500 text-xs sm:text-sm animate-entry"
                style={{ animationDelay: '0.8s' }}
            >
                <p>&copy; {new Date().getFullYear()} Elevated AI. Let's make learning easier.</p>
            </footer>
        </div>
      </div>
      
       <style>{`
        :root {
          --bg-primary: #0f172a;
          --bg-secondary: rgba(17, 24, 39, 0.5);
          --text-primary: #ffffff;
          --text-secondary: #9ca3af;
          --border-color: rgba(255, 255, 255, 0.1);
          --aurora-1: #7c3aed;
          --aurora-2: #4f46e5;
          --aurora-3: #db2777;
          --accent-primary: #7c3aed;
          --accent-secondary: #4f46e5;
        }
        
        [data-theme="light"] {
          --bg-primary: #f8fafc;
          --bg-secondary: rgba(255, 255, 255, 0.8);
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --border-color: rgba(0, 0, 0, 0.1);
          --aurora-1: #a855f7;
          --aurora-2: #6366f1;
          --aurora-3: #ec4899;
        }
        
        /* Color Schemes */
        [data-color-scheme="purple"] {
          --accent-primary: #7c3aed;
          --accent-secondary: #4f46e5;
          --aurora-1: #7c3aed;
          --aurora-2: #4f46e5;
          --aurora-3: #db2777;
        }
        
        [data-color-scheme="blue"] {
          --accent-primary: #2563eb;
          --accent-secondary: #0891b2;
          --aurora-1: #2563eb;
          --aurora-2: #0891b2;
          --aurora-3: #0284c7;
        }
        
        [data-color-scheme="green"] {
          --accent-primary: #16a34a;
          --accent-secondary: #059669;
          --aurora-1: #16a34a;
          --aurora-2: #059669;
          --aurora-3: #047857;
        }
        
        [data-color-scheme="orange"] {
          --accent-primary: #ea580c;
          --accent-secondary: #dc2626;
          --aurora-1: #ea580c;
          --aurora-2: #dc2626;
          --aurora-3: #c2410c;
        }
        
        [data-color-scheme="pink"] {
          --accent-primary: #ec4899;
          --accent-secondary: #be185d;
          --aurora-1: #ec4899;
          --aurora-2: #be185d;
          --aurora-3: #db2777;
        }
        
        [data-color-scheme="cyan"] {
          --accent-primary: #06b6d4;
          --accent-secondary: #0891b2;
          --aurora-1: #06b6d4;
          --aurora-2: #0891b2;
          --aurora-3: #0e7490;
        }
        
        /* Apply color scheme to gradients */
        [data-color-scheme] .bg-gradient-to-r.from-purple-600 {
          background: linear-gradient(to right, var(--accent-primary), var(--accent-secondary)) !important;
        }
        
        [data-color-scheme] .text-purple-400 {
          color: var(--accent-primary) !important;
        }
        
        [data-color-scheme] .border-purple-500 {
          border-color: var(--accent-primary) !important;
        }
        
        [data-color-scheme] .bg-purple-600\/20 {
          background: color-mix(in srgb, var(--accent-primary) 20%, transparent) !important;
        }
        
        /* Font Sizes */
        [data-font-size="small"] {
          font-size: 14px;
        }
        
        [data-font-size="small"] .text-lg {
          font-size: 1rem !important;
        }
        
        [data-font-size="small"] .text-xl {
          font-size: 1.125rem !important;
        }
        
        [data-font-size="small"] .text-2xl {
          font-size: 1.25rem !important;
        }
        
        [data-font-size="large"] {
          font-size: 18px;
        }
        
        [data-font-size="large"] .text-lg {
          font-size: 1.25rem !important;
        }
        
        [data-font-size="large"] .text-xl {
          font-size: 1.5rem !important;
        }
        
        [data-font-size="large"] .text-2xl {
          font-size: 1.75rem !important;
        }
        
        [data-font-size="extra-large"] {
          font-size: 20px;
        }
        
        [data-font-size="extra-large"] .text-lg {
          font-size: 1.5rem !important;
        }
        
        [data-font-size="extra-large"] .text-xl {
          font-size: 1.75rem !important;
        }
        
        [data-font-size="extra-large"] .text-2xl {
          font-size: 2rem !important;
        }
        
        /* Layout Modes */
        [data-layout-mode="compact"] .p-4 {
          padding: 0.75rem !important;
        }
        
        [data-layout-mode="compact"] .p-6 {
          padding: 1rem !important;
        }
        
        [data-layout-mode="compact"] .gap-8 {
          gap: 1rem !important;
        }
        
        [data-layout-mode="compact"] .mb-12 {
          margin-block-end: 2rem !important;
        }
        
        [data-layout-mode="spacious"] .p-4 {
          padding: 1.5rem !important;
        }
        
        [data-layout-mode="spacious"] .p-6 {
          padding: 2rem !important;
        }
        
        [data-layout-mode="spacious"] .gap-8 {
          gap: 3rem !important;
        }
        
        [data-layout-mode="spacious"] .mb-12 {
          margin-block-end: 4rem !important;
        }
        
        [data-theme="light"] .min-h-screen {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          color: var(--text-primary);
        }
        
        [data-theme="light"] .bg-gray-900\/50 {
          background: var(--bg-secondary) !important;
          backdrop-filter: blur(12px);
        }
        
        [data-theme="light"] .bg-black\/20 {
          background: rgba(255, 255, 255, 0.6) !important;
        }
        
        [data-theme="light"] .bg-white\/5 {
          background: rgba(0, 0, 0, 0.05) !important;
        }
        
        [data-theme="light"] .bg-gray-800\/80 {
          background: rgba(255, 255, 255, 0.9) !important;
          border-color: rgba(0, 0, 0, 0.1) !important;
        }
        
        [data-theme="light"] .text-white {
          color: var(--text-primary) !important;
        }
        
        [data-theme="light"] .text-gray-400 {
          color: var(--text-secondary) !important;
        }
        
        [data-theme="light"] .text-gray-300 {
          color: #475569 !important;
        }
        
        [data-theme="light"] .text-gray-500 {
          color: var(--text-secondary) !important;
        }
        
        [data-theme="light"] .border-white\/10 {
          border-color: var(--border-color) !important;
        }
        
        [data-theme="light"] .aurora-shape-1 {
          background: var(--aurora-1);
          opacity: 0.2;
        }
        
        [data-theme="light"] .aurora-shape-2 {
          background: var(--aurora-2);
          opacity: 0.2;
        }
        
        [data-theme="light"] .aurora-shape-3 {
          background: var(--aurora-3);
          opacity: 0.2;
        }
        
        .aurora-background {
          position: absolute;
          inset-block-start: 0;
          inset-inline-start: 0;
          inline-size: 100%;
          block-size: 100%;
          overflow: hidden;
          z-index: 0;
        }
        .aurora-shape {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.3;
        }
        .aurora-shape-1 {
          inline-size: 500px;
          block-size: 500px;
          background: var(--aurora-1);
          inset-block-start: -150px;
          inset-inline-start: -150px;
          animation: move-aurora-1 20s infinite alternate;
        }
        .aurora-shape-2 {
          inline-size: 400px;
          block-size: 400px;
          background: var(--aurora-2);
          inset-block-start: 50%;
          inset-inline-start: 50%;
          transform: translate(-50%, -50%);
          animation: move-aurora-2 25s infinite alternate;
        }
        .aurora-shape-3 {
          inline-size: 450px;
          block-size: 450px;
          background: var(--aurora-3);
          inset-block-end: -200px;
          inset-inline-end: -200px;
          animation: move-aurora-3 18s infinite alternate;
        }
        @keyframes move-aurora-1 {
          from { transform: translate(-100px, -50px) rotate(0deg); }
          to { transform: translate(100px, 100px) rotate(180deg); }
        }
        @keyframes move-aurora-2 {
          from { transform: translate(-50%, -50%) scale(0.8); }
          to { transform: translate(-30%, -60%) scale(1.2); }
        }
        @keyframes move-aurora-3 {
          from { transform: translate(50px, 80px) rotate(0deg); }
          to { transform: translate(-100px, -50px) rotate(-180deg); }
        }

        @keyframes entry {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-entry {
            animation: entry 0.7s ease-out forwards;
            opacity: 0;
        }
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
        
        /* Extra Small breakpoint support */
        @media (min-width: 475px) {
          .xs\:inline {
            display: inline !important;
          }
          .xs\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
