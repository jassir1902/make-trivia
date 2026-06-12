import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

// URL base de tu backend. En desarrollo local con FastAPI suele ser el puerto 8000
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export const useGameSocket = (roomId: string, playerId: string) => {
  const socketRef = useRef<WebSocket | null>(null);
  
  // Traemos los nuevos setters de Zustand
  const { 
    setRoom, 
    setActiveTrivia, 
    setLastTurnResult, 
    setErrorMessage 
  } = useGameStore();

  useEffect(() => {
    if (!roomId || !playerId) return;

    const wsUrl = `${WS_BASE_URL}/ws/${roomId}/${playerId}`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('✅ Conectado a la sala:', roomId);
      setErrorMessage(null); // Limpiamos errores previos al conectar
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.event) {
        case 'STATE_UPDATE':
          setRoom(data.payload);
          break;

        case 'TRIVIA_TIME':
          setActiveTrivia(data.payload);
          break;

        case 'TURN_RESULT':
          // 1. Guardamos el resultado para que el frontend inicie las animaciones
          setLastTurnResult(data.payload);
          // 2. Cerramos la ventana de trivia recién AHORA, para que el usuario
          //    pueda ver la transición en el tablero.
          setActiveTrivia(null);
          break;

        case 'ERROR':
          // Capturamos las infracciones (ej: tirar el dado fuera de turno)
          setErrorMessage(data.payload.message);
          // Opcional: Limpiar el error después de 3 segundos
          setTimeout(() => setErrorMessage(null), 3000);
          break;

        default:
          console.warn('Evento WebSocket desconocido:', data.event);
      }
    };

    socket.onclose = (event) => {
      console.log('🛑 Desconectado del WebSocket', event.reason);
    };

    return () => {
      socket.close();
    };
  }, [roomId, playerId, setRoom, setActiveTrivia, setLastTurnResult, setErrorMessage]);

  // --- FUNCIONES PARA ENVIAR ACCIONES AL BACKEND ---

  const startGame = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'START_GAME' }));
    }
  };

  const rollDice = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'ROLL_DICE' }));
    }
  };

  const answerTrivia = (questionId: string, selectedIndex: number, diceRoll: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        action: 'ANSWER_TRIVIA',
        question_id: questionId,
        selected_index: selectedIndex,
        dice_roll: diceRoll
      }));
    }
  };

  return { startGame, rollDice, answerTrivia };
};