import React, { useState, useEffect, useRef } from 'react';
import { allLessons } from './data';
import { smartShuffle } from './utils';
import { GameState, WordData, WrongAnswer, MatchingCard, LeaderboardEntry } from './types';
import TechOrb from './components/TechOrb';
import { CorrectModal, ExampleModal, WrongModal, CreditsModal, QuitModal } from './components/Modals';

// --- Helper Functions for Matching Game ---
const generateMatchingCards = (count: number, vocab: WordData[]): MatchingCard[] => {
  const shuffled = [...vocab].sort(() => 0.5 - Math.random());
  const selectedVocab: WordData[] = [];
  const seenIdentity = new Set<string>();
  const seenChinese = new Set<string>();

  for (const item of shuffled) {
    if (selectedVocab.length >= count) break;
    const match = item.definition.match(/^(\([a-z]+\.?\s*(?:\[.*?\])?\))\s*(.*)/);
    const pos = match ? match[1] : "";
    const cleanDef = match ? match[2].trim() : item.definition.trim();
    const identity = `${item.word.toLowerCase()}-${pos}`;
    if (!seenIdentity.has(identity) && !seenChinese.has(cleanDef)) {
      seenIdentity.add(identity);
      seenChinese.add(cleanDef);
      selectedVocab.push(item);
    }
  }

  if (selectedVocab.length < count) {
     const remaining = shuffled.filter(item => {
        const match = item.definition.match(/^(\([a-z]+\.?\s*(?:\[.*?\])?\))/);
        const pos = match ? match[1] : "";
        const identity = `${item.word.toLowerCase()}-${pos}`;
        return !seenIdentity.has(identity);
     });
     for (const item of remaining) {
        if (selectedVocab.length >= count) break;
        const match = item.definition.match(/^(\([a-z]+\.?\s*(?:\[.*?\])?\))/);
        const pos = match ? match[1] : "";
        const identity = `${item.word.toLowerCase()}-${pos}`;
        if (!seenIdentity.has(identity)) {
           seenIdentity.add(identity);
           selectedVocab.push(item);
        }
     }
  }
  
  const wordCounts: Record<string, number> = {};
  selectedVocab.forEach(v => {
    wordCounts[v.word] = (wordCounts[v.word] || 0) + 1;
  });

  const cards: MatchingCard[] = [];
  selectedVocab.forEach((item, index) => {
    const match = item.definition.match(/^(\([a-z]+\.?\s*(?:\[.*?\])?\))\s*(.*)/);
    const pos = match ? match[1] : "";
    const cleanDef = match ? match[2] : item.definition;
    const showPos = wordCounts[item.word] > 1;
    const englishContent = showPos ? `${item.word}\n${pos}` : item.word;
    cards.push({ id: `en-${index}`, word: item.word + item.definition, content: englishContent, type: 'EN', isMatched: false });
    cards.push({ id: `cn-${index}`, word: item.word + item.definition, content: cleanDef, type: 'CN', isMatched: false });
  });
  return cards.sort(() => 0.5 - Math.random());
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins}:${Number(secs) < 10 ? '0' : ''}${secs}`;
};

const App: React.FC = () => {
  const [currentLessonKey, setCurrentLessonKey] = useState<string>("");
  const [showLessonSelector, setShowLessonSelector] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<'B3' | 'B4'>('B3'); // New State for Book Selection
  const currentLesson = allLessons.find(l => l.key === currentLessonKey);
  const activeVocab = currentLesson ? currentLesson.vocab : [];

  const [gameState, setGameState] = useState<GameState>(GameState.HOME);
  const [homeCarouselIndex, setHomeCarouselIndex] = useState<number>(0);
  const [carouselDirection, setCarouselDirection] = useState<'left' | 'right' | null>(null);
  const [showCredits, setShowCredits] = useState<boolean>(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [isRoaming, setIsRoaming] = useState<boolean>(false);
  const [icon1Pos, setIcon1Pos] = useState({ x: 0, y: 0, r: -12 });
  const [icon2Pos, setIcon2Pos] = useState({ x: 0, y: 0, r: 12 });
  const roamingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [customCountInput, setCustomCountInput] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [spellingVocab, setSpellingVocab] = useState<WordData[]>([]);
  const [spellingIndex, setSpellingIndex] = useState<number>(0);
  const [userInput, setUserInput] = useState<string>("");
  const [mistakes, setMistakes] = useState<number>(0);
  const [currentQuestionMistakes, setCurrentQuestionMistakes] = useState<number>(0);
  const [extraHints, setExtraHints] = useState<number>(0);
  const [showEnglishDef, setShowEnglishDef] = useState<boolean>(false);
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  const [isErrorAnimating, setIsErrorAnimating] = useState<boolean>(false);
  const [showMistakeOrb, setShowMistakeOrb] = useState<boolean>(false);
  const [modalState, setModalState] = useState<'none' | 'correct' | 'wrong' | 'example'>('none');
  const [flashScore, setFlashScore] = useState<boolean>(false);
  const [hasViewedExample, setHasViewedExample] = useState<boolean>(false);
  const definitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [matchingCards, setMatchingCards] = useState<MatchingCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<MatchingCard[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number>(0);
  const [matchingStartTime, setMatchingStartTime] = useState<number>(0);
  const [matchingCurrentTime, setMatchingCurrentTime] = useState<number>(0);
  const matchingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentChallengerName, setCurrentChallengerName] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [dualP1Cards, setDualP1Cards] = useState<MatchingCard[]>([]);
  const [dualP2Cards, setDualP2Cards] = useState<MatchingCard[]>([]);
  const [dualP1Selected, setDualP1Selected] = useState<MatchingCard[]>([]);
  const [dualP2Selected, setDualP2Selected] = useState<MatchingCard[]>([]);
  const [dualP1Matches, setDualP1Matches] = useState<number>(0);
  const [dualP2Matches, setDualP2Matches] = useState<number>(0);
  const [dualWinner, setDualWinner] = useState<'P1' | 'P2' | null>(null);
  const [showDiceModal, setShowDiceModal] = useState<boolean>(false);
  const [diceMaxTens, setDiceMaxTens] = useState<number>(3);
  const [diceMaxOnes, setDiceMaxOnes] = useState<number>(5);
  const [diceResult, setDiceResult] = useState<string | null>(null);
  const [isRollingDice, setIsRollingDice] = useState<boolean>(false);

  const handleLogin = () => {
    if (passwordInput === "lukewang") setIsAuthenticated(true);
    else { alert("密碼錯誤 (Incorrect password)"); setPasswordInput(""); }
  };

  const handleAbortGame = () => setShowQuitConfirm(true);
  const confirmAbort = () => {
    setShowQuitConfirm(false); setGameState(GameState.HOME);
    if (matchingTimerRef.current) clearInterval(matchingTimerRef.current);
    if (definitionTimerRef.current) clearTimeout(definitionTimerRef.current);
  };

  const triggerRoaming = () => {
    if (roamingTimeoutRef.current) clearTimeout(roamingTimeoutRef.current);
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    
    // Only trigger if a lesson is actually selected
    if (!currentLessonKey) return;

    setIsRoaming(true);
    moveIcons();
    moveIntervalRef.current = setInterval(moveIcons, 2000);
    roamingTimeoutRef.current = setTimeout(() => {
      setIsRoaming(false);
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
      setIcon1Pos({ x: 0, y: 0, r: -12 }); setIcon2Pos({ x: 0, y: 0, r: 12 });
    }, 40000); // Increased duration to 40s
  };

  const moveIcons = () => {
    const rangeX = window.innerWidth * 0.4;
    const rangeY = window.innerHeight * 0.3;
    setIcon1Pos({ x: (Math.random() - 0.5) * 2 * rangeX, y: (Math.random() - 0.5) * 2 * rangeY, r: (Math.random() * 60) - 30 });
    setIcon2Pos({ x: (Math.random() - 0.5) * 2 * rangeX, y: (Math.random() - 0.5) * 2 * rangeY, r: (Math.random() * 60) - 30 });
  };

  useEffect(() => {
    if (gameState === GameState.HOME && currentLessonKey) triggerRoaming();
    else { setIsRoaming(false); if (roamingTimeoutRef.current) clearTimeout(roamingTimeoutRef.current); if (moveIntervalRef.current) clearInterval(moveIntervalRef.current); }
    return () => { if (roamingTimeoutRef.current) clearTimeout(roamingTimeoutRef.current); if (moveIntervalRef.current) clearInterval(moveIntervalRef.current); };
  }, [gameState, currentLessonKey]);

  const handleCarouselNext = (modesLength: number) => { setCarouselDirection('right'); setHomeCarouselIndex(prev => (prev === modesLength - 1 ? 0 : prev + 1)); };
  const handleCarouselPrev = (modesLength: number) => { setCarouselDirection('left'); setHomeCarouselIndex(prev => (prev === 0 ? modesLength - 1 : prev - 1)); };

  const handleOpenLessonSelector = () => {
    // Automatically switch to the tab of the current lesson if one is selected
    if (currentLessonKey.startsWith('B4')) {
        setSelectedBook('B4');
    } else {
        setSelectedBook('B3');
    }
    setShowLessonSelector(true);
  };

  const renderHome = () => {
    const modes = [
      { title: "看圖拼字", desc: "觀察圖片與提示，拼出正確單字", action: () => currentLesson ? setGameState(GameState.SPELLING_SETUP) : handleOpenLessonSelector(), icon: "🖼️", styleClass: "bg-gradient-to-br from-sky-100 to-blue-300 border-blue-500 shadow-blue-300/50" },
      { title: "中英配對", desc: "挑戰速度！將英文單字與中文定義配對", action: () => currentLesson ? setGameState(GameState.MATCHING_MENU) : handleOpenLessonSelector(), icon: "⚡", styleClass: "bg-gradient-to-br from-yellow-100 to-orange-300 border-orange-500 shadow-orange-300/50" }
    ];
    const currentMode = modes[homeCarouselIndex];
    const animClass = carouselDirection === 'right' ? 'animate-slide-right' : carouselDirection === 'left' ? 'animate-slide-left' : '';
    
    const icon1 = currentLesson?.icon1;
    const icon2 = currentLesson?.icon2;
    const headerTitle = currentLesson ? currentLesson.title : "Click to Choose a Lesson";

    return (
      <div className="h-[100svh] w-full flex flex-col items-center justify-start pt-16 p-4 pb-[env(safe-area-inset-bottom)] relative overflow-hidden">
        <div className="w-full max-w-5xl mb-12 z-10 px-2 relative" style={{ containerType: 'inline-size' }}>
            <div className="flex items-center justify-center gap-2 sm:gap-4 flex-nowrap w-full">
                {currentLessonKey && icon1 && (
                  <div onClick={triggerRoaming} style={{ transform: `translate(${icon1Pos.x}px, ${icon1Pos.y}px) rotate(${icon1Pos.r}deg)`, transition: isRoaming ? 'all 2s ease-in-out' : 'all 1s ease-out', fontSize: 'clamp(2rem, 15cqw, 6rem)' }} className="filter drop-shadow-2xl cursor-pointer z-50 hover:scale-110 active:scale-90 flex-shrink-0">{icon1}</div>
                )}
                <button 
                  onClick={handleOpenLessonSelector}
                  className="bg-black/20 backdrop-blur-md border-4 border-white/50 rounded-3xl p-4 sm:p-6 shadow-2xl animate-bounce-custom flex-shrink-1 min-w-0 flex justify-center items-center hover:bg-black/30 transition-all active:scale-95 group max-w-[80%]"
                >
                    <h1 className="font-bold text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] text-center tracking-wider leading-tight group-hover:scale-105 transition-transform break-words whitespace-normal" style={{ fontSize: 'clamp(1.2rem, 5cqw, 3.5rem)' }}>
                        {headerTitle}
                    </h1>
                </button>
                {currentLessonKey && icon2 && (
                  <div onClick={triggerRoaming} style={{ transform: `translate(${icon2Pos.x}px, ${icon2Pos.y}px) rotate(${icon2Pos.r}deg)`, transition: isRoaming ? 'all 2s ease-in-out' : 'all 1s ease-out', fontSize: 'clamp(2rem, 15cqw, 6rem)' }} className="filter drop-shadow-2xl cursor-pointer z-50 hover:scale-110 active:scale-90 flex-shrink-0">{icon2}</div>
                )}
            </div>
        </div>

        {/* Lesson Selector Modal */}
        {showLessonSelector && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowLessonSelector(false)}>
            <div className="bg-white/90 p-8 rounded-[2.5rem] shadow-2xl max-w-lg w-full border-4 border-white overflow-hidden animate-bounce-custom flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
               <div className="text-center mb-6 flex-shrink-0">
                  <h3 className="text-3xl font-black text-gray-800 tracking-tight">選擇課次</h3>
                  <p className="text-gray-500 mt-1">Select a lesson to study</p>
               </div>

               {/* Book Selector Tabs */}
               <div className="flex justify-center gap-4 mb-4 flex-shrink-0">
                  <button 
                    onClick={() => setSelectedBook('B3')}
                    className={`flex-1 px-4 py-3 rounded-2xl text-lg font-bold transition-all transform active:scale-95 shadow-md border-b-4 ${
                      selectedBook === 'B3' 
                        ? 'bg-blue-500 text-white border-blue-700 ring-2 ring-blue-300' 
                        : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    B3 (Book 3)
                  </button>
                  <button 
                    onClick={() => setSelectedBook('B4')}
                    className={`flex-1 px-4 py-3 rounded-2xl text-lg font-bold transition-all transform active:scale-95 shadow-md border-b-4 ${
                      selectedBook === 'B4' 
                        ? 'bg-pink-500 text-white border-pink-700 ring-2 ring-pink-300' 
                        : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    B4 (Book 4)
                  </button>
               </div>

               <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-2 no-scrollbar flex-1">
                  {allLessons
                    .filter(lesson => lesson.key.startsWith(selectedBook))
                    .map((lesson) => (
                    <button 
                      key={lesson.key}
                      onClick={() => { setCurrentLessonKey(lesson.key); setShowLessonSelector(false); setHomeCarouselIndex(0); }}
                      className={`w-full p-4 rounded-2xl text-lg sm:text-xl font-bold transition-all flex items-center justify-between border-b-4 transform active:scale-[0.98] ${
                        currentLessonKey === lesson.key 
                          ? 'bg-blue-600 text-white border-blue-800 shadow-lg ring-2 ring-blue-300' 
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-white hover:border-blue-300 hover:text-blue-600'
                      }`}
                    >
                      <span className="truncate mr-2">{lesson.title}</span>
                      {currentLessonKey === lesson.key && <span className="flex-shrink-0">✅</span>}
                    </button>
                  ))}
               </div>
               <button onClick={() => setShowLessonSelector(false)} className="w-full mt-6 bg-gray-200 p-4 rounded-2xl font-black text-gray-600 hover:bg-gray-300 flex-shrink-0 transition-colors">CLOSE</button>
            </div>
          </div>
        )}

        <div className="w-full max-w-2xl flex items-center justify-between gap-4 z-10">
          <button onClick={() => handleCarouselPrev(modes.length)} className="p-4 bg-white/30 hover:bg-white/50 rounded-full text-white text-3xl backdrop-blur-sm transition-all hover:scale-110 active:scale-95">◀</button>
          <div key={homeCarouselIndex} onClick={currentMode.action} className={`flex-1 backdrop-blur-md border-4 rounded-3xl p-8 shadow-2xl cursor-pointer transform transition-all duration-300 hover:scale-105 active:scale-95 group flex flex-col items-center text-center ${currentMode.styleClass} ${animClass}`}>
            <div className="text-6xl mb-4 transform transition-transform group-hover:rotate-12">{currentMode.icon}</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">{currentMode.title}</h2>
            <p className="text-gray-600 text-lg sm:text-xl">{currentMode.desc}</p>
            <div className="mt-6 px-6 py-2 bg-white/50 text-gray-800 rounded-full font-bold shadow-md group-hover:bg-white group-hover:text-blue-600 transition-colors">START</div>
          </div>
          <button onClick={() => handleCarouselNext(modes.length)} className="p-4 bg-white/30 hover:bg-white/50 rounded-full text-white text-3xl backdrop-blur-sm transition-all hover:scale-110 active:scale-95">▶</button>
        </div>
        <div onClick={() => setShowCredits(true)} className="absolute bottom-4 left-4 mb-[env(safe-area-inset-bottom)] px-4 py-2 bg-black/80 hover:bg-black backdrop-blur-sm rounded-full text-white cursor-pointer transition-all border-2 border-white/20 text-xs sm:text-sm font-bold shadow-lg hover:scale-105 active:scale-95 z-50 tracking-widest">設計者</div>
        {showCredits && <CreditsModal onClose={() => setShowCredits(false)} />}
      </div>
    );
  };

  const renderMatchingMenu = () => (
    <div className="h-[100svh] w-full flex flex-col items-center justify-start pt-16 p-4">
      <div className="w-full max-w-5xl mx-auto mb-10 flex items-center justify-center">
         <div className="bg-black/20 backdrop-blur-md border-4 border-white/50 rounded-3xl p-4 sm:p-6 shadow-xl relative">
           <button onClick={() => setGameState(GameState.HOME)} className="absolute left-[-60px] top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl backdrop-blur-sm transition-all">↩</button>
           <h1 className="font-bold text-white drop-shadow-md text-3xl sm:text-5xl tracking-widest">中英配對</h1>
         </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 w-full max-w-4xl justify-center items-stretch">
        <div onClick={() => { setCustomCountInput(""); setQuestionCount(10); setGameState(GameState.MATCHING_SINGLE_SETUP_GLOBAL); }} className="flex-1 bg-gradient-to-br from-blue-100 to-blue-200 border-4 border-white rounded-3xl p-8 shadow-xl cursor-pointer hover:scale-105 hover:shadow-2xl transition-all flex flex-col items-center justify-center min-h-[250px]">
          <span className="text-6xl mb-4">👥</span>
          <h3 className="text-3xl font-bold text-blue-900">多人挑戰</h3>
          <p className="text-blue-700 mt-2 text-center">計時挑戰賽<br/>輪流挑戰排行榜</p>
        </div>
        <div onClick={() => { setCustomCountInput(""); setQuestionCount(9); setDiceResult(null); setGameState(GameState.MATCHING_DUAL_SETUP); }} className="flex-1 bg-gradient-to-br from-red-100 to-red-200 border-4 border-white rounded-3xl p-8 shadow-xl cursor-pointer hover:scale-105 hover:shadow-2xl transition-all flex flex-col items-center justify-center min-h-[250px]">
          <span className="text-6xl mb-4">⚔️</span>
          <h3 className="text-3xl font-bold text-red-900">雙人對戰</h3>
          <p className="text-red-700 mt-2 text-center">分割畫面<br/>速度對決</p>
        </div>
      </div>
    </div>
  );

  const startSpellingGame = (count: number) => {
    const items = smartShuffle([...activeVocab], count);
    setSpellingVocab(items); setQuestionCount(count); setGameState(GameState.SPELLING_PLAYING); setSpellingIndex(0); setMistakes(0); setWrongAnswers([]); resetSpellingQuestion();
  };

  const resetSpellingQuestion = () => {
    setUserInput(""); setCurrentQuestionMistakes(0); setExtraHints(0); setShowEnglishDef(false); setModalState('none'); setHasViewedExample(false);
    if (definitionTimerRef.current) clearTimeout(definitionTimerRef.current);
    definitionTimerRef.current = setTimeout(() => setShowEnglishDef(true), 10000);
    if (window.innerWidth >= 768) setTimeout(() => inputRef.current?.focus(), 100);
  };

  const getSpellingWordStyles = (length: number) => {
     if (length <= 6) return { fontClass: "text-4xl sm:text-6xl md:text-7xl", borderClass: "border-b-4 sm:border-b-8 w-10 sm:w-20 mx-1 sm:mx-2" };
     else if (length <= 9) return { fontClass: "text-3xl sm:text-5xl md:text-6xl", borderClass: "border-b-4 sm:border-b-6 w-8 sm:w-14 mx-0.5 sm:mx-1.5" };
     else if (length <= 12) return { fontClass: "text-2xl sm:text-4xl md:text-5xl", borderClass: "border-b-2 sm:border-b-4 w-6 sm:w-10 mx-0.5 sm:mx-1" };
     else return { fontClass: "text-xl sm:text-3xl md:text-4xl", borderClass: "border-b-2 sm:border-b-4 w-5 sm:w-8 mx-[1px]" };
  };

  const renderSpellingHint = () => {
    const wordData = spellingVocab[spellingIndex]; if (!wordData) return null;
    const styles = getSpellingWordStyles(wordData.word.length);
    const hintsToShow = 1 + currentQuestionMistakes + extraHints;
    return wordData.word.split('').map((char, index) => {
      let content; 
      let styleClass = `${styles.borderClass} inline-block text-center transition-all`;
      
      if (index < userInput.length) { 
        content = userInput[index]; 
        styleClass += " border-gray-800 text-black"; 
        return <span key={index} className={styleClass}>{content}</span>;
      }
      else if (index < hintsToShow) { 
        content = char; 
        // Use outline style for letters revealed as hints but not yet typed
        return (
          <span 
            key={index} 
            className={`${styles.borderClass} inline-block text-center transition-all border-gray-500`}
            style={{ WebkitTextStroke: '2px #374151', color: 'transparent' }}
          >
            {content}
          </span>
        );
      }
      else { 
        content = "_"; 
        styleClass += " text-transparent border-gray-500"; 
        return <span key={index} className={styleClass}>{content}</span>;
      }
    });
  };

  const handleCardClick = (card: MatchingCard, currentSelected: MatchingCard[], setCurrentSelected: React.Dispatch<React.SetStateAction<MatchingCard[]>>, setAllCards: React.Dispatch<React.SetStateAction<MatchingCard[]>>, setMatchedCount: React.Dispatch<React.SetStateAction<number>>, onMatch?: () => void) => {
    if (card.isMatched || currentSelected.find(c => c.id === card.id) || currentSelected.length >= 2) return;
    const newSelected = [...currentSelected, card]; setCurrentSelected(newSelected);
    if (newSelected.length === 2) {
      const [c1, c2] = newSelected;
      if (c1.word === c2.word && c1.type !== c2.type) { setAllCards(prev => prev.map(c => (c.id === c1.id || c.id === c2.id) ? { ...c, isMatched: true } : c)); setMatchedCount(prev => prev + 1); setCurrentSelected([]); if (onMatch) onMatch(); }
      else { setTimeout(() => setCurrentSelected([]), 300); }
    }
  };

  const startSingleMatchingRound = () => {
    const cards = generateMatchingCards(questionCount, activeVocab);
    setMatchingCards(cards); setSelectedCards([]); setMatchedPairs(0); setMatchingCurrentTime(0); setGameState(GameState.MATCHING_SINGLE_PLAYING); setMatchingStartTime(Date.now());
    if (matchingTimerRef.current) clearInterval(matchingTimerRef.current);
    matchingTimerRef.current = setInterval(() => setMatchingCurrentTime((Date.now() - matchingStartTime) / 1000), 100);
  };

  useEffect(() => {
    if (gameState === GameState.MATCHING_SINGLE_PLAYING) {
      const start = Date.now();
      matchingTimerRef.current = setInterval(() => setMatchingCurrentTime((Date.now() - start) / 1000), 100);
    } else { if (matchingTimerRef.current) clearInterval(matchingTimerRef.current); }
    return () => { if (matchingTimerRef.current) clearInterval(matchingTimerRef.current); };
  }, [gameState]);

  useEffect(() => {
    if (gameState === GameState.MATCHING_SINGLE_PLAYING && matchedPairs > 0 && matchedPairs === questionCount) {
      if (matchingTimerRef.current) clearInterval(matchingTimerRef.current);
      const timeTaken = matchingCurrentTime;
      const newEntry: LeaderboardEntry = { studentId: currentChallengerName, timeTaken };
      setLeaderboard(prev => [...prev, newEntry].sort((a, b) => a.timeTaken - b.timeTaken));
      setGameState(GameState.MATCHING_SINGLE_RESULT);
    }
  }, [matchedPairs, gameState]);

  const startDualMatching = (count: number) => {
    setQuestionCount(count); const cardsP1 = generateMatchingCards(count, activeVocab);
    const cardsP2 = JSON.parse(JSON.stringify(cardsP1)).sort(() => 0.5 - Math.random());
    setDualP1Cards(cardsP1); setDualP2Cards(cardsP2); setDualP1Selected([]); setDualP2Selected([]); setDualP1Matches(0); setDualP2Matches(0); setDualWinner(null); setGameState(GameState.MATCHING_DUAL_PLAYING);
  };

  useEffect(() => {
    if (gameState === GameState.MATCHING_DUAL_PLAYING) {
      if (dualP1Matches === questionCount && dualWinner === null) setDualWinner('P1');
      else if (dualP2Matches === questionCount && dualWinner === null) setDualWinner('P2');
    }
  }, [dualP1Matches, dualP2Matches, gameState, questionCount]);

  const handleRollDice = (count: number) => {
      setShowDiceModal(false); setIsRollingDice(true);
      const maxVal = (diceMaxTens * 10) + diceMaxOnes;
      const safeMax = maxVal < 1 ? 1 : maxVal;
      let resString = "";
      if (count === 1) resString = (Math.floor(Math.random() * safeMax) + 1).toString();
      else resString = `${Math.floor(Math.random() * safeMax) + 1} & ${Math.floor(Math.random() * safeMax) + 1}`;
      setTimeout(() => { setDiceResult(resString); setIsRollingDice(false); }, 2500); 
  };

  if (!isAuthenticated) {
    return (
      <div className="h-[100svh] w-full flex flex-col items-center justify-center bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-black opacity-80"></div>
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-3xl shadow-2xl w-full max-w-md text-center relative z-10 animate-fade-in">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Restricted Access</h1>
          <p className="text-blue-200 mb-6 text-sm">Please enter the access code.</p>
          <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-center text-xl placeholder-gray-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all mb-4" placeholder="Password" autoFocus />
          <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transform transition-all active:scale-95">Unlock</button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.HOME) return renderHome();

  if (gameState === GameState.SPELLING_SETUP) {
    return (
      <div className="h-[100svh] w-full flex flex-col items-center justify-start pt-10 sm:pt-14 p-4 pb-[env(safe-area-inset-bottom)] overflow-y-auto">
         <div className="w-full max-w-5xl mx-auto mb-8 sm:mb-10 flex items-center justify-center">
          <div className="bg-black/20 backdrop-blur-md border-4 border-white/50 rounded-3xl p-4 sm:p-6 shadow-xl relative">
            <button onClick={() => setGameState(GameState.HOME)} className="absolute left-[-60px] top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl backdrop-blur-sm transition-all">↩</button>
            <h1 className="font-bold text-white drop-shadow-md text-3xl sm:text-5xl tracking-widest">看圖拼字</h1>
          </div>
        </div>
        <div className="marshmallow-bg p-6 sm:p-8 w-full max-w-2xl shadow-xl animate-fade-in rounded-3xl">
          <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-6 sm:mb-8 text-center text-gray-800">Choose Number of Questions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {[5, 10, 15].map(num => (
              <button key={num} onClick={() => startSpellingGame(num)} className="bg-white border-2 border-gray-100 text-gray-700 font-bold py-3 sm:py-4 rounded-xl text-xl sm:text-2xl lg:text-4xl shadow-sm hover:bg-blue-50 hover:border-blue-200">{num} 題</button>
            ))}
            <button onClick={() => setShowCustomInput(true)} className="bg-white border-2 border-gray-100 text-gray-700 font-bold py-3 sm:py-4 rounded-xl text-xl sm:text-2xl hover:bg-blue-50">自訂</button>
          </div>
          {showCustomInput && (
            <div className="flex flex-col items-center animate-fade-in gap-4">
              <div className="flex items-center gap-4">
                <input type="number" min="1" max="50" value={customCountInput} onChange={(e) => setQuestionCount(parseInt(e.target.value) || 10)} className="w-24 p-2 text-center text-2xl border-2 border-gray-300 rounded-lg" />
                <button onClick={() => { if (questionCount > 0 && questionCount <= 50) startSpellingGame(questionCount); }} className="bg-gray-800 text-white px-6 py-2 rounded-lg font-bold text-xl">GO</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState === GameState.SPELLING_PLAYING) {
     const currentWordData = spellingVocab[spellingIndex];
     const styles = currentWordData ? getSpellingWordStyles(currentWordData.word.length) : { fontClass: "", borderClass: "" };
     const progressPercentage = ((spellingIndex + 1) / questionCount) * 100;
     const posMatch = currentWordData ? currentWordData.definition.match(/^(\([a-z]+\.?\s*(?:\[.*?\])?\))/) : null;
     const pos = posMatch ? posMatch[1] : "";
     return (
       <div className="h-[100svh] w-full flex flex-col relative overflow-hidden bg-gradient-to-br from-yellow-200 via-orange-200 to-pink-300">
         {showQuitConfirm && <QuitModal onConfirm={confirmAbort} onCancel={() => setShowQuitConfirm(false)} />}
         <button onClick={handleAbortGame} className="absolute bottom-4 right-4 z-50 bg-red-500/80 hover:bg-red-600 text-white w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold text-xl shadow-lg transition-all">✕</button>
         <div className="flex-1 w-full h-full flex flex-col items-center justify-center pt-2 pb-safe">
            <div className="w-full max-w-[1920px] mx-auto flex flex-col md:flex-row items-center md:items-stretch justify-center relative">
                <div className="w-full md:w-1/2 flex flex-col items-center border-b-4 md:border-b-0 border-white/30 md:border-r-8 md:pr-4 md:pl-12 pb-2">
                    <div className="w-full max-w-xl flex flex-col gap-2 px-4">
                        <div className="bg-green-50/90 backdrop-blur-sm px-2 py-1 rounded-3xl text-center flex items-center justify-center min-h-[5rem] sm:min-h-[6rem] h-auto relative border-2 border-green-200 shadow-md">
                             <p className={`font-semibold leading-tight ${showEnglishDef ? 'text-green-900 text-2xl sm:text-3xl lg:text-4xl' : 'text-green-700 font-bold animate-flash-text text-3xl sm:text-5xl'}`}>
                                {showEnglishDef ? currentWordData.englishDef : "GUESS THE WORD"}
                             </p>
                             {!showEnglishDef && <div className="absolute bottom-0 left-0 h-1.5 bg-green-400 animate-countdown"></div>}
                        </div>
                        <div className="relative grid grid-cols-2 gap-3 w-full">
                           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
                              {!showMistakeOrb ? <TechOrb value={`${spellingIndex + 1}/${questionCount}`} positionClass="" colorClass="bg-blue-500" progress={progressPercentage} /> : <TechOrb value={mistakes} positionClass="" colorClass={`bg-red-500 ${isErrorAnimating ? 'animate-shake' : ''}`} />}
                           </div>
                           {currentWordData.images.slice(0, 4).map((img, idx) => (
                             <div key={idx} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm flex items-center justify-center text-[5.5rem] sm:text-[7.5rem] aspect-square animate-bounce-custom select-none">{img}</div>
                           ))}
                        </div>
                    </div>
                </div>
                <div className="w-full md:w-1/2 max-w-4xl px-2 flex flex-col items-center justify-center md:justify-start relative mt-4 md:mt-0">
                   <div className={`w-full max-w-xl bg-white p-2 sm:p-6 rounded-3xl shadow-lg border-4 border-green-200 relative min-h-[150px] sm:min-h-[250px] flex flex-col justify-center ${isInputFocused ? 'ring-4 ring-green-300' : ''}`}>
                      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40">
                          <span className="bg-black text-white font-bold text-xl sm:text-2xl lg:text-3xl px-5 py-1.5 rounded-xl shadow-lg whitespace-nowrap">{pos}</span>
                      </div>
                      <button onClick={() => { setExtraHints(h => h + 1); inputRef.current?.focus(); }} className="absolute -top-3 -right-3 w-12 h-12 sm:w-[60px] sm:h-[60px] rounded-full bg-purple-500 text-white font-bold border-2 sm:border-4 border-white shadow-xl text-lg sm:text-xl hover:scale-110 transition-transform flex items-center justify-center z-50">+1</button>
                      <div className="text-center cursor-text flex items-center justify-center pt-10 pb-4" onClick={() => inputRef.current?.focus()}>
                         <div className={`flex flex-nowrap justify-center items-end ${styles.fontClass} font-mono font-bold text-gray-900 w-full overflow-hidden`}>{renderSpellingHint()}</div>
                      </div>
                      <input ref={inputRef} type="text" value={userInput} onChange={(e) => {
                          const val = e.target.value.toLowerCase();
                          if (/^[a-z]*$/.test(val) && val.length <= currentWordData.word.length) {
                             setUserInput(val);
                             if (val.length === currentWordData.word.length) {
                                if (val === currentWordData.word.toLowerCase()) { setModalState('correct'); setFlashScore(true); setTimeout(() => setFlashScore(false), 2000); }
                                else { setMistakes(m => m + 1); setCurrentQuestionMistakes(m => m + 1); setModalState('wrong'); setIsErrorAnimating(true); setShowMistakeOrb(true); setTimeout(() => setIsErrorAnimating(false), 500); setTimeout(() => setShowMistakeOrb(false), 2000); setWrongAnswers(prev => [...prev.filter(w => w.word !== currentWordData.word), { word: currentWordData.word, definition: currentWordData.definition, mistakes: (prev.find(w => w.word === currentWordData.word)?.mistakes || 0) + 1 }]); }
                             }
                          }
                      }} onFocus={() => setIsInputFocused(true)} onBlur={() => setIsInputFocused(false)} className="opacity-0 absolute inset-0 w-full h-full cursor-default" style={{fontSize: '16px'}} autoComplete="off" />
                   </div>
                </div>
            </div>
            {modalState === 'correct' && <CorrectModal wordData={currentWordData} englishDef={currentWordData.englishDef} onNext={() => { if (spellingIndex < spellingVocab.length - 1) { setSpellingIndex(prev => prev + 1); resetSpellingQuestion(); } else { setGameState(GameState.SPELLING_REVIEW); } }} onShowExample={() => { setHasViewedExample(true); setModalState('example'); }} hasViewedExample={hasViewedExample} />}
            {modalState === 'wrong' && <WrongModal onClose={() => { setModalState('none'); setUserInput(""); inputRef.current?.focus(); }} />}
            {modalState === 'example' && <ExampleModal wordData={currentWordData} onClose={() => setModalState('correct')} />}
            {flashScore && <div className="fixed top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-[18rem] sm:text-[25rem] font-bold text-red-500 animate-flash-score pointer-events-none z-[100] drop-shadow-2xl">+2</div>}
         </div>
       </div>
     );
  }

  if (gameState === GameState.SPELLING_REVIEW) {
      const sortedMistakes = [...wrongAnswers].sort((a, b) => b.mistakes - a.mistakes);
      return (
        <div className="h-[100svh] w-full flex flex-col items-center justify-start pt-12 p-4 overflow-y-auto">
          <div className="marshmallow-bg p-8 w-full max-w-4xl shadow-xl rounded-2xl">
             <h2 className="text-4xl font-bold mb-6 text-center text-gray-800">Review Time!</h2>
             {sortedMistakes.length === 0 ? <div className="text-center text-3xl text-green-600 font-bold py-10">Perfect! 🎉</div> : (
               <div className="space-y-4">
                 {sortedMistakes.map((item, idx) => (
                   <div key={idx} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
                     <div><div className="text-2xl font-bold">{item.word}</div><div className="text-gray-500">{item.definition}</div></div>
                     <span className="text-red-500 font-bold text-xl">{item.mistakes} mistakes</span>
                   </div>
                 ))}
               </div>
             )}
             <button onClick={() => setGameState(GameState.SPELLING_SETUP)} className="w-full mt-6 bg-blue-500 text-white font-bold py-4 rounded-xl text-2xl hover:bg-blue-600">Play Again</button>
             <button onClick={() => setGameState(GameState.HOME)} className="w-full mt-4 bg-gray-500 text-white font-bold py-4 rounded-xl text-2xl hover:bg-gray-600">Back to Home</button>
          </div>
        </div>
      );
  }

  if (gameState === GameState.MATCHING_MENU) return renderMatchingMenu();

  if (gameState === GameState.MATCHING_SINGLE_SETUP_GLOBAL) {
    return (
      <div className="h-[100svh] w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-100 to-indigo-100">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-lg text-center animate-fade-in">
          <h2 className="text-3xl font-bold mb-6 text-blue-900">多人挑戰設定</h2>
          <div className="mb-8">
            <label className="block text-lg font-bold text-gray-700 mb-2">每人題目數 (對數)</label>
            <div className="flex justify-center gap-2 flex-wrap">
               <button onClick={() => setQuestionCount(10)} className={`px-4 py-2 rounded-lg border-2 font-bold ${questionCount === 10 ? 'bg-blue-500 text-white border-blue-500 shadow-md ring-2 ring-blue-300' : 'bg-white text-gray-600 border-gray-200'}`}>10題</button>
               <button onClick={() => setQuestionCount(12)} className={`px-4 py-2 rounded-lg border-2 font-bold ${questionCount === 12 ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200'}`}>12題</button>
               <input type="number" placeholder="自訂" className={`w-20 p-2 border-2 rounded-lg text-center font-bold ${[10,12].includes(questionCount) ? 'border-gray-200' : 'border-blue-500 text-blue-600'}`} onChange={(e) => setQuestionCount(parseInt(e.target.value) || 10)} />
            </div>
            <p className="text-sm text-gray-500 mt-2">建議選擇 "10題" 以獲得最佳全螢幕體驗</p>
          </div>
          <button onClick={() => { if (questionCount > 0) { setLeaderboard([]); setGameState(GameState.MATCHING_SINGLE_PLAYER_ENTRY); } else alert("請輸入有效的題數"); }} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl text-xl hover:bg-blue-700 shadow-lg">下一步</button>
          <button onClick={() => setGameState(GameState.MATCHING_MENU)} className="mt-4 text-gray-500 underline">取消</button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.MATCHING_SINGLE_PLAYER_ENTRY) {
    return (
      <div className="h-[100svh] w-full flex flex-col items-center justify-start p-4 pt-16 bg-gradient-to-br from-blue-100 to-indigo-100">
        {leaderboard.length > 0 && (
          <div className="mb-8 w-full max-w-lg bg-white/60 backdrop-blur-md rounded-2xl p-6 shadow-xl animate-fade-in z-20 border-2 border-white/50">
             <h3 className="text-center font-bold text-gray-700 mb-4 text-xl">目前排名</h3>
             <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {leaderboard.map((entry, idx) => (
                  <div key={idx} className="flex-shrink-0 bg-white p-4 rounded-xl shadow-md border border-gray-200 min-w-[120px] text-center transform hover:scale-105 transition-transform">
                    <div className="text-lg font-bold text-gray-400">#{idx + 1}</div>
                    <div className="font-black text-blue-800 truncate max-w-[150px] text-2xl my-1">{entry.studentId}</div>
                    <div className="text-green-600 font-mono text-xl font-bold">{formatTime(entry.timeTaken)}</div>
                  </div>
                ))}
             </div>
          </div>
        )}
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-lg text-center animate-fade-in relative z-10 border-4 border-white/50">
          <button onClick={() => setGameState(GameState.HOME)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">✕</button>
          <div className="mb-4 text-blue-500 font-bold uppercase tracking-widest">Next Challenger</div>
          <h2 className="text-3xl font-bold mb-6 text-gray-800">輸入挑戰者資訊</h2>
          <input type="text" value={currentChallengerName} onChange={(e) => { const val = e.target.value; if (/^\d{0,5}$/.test(val)) setCurrentChallengerName(val); }} className="w-full p-4 border-4 border-blue-100 rounded-2xl text-2xl text-center font-bold mb-8 focus:border-blue-500 outline-none placeholder:text-gray-300 transition-colors" placeholder="班級座號(5碼)" autoFocus />
          <button onClick={() => { if (currentChallengerName.trim().length === 5) startSingleMatchingRound(); else alert("請輸入5碼班級座號"); }} className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl text-2xl hover:bg-green-600 shadow-xl transform hover:scale-[1.02] active:scale-95 transition-all">開始挑戰 (Start)</button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.MATCHING_SINGLE_PLAYING) {
     return (
       <div className="h-[100svh] w-full flex flex-col bg-slate-900 overflow-hidden relative">
          {showQuitConfirm && <QuitModal onConfirm={confirmAbort} onCancel={() => setShowQuitConfirm(false)} />}
          
          {/* Top Bar - Exactly Four Equal Parts Layout */}
          <div className="bg-slate-800 shadow-2xl p-1 sm:p-2 flex items-stretch z-10 flex-shrink-0 border-b-4 border-blue-500/30 w-full h-[4.5rem] sm:h-[6rem]">
             
             {/* Leaderboard Section (Occupies 3/4 of the layout) */}
             <div className="flex-[3] overflow-x-auto no-scrollbar mask-linear-fade flex items-center">
                <div className="flex w-full h-full items-center">
                   {leaderboard.map((entry, idx) => (
                     /* Each entry is 1/3 of the 75% width container = 25% of total width */
                     <div key={idx} className="w-[33.333%] flex-shrink-0 px-1 sm:px-2 h-full py-1">
                        <div className="bg-slate-700/50 rounded-2xl border-2 border-white/10 pr-2 pl-1 h-full flex items-center gap-1 sm:gap-2 shadow-inner overflow-hidden">
                           <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-sm sm:text-2xl shadow-lg border-2 border-white/20 flex-shrink-0">
                              {idx + 1}
                           </div>
                           <div className="flex items-center gap-1 sm:gap-3 min-w-0 flex-1">
                              <span className="font-black text-blue-200 text-lg sm:text-3xl lg:text-4xl truncate leading-none">{entry.studentId}</span>
                              <span className="font-mono text-green-400 font-black text-lg sm:text-3xl lg:text-4xl whitespace-nowrap leading-none">{formatTime(entry.timeTaken)}</span>
                           </div>
                        </div>
                     </div>
                   ))}
                   {leaderboard.length === 0 && <div className="flex items-center justify-center w-full text-slate-500 italic text-xl sm:text-4xl">No records yet...</div>}
                </div>
             </div>

             {/* Timer Section (Occupies 1/4 of total width) */}
             <div className="flex-[1] px-1 sm:px-2 relative h-full">
                 <div className="bg-black border-2 sm:border-4 border-green-500/50 text-green-400 font-mono text-3xl sm:text-5xl lg:text-7xl rounded-xl sm:rounded-2xl shadow-[0_0_15px_rgba(34,197,94,0.3)] text-center h-full flex items-center justify-center min-w-0 leading-none">
                    {formatTime(matchingCurrentTime)}
                 </div>
                 {/* Shrinked Abort Button (50% smaller) placed at top-right of the timer box */}
                 <button 
                   onClick={handleAbortGame} 
                   className="absolute top-0.5 right-1.5 sm:top-1.5 sm:right-3 bg-red-500 hover:bg-red-600 text-white w-5 h-5 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center font-bold text-[10px] sm:text-base shadow-lg transition-all border-b sm:border-b-2 border-red-700 active:border-b-0 active:translate-y-0.5 z-20"
                 >
                   ✕
                 </button>
             </div>
          </div>

          <div className="flex-1 p-2 pb-safe w-full h-full overflow-hidden">
             <div className="grid h-full w-full gap-2 max-w-7xl mx-auto py-2" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                {matchingCards.map(card => {
                  const isSelected = selectedCards.some(c => c.id === card.id);
                  const contentParts = card.content.split('\n');
                  return (
                    <button key={card.id} disabled={card.isMatched} onClick={() => handleCardClick(card, selectedCards, setSelectedCards, setMatchingCards, setMatchedPairs)} className={`w-full h-full rounded-2xl flex items-center justify-center text-center shadow-lg transition-all duration-200 relative overflow-hidden p-2 ${card.isMatched ? 'invisible' : isSelected ? 'bg-blue-500 border-4 border-white scale-[1.02] z-10 shadow-[0_0_25px_rgba(255,255,255,0.4)]' : 'bg-slate-50 hover:bg-white border-b-4 border-slate-300'}`}>
                      <div className={`font-bold w-full h-full relative flex items-center justify-center ${card.type === 'EN' ? 'text-blue-700' : 'text-amber-900'}`}>
                        <span className="text-lg sm:text-3xl leading-tight z-10 select-none">{contentParts[0]}</span>
                        {contentParts[1] && <span className="absolute bottom-1 text-[150%] opacity-25 select-none pointer-events-none">{contentParts[1]}</span>}
                      </div>
                    </button>
                  );
                })}
             </div>
          </div>
       </div>
     );
  }

  if (gameState === GameState.MATCHING_SINGLE_RESULT) {
    return (
      <div className="h-[100svh] w-full flex flex-col items-center justify-center p-4 bg-green-50">
        <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-md w-full animate-bounce-custom border-8 border-green-200">
           <div className="text-6xl mb-6">🏁</div>
           <div className="mb-8"><div className="text-gray-500 text-sm uppercase tracking-widest mb-1">Challenger</div><div className="text-4xl font-black text-blue-900 break-words leading-tight">{currentChallengerName}</div></div>
           <div className="mb-8 bg-black/5 rounded-2xl p-4"><div className="text-gray-500 text-sm uppercase tracking-widest mb-1">Time</div><div className="text-6xl font-mono text-green-600 font-bold">{formatTime(matchingCurrentTime)}</div></div>
           <button onClick={() => { setCurrentChallengerName(""); setGameState(GameState.MATCHING_SINGLE_PLAYER_ENTRY); }} className="w-full bg-blue-500 text-white font-bold py-4 rounded-xl text-xl hover:bg-blue-600 shadow-lg">下一位挑戰者</button>
           <button onClick={() => setGameState(GameState.MATCHING_MENU)} className="mt-4 text-gray-500 font-bold hover:text-gray-700">結束挑戰</button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.MATCHING_DUAL_SETUP) {
    return (
      <div className="h-[100svh] w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-red-100 to-orange-100 relative">
        {isRollingDice && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 animate-dice-jump"><span className="text-9xl">🎲</span></div>}
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-lg text-center relative z-10">
           {diceResult && <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-black text-yellow-400 font-bold px-6 py-2 rounded-full border-4 border-yellow-500 shadow-lg animate-bounce text-3xl whitespace-nowrap z-50 text-center">{diceResult}</div>}
           <button onClick={() => setShowDiceModal(true)} className="absolute -top-4 -right-4 w-16 h-16 bg-white rounded-full border-4 border-gray-200 shadow-lg flex items-center justify-center hover:scale-110 transition-transform text-4xl" title="Roll Dice">🎲</button>
           <h2 className="text-3xl font-bold mb-6 text-red-900">雙人對戰設定</h2>
           <label className="block text-lg font-bold text-gray-700 mb-4">對戰題數</label>
            <div className="flex justify-center gap-2 mb-2 flex-wrap">
               <button onClick={() => setQuestionCount(9)} className={`px-4 py-2 rounded-lg border-2 font-bold ${questionCount === 9 ? 'bg-red-500 text-white border-red-500 shadow-md ring-2 ring-red-300' : 'bg-white text-gray-600 border-gray-200'}`}>9題</button>
               <button onClick={() => setQuestionCount(12)} className={`px-4 py-2 rounded-lg border-2 font-bold ${questionCount === 12 ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-200'}`}>12題</button>
            </div>
             <p className="text-sm text-gray-500 mb-8">建議選擇 "9題" 以獲得最佳全螢幕體驗</p>
            <button onClick={() => startDualMatching(questionCount)} className="w-full bg-red-600 text-white font-bold py-4 rounded-xl text-xl hover:bg-red-700 shadow-lg">FIGHT!</button>
            <button onClick={() => setGameState(GameState.MATCHING_MENU)} className="mt-4 text-gray-500 underline">取消</button>
        </div>
        {showDiceModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl animate-bounce-custom">
                <h3 className="text-xl font-bold text-center mb-4 text-gray-700">Set Max Value</h3>
                <div className="flex justify-center gap-2 mb-6">
                    <div className="flex flex-col items-center"><button onClick={() => setDiceMaxTens(p => (p+1)%10)} className="p-2 bg-gray-100 rounded hover:bg-gray-200">▲</button><div className="text-4xl font-mono font-bold py-2 w-12 text-center">{diceMaxTens}</div><button onClick={() => setDiceMaxTens(p => (p-1+10)%10)} className="p-2 bg-gray-100 rounded hover:bg-gray-200">▼</button></div>
                    <div className="flex flex-col items-center"><button onClick={() => setDiceMaxOnes(p => (p+1)%10)} className="p-2 bg-gray-100 rounded hover:bg-gray-200">▲</button><div className="text-4xl font-mono font-bold py-2 w-12 text-center">{diceMaxOnes}</div><button onClick={() => setDiceMaxOnes(p => (p-1+10)%10)} className="p-2 bg-gray-100 rounded hover:bg-gray-200">▼</button></div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button onClick={() => handleRollDice(1)} className="bg-blue-600 text-white font-bold py-3 rounded-xl text-lg hover:bg-blue-700 shadow">Roll Once</button>
                  <button onClick={() => handleRollDice(2)} className="bg-purple-600 text-white font-bold py-3 rounded-xl text-lg hover:bg-purple-700 shadow">Roll Twice</button>
                </div>
                <button onClick={() => setShowDiceModal(false)} className="w-full mt-2 text-gray-400 font-bold py-2">Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (gameState === GameState.MATCHING_DUAL_PLAYING) {
    return (
      <div className="h-[100svh] w-full flex bg-gray-900 overflow-hidden relative">
        <button onClick={handleAbortGame} className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-white/20 hover:bg-white/40 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl backdrop-blur-sm z-[70] transition-all border border-white/30">✕</button>
        {showQuitConfirm && <QuitModal onConfirm={confirmAbort} onCancel={() => setShowQuitConfirm(false)} />}
        <div className={`w-1/2 h-full flex flex-col border-r-4 border-black relative transition-all duration-500 ${dualWinner === 'P2' ? 'bg-black' : 'bg-blue-50'}`}>
           {dualWinner === 'P2' && <div className="absolute inset-0 bg-black z-50 flex items-center justify-center"><span className="text-gray-700 font-bold text-4xl">DEFEAT</span></div>}
           {dualWinner === 'P1' && <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"><div className="text-[15rem] animate-bounce filter drop-shadow-[0_0_20px_rgba(255,215,0,0.8)] leading-none">👑</div><div className="text-6xl text-yellow-400 font-black tracking-widest animate-rock absolute top-1/4">YOU ROCK</div></div>}
           <div className="bg-blue-600 text-white text-center py-2 font-bold text-xl shadow-md flex-shrink-0">Player 1</div>
           <div className="flex-1 p-2 h-full w-full">
              <div className="grid h-full w-full gap-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                {dualP1Cards.map(card => (
                  <button key={card.id} disabled={card.isMatched || !!dualWinner} onClick={() => handleCardClick(card, dualP1Selected, setDualP1Selected, setDualP1Cards, setDualP1Matches)} className={`w-full h-full rounded-lg p-1 flex items-center justify-center text-center shadow-sm font-bold transition-all ${card.isMatched ? 'invisible' : dualP1Selected.some(c => c.id === card.id) ? 'bg-blue-200 ring-2 ring-blue-500 scale-105' : 'bg-white text-gray-800'}`}>
                    <div className={`font-bold w-full h-full relative flex items-center justify-center ${card.type === 'EN' ? 'text-blue-700' : 'text-amber-900'}`}><span className="text-lg sm:text-2xl leading-tight z-10">{card.content.split('\n')[0]}</span>{card.content.split('\n')[1] && <span className="absolute bottom-1 text-[150%] opacity-25 select-none pointer-events-none">{card.content.split('\n')[1]}</span>}</div>
                  </button>
                ))}
              </div>
           </div>
        </div>
        <div className={`w-1/2 h-full flex flex-col relative transition-all duration-500 ${dualWinner === 'P1' ? 'bg-black' : 'bg-red-50'}`}>
           {dualWinner === 'P1' && <div className="absolute inset-0 bg-black z-50 flex items-center justify-center"><span className="text-gray-700 font-bold text-4xl">DEFEAT</span></div>}
           {dualWinner === 'P2' && <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"><div className="text-[15rem] animate-bounce filter drop-shadow-[0_0_20px_rgba(255,215,0,0.8)] leading-none">👑</div><div className="text-6xl text-yellow-400 font-black tracking-widest animate-rock absolute top-1/4">YOU ROCK</div></div>}
           <div className="bg-red-600 text-white text-center py-2 font-bold text-xl shadow-md flex-shrink-0">Player 2</div>
           <div className="flex-1 p-2 h-full w-full">
              <div className="grid h-full w-full gap-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                {dualP2Cards.map(card => (
                  <button key={card.id} disabled={card.isMatched || !!dualWinner} onClick={() => handleCardClick(card, dualP2Selected, setDualP2Selected, setDualP2Cards, setDualP2Matches)} className={`w-full h-full rounded-lg p-1 flex items-center justify-center text-center shadow-sm font-bold transition-all ${card.isMatched ? 'invisible' : dualP2Selected.some(c => c.id === card.id) ? 'bg-red-200 ring-2 ring-red-500 scale-105' : 'bg-white text-gray-800'}`}>
                    <div className={`font-bold w-full h-full relative flex items-center justify-center ${card.type === 'EN' ? 'text-blue-700' : 'text-amber-900'}`}><span className="text-lg sm:text-2xl leading-tight z-10">{card.content.split('\n')[0]}</span>{card.content.split('\n')[1] && <span className="absolute bottom-1 text-[150%] opacity-25 select-none pointer-events-none">{card.content.split('\n')[1]}</span>}</div>
                  </button>
                ))}
              </div>
           </div>
        </div>
        {dualWinner && <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-[60]"><button onClick={() => setGameState(GameState.MATCHING_MENU)} className="bg-white text-black font-bold px-8 py-3 rounded-full shadow-2xl hover:scale-105 transition-transform">Back to Menu</button></div>}
      </div>
    );
  }
  return null;
};

export default App;