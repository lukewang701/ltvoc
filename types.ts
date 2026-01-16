
export interface ExampleItem {
  sentence: string;
  translation: string;
}

export interface VocabularyItem {
  word: string;
  definition: string; // Chinese definition with Part of Speech
  images: string[];
  englishDef?: string;
  // Added to support extra definitions or parts of speech found in data.ts
  englishDef_extra?: string;
  example?: ExampleItem;
}

export interface WordData extends VocabularyItem {
  englishDef?: string;
  example?: ExampleItem;
}

export interface WrongAnswer {
  word: string;
  definition: string;
  mistakes: number;
}

// New interfaces for Matching Game
export interface MatchingCard {
  id: string; // Unique ID for the card instance
  word: string; // The underlying word key
  content: string; // Text to display (English+POS or Chinese)
  type: 'EN' | 'CN';
  isMatched: boolean;
}

export interface LeaderboardEntry {
  studentId: string;
  timeTaken: number; // in seconds
}

export enum GameState {
  // Navigation
  HOME, // Carousel selection
  
  // Mode 1: Spelling (Original)
  SPELLING_SETUP, // Choose question count
  SPELLING_PLAYING,
  SPELLING_REVIEW,

  // Mode 2: Matching Navigation
  MATCHING_MENU, // Choose Single or Dual
  
  // Mode 2: Matching Single Player
  MATCHING_SINGLE_SETUP_GLOBAL, // Input total challengers & question count
  MATCHING_SINGLE_PLAYER_ENTRY, // Input Student ID
  MATCHING_SINGLE_PLAYING,
  MATCHING_SINGLE_RESULT, // Show individual result then next player or finish

  // Mode 2: Matching Dual Player
  MATCHING_DUAL_SETUP, // Input question count
  MATCHING_DUAL_PLAYING,
  MATCHING_DUAL_RESULT
}
