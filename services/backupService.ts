import type { StudyDocument, Flashcard, QuizQuestion, GradeLevel } from '../types';

interface StudyProgress {
  documents: StudyDocument[];
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  gradeLevel: GradeLevel | null;
  lastSaved: string;
}

class BackupService {
  private readonly BACKUP_KEY = 'elevated-ai-auto-backup';
  private readonly BACKUP_INTERVAL = 30000; // 30 seconds
  private backupTimer: NodeJS.Timeout | null = null;

  // Auto-save study progress
  startAutoBackup(
    getDocuments: () => StudyDocument[],
    getFlashcards: () => Flashcard[],
    getQuiz: () => QuizQuestion[],
    getGradeLevel: () => GradeLevel | null
  ) {
    this.stopAutoBackup(); // Clear any existing timer
    
    this.backupTimer = setInterval(() => {
      this.saveProgress(getDocuments(), getFlashcards(), getQuiz(), getGradeLevel());
    }, this.BACKUP_INTERVAL);
  }

  stopAutoBackup() {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
  }

  // Manual save
  saveProgress(
    documents: StudyDocument[],
    flashcards: Flashcard[],
    quiz: QuizQuestion[],
    gradeLevel: GradeLevel | null
  ) {
    try {
      const progress: StudyProgress = {
        documents,
        flashcards,
        quiz,
        gradeLevel,
        lastSaved: new Date().toISOString(),
      };

      localStorage.setItem(this.BACKUP_KEY, JSON.stringify(progress));
    } catch (error) {
      console.warn('Failed to save progress to localStorage:', error);
    }
  }

  // Load saved progress
  loadProgress(): StudyProgress | null {
    try {
      const saved = localStorage.getItem(this.BACKUP_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load progress from localStorage:', error);
    }
    return null;
  }

  // Clear saved progress
  clearProgress() {
    localStorage.removeItem(this.BACKUP_KEY);
  }

  // Check if there's saved progress
  hasSavedProgress(): boolean {
    return localStorage.getItem(this.BACKUP_KEY) !== null;
  }

  // Get last saved time
  getLastSavedTime(): Date | null {
    const progress = this.loadProgress();
    return progress ? new Date(progress.lastSaved) : null;
  }
}

export const backupService = new BackupService();