import React, { useState, useCallback, useEffect } from 'react';
import { extractTextFromContent } from '../services/aiService';
import UploadIcon from './icons/UploadIcon';
import Loader from './Loader';
import ClipboardIcon from './icons/ClipboardIcon';
import ClipboardCheckIcon from './icons/ClipboardCheckIcon';
import MagicWandIcon from './icons/MagicWandIcon';

interface TextExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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

const TextExtractorModal: React.FC<TextExtractorModalProps> = ({ isOpen, onClose }) => {
  const [show, setShow] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => setShow(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
      // Delay unmounting to allow fade-out animation
      const timer = setTimeout(() => setShouldRender(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  // Reset state on close
  useEffect(() => {
      if (!isOpen) {
          const timer = setTimeout(() => {
              setFile(null);
              setIsLoading(false);
              setExtractedText('');
              setError(null);
              setIsDragging(false);
              setIsCopied(false);
          }, 300); // after transition
          return () => clearTimeout(timer);
      }
  }, [isOpen]);

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
      setExtractedText('');
    } else {
      setError('Please select a valid PDF file.');
      setFile(null);
    }
  };
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); }, []);
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);

  const handleExtractText = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setExtractedText('');

    try {
      const base64Data = await fileToBase64(file);
      const text = await extractTextFromContent({ mimeType: file.type, data: base64Data }, 'gemini-2.5-flash');
      setExtractedText(text);
    } catch (err) {
      console.error("Extraction failed:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during text extraction.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedText).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    });
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-out ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className={`fixed inset-0 bg-black/50 backdrop-blur-md transition-all duration-500 ease-out ${
        show ? 'opacity-100' : 'opacity-0'
      }`} onClick={onClose}></div>

      <div
        className={`relative bg-gradient-to-br from-gray-900/95 via-purple-900/20 to-gray-900/95 backdrop-blur-2xl border border-purple-500/20 rounded-3xl shadow-2xl w-full max-w-3xl transform transition-all duration-500 ease-out flex flex-col overflow-hidden h-[90vh] max-h-[750px] ${
          show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Enhanced Header with Gradient */}
        <div className="relative p-8 flex-shrink-0 border-b border-purple-500/20 bg-gradient-to-r from-purple-600/10 to-indigo-600/10">
          {/* Decorative Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-2 right-2 w-8 h-8 border border-purple-400/30 rounded-full"></div>
            <div className="absolute top-6 right-16 w-4 h-4 bg-purple-400/20 rounded-full"></div>
            <div className="absolute bottom-2 left-8 w-6 h-6 border border-indigo-400/30 rounded-lg rotate-45"></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-3">
              <div className="
                relative p-3 
                bg-gradient-to-br from-purple-500/20 to-indigo-600/20 
                backdrop-blur-md 
                border border-white/20 
                rounded-2xl 
                shadow-[0_8px_32px_rgba(139,92,246,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]
                transition-all duration-300
                hover:scale-105 hover:shadow-[0_12px_40px_rgba(139,92,246,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]
                hover:border-white/30
                group
              ">
                {/* Glow effect background */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-indigo-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Icon container with glassmorphism */}
                <div className="relative">
                  <MagicWandIcon className="w-6 h-6 text-white drop-shadow-sm group-hover:scale-110 transition-transform duration-300" animated={true} />
                  
                  {/* Subtle highlight for 3D effect */}
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10 rounded-lg opacity-50"></div>
                </div>
              </div>
              <div>
                <h2 id="modal-title" className="text-3xl font-bold bg-gradient-to-r from-white via-purple-100 to-indigo-200 bg-clip-text text-transparent drop-shadow-sm">
                  AI PDF Analyzer
                </h2>
                <p className="text-purple-300/90 text-lg font-medium tracking-wide">
                  Extract and analyze text from any PDF using advanced AI
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Upload Section */}
        <div className="px-8 pt-6 flex-shrink-0">
          {!file ? (
             <label
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                className={`group relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-500 ease-in-out overflow-hidden ${
                  isDragging 
                    ? 'border-purple-400 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 shadow-lg shadow-purple-500/25' 
                    : 'border-purple-500/30 hover:border-purple-400/60 hover:bg-gradient-to-br hover:from-purple-500/10 hover:to-indigo-500/10 hover:shadow-lg hover:shadow-purple-500/10'
                }`}
             >
                {/* Animated Background */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute top-4 left-4 w-2 h-2 bg-purple-400/40 rounded-full animate-pulse"></div>
                  <div className="absolute top-8 right-6 w-1.5 h-1.5 bg-indigo-400/40 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  <div className="absolute bottom-6 left-8 w-1 h-1 bg-pink-400/40 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                  <div className="absolute bottom-4 right-4 w-2.5 h-2.5 bg-purple-400/40 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
                </div>
                
                {/* Upload Icon with Animation */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <UploadIcon className="w-10 h-10 text-purple-400 group-hover:text-purple-300 transition-colors duration-300" />
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                
                <div className="text-center relative z-10">
                  <p className="text-xl font-semibold text-white mb-2 group-hover:text-purple-200 transition-colors duration-300">
                    <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Drop your PDF here</span> or click to browse
                  </p>
                  <p className="text-purple-300/70 text-sm">
                    Supports PDF files up to 50MB • AI-powered text extraction
                  </p>
                </div>
                
                <input type="file" className="hidden" accept="application/pdf" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)} />
            </label>
          ) : (
             <div className="bg-gradient-to-br from-gray-800/60 to-purple-800/20 p-6 rounded-2xl flex items-center justify-between border border-purple-500/20 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-lg" title={file.name}>{file.name}</p>
                    <p className="text-purple-300/70 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB • PDF Document</p>
                  </div>
                </div>
                <button 
                  onClick={() => setFile(null)} 
                  className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200 font-medium"
                >
                  Remove
                </button>
             </div>
          )}
        </div>

        {/* Enhanced Extract Button */}
        <div className="px-8 mt-6 flex-shrink-0">
            <button
                onClick={handleExtractText}
                disabled={!file || isLoading}
                className="group relative w-full py-4 px-8 rounded-2xl text-lg font-bold transition-all duration-300 overflow-hidden disabled:cursor-not-allowed"
            >
                {/* Button Background */}
                <div className={`absolute inset-0 transition-all duration-300 ${
                  !file || isLoading 
                    ? 'bg-gray-700/40 border border-gray-600/30' 
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25 border border-purple-500/30'
                } rounded-2xl`}></div>
                
                {/* Button Glow Effect */}
                {file && !isLoading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
                )}
                
                {/* Button Content */}
                <div className="relative z-10 flex items-center justify-center gap-3">
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-purple-300/30 border-t-purple-300 rounded-full animate-spin"></div>
                      <span className="text-purple-300">Analyzing PDF...</span>
                    </>
                  ) : (
                    <>
                      <MagicWandIcon 
                        className={`w-5 h-5 transition-all duration-300 ${
                          !file ? 'text-gray-500' : 'text-white group-hover:text-purple-100 group-hover:scale-110'
                        }`} 
                        animated={!!file}
                      />
                      <span className={`transition-colors duration-300 ${
                        !file ? 'text-gray-500' : 'text-white group-hover:text-purple-100'
                      }`}>
                        Extract Text with AI
                      </span>
                    </>
                  )}
                </div>
            </button>
        </div>

        {/* Enhanced Results Section */}
        <div className="flex-grow p-8 overflow-y-auto">
            {isLoading && (
                <div className="h-full flex flex-col items-center justify-center">
                    <div className="relative">
                      <Loader />
                      {/* Enhanced loading animation */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                      </div>
                    </div>
                    <div className="mt-8 text-center">
                      <p className="text-xl font-semibold text-purple-300 mb-2">AI is analyzing your PDF...</p>
                      <p className="text-purple-400/70">This process may take a moment depending on document complexity</p>
                    </div>
                </div>
            )}
            
            {error && (
              <div className="text-center">
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-red-500/20 to-pink-500/20 p-6 rounded-2xl border border-red-500/30 shadow-lg">
                  <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-red-300 font-semibold">Extraction Failed</p>
                    <p className="text-red-400/80 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {extractedText && (
                <div className="space-y-4">
                    {/* Results Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        Extracted Text
                      </h3>
                      <div className="text-sm text-purple-300/70">
                        {extractedText.length.toLocaleString()} characters
                      </div>
                    </div>
                    
                    {/* Enhanced Text Area */}
                    <div className="relative">
                        <textarea
                            readOnly
                            value={extractedText}
                            className="w-full h-full min-h-[300px] bg-gradient-to-br from-gray-900/60 to-purple-900/20 text-gray-200 p-6 rounded-2xl focus:outline-none border border-purple-500/20 resize-none font-mono text-sm leading-relaxed shadow-inner"
                            placeholder="Extracted text will appear here..."
                        />
                        
                        {/* Enhanced Copy Button */}
                        <button
                            onClick={handleCopy}
                            className="absolute top-4 right-4 group p-3 bg-gradient-to-r from-purple-600/80 to-indigo-600/80 backdrop-blur-sm rounded-xl text-white hover:from-purple-500/90 hover:to-indigo-500/90 transition-all duration-200 shadow-lg"
                            aria-label="Copy text"
                        >
                            {isCopied ? (
                              <div className="flex items-center gap-2">
                                <ClipboardCheckIcon className="w-4 h-4 text-green-300" />
                                <span className="text-xs font-medium text-green-300">Copied!</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <ClipboardIcon className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                                <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">Copy</span>
                              </div>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
        
        {/* Enhanced Footer */}
        <div className="p-8 bg-gradient-to-r from-gray-900/80 via-purple-900/20 to-gray-900/80 flex-shrink-0 border-t border-purple-500/20">
             <div className="flex items-center justify-between">
               <div className="text-sm text-purple-300/70">
                 Powered by <span className="font-semibold text-purple-300">Gemini AI</span>
               </div>
               <button
                  onClick={onClose}
                  className="group px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-gray-700/50 to-gray-600/50 hover:from-gray-600/60 hover:to-gray-500/60 transition-all duration-200 border border-gray-500/30 text-gray-300 hover:text-white"
              >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close
                  </span>
              </button>
             </div>
        </div>
      </div>
    </div>
  );
};

export default TextExtractorModal;