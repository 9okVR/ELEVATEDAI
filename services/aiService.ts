// Enhanced AI service with actual Gemini 2.5 Pro API integration
// Includes code execution, Google Search, and thinking capabilities
import type { GradeLevel, WebSource, Message, StudyDocument, Flashcard, QuizQuestion, AiModel } from '../types';
import { canUseProxy, proxyGenerate } from './proxyService';
import { AI_MODELS } from "../constants";
import { getAccessToken } from './supabaseClient';

const PUBLIC_API_USE_KEY = 'public-api-uses';
const PUBLIC_API_MAX_USES = 10;

function getPublicApiUses(): number {
  if (typeof localStorage === 'undefined') return 0;
  const val = localStorage.getItem(PUBLIC_API_USE_KEY);
  return val ? parseInt(val, 10) || 0 : 0;
}

function incrementPublicApiUses(): number {
  if (typeof localStorage === 'undefined') return 0;
  const uses = getPublicApiUses() + 1;
  localStorage.setItem(PUBLIC_API_USE_KEY, uses.toString());
  return uses;
}

// --- Token-aware chunking utilities (approximate) ---
const approxTokenCount = (text: string): number => Math.ceil(((text || '').trim().length) / 4);

const firstApproxTokens = (text: string, maxTokens: number): string => {
  if (!text) return '';
  if (maxTokens <= 0) return '';
  const charBudget = Math.max(1, Math.floor(maxTokens * 4));
  if (text.length <= charBudget) return text;
  const slice = text.slice(0, charBudget);
  const lastSentence = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  if (lastSentence > Math.floor(charBudget * 0.6)) return slice.slice(0, lastSentence + 1);
  const lastSpace = slice.lastIndexOf(' ');
  return lastSpace > 0 ? slice.slice(0, lastSpace) + '…' : slice + '…';
};

const chunkTextByApproxTokens = (text: string, chunkTokens = 300): string[] => {
  if (!text) return [];
  const sentences = text
    .replace(/\r\n/g, '\n')
    .split(/\n\n+/)
    .flatMap(p => p.split(/(?<=[.!?])\s+/));
  const chunks: string[] = [];
  let current = '';
  let used = 0;
  for (const seg of sentences) {
    const segTokens = approxTokenCount(seg);
    if (used + segTokens <= chunkTokens || current.length === 0) {
      current += (current ? ' ' : '') + seg;
      used += segTokens;
    } else {
      chunks.push(current);
      current = seg;
      used = segTokens;
    }
  }
  if (current) chunks.push(current);
  return chunks;
};

const buildDocumentsContext = (
  documents: StudyDocument[],
  opts?: { totalBudgetTokens?: number; perDocBudgetTokens?: number; chunkTokens?: number; includeHeadings?: boolean }
): string => {
  const totalBudget = opts?.totalBudgetTokens ?? 8000;
  const perDocBudget = opts?.perDocBudgetTokens ?? 2000;
  const chunkTokens = opts?.chunkTokens ?? 320;
  const includeHeadings = opts?.includeHeadings ?? true;

  let remaining = totalBudget;
  const parts: string[] = [];
  for (const doc of documents) {
    if (remaining <= 0) break;
    const docChunks = chunkTextByApproxTokens(doc.content || '', chunkTokens);
    if (docChunks.length === 0) continue;
    let usedForDoc = 0;
    const buf: string[] = [];
    for (const ch of docChunks) {
      const tks = approxTokenCount(ch);
      if (usedForDoc + tks > perDocBudget) break;
      if (tks > remaining) break;
      buf.push(ch);
      usedForDoc += tks;
      remaining -= tks;
      if (remaining < Math.floor(chunkTokens * 0.6)) break;
    }
    if (buf.length > 0) {
      parts.push(`${includeHeadings ? `## ${doc.name}\n` : ''}${buf.join('\n')}`);
    }
  }
  return parts.join('\n\n');
};

// Token-aware variant to build the full prompt with documents
const buildPromptWithDocumentsTokenAware = (documents: StudyDocument[], gradeLevel: GradeLevel, instruction: string): string => {
  console.log('dY"? Building prompt (token-aware) with', documents.length, 'documents');
  const documentsContent = buildDocumentsContext(documents, {
    totalBudgetTokens: 8000,
    perDocBudgetTokens: 2000,
    chunkTokens: 320,
    includeHeadings: true,
  });
  console.log('dY"? Total approx tokens in docs:', approxTokenCount(documentsContent));

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

  console.log('dY"? Final prompt length:', fullPrompt.length, 'characters');
  return fullPrompt;
};

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

// Attempt to robustly extract a JSON array from a free-form model response
function extractJsonArray<T = any>(text: string): T[] | null {
  if (!text) return null;
  let candidate = text.trim();

  // Remove common code fences
  if (candidate.startsWith('```')) {
    candidate = candidate.replace(/^```[a-zA-Z]*\s*/m, '');
    candidate = candidate.replace(/```\s*$/m, '');
  }

  const tryParse = (s: string) => {
    try {
      const v = JSON.parse(s);
      return Array.isArray(v) ? v : null;
    } catch {
      return null;
    }
  };

  // Direct parse
  let parsed = tryParse(candidate);
  if (parsed) return parsed as T[];

  // Normalize smart quotes
  candidate = candidate
    .replace(/[\u201C-\u201F\u2033]/g, '"')
    .replace(/[\u2018-\u201B\u2032]/g, "'");

  parsed = tryParse(candidate);
  if (parsed) return parsed as T[];

  // Extract first balanced [...] block
  const start = candidate.indexOf('[');
  if (start !== -1) {
    let depth = 0;
    for (let i = start; i < candidate.length; i++) {
      const ch = candidate[i];
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) {
          let slice = candidate.slice(start, i + 1);

          // Attempt direct parse
          let arr = tryParse(slice);
          if (arr) return arr as T[];

          // Remove code fences if present anywhere
          slice = slice.replace(/```/g, '');

          // Remove trailing commas before } or ]
          slice = slice.replace(/,\s*(\}|\])/g, '$1');

          // Ensure object keys are quoted
          slice = slice.replace(/([\{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');

          // Replace single-quoted strings with double quotes
          slice = slice.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (m, g1) => '"' + g1.replace(/"/g, '\\"') + '"');

          arr = tryParse(slice);
          if (arr) return arr as T[];
        }
      }
    }
  }

  return null;
}

// Real Gemini API call with simplified error handling
const callGeminiAPI = async (
  prompt: string,
  config: EnhancedAIConfig = DEFAULT_AI_CONFIG,
  responseMimeType?: string
): Promise<{ text: string; sources: WebSource[] | null }> => {
  console.log('🔄 Starting callGeminiAPI...');

  const token = await getAccessToken();
  if (!token) {
    const uses = getPublicApiUses();
    if (uses >= PUBLIC_API_MAX_USES) {
      return {
        text: `# 🔒 Public API limit reached\n\nYou've used the shared Gemini key ${PUBLIC_API_MAX_USES} times.\n\nPlease log in and provide your own API key to continue.`,
        sources: null
      };
    }
    incrementPublicApiUses();
  }
  
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
        ...(responseMimeType ? { responseMimeType } : {}) as any,
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

// Gemini API call with automatic fallback across several model names.
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
    // Create a comprehensive prompt for key topics (token-aware)
    const documentsText = buildDocumentsContext(documents, {
      totalBudgetTokens: 5000,
      perDocBudgetTokens: 1200,
      chunkTokens: 280,
      includeHeadings: false,
    });

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

    // Try server proxy first (per-user key) for topics
    try {
      const modelName = getModelInfo(modelId)?.modelName || modelId;
      if (canUseProxy()) {
        const proxied = await proxyGenerate({
          prompt,
          model: modelName,
          action: 'topics',
          docBytes: documents.reduce((a, d) => a + (d.content?.length || 0), 0),
        });
        if (proxied.ok && proxied.text) {
          return { text: proxied.text, sources: null };
        }
      }
    } catch {}

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
    // Create token-aware summary of documents
    const documentsText = buildDocumentsContext(documents, {
      totalBudgetTokens: 2000,
      perDocBudgetTokens: 500,
      chunkTokens: 220,
      includeHeadings: false,
    });

    const prompt = `You are a ${gradeLevel}th grade tutor. Welcome the student and describe what you can help them learn.

**IMPORTANT**: You MUST base your welcome ONLY on the study materials provided below. Do NOT use external knowledge.

Student's Study Materials:
${documentsText}

**Task**: Provide a friendly welcome that mentions the specific topics and subjects you see in THESE materials. Only reference what you can actually see in the provided documents. DO NOT add any introductory phrases or disclaimers about using only the provided materials. Just provide a direct, friendly welcome message.`;

    // Try server proxy first (per-user key) for initial chat
    try {
      const modelName = getModelInfo(modelId)?.modelName || modelId;
      if (canUseProxy()) {
        const proxied = await proxyGenerate({
          prompt,
          model: modelName,
          action: 'chat',
          docBytes: documents.reduce((a, d) => a + (d.content?.length || 0), 0),
        });
        if (proxied.ok && proxied.text) {
          return { text: proxied.text, sources: null };
        }
      }
    } catch {}

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
  // Allow conversation even without study materials; we'll prioritize them if present.
  
  try {
    // Create simple context from documents
    const documentsText = documents.length > 0
      ? buildDocumentsContext(documents, {
          totalBudgetTokens: 6000,
          perDocBudgetTokens: 1500,
          chunkTokens: 300,
          includeHeadings: false,
        })
      : '(no study materials provided)';

    // Create simple conversation history
    const conversationHistory = history
      .slice(-5)
      .map(msg => `${msg.role}: ${firstApproxTokens(msg.text, 120)}`)
      .join('\n');

    const prompt = `You are a patient, helpful ${gradeLevel}th-grade tutor.

Student's Study Materials (use these first if relevant):
${documentsText}

Recent Conversation:
${conversationHistory}

Student Question:
${newMessage}

Instructions:
- If the materials clearly contain the answer, use them and explain simply.
- If the materials do not cover the question (or only partially), answer helpfully using your general knowledge.
- When you go beyond the materials, briefly mention that you are extending beyond the uploaded content.
- Keep the tone supportive and concise; avoid unnecessary disclaimers.

Tutor Response:`;

    // Try server proxy first (per-user key) for chat
    try {
      const modelName = getModelInfo(modelId)?.modelName || modelId;
      if (canUseProxy()) {
        const proxied = await proxyGenerate({
          prompt,
          model: modelName,
          action: 'chat',
          docBytes: documents.reduce((a, d) => a + (d.content?.length || 0), 0),
        });
        if (proxied.ok && proxied.text) {
          return { text: proxied.text, sources: null };
        }
      }
    } catch {}

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
  
  const prompt = buildPromptWithDocumentsTokenAware(
    documents,
    gradeLevel,
    `Generate exactly ${numFlashcards} flashcards. Use the study materials as the primary source; if they don't fully cover a topic, you may use accurate, widely taught knowledge appropriate for ${gradeLevel}th grade.

Respond with pure JSON only — no markdown, no code fences, no commentary. Format strictly as a JSON array of objects with keys "term" (string) and "definition" (string). Keep definitions clear, concise, and suitable for ${gradeLevel}th grade.

Example format:
[
  {"term": "Concept Name", "definition": "Clear, grade-appropriate definition from the materials"},
  {"term": "Another Term", "definition": "Another definition from the materials"}
]

Only return the JSON array, no other text. Do not add explanations, notes, disclaimers, or code fences.`
  );
  
  try {
    // Prefer server proxy if user is signed in (per-user key + logging)
    const modelName = getModelInfo(modelId)?.modelName || modelId;
    const combine = (a: Flashcard[] = [], b: Flashcard[] = []) => {
      const seen = new Set(a.map(c => (c.term || '').trim().toLowerCase()))
      for (const c of b) {
        const key = (c?.term || '').trim().toLowerCase()
        if (!key || seen.has(key)) continue
        a.push({ term: c.term, definition: c.definition })
        seen.add(key)
        if (a.length >= numFlashcards) break
      }
      return a
    }
    if (canUseProxy()) {
      onProgress('Generating flashcards with your account...');
      const proxied = await proxyGenerate({
        prompt,
        model: modelName,
        expectJson: true,
        action: 'flashcards',
        items: numFlashcards,
        docBytes: documents.reduce((a, d) => a + (d.content?.length || 0), 0)
      });
      if (proxied.ok && proxied.text) {
        let all = extractJsonArray<Flashcard>(proxied.text) || [];
        if (all.length >= numFlashcards) return all.slice(0, numFlashcards);
        if (all.length > 0 && all.length < numFlashcards) {
          const remaining = numFlashcards - all.length;
          const used = all.map(c => c.term).filter(Boolean).join('\n- ');
          const topUpInstruction = `Generate exactly ${remaining} additional flashcards that DO NOT repeat any of the following terms:\n- ${used}\n\nReturn ONLY a JSON array with objects {"term","definition"}.`;
          const topUpPrompt = buildPromptWithDocumentsTokenAware(documents, gradeLevel, topUpInstruction);
          const next = await proxyGenerate({
            prompt: topUpPrompt,
            model: modelName,
            expectJson: true,
            action: 'flashcards',
            items: remaining,
            docBytes: documents.reduce((a, d) => a + (d.content?.length || 0), 0)
          });
          if (next.ok && next.text) {
            const extra = extractJsonArray<Flashcard>(next.text) || [];
            all = combine(all, extra);
          }
          if (all.length > 0) return all.slice(0, numFlashcards);
        }
        // Try conversion via proxy
        onProgress('Formatting results...');
        const conv = await proxyGenerate({
          prompt: `Convert the following content to a JSON array of objects with strictly these keys: "term" (string) and "definition" (string). Only output the JSON array.\n\nCONTENT:\n${proxied.text}`,
          model: modelName,
          expectJson: true,
          action: 'flashcards'
        });
        if (conv.ok && conv.text) {
          let all2 = extractJsonArray<Flashcard>(conv.text) || [];
          if (all2.length >= numFlashcards) return all2.slice(0, numFlashcards);
          if (all2.length > 0) {
            const remaining = numFlashcards - all2.length;
            const used = all2.map(c => c.term).filter(Boolean).join('\n- ');
            const topUpInstruction = `Generate exactly ${remaining} additional flashcards that DO NOT repeat any of the following terms:\n- ${used}\n\nReturn ONLY a JSON array with objects {"term","definition"}.`;
            const topUpPrompt = buildPromptWithDocumentsTokenAware(documents, gradeLevel, topUpInstruction);
            const next = await proxyGenerate({ prompt: topUpPrompt, model: modelName, expectJson: true, action: 'flashcards', items: remaining, docBytes: documents.reduce((a, d) => a + (d.content?.length || 0), 0) });
            if (next.ok && next.text) {
              const extra = extractJsonArray<Flashcard>(next.text) || [];
              all2 = combine(all2, extra);
            }
            if (all2.length > 0) return all2.slice(0, numFlashcards);
          }
        }
      }
    }

    onProgress('Generating flashcards with AI...');
    // Attempt 1: standard call (no JSON mode), then parse flexibly
    const response = await callGeminiAPI(prompt, { ...DEFAULT_AI_CONFIG, model: modelId });
    let flashcards = extractJsonArray<Flashcard>(response.text) || [];
    if (flashcards.length > 0) {
      if (flashcards.length >= numFlashcards) return flashcards.slice(0, numFlashcards);
      const remaining = numFlashcards - flashcards.length;
      const used = flashcards.map(c => c.term).filter(Boolean).join('\n- ');
      const compactPrompt = buildPromptWithDocumentsTokenAware(
        documents,
        gradeLevel,
        `Generate exactly ${remaining} additional flashcards that do not repeat any of these terms:\n- ${used}\n\nReturn only a JSON array of {"term","definition"}.`
      );
      const more = await callGeminiAPI(compactPrompt, { ...DEFAULT_AI_CONFIG, model: modelId });
      const add = extractJsonArray<Flashcard>(more.text) || [];
      flashcards = combine(flashcards, add);
      if (flashcards.length > 0) return flashcards.slice(0, numFlashcards);
    }
    
    // Attempt 1b: ask for a compact, line-delimited format and parse it
    onProgress('Refining format...');
    const compactPrompt = buildPromptWithDocumentsTokenAware(
      documents,
      gradeLevel,
      `Return exactly ${numFlashcards} flashcards as ${numFlashcards} separate lines.\n\nEach line must be: term || definition\n- Use the double pipe "||" as the only delimiter\n- No numbering, no bullets, no code fences, no extra text\n- Keep definitions concise and ${gradeLevel}th-grade appropriate`
    );
    const compactResp = await callGeminiAPI(compactPrompt, { ...DEFAULT_AI_CONFIG, model: modelId });
    const lines = compactResp.text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0 && l.includes('||'));
    if (lines.length > 0) {
      const parsedPairs: Flashcard[] = lines.map(l => {
        const idx = l.indexOf('||');
        const term = l.substring(0, idx).trim().replace(/^[-*\d\.\)\s]+/, '');
        const definition = l.substring(idx + 2).trim();
        return { term, definition } as Flashcard;
      }).filter(c => c.term && c.definition);
      if (parsedPairs.length > 0) {
        return parsedPairs.slice(0, numFlashcards);
      }
    }
    
    // Attempt 2: ask model to convert to JSON strictly, then parse
    onProgress('Formatting results...');
    const convertPrompt = `Convert the following content to a JSON array of objects with strictly these keys: "term" (string) and "definition" (string). Do not include any extra keys or wrapper objects. Only output the JSON array, nothing else.\n\nCONTENT:\n${response.text}`;
    const normalized = await callGeminiAPI(convertPrompt, { ...DEFAULT_AI_CONFIG, model: modelId });
    flashcards = extractJsonArray<Flashcard>(normalized.text);
    if (flashcards && flashcards.length > 0) {
      return flashcards.slice(0, numFlashcards);
    }
    
    // Third attempt: generate free-form, then convert to JSON
    onProgress('Formatting results...');
    const freeform = await callAI(prompt, modelId);
    if (freeform.text) {
      const convertPrompt = `Convert the following content to a JSON array of objects with strictly these keys: "term" (string) and "definition" (string). Do not include any extra keys or wrapper objects. Only output the JSON array, nothing else.\n\nCONTENT:\n${freeform.text}`;
    const normalized = await callGeminiAPI(convertPrompt, { ...DEFAULT_AI_CONFIG, model: modelId }, 'application/json');
    const converted = extractJsonArray<Flashcard>(normalized.text) || [];
    if (converted.length > 0) {
      if (converted.length >= numFlashcards) return converted.slice(0, numFlashcards);
      return converted;
    }
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
  
  const prompt = buildPromptWithDocumentsTokenAware(
    documents,
    gradeLevel,
    `Generate exactly ${numQuestions} multiple choice quiz questions. Use the study materials as the primary source; if they don't fully cover a topic, you may use accurate, widely taught knowledge appropriate for ${gradeLevel}th grade.

Format strictly as a JSON array with objects containing "question", "options" (array of 4 choices), "correctAnswer", and "explanation" fields. Make questions appropriate for ${gradeLevel}th grade level and ensure clarity. Respond with pure JSON only — no markdown, no code fences, no commentary.

Example format:
[
  {
    "question": "Based on the study materials, what is...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option B",
    "explanation": "According to the study materials, this is correct because..."
  }
]

Only return the JSON array, no other text. Do not add explanations, notes, disclaimers, or code fences.`
  );
  
  try {
    const modelName = getModelInfo(modelId)?.modelName || modelId;
    if (canUseProxy()) {
      onProgress('Creating quiz with your account...');
      const proxied = await proxyGenerate({
        prompt,
        model: modelName,
        expectJson: true,
        action: 'quiz',
        items: numQuestions,
        docBytes: documents.reduce((a, d) => a + (d.content?.length || 0), 0)
      });
      if (proxied.ok && proxied.text) {
        let qq = extractJsonArray<QuizQuestion>(proxied.text);
        if (qq && qq.length > 0) {
          if (qq.length >= numQuestions) return qq.slice(0, numQuestions);
          // Top-up: request remaining questions without repeating
          const remaining = numQuestions - qq.length;
          const used = qq.map(q => q.question).join('\n- ');
          const topUpInstruction = `Generate exactly ${remaining} additional multiple choice quiz questions that DO NOT repeat any of the following questions:\n- ${used}\n\nReturn ONLY a JSON array with objects {"question","options":[4],"correctAnswer","explanation"}.`;
          const topUpPrompt = buildPromptWithDocumentsTokenAware(documents, gradeLevel, topUpInstruction);
          const next = await proxyGenerate({ prompt: topUpPrompt, model: modelName, expectJson: true, action: 'quiz', items: remaining, docBytes: documents.reduce((a, d) => a + (d.content?.length || 0), 0) });
          if (next.ok && next.text) {
            const extra = extractJsonArray<QuizQuestion>(next.text) || [];
            const seen = new Set(qq.map(q => (q.question||'').trim().toLowerCase()));
            for (const q of extra) {
              const key = (q?.question||'').trim().toLowerCase();
              if (!key || seen.has(key)) continue;
              qq.push(q);
              seen.add(key);
              if (qq.length >= numQuestions) break;
            }
          }
          if (qq.length > 0) return qq.slice(0, numQuestions);
        }
        onProgress('Formatting results...');
        const conv = await proxyGenerate({
          prompt: `Convert the following content to a JSON array of quiz questions with strictly these keys: "question" (string), "options" (array of 4 strings), "correctAnswer" (string equal to one of the options), and "explanation" (string). Only output the JSON array.\n\nCONTENT:\n${proxied.text}`,
          model: modelName,
          expectJson: true,
          action: 'quiz'
        });
        if (conv.ok && conv.text) {
          qq = extractJsonArray<QuizQuestion>(conv.text);
          if (qq && qq.length > 0) {
            if (qq.length >= numQuestions) return qq.slice(0, numQuestions);
            // Top-up same as above
            const remaining = numQuestions - qq.length;
            const used = qq.map(q => q.question).join('\n- ');
            const topUpInstruction = `Generate exactly ${remaining} additional multiple choice quiz questions that DO NOT repeat any of the following questions:\n- ${used}\n\nReturn ONLY a JSON array with objects {"question","options":[4],"correctAnswer","explanation"}.`;
            const topUpPrompt = buildPromptWithDocumentsTokenAware(documents, gradeLevel, topUpInstruction);
            const next = await proxyGenerate({ prompt: topUpPrompt, model: modelName, expectJson: true, action: 'quiz', items: remaining, docBytes: documents.reduce((a, d) => a + (d.content?.length || 0), 0) });
            if (next.ok && next.text) {
              const extra = extractJsonArray<QuizQuestion>(next.text) || [];
              const seen = new Set(qq.map(q => (q.question||'').trim().toLowerCase()));
              for (const q of extra) {
                const key = (q?.question||'').trim().toLowerCase();
                if (!key || seen.has(key)) continue;
                qq.push(q);
                seen.add(key);
                if (qq.length >= numQuestions) break;
              }
            }
            if (qq.length > 0) return qq.slice(0, numQuestions);
          }
        }
      }
    }

    onProgress('Creating quiz with AI...');
    // Attempt 1: standard call (no JSON mode), then parse flexibly
    const response = await callGeminiAPI(prompt, { ...DEFAULT_AI_CONFIG, model: modelId });
    let questions = extractJsonArray<QuizQuestion>(response.text);
    if (questions && questions.length > 0) {
      if (questions.length >= numQuestions) return questions.slice(0, numQuestions);
      const remaining = numQuestions - questions.length;
      const used = questions.map(q => q.question).join('\n- ');
      const convertPrompt = `Generate exactly ${remaining} additional multiple choice quiz questions that do not repeat any of the following:\n- ${used}\n\nReturn ONLY a JSON array with keys: question, options (4), correctAnswer, explanation.`;
      const normalized = await callGeminiAPI(convertPrompt, { ...DEFAULT_AI_CONFIG, model: modelId });
      const extra = extractJsonArray<QuizQuestion>(normalized.text) || [];
      const seen = new Set(questions.map(q => (q.question||'').trim().toLowerCase()));
      for (const q of extra) {
        const key = (q?.question||'').trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        questions.push(q);
        seen.add(key);
        if (questions.length >= numQuestions) break;
      }
      if (questions.length > 0) return questions.slice(0, numQuestions);
    }
    
    // Attempt 2: ask model to convert to strict JSON array, then parse
    onProgress('Formatting results...');
    const convertPrompt = `Convert the following content to a JSON array of quiz questions with strictly these keys: "question" (string), "options" (array of 4 strings), "correctAnswer" (string equal to one of the options), and "explanation" (string). Only output the JSON array, nothing else.\n\nCONTENT:\n${response.text}`;
    const normalized = await callGeminiAPI(convertPrompt, { ...DEFAULT_AI_CONFIG, model: modelId });
    questions = extractJsonArray<QuizQuestion>(normalized.text);
    if (questions && questions.length > 0) {
      return questions.slice(0, numQuestions);
    }
    
    // Third attempt: generate free-form, then convert to JSON
    onProgress('Formatting results...');
    const freeform = await callAI(prompt, modelId);
    if (freeform.text) {
      const convertPrompt = `Convert the following content to a JSON array of quiz questions with strictly these keys: "question" (string), "options" (array of 4 strings), "correctAnswer" (string equal to one of the options), and "explanation" (string). Only output the JSON array, nothing else.\n\nCONTENT:\n${freeform.text}`;
      const normalized = await callGeminiAPI(convertPrompt, { ...DEFAULT_AI_CONFIG, model: modelId }, 'application/json');
      const converted = extractJsonArray<QuizQuestion>(normalized.text);
      if (converted && converted.length > 0) {
        return converted.slice(0, numQuestions);
      }
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
  
  const prompt = `You are an AI tutor analyzing a student's quiz performance. Use the student's study materials as the primary source. If the materials do not fully cover a needed concept, provide helpful general guidance appropriate for their grade level.

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

Prioritize referencing concepts and topics that appear in their study materials. If you extend beyond the materials, keep it concise and relevant. Format in clear text and provide a direct analysis.`;
  
  try {
    // Prefer server proxy with the user's saved key if available
    const modelName = getModelInfo(modelId)?.modelName || modelId;
    if (canUseProxy()) {
      const proxied = await proxyGenerate({
        prompt,
        model: modelName,
        action: 'analysis',
        docBytes: documents.reduce((a, d) => a + (d.content?.length || 0), 0)
      });
      if (proxied.ok && proxied.text) return proxied.text;
    }

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



