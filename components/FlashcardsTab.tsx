import React, { useState, useEffect } from 'react';
import type { Flashcard } from '../types';
import Loader from './Loader';
import CardStackIcon from './icons/CardStackIcon';
import QuantitySelector from './QuantitySelector';

interface FlashcardsTabProps {
  flashcards: Flashcard[];
  isLoading: boolean;
  error: string | null;
  onGenerate: () => void;
  loadingMessage?: string;
  numFlashcards: number;
  onNumFlashcardsChange: (num: number) => void;
}

const FlashcardsTab: React.FC<FlashcardsTabProps> = ({ flashcards, isLoading, error, onGenerate, loadingMessage, numFlashcards, onNumFlashcardsChange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // When a new set of flashcards is generated, reset to the first card
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [flashcards]);

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setIsFlipped(false);
      // A tiny delay allows the card to flip back before changing content
      setTimeout(() => setCurrentIndex(currentIndex + 1), 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(currentIndex - 1), 150);
    }
  };

  if (isLoading) {
    return (
        <div className="flex-grow flex items-center justify-center h-full">
            <div className="text-center">
                <p className="text-lg font-semibold text-purple-300 mb-2">{loadingMessage || 'Generating Flashcards...'}</p>
                <p className="text-gray-400">The AI is analyzing your documents to find key concepts.</p>
                <div className="mt-6"><Loader /></div>
            </div>
        </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
        <CardStackIcon className="w-24 h-24 mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">Ready to test your knowledge?</h3>
        <p className="max-w-md mb-6">Generate a set of flashcards from your study materials to quiz yourself on the key terms and concepts.</p>
        <button
          onClick={onGenerate}
          className="py-3 px-8 rounded-lg text-lg font-semibold transition-all duration-300 ease-in-out transform focus:outline-none focus:ring-4 focus:ring-purple-500/50 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 hover:opacity-90"
        >
          Generate Flashcards
        </button>
        <QuantitySelector
            id="flashcard-quantity"
            label="Number of Flashcards"
            value={numFlashcards}
            onChange={onNumFlashcardsChange}
            options={[10, 15, 20, 25]}
            className="mt-6"
        />
         {error && (
            <div className="text-center bg-red-500/20 p-4 rounded-lg mt-8 border border-red-500/30">
              <p className="text-red-400 font-semibold">An Error Occurred</p>
              <p className="text-red-300 mt-1">{error}</p>
            </div>
        )}
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  // This check prevents a crash if the flashcards array is updated and the currentIndex becomes invalid
  // for a single render cycle, or if the data itself is malformed.
  if (!currentCard) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      {/* Flashcard viewer */}
      <div className="w-full max-w-xl h-80 perspective-1000">
        <div
          className={`relative w-full h-full transform-style-preserve-3d transition-transform duration-500 ${isFlipped ? 'rotate-y-180' : ''}`}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front of card */}
          <div className="absolute w-full h-full backface-hidden bg-gray-800/80 border border-white/10 rounded-2xl p-6 flex items-center justify-center text-center cursor-pointer shadow-2xl">
            <p className="text-2xl font-bold text-white">{currentCard.term}</p>
          </div>
          {/* Back of card */}
          <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-purple-700 to-indigo-700 border border-purple-400/50 rounded-2xl p-6 flex items-center justify-center text-center cursor-pointer shadow-2xl rotate-y-180">
            <p className="text-xl text-purple-100">{currentCard.definition}</p>
          </div>
        </div>
      </div>

      {/* Navigation and Counter */}
      <div className="mt-8 flex items-center justify-between w-full max-w-xl">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-6 py-2 rounded-lg font-semibold bg-white/5 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
        >
          Previous
        </button>
        <p className="text-lg font-semibold text-gray-400">
          {currentIndex + 1} / {flashcards.length}
        </p>
        <button
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
          className="px-6 py-2 rounded-lg font-semibold bg-white/5 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
        >
          Next
        </button>
      </div>
        <style>{`
            .perspective-1000 { perspective: 1000px; }
            .transform-style-preserve-3d { transform-style: preserve-3d; }
            .rotate-y-180 { transform: rotateY(180deg); }
            .backface-hidden { backface-visibility: hidden; }
        `}</style>
    </div>
  );
};

export default FlashcardsTab;
