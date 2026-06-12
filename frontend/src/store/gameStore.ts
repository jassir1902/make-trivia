import { create } from 'zustand';
import { GameRoom, TriviaTimePayload, TurnResultPayload } from '../types/game';

interface GameState {
  room: GameRoom | null;
  playerId: string | null;
  activeTrivia: TriviaTimePayload | null;
  
  // Nuevos estados para manejar animaciones y errores
  lastTurnResult: TurnResultPayload | null;
  errorMessage: string | null;

  setRoom: (room: GameRoom) => void;
  setPlayerId: (id: string) => void;
  setActiveTrivia: (trivia: TriviaTimePayload | null) => void;
  setLastTurnResult: (result: TurnResultPayload | null) => void;
  setErrorMessage: (msg: string | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  room: null,
  playerId: null,
  activeTrivia: null,
  lastTurnResult: null,
  errorMessage: null,

  setRoom: (room) => set({ room }),
  setPlayerId: (playerId) => set({ playerId }),
  setActiveTrivia: (activeTrivia) => set({ activeTrivia }),
  setLastTurnResult: (result) => set({ lastTurnResult: result }),
  setErrorMessage: (msg) => set({ errorMessage: msg }),
  
  reset: () => set({ 
    room: null, 
    playerId: null, 
    activeTrivia: null, 
    lastTurnResult: null, 
    errorMessage: null 
  }),
}));