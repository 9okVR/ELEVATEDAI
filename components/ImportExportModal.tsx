import React, { useState, useRef, useEffect } from 'react';
import { importExportService, ExportFormat, StudySet } from '../services/importExportService';
import { createChatSession, updateChatSession, addChatMessage, saveFlashcardSet, saveQuiz } from '../services/historyService';
import type { StudyDocument, Flashcard, QuizQuestion, GradeLevel } from '../types';
import DownloadIcon from './icons/DownloadIcon';
import UploadIcon from './icons/UploadIcon';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: StudyDocument[];
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  gradeLevel: GradeLevel | null;
  onImportDocuments: (documents: StudyDocument[]) => void;
  onImportFlashcards: (flashcards: Flashcard[]) => void;
  onImportQuiz: (quiz: QuizQuestion[]) => void;
  onImportGradeLevel: (grade: GradeLevel) => void;
}

const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  documents,
  flashcards,
  quiz,
  gradeLevel,
  onImportDocuments,
  onImportFlashcards,
  onImportQuiz,
  onImportGradeLevel,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [show, setShow] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => setShow(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
      // Delay unmounting to allow fade-out animation
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Lock body scroll while modal is open (prevents background scroll/cropping on mobile)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!shouldRender) return null;

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExport = async (format: ExportFormat) => {
    if (!gradeLevel) {
      showMessage('error', 'Please select a grade level before exporting');
      return;
    }

    setIsProcessing(true);
    try {
      await importExportService.exportStudyData(documents, flashcards, quiz, gradeLevel, format);
      showMessage('success', `Successfully exported as ${format.toUpperCase()}`);
    } catch (error) {
      showMessage('error', 'Failed to export: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const data = await importExportService.importStudyData(file) as any;
      // If it's a sessions bundle from HistoryModal
      if (data && data.type === 'elevated-ai/sessions' && Array.isArray(data.sessions)) {
        let imported = 0;
        for (const entry of data.sessions) {
          try {
            const s = entry.session || {};
            const created = await createChatSession({
              flashcard_set_id: null,
              quiz_id: null,
              grade_level: typeof s.grade_level === 'number' ? s.grade_level : null,
            });
            if (!created.ok || !created.id) continue;
            const sid = created.id;
            // Link flashcards
            if (entry.flashcards && Array.isArray(entry.flashcards.items)) {
              try {
                const res = await saveFlashcardSet(entry.flashcards.items);
                if (res.ok && res.id) await updateChatSession({ id: sid, flashcard_set_id: res.id });
              } catch {}
            }
            // Link quiz
            if (entry.quiz && Array.isArray(entry.quiz.items)) {
              try {
                const res = await saveQuiz(entry.quiz.items, entry.quiz.results ?? null);
                if (res.ok && res.id) await updateChatSession({ id: sid, quiz_id: res.id });
              } catch {}
            }
            // Update metadata: title, topics, sources, documents, grade
            try {
              const patch: any = {};
              if (typeof s.title === 'string' && s.title.trim()) patch.title = s.title.slice(0, 120);
              if (typeof s.topics === 'string') patch.topics = s.topics;
              if (s.topics_sources) patch.topics_sources = s.topics_sources;
              if (Array.isArray(s.documents)) patch.documents = s.documents;
              if (typeof s.grade_level === 'number') patch.grade_level = s.grade_level;
              if (Object.keys(patch).length) await updateChatSession({ id: sid, ...patch });
            } catch {}
            // Recreate messages in order
            if (Array.isArray(entry.messages)) {
              for (const m of entry.messages) {
                try {
                  const role = m.role === 'model' ? 'assistant' : m.role; // tolerate alternative role naming
                  await addChatMessage(sid, role, String(m.content ?? m.text ?? ''));
                } catch {}
              }
            }
            imported++;
          } catch {}
        }
        showMessage('success', `Imported ${imported} session${imported === 1 ? '' : 's'}!`);
      } else {
        // Regular study data import
        if (data.documents && data.documents.length > 0) {
          onImportDocuments(data.documents);
        }
        if (data.flashcards && data.flashcards.length > 0) {
          onImportFlashcards(data.flashcards);
        }
        if (data.quiz && data.quiz.length > 0) {
          onImportQuiz(data.quiz);
        }
        if (data.gradeLevel) {
          onImportGradeLevel(data.gradeLevel);
        }
        showMessage('success', 'Successfully imported study data!');
      }
    } catch (error) {
      showMessage('error', 'Failed to import: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const flashcards = await importExportService.importFlashcardsFromCSV(file);
      onImportFlashcards(flashcards);
      showMessage('success', `Successfully imported ${flashcards.length} flashcards!`);
    } catch (error) {
      showMessage('error', 'Failed to import CSV: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
      if (csvInputRef.current) {
        csvInputRef.current.value = '';
      }
    }
  };

  const handleCreateStudySet = () => {
    if (!gradeLevel) {
      showMessage('error', 'Please select a grade level before creating a study set');
      return;
    }

    const studySet: StudySet = {
      id: Date.now().toString(),
      title: `Study Set - ${new Date().toLocaleDateString()}`,
      description: `Study materials for ${gradeLevel}th grade`,
      documents,
      flashcards,
      quiz,
      gradeLevel,
      createdAt: new Date(),
      tags: ['exported', `grade-${gradeLevel}`],
    };

    importExportService.exportStudySet(studySet);
    showMessage('success', 'Study set exported successfully!');
  };

  return (
    <>
      <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 pt-safe pb-safe overscroll-contain transition-opacity duration-300 ease-out ${
        show ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-all duration-300 ease-out ${
          show ? 'opacity-100' : 'opacity-0'
        }`} onClick={onClose}></div>
        <div className={`relative bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] max-h-[90dvh] overflow-y-auto transform transition-all duration-300 ease-out ${
          show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Import & Export</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                aria-label="Close import/export"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-white/10 mb-6">
            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors ${
                activeTab === 'export'
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <DownloadIcon className="w-5 h-5" />
              Export
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors ${
                activeTab === 'import'
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <UploadIcon className="w-5 h-5" />
              Import
            </button>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mb-4 p-4 rounded-lg border ${
              message.type === 'success'
                ? 'bg-green-500/20 border-green-500/30 text-green-300'
                : 'bg-red-500/20 border-red-500/30 text-red-300'
            }`}>
              {message.text}
            </div>
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Export Study Data</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleExport('json')}
                    disabled={isProcessing}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="font-semibold text-white mb-1">JSON Format</div>
                    <div className="text-sm text-gray-400">Complete data with all features</div>
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    disabled={isProcessing}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="font-semibold text-white mb-1">CSV Format</div>
                    <div className="text-sm text-gray-400">Flashcards only, spreadsheet compatible</div>
                  </button>
                  <button
                    onClick={() => handleExport('txt')}
                    disabled={isProcessing}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="font-semibold text-white mb-1">Text Format</div>
                    <div className="text-sm text-gray-400">Human-readable study guide</div>
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={isProcessing}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="font-semibold text-white mb-1">PDF Format</div>
                    <div className="text-sm text-gray-400">Printable study guide</div>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Create Study Set</h3>
                <button
                  onClick={handleCreateStudySet}
                  disabled={isProcessing}
                  className="w-full p-4 rounded-xl bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 transition-colors text-left disabled:opacity-50"
                >
                  <div className="font-semibold text-white mb-1">Export Study Set</div>
                  <div className="text-sm text-gray-400">Shareable package with metadata</div>
                </button>
              </div>
            </div>
          )}

          {/* Import Tab */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Import Study Data</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="font-semibold text-white mb-1">Import JSON File</div>
                    <div className="text-sm text-gray-400">Restore complete study data from Elevated AI export</div>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="hidden"
                  />

                  <button
                    onClick={() => csvInputRef.current?.click()}
                    disabled={isProcessing}
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="font-semibold text-white mb-1">Import CSV Flashcards</div>
                    <div className="text-sm text-gray-400">Import flashcards from CSV (Term, Definition format)</div>
                  </button>
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <h4 className="font-semibold text-blue-300 mb-2">Import Tips</h4>
                <ul className="text-sm text-blue-200 space-y-1 list-disc pl-5">
                  <li>JSON files preserve all data including quiz questions and metadata</li>
                  <li>CSV files should have "Term" and "Definition" columns</li>
                  <li>Importing will add to existing data, not replace it</li>
                  <li>Large files may take a few seconds to process</li>
                </ul>
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-3 text-purple-300">
                <div className="relative w-5 h-5">
                  <div className="absolute w-5 h-5 border-2 border-transparent border-t-purple-400 border-r-purple-400 rounded-full animate-spin"></div>
                  <div className="absolute w-3 h-3 top-1 left-1 border-2 border-transparent border-b-indigo-400 rounded-full animate-spin-reverse"></div>
                  <div className="absolute w-1 h-1 top-2 left-2 bg-purple-500 rounded-full animate-pulse"></div>
                </div>
                <span className="font-medium tracking-wide animate-pulse">Processing...</span>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ImportExportModal;
