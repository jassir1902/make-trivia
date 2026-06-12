// src/app/room/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { useGameSocket } from "@/hooks/useGameSocket";

export default function RoomPage() {
  // --- 1. ENRUTAMIENTO Y PARÁMETROS ---
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  // --- 2. ESTADO GLOBAL (Zustand) ---
  // Extraemos toda la información que el WebSocket mantiene sincronizada
  const { 
    playerId, 
    room, 
    activeTrivia, 
    lastTurnResult, 
    errorMessage 
  } = useGameStore();

  // --- 3. CONEXIÓN WEBSOCKET ---
  // Iniciamos la conexión pasando el ID de la sala y del jugador.
  // Obtenemos las funciones para enviar acciones al backend.
  const { startGame, rollDice, answerTrivia } = useGameSocket(roomId, playerId || "");
  
  // --- 4. ESTADO LOCAL ---
  // Controla qué opción del modal de trivia ha seleccionado el jugador antes de confirmar
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // --- 5. EFECTOS DE CICLO DE VIDA ---
  // Seguridad: Si recarga la página y pierde su ID de sesión, lo devolvemos al inicio
  useEffect(() => {
    if (!playerId) {
      router.push("/");
    }
  }, [playerId, router]);


  // --- 6. PANTALLAS DE CARGA Y REDIRECCIÓN ---
  if (!playerId) return null; // Evita parpadeos extraños mientras Next.js redirige
  if (!room) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
      Conectando al tablero de juego...
    </div>
  );

  // --- 7. VARIABLES DERIVADAS (Lógica de UI) ---
  // Procesamos los datos crudos del estado para facilitar el renderizado
  const playersList = Object.values(room.players);
  const isHost = room.player_order[0] === playerId;
  const currentTurnPlayerId = room.player_order[room.current_turn_index];
  const isMyTurn = currentTurnPlayerId === playerId;
  const currentTurnPlayer = room.players[currentTurnPlayerId];
  
  // Identificamos quién está respondiendo la trivia (útil para mostrarlo a los espectadores)
  const playerAnswering = activeTrivia ? room.players[activeTrivia.player_id] : null;

  // --- 8. RENDERIZADO PRINCIPAL ---
  return (
    <main className="min-h-screen bg-slate-900 p-4 md:p-8 font-sans text-slate-100 relative overflow-hidden">
      
      {/* --- SISTEMA DE NOTIFICACIONES FLOTANTES --- */}
      
      {/* Alerta de Error: Aparece si el servidor rechaza una acción (ej. jugar fuera de turno) */}
      {errorMessage && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-bounce">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Crónica de Eventos: Muestra el resultado del último turno a todos los jugadores */}
      {lastTurnResult && !activeTrivia && (
        <div className="absolute top-4 right-4 bg-slate-800 border border-slate-600 text-white p-4 rounded-lg shadow-xl z-40 max-w-xs transition-all animate-fade-in-down">
          <p className="font-bold text-sm text-slate-400 mb-1">Última acción:</p>
          <p className="text-sm">
            <span className="font-bold">{room.players[lastTurnResult.player_id]?.name}</span>{' '}
            {lastTurnResult.is_correct ? 
              <span className="text-emerald-400 font-bold">¡acertó y avanza {lastTurnResult.dice_roll}!</span> : 
              <span className="text-red-400 font-bold">falló la pregunta.</span>
            }
          </p>
        </div>
      )}

      {/* --- CONTENEDOR PRINCIPAL --- */}
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* CABECERA: Siempre visible, muestra información básica de la sala */}
        <header className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center shadow-lg">
          <div>
            <h1 className="text-2xl font-bold text-emerald-400">Sala: {room.id}</h1>
            <p className="text-sm text-slate-400">Jugadores Conectados: {playersList.length}/5</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Jugando como:</p>
            <p className="font-bold text-blue-400 text-lg">{room.players[playerId]?.name}</p>
          </div>
        </header>

        {/* --- VISTA 1: LOBBY DE ESPERA --- */}
        {room.status === "waiting" && (
           <section className="bg-slate-800 p-8 rounded-xl border border-slate-700 text-center space-y-8 shadow-lg">
           <h2 className="text-2xl font-semibold">Esperando a que se unan los jugadores...</h2>
           
           {/* Lista de avatares de jugadores en el lobby */}
           <div className="flex flex-wrap gap-4 justify-center">
             {playersList.map((p) => (
               <div key={p.id} className="bg-slate-700 px-5 py-3 rounded-full flex items-center gap-3 shadow-sm border border-slate-600">
                 <div className={`w-3 h-3 rounded-full animate-pulse ${p.is_online ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                 <span className="font-medium">{p.name}</span>
                 {p.id === room.player_order[0] && <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">(Host)</span>}
               </div>
             ))}
           </div>

           {/* Controles del Host */}
           {isHost ? (
             <div className="pt-4">
               <button 
                 onClick={startGame}
                 disabled={playersList.length < 2}
                 className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {playersList.length < 2 ? "Se necesitan al menos 2 jugadores" : "Comenzar Partida Ahora"}
               </button>
             </div>
           ) : (
             <p className="text-slate-400 italic pt-4">Esperando a que el creador de la sala inicie la partida...</p>
           )}
         </section>
        )}

        {/* --- VISTA 2: EL TABLERO DE JUEGO --- */}
        {room.status === "playing" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* PANEL IZQUIERDO: Controles e Información del Turno */}
            <aside className="space-y-6">
              
              {/* Tarjeta de Acción Principal */}
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center shadow-lg relative overflow-hidden">
                <h3 className="text-slate-400 text-sm uppercase tracking-wider mb-2">Turno actual</h3>
                <p className={`text-2xl font-bold ${isMyTurn ? 'text-emerald-400' : 'text-blue-400'}`}>
                  {isMyTurn ? "¡Es tu turno!" : currentTurnPlayer?.name}
                </p>
                
                {/* Botón para tirar el dado (Solo visible si es tu turno y no hay trivia activa) */}
                {isMyTurn && !activeTrivia && (
                  <button 
                    onClick={rollDice}
                    className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-900/50 transform hover:-translate-y-1 transition-all"
                  >
                    🎲 Tirar el Dado
                  </button>
                )}

                {/* Indicador visual mientras el jugador responde */}
                {isMyTurn && activeTrivia && (
                    <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <p className="text-amber-400 text-sm font-medium animate-pulse">Respondiendo trivia...</p>
                    </div>
                )}
              </div>
              
              {/* Tarjeta de Posiciones (Leaderboard en vivo) */}
              <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
                <h4 className="font-semibold mb-4 border-b border-slate-700 pb-2 text-slate-300">Posiciones Actuales</h4>
                <ul className="space-y-3">
                  {playersList.map(p => (
                    <li key={p.id} className="flex justify-between items-center text-sm bg-slate-900/50 p-2 rounded-lg">
                      <span className={`truncate mr-2 ${p.id === playerId ? "text-blue-400 font-bold" : "text-slate-200"}`}>
                        {p.name} {p.has_finished && "🏆"}
                      </span>
                      <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-md font-mono text-xs whitespace-nowrap border border-slate-600">
                        Casilla {p.position}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            {/* PANEL DERECHO: El Tablero Visual */}
             <section className="md:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
               <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                 {room.board_cells.map((cell) => {
                   // Identificamos qué jugadores se encuentran actualmente parados en esta casilla
                   const playersInCell = playersList.filter(p => p.position === cell.index);
                   
                   // Asignamos estilos visuales dependiendo de si es salida, meta, escalera o serpiente
                   let cellStyle = "bg-slate-700 border-slate-600";
                   if (cell.cell_type === "start") cellStyle = "bg-blue-900/40 border-blue-500/50 shadow-[inset_0_0_15px_rgba(59,130,246,0.2)]";
                   if (cell.cell_type === "end") cellStyle = "bg-emerald-900/40 border-emerald-500/50 shadow-[inset_0_0_15px_rgba(16,185,129,0.2)]";
                   if (cell.cell_type === "snake") cellStyle = "bg-red-950/40 border-red-500/30";
                   if (cell.cell_type === "ladder") cellStyle = "bg-amber-950/40 border-amber-500/30";

                   return (
                     <div 
                       key={cell.index} 
                       className={`relative aspect-square border-2 rounded-xl flex flex-col items-center justify-center p-2 transition-all ${cellStyle}`}
                     >
                       {/* Número de la casilla */}
                       <span className="absolute top-1.5 left-2 text-[10px] font-bold text-slate-400 opacity-70">
                         {cell.index}
                       </span>
                       
                       {/* Iconos de efectos especiales del tablero */}
                       {cell.cell_type === "snake" && <span className="text-sm md:text-base text-red-400/80 mb-1">🐍 {cell.effect_value}</span>}
                       {cell.cell_type === "ladder" && <span className="text-sm md:text-base text-amber-400/80 mb-1">🪜 +{cell.effect_value}</span>}
                       {cell.cell_type === "end" && <span className="text-2xl mb-1 drop-shadow-lg">🏆</span>}
                       {cell.cell_type === "start" && <span className="text-xs text-blue-300/50 font-bold uppercase tracking-widest mb-1">Inicio</span>}
                       
                       {/* Renderizado de las fichas de los jugadores en la casilla */}
                       <div className="flex flex-wrap gap-1 justify-center items-end h-full pb-1">
                         {playersInCell.map(p => (
                           <div 
                             key={p.id} 
                             title={p.name}
                             className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 shadow-md flex items-center justify-center text-[9px] font-bold text-white transition-all transform hover:scale-110
                               ${p.id === playerId ? 'bg-blue-500 border-blue-200 z-10 scale-110' : 'bg-slate-500 border-slate-300'}
                             `}
                           >
                             {p.name.charAt(0).toUpperCase()}
                           </div>
                         ))}
                       </div>
                     </div>
                   );
                 })}
               </div>
             </section>
          </div>
        )}

        {/* --- VISTA 3: PANTALLA DE RESULTADOS FINALES --- */}
        {room.status === "finished" && (
          <section className="bg-slate-800 p-10 rounded-xl border border-slate-700 text-center shadow-2xl relative overflow-hidden">
            {/* Efecto decorativo de fondo */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-32 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none"></div>
            
            <h2 className="text-5xl font-black text-emerald-400 mb-8 tracking-tight drop-shadow-md">¡Juego Terminado!</h2>
            
            <div className="space-y-4 max-w-md mx-auto relative z-10">
              {room.leaderboard.map((id, index) => {
                const p = room.players[id];
                // Asignamos estilos especiales al podio
                const isWinner = index === 0;
                return (
                  <div 
                    key={id} 
                    className={`flex items-center justify-between p-5 rounded-xl border transition-all
                      ${isWinner ? 'bg-emerald-900/30 border-emerald-500 shadow-lg scale-105' : 'bg-slate-700 border-slate-600'}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl drop-shadow-md">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👏'}
                      </span>
                      <span className={`font-bold text-lg ${isWinner ? 'text-emerald-300' : 'text-slate-200'}`}>
                        {p?.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Botón para volver al inicio */}
            <button 
              onClick={() => router.push("/")}
              className="mt-10 text-slate-400 hover:text-white underline transition-colors"
            >
              Volver al Menú Principal
            </button>
          </section>
        )}

      </div>

      {/* --- EL MODAL DE LA TRIVIA (OVERLAY OVER THE BOARD) --- */}
      {/* Solo se renderiza si hay un objeto activeTrivia en el estado global */}
      {activeTrivia && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-800 border-2 border-slate-600 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden">
            
            {/* Cabecera del Modal */}
            <div className="text-center mb-8 relative z-10">
              <p className="text-xs text-slate-400 uppercase tracking-[0.2em] font-bold mb-2">Desafío de Trivia</p>
              <h2 className="text-2xl font-bold text-white">
                Turno de <span className="text-blue-400">{playerAnswering?.name}</span>
              </h2>
              
              {/* Insignia del Dado: Muestra cuánto avanzará si acierta */}
              <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-700 px-4 py-2 rounded-full mt-4 shadow-inner">
                <span className="text-slate-400 text-sm">Valor del dado:</span>
                <span className="text-emerald-400 font-black text-xl">{activeTrivia.dice_roll}</span>
              </div>
            </div>

            {/* Contenedor de la Pregunta */}
            <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-700 mb-6 shadow-inner relative z-10">
              <p className="text-lg leading-relaxed text-slate-100 font-medium">
                {activeTrivia.question.text}
              </p>
            </div>

            {/* Lista de Opciones */}
            <div className="space-y-3 relative z-10">
              {activeTrivia.question.options.map((option, index) => {
                const isSelected = selectedIndex === index;
                // Lógica clave: Solo permitimos hacer clic si es el turno del jugador local
                const canSelect = isMyTurn; 
                
                return (
                  <button
                    key={index}
                    onClick={() => canSelect && setSelectedIndex(index)}
                    disabled={!canSelect}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200
                      ${!canSelect ? 'cursor-default opacity-90' : 'hover:border-blue-400 cursor-pointer hover:bg-slate-700/50'}
                      ${isSelected 
                        ? 'bg-blue-600/20 border-blue-500 text-blue-50 shadow-[0_0_15px_rgba(59,130,246,0.3)] transform scale-[1.02]' 
                        : 'bg-slate-800 border-slate-600 text-slate-300'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`font-black mt-0.5 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`}>
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <span className="leading-snug">{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Acciones Finales del Modal */}
            <div className="mt-8 relative z-10">
              {isMyTurn ? (
                <button
                  onClick={() => {
                    if (selectedIndex !== null) {
                      // 1. Enviamos la respuesta al servidor
                      answerTrivia(activeTrivia.question.id, selectedIndex, activeTrivia.dice_roll);
                      // 2. Limpiamos la selección local inmediatamente aquí
                      setSelectedIndex(null); 
                    }
                  }}
                  disabled={selectedIndex === null}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-emerald-500/20 disabled:shadow-none"
                >
                  Confirmar Respuesta
                </button>
              ) : (
                // Mensaje de espera para los espectadores
                <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl text-center">
                  <p className="text-slate-400 flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                    Esperando a que responda...
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </main>
  );
}