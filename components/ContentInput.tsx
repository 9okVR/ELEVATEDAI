
import React, { useState, useCallback, useRef } from 'react';
import UploadIcon from './icons/UploadIcon';
import DocumentStackIcon from './icons/DocumentStackIcon';
import TrashIcon from './icons/TrashIcon';
import type { StudyDocument } from '../types';
import ModelSelector from './ModelSelector';


interface ContentInputProps {
  documents: StudyDocument[];
  onAddPastedText: (content: string) => void;
  onRemoveDocument: (id: number) => void;
  onFilesSelected: (files: File[]) => void;
  isSessionActive: boolean;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  isCurrentModelKeySet: boolean;
  onConfigureCollaboration: () => void;
}

const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const DocumentItem: React.FC<{ doc: StudyDocument; onRemove: () => void; isDisabled: boolean; }> = ({ doc, onRemove, isDisabled }) => {
    const getStatusIcon = () => {
        switch (doc.status) {
            case 'ready':
                return (
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
            case 'processing':
                return (
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <div className="relative w-5 h-5">
                            <div className="absolute w-5 h-5 border-2 border-transparent border-t-white border-r-white rounded-full animate-spin"></div>
                            <div className="absolute w-3 h-3 top-1 left-1 border-2 border-transparent border-b-blue-200 rounded-full animate-spin-reverse"></div>
                            <div className="absolute w-1 h-1 top-2 left-2 bg-white rounded-full animate-pulse"></div>
                        </div>
                    </div>
                );
            case 'error':
                return (
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
            default:
                return (
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center shadow-lg">
                        <DocumentStackIcon className="w-5 h-5 text-white" />
                    </div>
                );
        }
    };

    const getStatusColor = () => {
        switch (doc.status) {
            case 'ready': return 'from-green-500/10 to-emerald-500/10 border-green-500/20';
            case 'processing': return 'from-blue-500/10 to-indigo-500/10 border-blue-500/20';
            case 'error': return 'from-red-500/10 to-pink-500/10 border-red-500/20';
            default: return 'from-gray-500/10 to-gray-600/10 border-gray-500/20';
        }
    };

    return (
        <div className={`group bg-gradient-to-r ${getStatusColor()} backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 flex items-center justify-between transition-all duration-300 hover:shadow-lg border w-full`}>
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 overflow-hidden min-w-0 flex-1">
                {getStatusIcon()}
                <div className="overflow-hidden min-w-0 flex-1">
                    <p className="font-bold text-white text-sm sm:text-base lg:text-lg truncate group-hover:text-purple-200 transition-colors duration-200" title={doc.name}>
                        {doc.name}
                    </p>
                    {doc.status === 'ready' && (
                        <div className="flex items-center gap-2 sm:gap-3 mt-1">
                            <p className="text-xs sm:text-sm text-gray-400 flex items-center gap-1">
                                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {countWords(doc.content)} words
                            </p>
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
                        </div>
                    )}
                    {doc.status === 'processing' && (
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-300 mt-1">
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 border border-blue-400/50 rounded-full animate-pulse"></div>
                            <span className="font-medium animate-pulse">AI is processing...</span>
                        </div>
                    )}
                    {doc.status === 'error' && (
                        <p className="text-xs sm:text-sm text-red-400 mt-1 flex items-center gap-1">
                            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Extraction failed - try again
                        </p>
                    )}
                </div>
            </div>
            <button
                onClick={onRemove}
                disabled={isDisabled}
                className="group/btn p-2 sm:p-3 rounded-lg sm:rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ml-2 sm:ml-3 lg:ml-4 border border-transparent hover:border-red-500/20 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={`Remove ${doc.name}`}
            >
                <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover/btn:scale-110 transition-transform duration-200" />
            </button>
        </div>
    );
};

const ContentInput: React.FC<ContentInputProps> = ({ documents, onAddPastedText, onRemoveDocument, onFilesSelected, isSessionActive, selectedModel, onSelectModel, isCurrentModelKeySet, onConfigureCollaboration }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [isTextFocused, setIsTextFocused] = useState(false);
  const dragCounter = useRef(0);
  
  const handleAddPastedText = () => {
      if (pastedText.trim()) {
          onAddPastedText(pastedText);
          setPastedText('');
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelected(Array.from(e.target.files));
      // Reset file input to allow selecting the same file again
      e.target.value = '';
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  }, [onFilesSelected]);

  const supportedFileTypes = "Supports: .txt, .md, PDF, PNG, JPG, PPTX";
  const supportedFileAccept = ".txt,.md,.text,application/pdf,image/*,.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation";


  return (
    <>
      <div className="w-full">
          {/* Enhanced Header */}
          <div className="relative mb-4 sm:mb-6 lg:mb-8">
              {/* Decorative Background Elements */}
              <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-2 right-4 w-6 h-6 border border-purple-400/30 rounded-full"></div>
                  <div className="absolute top-0 right-16 w-3 h-3 bg-purple-400/20 rounded-full"></div>
                  <div className="absolute bottom-2 left-8 w-4 h-4 border border-indigo-400/30 rounded-lg rotate-45"></div>
              </div>
              
              <div className="relative flex items-center gap-2 sm:gap-3 lg:gap-4 p-3 sm:p-4 lg:p-6 bg-gradient-to-r from-purple-600/10 via-indigo-600/10 to-purple-600/10 rounded-xl sm:rounded-2xl border border-purple-500/20 backdrop-blur-sm">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="panel-section-title text-lg sm:text-xl lg:text-2xl">
                      <span className="text-purple-400">1.</span> Provide Your Study Materials
                    </h2>
                      <p className="text-purple-300/80 text-xs sm:text-sm mt-1">
                          Upload documents, paste text, or drag files to get started
                      </p>
                  </div>
              </div>
          </div>

        <ModelSelector 
            selectedModel={selectedModel}
            onSelectModel={onSelectModel}
            isSessionActive={isSessionActive}
            isCurrentModelKeySet={isCurrentModelKeySet}
            onConfigureCollaboration={onConfigureCollaboration}
        />
        
        {/* Enhanced Document List */}
        {documents.length > 0 && (
            <div className="my-4 sm:my-6 lg:my-8">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white">Your Materials</h3>
                    <div className="px-2 sm:px-3 py-1 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-full border border-purple-500/30">
                        <span className="text-xs sm:text-sm font-semibold text-purple-300">{documents.length} {documents.length === 1 ? 'item' : 'items'}</span>
                    </div>
                </div>
                
                <div className="grid gap-2 sm:gap-3 pr-2">
                    {documents.map((doc) => (
                        <DocumentItem 
                            key={doc.id} 
                            doc={doc} 
                            onRemove={() => onRemoveDocument(doc.id)}
                            isDisabled={isSessionActive}
                        />
                    ))}
                </div>
            </div>
        )}

        {/* Enhanced Input Area */}
        {!isSessionActive && (
            <div className="space-y-4 sm:space-y-6">
                {documents.length > 0 && (
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-white">Add More Materials</h3>
                    </div>
                )}
                
                {/* Enhanced Text Input Area */}
                <div className={`relative group bg-gradient-to-br from-gray-900/60 to-purple-900/20 rounded-xl sm:rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isTextFocused 
                        ? 'border-purple-500/50 shadow-lg shadow-purple-500/25' 
                        : 'border-purple-500/20 hover:border-purple-500/30'
                }`}>
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                        <div className="absolute top-4 right-4 w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                        <div className="absolute top-8 right-8 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                        <div className="absolute bottom-6 left-6 w-1 h-1 bg-pink-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                    </div>
                    
                    <div className="relative p-3 sm:p-4 lg:p-6">
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="panel-section-title text-sm sm:text-base">Paste Your Content</h4>
                                <p className="text-xs sm:text-sm text-purple-300/70">Paste notes, articles, or any text content</p>
                            </div>
                        </div>
                        
                        <textarea
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                            onFocus={() => setIsTextFocused(true)}
                            onBlur={() => setIsTextFocused(false)}
                            placeholder="Paste your study content here... \n\n• Copy and paste from articles, notes, or documents\n• Type directly or paste from clipboard\n• All text will be processed by AI for study materials"
                            className="w-full h-28 sm:h-32 lg:h-36 input-modern p-3 sm:p-4 resize-none font-mono text-xs sm:text-sm leading-relaxed"
                        />
                        
                        {pastedText.trim() && (
                            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-r from-purple-600/10 to-indigo-600/10 rounded-lg sm:rounded-xl border border-purple-500/20">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <div className="flex items-center gap-2 text-xs sm:text-sm text-purple-300">
                                        <div className="w-4 h-4 bg-green-500/20 rounded-full flex items-center justify-center">
                                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                        </div>
                                        <span>{countWords(pastedText)} words ready to add</span>
                                    </div>
                                    <button 
                                        onClick={handleAddPastedText} 
                                        className="group px-4 sm:px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-lg sm:rounded-xl text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-purple-500/25 transform hover:scale-105 text-sm min-h-[44px] flex items-center"
                                    >
                                        <span className="flex items-center gap-2">
                                            <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            <span className="hidden xs:inline">Add Content</span>
                                            <span className="xs:hidden">Add</span>
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Enhanced File Upload Area */}
                <div className="relative group">
                    <label
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        className={`relative flex flex-col items-center justify-center p-6 sm:p-8 lg:p-12 border-2 border-dashed rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-500 ease-in-out overflow-hidden ${
                            isDragging 
                                ? 'border-purple-400 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 shadow-lg shadow-purple-500/25 scale-105' 
                                : 'border-purple-500/30 hover:border-purple-400/60 hover:bg-gradient-to-br hover:from-purple-500/10 hover:to-indigo-500/10 hover:shadow-lg hover:shadow-purple-500/10'
                        }`}
                    >
                        {/* Animated Background Particles */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <div className="absolute top-6 left-6 w-2 h-2 bg-purple-400/40 rounded-full animate-pulse"></div>
                            <div className="absolute top-10 right-8 w-1.5 h-1.5 bg-indigo-400/40 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                            <div className="absolute bottom-8 left-10 w-1 h-1 bg-pink-400/40 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                            <div className="absolute bottom-6 right-6 w-2.5 h-2.5 bg-purple-400/40 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
                        </div>
                        
                        {/* Upload Icon with Enhanced Animation */}
                        <div className="relative mb-4 sm:mb-6">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-2xl sm:rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <UploadIcon className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-purple-400 group-hover:text-purple-300 transition-colors duration-300" />
                            </div>
                            <div className="absolute -inset-3 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-2xl sm:rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            
                            {/* Floating Upload Animation */}
                            <div className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                        </div>
                        
                        <div className="text-center relative z-10">
                            <p className="text-2xl font-bold text-white mb-3 group-hover:text-purple-200 transition-colors duration-300">
                                <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Drop files here</span> or click to browse
                            </p>
                            <p className="text-purple-300/70 text-lg mb-4">
                                Upload documents, images, or presentations
                            </p>
                            
                            {/* Enhanced File Type Support */}
                            <div className="grid grid-cols-3 gap-4 mt-6">
                                <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-xl border border-red-500/20">
                                    <div className="w-6 h-6 bg-red-500/20 rounded-lg flex items-center justify-center">
                                        <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-red-300">PDF</span>
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
                                    <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                        <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-blue-300">Text</span>
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                                    <div className="w-6 h-6 bg-green-500/20 rounded-lg flex items-center justify-center">
                                        <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-green-300">Images</span>
                                </div>
                            </div>
                            
                            <p className="text-xs text-purple-400/60 mt-4">
                                Supports: PDF, TXT, MD, PNG, JPG, PPTX • Max 50MB per file
                            </p>
                        </div>
                        
                        <input
                            type="file"
                            className="hidden"
                            accept={supportedFileAccept}
                            onChange={handleFileChange}
                            multiple
                        />
                    </label>
                </div>
            </div>
        )}
      </div>
    </>
  );
};

export default ContentInput;

