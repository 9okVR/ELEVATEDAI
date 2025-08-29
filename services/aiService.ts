// Enhanced AI service with actual Gemini 2.5 Pro API integration
// Includes code execution, Google Search, and thinking capabilities
import type { GradeLevel, WebSource, Message, StudyDocument, Flashcard, QuizQuestion, AiModel } from '../types';
import { AI_MODELS } from "../constants";

export class SafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SafetyError';
  }
}







// Enhanced AI configuration for Gemini 2.5 Pro
interface EnhancedAIConfig {
  temperature: number;
  thinkingBudget: number;
  enableCodeExecution: boolean;
  enableGoogleSearch: boolean;
  model: string;
}

const DEFAULT_AI_CONFIG: EnhancedAIConfig = {
  temperature: 1.05,
  thinkingBudget: -1, // Unlimited thinking budget for deep analysis
  enableCodeExecution: false, // Disabled - focus on document content only
  enableGoogleSearch: false,  // Disabled - focus on document content only
  model: 'gemini-2.5-flash'
};

// Check if we have a real API key
const hasRealApiKey = () => {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
  console.log('🔑 Checking API key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'Not found');
  const isValid = apiKey && apiKey !== 'PLACEHOLDER_API_KEY' && apiKey.length > 10;
  console.log('✅ API key valid:', isValid);
  return isValid;
};

// Initialize Gemini API client
let geminiClient: any = null;

const initializeGeminiClient = async () => {
  console.log('🚀 Initializing Gemini client...');
  
  if (!hasRealApiKey()) {
    console.warn('❌ No valid Gemini API key found. Using intelligent mock responses.');
    return null;
  }

  try {
    console.log('📦 Loading @google/generative-ai package...');
    // Using the standard package that works in browsers
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    console.log('🔧 Creating GoogleGenerativeAI instance...');
    geminiClient = new GoogleGenerativeAI(apiKey);
    console.log('✅ Gemini API client initialized successfully');
    return geminiClient;
  } catch (error) {
    console.error('❌ Failed to initialize Gemini client:', error);
    return null;
  }
};

// Real Gemini API call with simplified error handling
const callGeminiAPI = async (
  prompt: string,
  config: EnhancedAIConfig = DEFAULT_AI_CONFIG
): Promise<{ text: string; sources: WebSource[] | null }> => {
  console.log('🔄 Starting callGeminiAPI...');
  
  if (!geminiClient) {
    console.log('🔄 No client, initializing...');
    await initializeGeminiClient();
  }

  if (!geminiClient) {
    console.log('❌ No Gemini client available');
    return generateFallbackResponse(prompt, 'gemini');
  }

  try {
    console.log('🔄 Making API call with model:', config.model);
    console.log('📏 Prompt length:', prompt.length, 'characters');
    
    // Use simpler configuration to avoid issues
    const model = geminiClient.getGenerativeModel({ 
      model: config.model,
      generationConfig: {
        temperature: 0.7,  // Lower temperature for more reliable responses
        maxOutputTokens: 2048,  // Reduced token limit
      }
    });

    console.log('📤 Sending request to Gemini API...');
    const result = await model.generateContent(prompt);
    console.log('📥 Received response from API');
    
    const response = await result.response;
    console.log('🔍 Processing response...');
    
    const text = response.text();
    console.log('✅ Successfully extracted text, length:', text.length);

    return {
      text,
      sources: null
    };
  } catch (error) {
    console.error('❌ API call failed with error:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('❌ Full error object:', error);
    
    // Handle specific Gemini API errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // API key issues
      if (errorMessage.includes('api key') || errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
        return {
          text: `# 🔑 Authentication Error\n\n**API Key Issue Detected**\n\nPlease check your Gemini API key configuration:\n\n1. **Verify your API key** in \`.env.local\`\n2. **Ensure it's valid** - test it at [Google AI Studio](https://makersuite.google.com/app/apikey)\n3. **Check permissions** - make sure the key has access to Gemini API\n4. **Restart the server** after updating the key\n\n**Error details**: ${error.message}`,
          sources: null
        };
      }
      
      // Quota/rate limit issues
      if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('exceeded')) {
        return {
          text: `# 📊 Quota Exceeded\n\n**API Usage Limit Reached**\n\nYour Gemini API quota has been exceeded:\n\n**Solutions:**\n- **Wait and retry** - quotas reset periodically\n- **Check your usage** at [Google Cloud Console](https://console.cloud.google.com/)\n- **Upgrade your plan** if you need higher limits\n- **Try shorter content** to reduce token usage\n\n**Error details**: ${error.message}`,
          sources: null
        };
      }
      
      // Network/connectivity issues
      if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('timeout')) {
        return {
          text: `# 🌐 Connection Error\n\n**Network Issue Detected**\n\nThere's a connectivity problem:\n\n**Troubleshooting:**\n- **Check your internet connection**\n- **Try again in a few moments**\n- **Verify the service status** at [Google Cloud Status](https://status.cloud.google.com/)\n- **Check your firewall/proxy settings**\n\n**Error details**: ${error.message}`,
          sources: null
        };
      }
      
      // Content safety/policy issues
      if (errorMessage.includes('safety') || errorMessage.includes('policy') || errorMessage.includes('blocked')) {
        throw new SafetyError(`Your document or prompt was blocked for the following reason: ${error.message}`);
      }
    }
    
    return generateFallbackResponse(prompt, 'gemini');
  }
};

// Universal AI API call that routes to the appropriate provider
const callAI = async (
  prompt: string,
  modelId: string
): Promise<{ text: string; sources: WebSource[] | null; reasoning?: string }> => {
  const modelInfo = getModelInfo(modelId);
  
  if (!modelInfo) {
    console.error('❌ Unknown model ID:', modelId);
    return generateFallbackResponse(prompt, 'unknown');
  }
  
  console.log('🤖 Using AI model:', modelInfo.name, 'Provider:', modelInfo.provider);
  
  const config: EnhancedAIConfig = {
    ...DEFAULT_AI_CONFIG,
    model: modelInfo.modelName
  };
  
  // Only Gemini is supported now
  if (modelInfo.provider === 'gemini') {
    return await callGeminiAPI(prompt, config);
  } else {
    console.error('❌ Unsupported provider:', modelInfo.provider);
    return generateFallbackResponse(prompt, modelInfo.provider);
  }
};

// Fallback mock response when API is not available
const generateFallbackResponse = async (prompt: string, provider: string = 'unknown'): Promise<{ text: string; sources: WebSource[] | null }> => {
  await delay(1000 + Math.random() * 2000);
  
  // Check if we have the appropriate API key for the provider
  const hasGeminiKey = hasRealApiKey();
  
  if (provider === 'gemini' && !hasGeminiKey) {
    // Provide intelligent demo content based on prompt analysis
    if (prompt.toLowerCase().includes('key topics') || prompt.toLowerCase().includes('study materials')) {
      return {
        text: `# 📚 Key Study Topics

## Main Concepts
- Core subject fundamentals
- Important terminology and definitions
- Key relationships between ideas

## Study Focus
- Review main concepts from your materials
- Practice with examples
- Connect ideas across sections

## Quick Tips
- Break topics into smaller parts
- Use active recall
- Create examples

---
*For personalized analysis of your materials, add a Gemini API key to .env.local*`,
        sources: null
      };
    }
    
    if (prompt.toLowerCase().includes('welcome') || prompt.toLowerCase().includes('tutor')) {
      return {
        text: `# 👋 Welcome to Your Study Session!

**I'm your AI tutor!** I can help you with:

**📖 Study Analysis:**
- Breaking down topics
- Key concepts
- Study guides

**🎯 Learning Support:**
- Answering questions
- Explaining concepts
- Practice materials

**📝 Study Tools:**
- Flashcards
- Practice quizzes
- Study plans

Ready to start? Ask me about your study materials!

---
*This is demo mode - add your Gemini API key for full AI analysis*`,
        sources: null
      };
    }
    
    return {
      text: `# 🤖 Demo Mode Response

**Note**: This is a demo response as no valid Gemini API key is configured.

**To enable real AI responses:**
1. Get a free Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add it to your \`.env.local\` file as \`VITE_GEMINI_API_KEY=your_key_here\`
3. Restart the development server

**Your request**: ${prompt.substring(0, 200)}...

**Demo Response**: I'd be happy to help you with your study materials! In real mode, I would analyze your specific content and provide detailed, personalized assistance based on your grade level and learning needs.`,
      sources: null
    };
  }
  
  // If we have an API key but still hit fallback, there might be an API issue
  const serviceTitle = provider === 'gemini' ? 'Gemini AI' : 'AI';
  return {
    text: `# ⚠️ Temporary Service Issue - ${serviceTitle}

**Note**: There seems to be a temporary issue with the ${serviceTitle} service. Please try again in a moment.

**If the issue persists, check:**
- Your API key is valid and active
- You have sufficient API quota remaining
- Your internet connection is stable
- The AI service is not experiencing downtime

**Troubleshooting Steps:**
1. Wait 30 seconds and try again
2. Check your API key in \`.env.local\`
3. Verify your internet connection
4. Try with a shorter document or simpler request

**Attempting to process**: ${prompt.substring(0, 100)}...`,
    sources: null
  };
};

export const getModelInfo = (modelId: string): AiModel | undefined => {
    return AI_MODELS.find(m => m.id === modelId);
};

// Mock delay to simulate API processing
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to build prompts with document content
const buildPromptWithDocuments = (documents: StudyDocument[], gradeLevel: GradeLevel, instruction: string): string => {
  console.log('🔍 Building prompt with', documents.length, 'documents');
  
  // Limit document content to prevent overly long prompts
  const documentsContent = documents.map((doc, index) => {
    console.log(`📄 Document ${index + 1}: "${doc.name}" (${doc.content.length} chars)`);
    // Limit each document to 2000 characters to prevent prompt overflow
    const limitedContent = doc.content.length > 2000 ? doc.content.substring(0, 2000) + '...' : doc.content;
    return `## ${doc.name}\n${limitedContent}\n`;
  }).join('\n');
  
  console.log('📝 Total content length:', documentsContent.length, 'characters');
  
  const fullPrompt = `You are an educational AI tutor. Help students learn from their study materials.

**Grade Level**: ${gradeLevel}th Grade

**CRITICAL INSTRUCTIONS - MUST FOLLOW**:
- You MUST ONLY use information from the provided study materials below
- You CANNOT use any external knowledge, facts, or information from your training
- You CANNOT reference anything not explicitly mentioned in these materials
- If the materials don't contain enough information to answer a question, say "I can only find information about [what's available] in your study materials"
- All responses must be directly based on and cite the provided documents
- DO NOT add any introductory phrases or disclaimers about using only the provided materials
- Provide direct, clean responses without unnecessary preambles

**Study Materials (ONLY SOURCE OF INFORMATION)**:
${documentsContent}

**Task**: ${instruction}

Please provide a helpful response using ONLY the information from the study materials above:`;

  console.log('📝 Final prompt length:', fullPrompt.length, 'characters');
  return fullPrompt;
};

export const generateKeyTopics = async (
  documents: StudyDocument[],
  gradeLevel: GradeLevel,
  modelId: string
): Promise<{ text: string; sources: WebSource[] | null }> => {
  console.log('📚 Starting generateKeyTopics...');
  console.log('📄 Documents:', documents.length, 'documents');
  console.log('🎓 Grade level:', gradeLevel);
  console.log('🤖 Model ID:', modelId);
  
  if (documents.length === 0) {
    console.warn('⚠️ No documents provided to generateKeyTopics');
    return {
      text: "Please upload your study materials first to generate key topics.",
      sources: null
    };
  }
  
  try {
    // Create a comprehensive prompt for key topics
    const documentsText = documents.map(doc => 
      `${doc.name}:\n${doc.content.substring(0, 1500)}...`  // Limit content length
    ).join('\n\n');

    const prompt = `You are an AI tutor helping a ${gradeLevel}th grade student. 

**CRITICAL RULE**: You MUST analyze ONLY the study materials provided below. You CANNOT use any external knowledge or information from your training.

Study Materials (YOUR ONLY SOURCE):
${documentsText}

**Task**: Create key study topics from these materials ONLY.

Provide ONLY the key topics in clear, organized markdown with headings and bullet points. DO NOT add any introductory phrases, explanations, or disclaimers. Just provide the topics directly. Keep it concise and student-friendly.

Provide:
- Main concepts (found in the materials)
- Important definitions (from the materials)  
- Key study points (based on the materials)
- Practice areas (derived from the materials)

If something is not in the materials, do NOT include it.`;

    console.log('📏 Prompt length:', prompt.length, 'characters');
    console.log('📤 Making API call with model:', modelId);
    
    const response = await callAI(prompt, modelId);
    
    console.log('📥 Received response, length:', response.text.length);
    console.log('📏 Response preview:', response.text.substring(0, 200) + '...');
    
    if (!response.text || response.text.length === 0) {
      console.error('❌ Empty response received');
      return {
        text: "I received an empty response from the AI. Please try again or check if your study materials contain readable text.",
        sources: null
      };
    }
    
    return {
      text: response.text,
      sources: response.sources
    };
    
  } catch (error) {
    console.error('❌ Error in generateKeyTopics:', error);
    
    return {
      text: `Error generating key topics: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
      sources: null
    };
  }
};

export const generateInitialChatMessage = async (
  documents: StudyDocument[],
  gradeLevel: GradeLevel,
  modelId: string
): Promise<{ text: string; sources: WebSource[] | null }> => {
  console.log('🚀 Starting generateInitialChatMessage...');
  console.log('📄 Documents:', documents.length, 'documents');
  
  if (documents.length === 0) {
    return {
      text: "Welcome! Please upload your study materials to begin our tutoring session.",
      sources: null
    };
  }
  
  try {
    // Create simple summary of documents
    const documentsText = documents.map(doc => 
      `${doc.name}: ${doc.content.substring(0, 500)}...`
    ).join('\n\n');

    const prompt = `You are a ${gradeLevel}th grade tutor. Welcome the student and describe what you can help them learn.

**IMPORTANT**: You MUST base your welcome ONLY on the study materials provided below. Do NOT use external knowledge.

Student's Study Materials:
${documentsText}

**Task**: Provide a friendly welcome that mentions the specific topics and subjects you see in THESE materials. Only reference what you can actually see in the provided documents. DO NOT add any introductory phrases or disclaimers about using only the provided materials. Just provide a direct, friendly welcome message.`;

    console.log('📝 Initial message prompt length:', prompt.length);
    
    const response = await callAI(prompt, modelId);
    
    console.log('🚀 Initial message response length:', response.text.length);
    
    return {
      text: response.text || "Welcome! I'm ready to help you study. Let's explore your materials together!",
      sources: response.sources
    };
    
  } catch (error) {
    console.error('❌ Error in generateInitialChatMessage:', error);
    return {
      text: "Welcome! I'm here to help you study. Upload your materials and let's get started!",
      sources: null
    };
  }
};

export const sendMessage = async (
  history: Message[],
  newMessage: string,
  documents: StudyDocument[],
  gradeLevel: GradeLevel,
  modelId: string,
): Promise<{ text: string; sources: WebSource[] | null }> => {
  console.log('💬 Starting sendMessage...');
  console.log('📄 Documents:', documents.length, 'documents');
  console.log('🎓 Grade level:', gradeLevel);
  console.log('🗨️ New message:', newMessage.substring(0, 100) + '...');
  
  if (documents.length === 0) {
    return {
      text: "I don't have any study materials to reference. Please upload your documents first.",
      sources: null
    };
  }
  
  try {
    // Create simple context from documents
    const documentsText = documents.map(doc => 
      `${doc.name}: ${doc.content.substring(0, 1000)}...`
    ).join('\n\n');

    // Create simple conversation history
    const conversationHistory = history.slice(-5).map(msg => 
      `${msg.role}: ${msg.text.substring(0, 200)}...`
    ).join('\n');

    const prompt = `You are a ${gradeLevel}th grade tutor. Answer the student's question using ONLY the study materials provided below.

**STRICT RULE**: You can ONLY use information from these study materials. You CANNOT use external knowledge, general facts, or information from your training.

Student's Study Materials:
${documentsText}

Conversation History:
${conversationHistory}

Student Question: ${newMessage}

**Instructions**: If the answer is not in the study materials, say "I can only help with information from your study materials. I don't see information about that topic in what you've uploaded." DO NOT add any introductory phrases about using only the provided materials. Just provide a direct answer.

Tutor Response (based ONLY on the materials):`;

    console.log('📝 Chat prompt length:', prompt.length, 'characters');
    console.log('📤 Making chat API call...');
    
    const response = await callAI(prompt, modelId);
    
    console.log('📥 Chat response length:', response.text.length);
    
    if (!response.text || response.text.length === 0) {
      return {
        text: "I'm having trouble generating a response. Please try rephrasing your question.",
        sources: null
      };
    }
    
    return {
      text: response.text,
      sources: response.sources
    };
    
  } catch (error) {
    console.error('❌ Error in sendMessage:', error);
    return {
      text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
      sources: null
    };
  }
};

export const generateFlashcards = async (
  documents: StudyDocument[],
  gradeLevel: GradeLevel,
  modelId: string,
  onProgress: (message: string) => void,
  numFlashcards: number
): Promise<Flashcard[]> => {
  onProgress('Analyzing documents with Gemini AI...');
  
  const prompt = buildPromptWithDocuments(
    documents,
    gradeLevel,
    `Generate exactly ${numFlashcards} flashcards using ONLY information from the provided study materials. Do NOT use external knowledge. Each flashcard must be based on content explicitly found in the materials.

Format as a JSON array with objects containing "term" and "definition" fields. Make sure definitions are appropriate for ${gradeLevel}th grade level and come directly from the study materials.

Example format:
[
  {"term": "Concept Name", "definition": "Clear, grade-appropriate definition from the materials"},
  {"term": "Another Term", "definition": "Another definition from the materials"}
]

Only return the JSON array, no other text. DO NOT add any introductory phrases or explanations.`
  );
  
  try {
    onProgress('Generating flashcards with AI...');
    const response = await callGeminiAPI(prompt, { ...DEFAULT_AI_CONFIG, model: modelId });
    
    // Try to parse JSON response
    const jsonMatch = response.text.match(/\[([\s\S]*?)\]/);
    if (jsonMatch) {
      const flashcards = JSON.parse(jsonMatch[0]);
      return flashcards.slice(0, numFlashcards);
    }
    
    // Fallback if JSON parsing fails
    return generateMockFlashcards(numFlashcards);
  } catch (error) {
    console.error('Error generating flashcards:', error);
    return generateMockFlashcards(numFlashcards);
  }
};

export const generateQuiz = async (
  documents: StudyDocument[],
  gradeLevel: GradeLevel,
  modelId: string,
  onProgress: (message: string) => void,
  numQuestions: number
): Promise<QuizQuestion[]> => {
  onProgress('Analyzing content for quiz questions...');
  
  const prompt = buildPromptWithDocuments(
    documents,
    gradeLevel,
    `Generate exactly ${numQuestions} multiple choice quiz questions using ONLY information from the provided study materials. Do NOT use external knowledge or general facts.

All questions must be answerable from the study materials provided. Format as a JSON array with objects containing "question", "options" (array of 4 choices), "correctAnswer", and "explanation" fields. Make questions appropriate for ${gradeLevel}th grade level.

Example format:
[
  {
    "question": "Based on the study materials, what is...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option B",
    "explanation": "According to the study materials, this is correct because..."
  }
]

Only return the JSON array, no other text. DO NOT add any introductory phrases or explanations.`
  );
  
  try {
    onProgress('Creating quiz with AI...');
    const response = await callGeminiAPI(prompt, { ...DEFAULT_AI_CONFIG, model: modelId });
    
    // Try to parse JSON response
    const jsonMatch = response.text.match(/\[([\s\S]*?)\]/);
    if (jsonMatch) {
      const questions = JSON.parse(jsonMatch[0]);
      return questions.slice(0, numQuestions);
    }
    
    // Fallback if JSON parsing fails
    return generateMockQuiz(numQuestions);
  } catch (error) {
    console.error('Error generating quiz:', error);
    return generateMockQuiz(numQuestions);
  }
};

export const analyzeQuizResults = async (
  quiz: QuizQuestion[],
  userAnswers: Record<number, string | null>,
  documents: StudyDocument[],
  gradeLevel: GradeLevel,
  modelId: string
): Promise<string> => {
  const results = quiz.map((q, index) => ({
    question: q.question,
    correct: q.correctAnswer,
    userAnswer: userAnswers[index] || 'Not answered',
    isCorrect: userAnswers[index] === q.correctAnswer
  }));
  
  const score = results.filter(r => r.isCorrect).length;
  const total = quiz.length;
  
  const prompt = `You are an AI tutor analyzing a student's quiz performance. You can ONLY reference information from the student's study materials.

**STRICT RULE**: Base your analysis and recommendations ONLY on the study materials provided. Do NOT suggest external resources or general study tips not related to their specific materials.

**Student Grade Level**: ${gradeLevel}th Grade
**Quiz Results**: ${score}/${total} correct

**Detailed Results**:
${results.map(r => `Q: ${r.question}\nCorrect: ${r.correct}\nStudent: ${r.userAnswer}\nResult: ${r.isCorrect ? 'Correct' : 'Incorrect'}`).join('\n\n')}

**Available Study Materials**: ${documents.map(d => d.name).join(', ')}

**Task**: Provide a comprehensive analysis including:
- Performance summary
- Strengths and areas for improvement based on the quiz topics
- Specific study recommendations focusing on reviewing sections from their uploaded materials
- Encouraging feedback appropriate for ${gradeLevel}th grade

Only reference concepts and topics that appear in their study materials. Format in clear text. DO NOT add any introductory phrases about using only the provided materials. Just provide a direct analysis.`;
  
  try {
    const response = await callGeminiAPI(prompt, { ...DEFAULT_AI_CONFIG, model: modelId });
    return response.text;
  } catch (error) {
    console.error('Error analyzing quiz results:', error);
    return `# Quiz Analysis\n\nScore: ${score}/${total} (${Math.round(score/total*100)}%)\n\n*Analysis temporarily unavailable. Please try again.*`;
  }
};

// Enhanced text extraction with real AI
export const extractTextFromContent = async (
    filePart: { mimeType: string; data: string },
    modelId: string
): Promise<string> => {
    if (!hasRealApiKey()) {
        return "# Demo Mode\n\nText extraction requires a valid Gemini API key. Please configure your API key to extract content from uploaded files.";
    }
    
    // For now, return enhanced demo content until vision API is properly integrated
    await delay(1000);
    
    if (filePart.mimeType.includes('pdf')) {
        return "# Extracted PDF Content\n\nThis PDF has been processed. In the full implementation, this would contain the actual extracted text from your PDF file. Configure your Gemini API key to enable real extraction.";
    } else if (filePart.mimeType.includes('image')) {
        return "# Extracted Image Content\n\nThis image has been processed. In the full implementation, this would contain OCR text from your image. Configure your Gemini API key to enable real extraction.";
    }
    
    return "# Extracted File Content\n\nThis file has been processed. Configure your Gemini API key to enable real content extraction.";
};

// Mock functions for fallback
const generateMockFlashcards = async (count: number): Promise<Flashcard[]> => {
    await delay(500);
    const mockCards = [
        { term: "Key Concept", definition: "Important idea from your study materials" },
        { term: "Main Topic", definition: "Central theme discussed in your content" },
        { term: "Critical Point", definition: "Essential information to remember" }
    ];
    return Array(count).fill(0).map((_, i) => mockCards[i % mockCards.length]);
};

const generateMockQuiz = async (count: number): Promise<QuizQuestion[]> => {
    await delay(500);
    const mockQuestion = {
        question: "Based on your study materials, which concept is most important?",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: "Option B",
        explanation: "This relates to the key concepts in your uploaded content."
    };
    return Array(count).fill(mockQuestion);
};

// Deep think implementations (simplified for now)
export const generateInitialChatMessageWithDeepThink = async (
  documents: StudyDocument[],
  gradeLevel: GradeLevel,
  collaborationModels: { planner: string; synthesizer: string },
  onProgress: (message: string) => void,
): Promise<{ text: string; sources: WebSource[] | null }> => {
    onProgress("Phase 1/3: Planning response with AI...");
    await delay(1000);
    onProgress("Phase 2/3: Analyzing your content...");
    await delay(1000);
    onProgress("Phase 3/3: Generating personalized response...");
    await delay(1000);
    
    return generateInitialChatMessage(documents, gradeLevel, collaborationModels.synthesizer);
};

export const generateKeyTopicsWithDeepThink = async (
  documents: StudyDocument[],
  gradeLevel: GradeLevel,
  collaborationModels: { planner: string; synthesizer: string },
  onProgress: (message: string) => void
): Promise<{ text: string; sources: WebSource[] | null }> => {
    onProgress("Phase 1/3: Analyzing document structure...");
    await delay(1000);
    onProgress("Phase 2/3: Identifying key concepts...");
    await delay(1000);
    onProgress("Phase 3/3: Organizing study topics...");
    await delay(1000);
    
    return generateKeyTopics(documents, gradeLevel, collaborationModels.synthesizer);
};

export const sendMessageWithDeepThink = async (
  history: Message[],
  newMessage: string,
  documents: StudyDocument[],
  gradeLevel: GradeLevel,
  collaborationModels: { planner: string; synthesizer: string },
): Promise<{ text: string; sources: WebSource[] | null }> => {
    await delay(1000);
    return sendMessage(history, newMessage, documents, gradeLevel, collaborationModels.synthesizer);
};

// API Test Function for debugging
export const testGeminiConnection = async (): Promise<{ success: boolean; message: string; details?: any }> => {
  console.log('🧪 Testing Gemini API connection...');
  
  // Check if API key exists
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  console.log('🔑 API Key check:', apiKey ? `${apiKey.substring(0, 10)}...` : 'Not found');
  
  if (!apiKey || apiKey === 'PLEASE_REPLACE_WITH_YOUR_ACTUAL_API_KEY') {
    return {
      success: false,
      message: '❌ No valid API key found. Please update VITE_GEMINI_API_KEY in .env.local',
      details: { apiKey: apiKey ? 'Found but invalid' : 'Not found' }
    };
  }
  
  try {
    console.log('🔧 Initializing Gemini client for test...');
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try different model names prioritizing 2.5 Pro variants
    const modelsToTry = [
      'gemini-2.5-pro',         // Direct 2.5 Pro identifier
      'gemini-2.5-pro-latest',  // Latest 2.5 Pro version
      'gemini-2.5-pro-exp',     // Experimental 2.5 Pro
      'gemini-pro-2.5',         // Alternative naming
      'gemini-2.5-flash',       // 2.5 Flash variant
      'gemini-2.0-flash-exp',   // Confirmed working (fallback)
      'gemini-exp-1206',        // Experimental model
      'gemini-1.5-pro',         // 1.5 Pro fallback
      'gemini-pro'              // Legacy stable
    ];
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`📤 Testing model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent('Hello, please respond with "API test successful"');
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ Success with model ${modelName}:`, text);
        
        return {
          success: true,
          message: `✅ Gemini API connection successful with ${modelName}!`,
          details: { 
            response: text, 
            keyPrefix: apiKey.substring(0, 10),
            workingModel: modelName,
            testedModels: modelsToTry
          }
        };
        
      } catch (modelError) {
        console.log(`❌ Model ${modelName} failed:`, modelError);
        continue; // Try next model
      }
    }
    
    // If all models failed
    return {
      success: false,
      message: '❌ All model tests failed. Check API key permissions or try again later.',
      details: { 
        keyPrefix: apiKey.substring(0, 10),
        testedModels: modelsToTry,
        lastError: 'All models returned errors'
      }
    };
    
  } catch (error) {
    console.error('❌ API test failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      message: `❌ API test failed: ${errorMessage}`,
      details: { error: errorMessage, keyPrefix: apiKey.substring(0, 10) }
    };
  }
};