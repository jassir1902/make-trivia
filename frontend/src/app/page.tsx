// src/app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";

// --- CONFIGURACIÓN DE ENTORNO ---
// Mantenemos la base, pero nos aseguramos de que las llamadas usen la ruta correcta.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  // --- HOOKS Y ESTADO GLOBAL ---
  const router = useRouter();
  const setPlayerId = useGameStore((state) => state.setPlayerId);

  // --- ESTADOS LOCALES ---
  // Controlan los inputs de los formularios y el feedback visual (carga/errores)
  const [hostName, setHostName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // --- FUNCIÓN 1: CREAR UNA SALA NUEVA (Como Host) ---
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault(); // Evita que el navegador recargue la página al enviar el formulario
    setError(null);
    setIsLoading(true);

    try {
      // CORRECCIÓN CLAVE: Agregamos "/api" a la ruta para que coincida con FastAPI
      const response = await fetch(`${API_BASE_URL}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host_name: hostName }),
      });

      if (!response.ok) {
        throw new Error("Error al crear la sala en el servidor.");
      }

      const data = await response.json();
      
      // 1. Guardamos nuestro ID de sesión en Zustand (para que useGameSocket lo tome luego)
      setPlayerId(data.player_id);
      
      // 2. Redirigimos al usuario a la página de la sala dinámica
      router.push(`/room/${data.room_id}`);
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor. Verifica que FastAPI esté corriendo y sin errores de CORS.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- FUNCIÓN 2: UNIRSE A UNA SALA EXISTENTE (Como Jugador) ---
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // UX: Limpiamos espacios accidentales y forzamos mayúsculas (ej: " x7k9 " -> "X7K9")
    const cleanRoomCode = roomCode.trim().toUpperCase();

    try {
      // CORRECCIÓN CLAVE: Agregamos "/api" a la ruta
      const response = await fetch(`${API_BASE_URL}/api/rooms/${cleanRoomCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_name: playerName }),
      });

      const data = await response.json();

      // Si la sala no existe o está llena, FastAPI nos mandará un detail con el motivo
      if (!response.ok) {
        throw new Error(data.detail || "Error al unirse a la sala");
      }

      // Guardamos ID y navegamos al tablero
      setPlayerId(data.player_id);
      router.push(`/room/${data.room_id}`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error desconocido al intentar unirse.");
      }
    } finally {
      setIsLoading(false); 
    }    
  };

  // --- RENDERIZADO DE LA INTERFAZ ---
  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-100 relative overflow-hidden">
      
      {/* Elemento decorativo de fondo para darle un toque más de "juego" */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-700 relative z-10">
        
        {/* ENCABEZADO */}
        <div className="bg-slate-950/80 p-8 text-center border-b border-slate-700">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500 mb-2 drop-shadow-sm">
            Trivia
          </h1>
          <p className="text-slate-400 font-medium tracking-wide">El juego de trivia sistémica</p>
        </div>

        <div className="p-8 space-y-8">
          
          {/* ÁREA DE ALERTAS DE ERROR */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm text-center shadow-inner animate-fade-in">
              {error}
            </div>
          )}

          {/* --- SECCIÓN 1: CREAR SALA --- */}
          <section>
            <h2 className="text-sm uppercase tracking-widest font-bold mb-4 text-slate-400">Crear Nueva Partida</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Tu nombre (Host)"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="w-full px-5 py-3 bg-slate-900/50 border-2 border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors text-white placeholder-slate-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
              >
                {isLoading ? "Creando sala..." : "Crear Sala"}
              </button>
            </form>
          </section>

          {/* DIVISOR VISUAL */}
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-700"></div>
            <span className="flex-shrink-0 mx-4 text-slate-500 text-xs font-bold uppercase tracking-wider">O únete a una existente</span>
            <div className="flex-grow border-t border-slate-700"></div>
          </div>

          {/* --- SECCIÓN 2: UNIRSE A SALA --- */}
          <section>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Código de la sala (Ej: X7K9)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="w-full px-5 py-3 bg-slate-900/50 border-2 border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 uppercase transition-colors text-white placeholder-slate-500 tracking-widest font-mono"
                disabled={isLoading}
              />
              <input
                type="text"
                required
                placeholder="Tu nombre (Jugador)"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-5 py-3 bg-slate-900/50 border-2 border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-white placeholder-slate-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
              >
                {isLoading ? "Conectando..." : "Unirse a la Partida"}
              </button>
            </form>
          </section>
          
        </div>
      </div>
    </main>
  );
}