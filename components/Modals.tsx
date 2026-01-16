import React, { useEffect, useRef } from 'react';
import { WordData } from '../types';

interface CorrectModalProps {
  wordData: WordData | null;
  onShowExample: () => void;
  onNext: () => void;
  englishDef?: string;
  hasViewedExample: boolean;
}

export const CorrectModal: React.FC<CorrectModalProps> = ({ wordData, onShowExample, onNext, englishDef, hasViewedExample }) => {
  const showExampleBtnRef = useRef<HTMLButtonElement>(null);
  const nextQuestionBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasViewedExample) {
        showExampleBtnRef.current?.focus();
      } else {
        nextQuestionBtnRef.current?.focus();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [hasViewedExample]);

  if (!wordData) return null;

  const btnBaseClass = "transform transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:scale-95 active:translate-y-0 active:shadow-sm";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 animate-fade-in">
      <div className="marshmallow-bg p-6 sm:p-8 w-full max-w-3xl rounded-2xl shadow-2xl relative transform transition-transform max-h-[90vh] overflow-y-auto">
        <div className="text-center">
          {/* Word as Black Tag */}
          <div className="mb-4 sm:mb-6">
             <span className="bg-black text-white text-3xl sm:text-4xl lg:text-5xl font-bold px-6 py-2 sm:py-3 rounded-2xl inline-block shadow-lg tracking-wide">
                {wordData.word}
             </span>
          </div>

          <div className="text-xl sm:text-2xl lg:text-4xl text-gray-700 mb-2 sm:mb-4 font-medium">{wordData.definition}</div>
          
          {/* Increased font size for English definition */}
          <div className="text-lg sm:text-xl lg:text-3xl text-blue-600 italic mb-6 leading-relaxed font-medium">{englishDef}</div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <button 
              ref={showExampleBtnRef}
              onClick={onShowExample}
              className={`px-5 py-2.5 sm:px-6 sm:py-3 text-lg sm:text-xl bg-white border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 focus:ring-4 focus:ring-blue-300 focus:outline-none ${btnBaseClass}`}
            >
              Show Example 📝
            </button>
            <button 
              ref={nextQuestionBtnRef}
              onClick={onNext}
              className={`px-5 py-2.5 sm:px-6 sm:py-3 text-lg sm:text-xl bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold focus:ring-4 focus:ring-green-300 focus:outline-none ${btnBaseClass}`}
            >
              Next Question ➡️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ExampleModalProps {
  wordData: WordData | null;
  onClose: () => void;
}

export const ExampleModal: React.FC<ExampleModalProps> = ({ wordData, onClose }) => {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setTimeout(() => closeBtnRef.current?.focus(), 50);
  }, []);

  if (!wordData || !wordData.example) return null;

  const btnBaseClass = "transform transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:scale-95 active:translate-y-0 active:shadow-sm";

  // Helper function to highlight the vocabulary word in the sentence
  const formatSentence = (sentence: string, word: string) => {
    if (!sentence || !word) return sentence;
    
    // Create a regex that captures the word token starting with the target word (case insensitive)
    // This captures suffixes like -ed, -s, -ing. 
    // Example: word="designate", it matches "designated" inside the text.
    // We use a capturing group () in split to include the separator in the result array.
    const safeWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(\\b${safeWord}[a-z]*)`, 'gi');
    
    const parts = sentence.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <span key={i} className="bg-black text-white px-2 py-0.5 rounded-lg mx-1 font-bold shadow-sm inline-block tracking-wide">{part}</span>
      ) : (
        part
      )
    );
  };

  // Enforce the "new" design with dashed border
  const containerClasses = "bg-yellow-100 p-5 sm:p-6 rounded-xl mb-6 shadow-sm mt-2 border-2 border-dashed border-blue-400";
    
  // Use the larger text classes
  const textClasses = "text-2xl sm:text-3xl text-gray-800 mb-3 leading-relaxed text-justify";
    
  const translationClasses = "text-xl sm:text-2xl text-gray-600 mt-4 border-t border-yellow-200 pt-3 text-justify";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-start justify-center p-4 pt-4 sm:pt-12 animate-fade-in">
      <div className="marshmallow-bg p-6 sm:p-8 w-full max-w-3xl rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Yellow background box for example */}
        <div className={containerClasses}>
          {/* Increased text size significantly (~10-20% boost) */}
          <p className={textClasses}>
            {formatSentence(wordData.example.sentence, wordData.word)}
          </p>
          <p className={translationClasses}>{wordData.example.translation}</p>
        </div>
        
        <div className="relative flex justify-center items-center">
           <button 
              ref={closeBtnRef}
              onClick={onClose}
              className={`px-8 py-3 text-2xl bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold ${btnBaseClass}`}
            >
              Got it! 👍
            </button>
        </div>
      </div>
    </div>
  );
};

interface WrongModalProps {
  onClose: () => void;
}

export const WrongModal: React.FC<WrongModalProps> = ({ onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 750); // Auto close after 0.75s (halved from 1.5s)
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-red-500/90 backdrop-blur-md text-white px-8 py-6 rounded-3xl shadow-2xl animate-bounce-custom">
         <div className="text-6xl mb-2 text-center">❌</div>
         <div className="text-3xl font-bold">Try Again!</div>
      </div>
    </div>
  );
};

interface CreditsModalProps {
  onClose: () => void;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white p-8 rounded-3xl shadow-2xl text-center border-4 border-blue-100 transform scale-100 animate-bounce-custom max-w-sm w-full" 
        onClick={e => e.stopPropagation()}
      >
         <div className="text-2xl font-bold text-gray-800 mb-2">松山高中 英文科</div>
         <div className="text-3xl text-blue-600 font-bold">王信斌 老師</div>
         
         <div className="mt-8">
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 font-medium transition-colors outline-none focus:ring-2 focus:ring-gray-300"
            >
              Close
            </button>
         </div>
      </div>
    </div>
  );
};

interface QuitModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const QuitModal: React.FC<QuitModalProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white p-8 rounded-3xl shadow-2xl text-center border-4 border-red-200 max-w-sm w-full animate-bounce-custom">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">確定要中止挑戰嗎？</h2>
        <p className="text-gray-600 mb-8">目前的進度將會遺失。</p>
        <div className="flex gap-4 justify-center">
          <button 
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition-colors"
          >
            取消
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors shadow-lg"
          >
            中止
          </button>
        </div>
      </div>
    </div>
  );
};