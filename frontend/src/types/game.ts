// src/types/game.ts

// --- MODELOS PRINCIPALES ---

export interface Player {
  id: string;
  name: string;
  position: number;
  is_online: boolean;
  has_finished: boolean;
}

// Usamos "Union Types" (Tipos Literales) para tener autocompletado exacto
export type CellType = "start" | "end" | "normal" | "ladder" | "snake";

export interface Cell {
  index: number;
  cell_type: CellType;
  effect_value: number;
}

export type RoomStatus = "waiting" | "playing" | "finished";

export interface GameRoom {
  id: string;
  players: Record<string, Player>; // Record equivale al Dict[str, Player] de Python
  player_order: string[];
  current_turn_index: number;
  board_cells: Cell[];
  status: RoomStatus;
  asked_questions: string[];
  leaderboard: string[];
}

// --- MODELO DE TRIVIA ---

export interface TriviaQuestion {
  id: string;
  law_number: number;
  question_type: string;
  text: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

// --- PAYLOADS DE WEBSOCKET (Lo que envía el servidor) ---

// El payload de "STATE_UPDATE" es directamente la interfaz GameRoom.
// Aquí definimos el payload de "TRIVIA_TIME".
export interface TriviaTimePayload {
  player_id: string;
  dice_roll: number;
  question: TriviaQuestion;
}

// --- PAYLOADS DE WEBSOCKET (Lo que envía el cliente) ---

export interface AnswerTriviaAction {
  action: "ANSWER_TRIVIA";
  question_id: string;
  selected_index: number;
  dice_roll: number;
}

export interface GenericAction {
  action: "START_GAME" | "ROLL_DICE";
}

// --- NUEVOS PAYLOADS ---

export interface TurnResultPayload {
  player_id: string;
  is_correct: boolean;
  dice_roll: number; // Será 0 si se equivocó
  old_position: number;
  new_position: number;
}

export interface ErrorPayload {
  message: string;
}