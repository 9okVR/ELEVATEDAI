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
import EllipsisHorizontalIcon from './components/icons/EllipsisHorizontalIcon';
import UserIcon from './components/icons/UserIcon';
import AuthModal from './components/AuthModal';
import { useTheme } from './contexts/ThemeContext';
import { useSettings } from './contexts/SettingsContext';
import { supabase } from './services/supabaseClient';
import AIInfoModal from './components/AIInfoModal';
import HistoryModal from './components/HistoryModal';
import { getChatSession, createChatSession, addChatMessage, updateChatSession, saveFlashcardSet, saveQuiz } from './services/historyService';

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
  const [settingsInitialTab, setSettingsInitialTab] = useState<'appearance' | 'layout' | 'advanced' | 'account'>('appearance');
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isAIInfoModalOpen, setIsAIInfoModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const { toggleTheme } = useTheme();
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  // Track Auth session to reflect signed-in status in header/buttons
  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      if (!supabase) return;
      try {
        const { data } = await supabase.auth.getSession();
        setSessionEmail(data.session?.user?.email ?? null);
        const sub = supabase.auth.onAuthStateChange((_evt, sess) => {
          setSessionEmail(sess?.user?.email ?? null);
        });
        unsub = sub.data.subscription.unsubscribe;
      } catch {}
    })();
    return () => { try { unsub && unsub(); } catch {} };
  }, []);


  // No API key checking needed in mock version

  const handleCloseBetaModal = () => {
    setIsBetaModalOpen(false);
  };

  // Load a saved session from Supabase history
  const handleSelectHistorySession = useCallback(async (id: string) => {
    try {
      const res = await getChatSession(id);
      if (!res.ok || !res.data) {
        setError(res.error || 'Failed to load session');
        return;
      }
      const { session, messages: rawMessages, flashcards: fc, quiz: qz } = res.data as any;
      const mappedMessages = (rawMessages || []).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : m.role,
        text: m.content,
        at: m.created_at,
      }));
      setMessages(mappedMessages);
      if (session?.topics) setKeyTopics(session.topics);
      if (session?.topics_sources) setKeyTopicsSources(session.topics_sources);
      if (typeof session?.grade_level === 'number') {
        try { setSelectedGrade(session.grade_level as any); } catch {}
      }
      if (Array.isArray(session?.documents)) {
        const restored = (session.documents as any[]).map((d: any, i: number) => ({
          id: Date.now() + i,
          name: String(d.name ?? `Document ${i+1}`),
          content: String(d.content ?? ''),
          status: 'ready' as const,
        }));
        setDocuments(restored);
      }
      if (fc?.items) setFlashcards(fc.items);
      if (qz?.items) setQuiz(qz.items);
      setIsChatActive(true);
      setActiveTab('chat');
      setError(null);
      setCurrentSessionId(session?.id || id);
    } catch (e) {
      setError((e as Error)?.message || 'Failed to load session');
    }
  }, []);





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
    // If Supabase is configured and the user isn't signed in, prompt auth
    try {
      if (supabase && !sessionEmail) {
        setIsAuthModalOpen(true);
        return;
      }
    } catch {}
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
        
        setMessages([{ role: 'model', text: initialMessageResponse.text, sources: initialMessageResponse.sources, at: new Date().toISOString(), model: (getModelInfo as any ? (getModelInfo as any)(selectedModel)?.name : undefined) || selectedModel }]);
        setKeyTopics(topicsResponse.text);
        setKeyTopicsSources(topicsResponse.sources);

        setIsChatActive(true);
        setActiveTab('topics');

        // Create a persisted session and store the initial assistant message and topics
        try {
          const created = await createChatSession({});
          if (created.ok && created.id) {
            setCurrentSessionId(created.id);
            // Persist the initial assistant message
            await addChatMessage(created.id, 'assistant', initialMessageResponse.text);
            // Persist topics into the session if schema supports it
            try { await updateChatSession({ id: created.id, topics: topicsResponse.text, topics_sources: topicsResponse.sources, grade_level: (selectedGrade as any) ?? null }); } catch {}
            // Persist documents (names + content only)
            try {
              const docsPayload = readyDocs.map(d => ({ name: d.name, content: d.content }));
              await updateChatSession({ id: created.id, documents: docsPayload });
            } catch {}
          }
        } catch (_) {
          // Non-fatal: UI continues even if persistence fails
        }
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
  }, [documents, selectedGrade, selectedModel, isCurrentModelKeySet, collaborationModels, sessionEmail]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (isLoading || !selectedGrade) return;

    const isAdvancedModel = selectedModel === 'ai-advanced-analysis';
    
    setIsLoading(true);
    setLoadingMessage("Thinking...");
    setError(null);
    const updatedMessages: Message[] = [...messages, { role: 'user', text: message, at: new Date().toISOString() }];
    setMessages(updatedMessages);

    try {
      // Ensure a session exists in history; create if missing
      let sid = currentSessionId;
      if (!sid) {
        const created = await createChatSession({});
        if (created.ok && created.id) {
          sid = created.id;
          setCurrentSessionId(sid);
        }
      }

      // Persist the user message (fire-and-forget if no session)
      if (sid) {
        try { await addChatMessage(sid, 'user', message); } catch {}
      }

      const readyDocs = documents.filter(d => d.status === 'ready');
      const response = isAdvancedModel
        ? await sendMessageWithDeepThink(messages, message, readyDocs, selectedGrade, collaborationModels)
        : await sendMessage(messages, message, readyDocs, selectedGrade, selectedModel);
        
      setMessages([...updatedMessages, { role: 'model', text: response.text, sources: response.sources, at: new Date().toISOString(), model: (getModelInfo as any ? (getModelInfo as any)(selectedModel)?.name : undefined) || selectedModel }]);

      // Persist assistant response
      if (sid) {
        try { await addChatMessage(sid, 'assistant', response.text); } catch {}
      }
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
  }, [messages, isLoading, documents, selectedGrade, selectedModel, collaborationModels, currentSessionId]);

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

      // Save flashcards and link to session
      if (currentSessionId) {
        try {
          const res = await saveFlashcardSet(generated as any);
          if (res.ok && res.id) {
            await updateChatSession({ id: currentSessionId, flashcard_set_id: res.id });
          }
        } catch {}
      }
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
  }, [documents, selectedGrade, selectedModel, numFlashcards, currentSessionId]);

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

      // Save quiz and link to session
      if (currentSessionId) {
        try {
          const res = await saveQuiz(generated as any);
          if (res.ok && res.id) {
            await updateChatSession({ id: currentSessionId, quiz_id: res.id });
          }
        } catch {}
      }
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
  }, [documents, selectedGrade, selectedModel, numQuizQuestions, currentSessionId]);

  const { enableQuizFeedback } = useSettings();

  const handleQuizAnalysis = useCallback(async (quiz: QuizQuestion[], userAnswers: Record<number, string | null>): Promise<string> => {
    if (!selectedGrade) return "Cannot analyze results without a grade level.";
    if (!enableQuizFeedback) {
      const correct = quiz.reduce((acc, q, i) => acc + ((userAnswers[i] || null) === q.correctAnswer ? 1 : 0), 0);
      const total = quiz.length;
      const percent = total ? Math.round((correct / total) * 100) : 0;
      return `Quiz Summary\n\nScore: ${correct}/${total} (${percent}%)\n\nAI feedback is disabled in Settings → Advanced.`;
    }
    return await analyzeQuizResults(quiz, userAnswers, documents, selectedGrade, selectedModel);
  }, [documents, selectedGrade, selectedModel, enableQuizFeedback]);

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
      setCurrentSessionId(null);
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

  // Persist documents to the session whenever they change (if a session exists)
  useEffect(() => {
    const sync = async () => {
      if (!currentSessionId) return;
      try {
        const docsPayload = documents.filter(d => d.status === 'ready').map(d => ({ name: d.name, content: d.content }));
        await updateChatSession({ id: currentSessionId, documents: docsPayload });
      } catch {}
    };
    sync();
  }, [documents, currentSessionId]);

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
    <div className="min-h-screen min-h-[100dvh] bg-[#0D0B14] text-white font-sans p-2 sm:p-4 lg:p-8 relative overflow-hidden">
      <ThemeToggle />
      <StudyTimer isActive={isChatActive} />
      
      {/* Settings Button (hidden on small screens; provided via mobile header) */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="hidden sm:flex fixed top-2 sm:top-4 left-2 sm:left-4 z-30 p-2 sm:p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full shadow-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-500/50 min-h-[44px] min-w-[44px] items-center justify-center"
            aria-label="Open settings"
            title="Customize Interface"
          >
            <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
          </button>

      {/* Account Button (desktop header now handles this) */}
      <div className="hidden"></div>

      {/* Mobile Compact Header */}
      <div className="sm:hidden sticky top-0 z-40 -mx-2 px-3 py-2 bg-black/30 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ElevatedAILogo className="w-6 h-6" showText={false} />
            <span className="font-extrabold tracking-wide bg-gradient-to-r from-purple-200 via-indigo-200 to-pink-200 bg-clip-text text-transparent">Elevated AI</span>
          </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2 rounded-lg bg-white/10 border border-white/10 text-white/80 hover:bg-white/20"
            aria-label="Open settings"
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
          <div className="relative">
            <button
              onClick={() => setIsMobileMenuOpen(v => !v)}
              className="p-2 rounded-lg bg-white/10 border border-white/10 text-white/80 hover:bg-white/20"
              aria-haspopup="menu"
              aria-expanded={isMobileMenuOpen}
              aria-label="More"
              title="More"
            >
              <EllipsisHorizontalIcon className="w-5 h-5" />
            </button>
            {isMobileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-gray-900/95 border border-white/10 rounded-xl shadow-xl p-2 z-50">
                <button
                  onClick={() => {
                    if (sessionEmail) {
                      setSettingsInitialTab('account');
                      setIsSettingsModalOpen(true);
                    } else {
                      setIsAuthModalOpen(true);
                    }
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-white/90 hover:bg-white/10"
                  title={sessionEmail ? `Signed in as ${sessionEmail}` : undefined}
                >
                  <UserIcon className={`w-4 h-4 ${sessionEmail ? 'text-green-300' : ''}`} />
                  <span className="truncate">
                    {sessionEmail ? `Account — ${sessionEmail}` : 'Account (Sign In / Up)'}
                  </span>
                </button>
                <button
                  onClick={() => { setIsHistoryModalOpen(true); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-white/90 hover:bg-white/10"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  Chat History
                </button>
                <button
                  onClick={() => { setIsImportExportModalOpen(true); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-white/90 hover:bg-white/10"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Import / Export
                </button>
                <button
                  onClick={() => { setIsExtractorModalOpen(true); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-white/90 hover:bg-white/10"
                >
                  <MagicWandIcon className="w-4 h-4" />
                  PDF Text Extractor
                </button>
                <button
                  onClick={() => { try { toggleTheme(); } catch {} setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-white/90 hover:bg-white/10"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0-1.414 1.414M7.05 16.95l-1.414 1.414"/></svg>
                  Toggle Theme
                </button>
                <button
                  onClick={() => { setIsAIInfoModalOpen(true); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-white/90 hover:bg-white/10"
                >
                  <InfoIcon className="w-4 h-4" />
                  How Our AI Works
                </button>
                <button
                  onClick={() => { setIsCollaborationModalOpen(true); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-white/90 hover:bg-white/10"
                >
                  <SettingsIcon className="w-4 h-4" />
                  Collaboration Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import/Export Button (hidden on small screens) */}
      <button
        onClick={() => setIsImportExportModalOpen(true)}
        className="hidden sm:flex fixed top-28 sm:top-28 left-2 sm:left-4 z-30 p-2 sm:p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full shadow-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-500/50 min-h-[44px] min-w-[44px] items-center justify-center"
        aria-label="Import/Export data"
        title="Import & Export"
      >
        <DownloadIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
      </button>

      {/* History Button (mobile FAB) */}
      <button
        onClick={() => setIsHistoryModalOpen(true)}
        className="sm:hidden fixed bottom-4 left-3 z-50 p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full shadow-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-500/50 min-h-[44px] min-w-[44px] items-center justify-center"
        aria-label="Open chat history"
        title="History"
      >
        <svg className="w-6 h-6 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      </button>

      {/* History Button (hidden on small screens) */}
      <button
        onClick={() => setIsHistoryModalOpen(true)}
        className="hidden sm:flex fixed top-28 sm:top-28 right-2 sm:right-4 z-30 p-2 sm:p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full shadow-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-500/50 min-h-[44px] min-w-[44px] items-center justify-center"
        aria-label="Open chat history"
        title="History"
      >
        {/* clock icon */}
        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      </button>

      {/* AI Info Button (desktop header now handles this) */}
      <div className="hidden"></div>

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
        initialTab={settingsInitialTab}
      />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
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

      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onSelectSession={handleSelectHistorySession}
      />

      {/* Extractor CTA (hidden on small screens) */}
      <button
          onClick={() => setIsExtractorModalOpen(true)}
          className="hidden sm:block group fixed bottom-4 sm:bottom-8 left-2 sm:left-4 lg:left-8 z-30 p-3 sm:p-4 bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 text-white rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500/50 animate-entry border border-purple-500/20 min-h-[44px] min-w-[44px]"
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

      <div className="container mx-auto max-w-7xl relative z-30 px-2 sm:px-4">
        {/* Desktop top bar (scrolls with page) */}
        <div className="hidden sm:flex items-center justify-between py-2">
          <div />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAIInfoModalOpen(true)}
              className="p-2 rounded-lg bg-white/10 border border-white/10 text-white/80 hover:bg-white/20"
              aria-label="How Our AI Works"
              title="How Our AI Works"
            >
              <InfoIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                if (sessionEmail) {
                  setSettingsInitialTab('account');
                  setIsSettingsModalOpen(true);
                } else {
                  setIsAuthModalOpen(true);
                }
              }}
              className="p-2 rounded-lg bg-white/10 border border-white/10 text-white/80 hover:bg-white/20 relative"
              aria-label="Open account"
              title={sessionEmail ? `Signed in as ${sessionEmail}` : 'Sign In / Sign Up'}
            >
              <UserIcon className={`w-5 h-5 ${sessionEmail ? 'text-green-300' : ''}`} />
              {sessionEmail && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full ring-2 ring-black/40" />}
            </button>
          </div>
        </div>
        <div className="lg:flex lg:flex-col lg:justify-center lg:min-h-screen">
            <header 
              className="relative z-30 text-center mb-8 sm:mb-12 animate-entry"
              style={{ animationDelay: '0.2s' }}
            >
              <div className="relative inline-flex items-center gap-3 sm:gap-5 flex-wrap justify-center">
                <div className="relative inline-flex items-center justify-center p-2 rounded-full bg-white/5 border border-white/10 shadow-lg">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-600/20 to-indigo-600/20 blur-xl" />
                  <ElevatedAILogo className="w-14 h-14 sm:w-16 sm:h-16" showText={false} />
                </div>
                <div className="relative">
                  <ElevatedAILogo className="w-[0px] h-[0px]" showText />
                  <div className="h-[3px] rounded-full mt-2 bg-gradient-to-r from-purple-500/60 via-cyan-400/60 to-pink-500/60 animate-hero-underline" />
                </div>
              </div>
              <p className="mt-4 text-base sm:text-lg text-gray-300/90 max-w-2xl mx-auto px-2">
                Upload notes or paste text to elevate your study sessions with a personal AI tutor.
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

        /* Smooth transitions when switching layout modes */
        @media (prefers-reduced-motion: no-preference) {
          .p-4, .p-6 { transition: padding 200ms ease; }
          .gap-8 { transition: gap 200ms ease; }
          .mb-12 { transition: margin 200ms ease; }
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
          pointer-events: none;
        }
        .aurora-shape {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.3;
          pointer-events: none;
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
        @media (min-inline-size: 475px) {
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
