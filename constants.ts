import type { GradeOption, AiModel } from './types';

export const GRADE_LEVELS: GradeOption[] = [
  { grade: 6, label: "6th Grade", description: "Simple terms & basic concepts" },
  { grade: 7, label: "7th Grade", description: "Building on fundamentals" },
  { grade: 8, label: "8th Grade", description: "Intro to more complex ideas" },
  { grade: 9, label: "9th Grade", description: "High school level foundations" },
  { grade: 10, label: "10th Grade", description: "Deeper analysis & connections" },
  { grade: 11, label: "11th Grade", description: "Advanced topics & critical thinking" },
  { grade: 12, label: "12th Grade", description: "College-prep level explanations" },
];

export const AI_MODELS: AiModel[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    modelName: 'gemini-2.5-flash',
    description: 'Latest Gemini 2.5 model with enhanced speed and advanced capabilities.',
    isAvailable: true,
  },
];
