
export interface StudyDocument {
  id: number;
  name: string;
  content: string;
  status: 'ready' | 'processing' | 'error';
}

export type GradeLevel = 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface GradeOption {
  grade: GradeLevel;
  label: string;
  description: string;
}

export interface WebSource {
  web: {
    uri: string;
    title: string;
  };
}

export interface Message {
  role: 'user' | 'model' | 'system';
  text: string;
  sources?: WebSource[] | null;
}

export interface Flashcard {
  term: string;
  definition: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface AiModel {
  id: string; // Unique identifier for the app's state
  name: string; // Display name in the UI
  provider: 'gemini';
  modelName: string; // The actual model name for the API call
  description: string;
  isAvailable: boolean;
}