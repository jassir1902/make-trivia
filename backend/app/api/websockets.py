from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
import random
from app.core import state
from app.services.game_engine import get_question_for_turn, process_turn_result

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Mapeo: room_id -> { player_id -> WebSocket }
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str, player_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
        self.active_connections[room_id][player_id] = websocket

    def disconnect(self, room_id: str, player_id: str):
        if room_id in self.active_connections:
            if player_id in self.active_connections[room_id]:
                del self.active_connections[room_id][player_id]
            # Si la sala queda vacía de conexiones, podríamos limpiarla (opcional para el MVP)

    async def broadcast_state(self, room_id: str):
        """Envía el estado completo del tablero a todos los jugadores en la sala."""
        if room_id in state.active_rooms and room_id in self.active_connections:
            room = state.active_rooms[room_id]
            # Convertimos el modelo Pydantic a un diccionario serializable
            game_state = room.model_dump()
            
            for connection in self.active_connections[room_id].values():
                await connection.send_json({
                    "event": "STATE_UPDATE",
                    "payload": game_state
                })

manager = ConnectionManager()

@router.websocket("/ws/{room_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, player_id: str):
    room_id = room_id.upper()
    
    # 1. Validaciones iniciales
    if room_id not in state.active_rooms:
        await websocket.close(code=4000, reason="Sala no encontrada")
        return
        
    room = state.active_rooms[room_id]
    if player_id not in room.players:
        await websocket.close(code=4001, reason="Jugador no pertenece a esta sala")
        return

    # 2. Aceptar conexión y avisar a todos del nuevo estado
    await manager.connect(websocket, room_id, player_id)
    room.players[player_id].is_online = True
    await manager.broadcast_state(room_id)

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "START_GAME":
                if room.status == "waiting" and room.player_order[0] == player_id:
                    room.status = "playing"
                    room.current_turn_index = 0
                    await manager.broadcast_state(room_id)

            elif action == "ROLL_DICE":
                if room.current_player_id == player_id and room.status == "playing":
                    dice_roll = random.randint(1, 4)
                    question = get_question_for_turn(room, state.trivia_database)
                    
                    for connection in manager.active_connections[room_id].values():
                        await connection.send_json({
                            "event": "TRIVIA_TIME",
                            "payload": {
                                "player_id": player_id,
                                "dice_roll": dice_roll,
                                "question": question.model_dump() # .model_dump() convierte el modelo a dict para JSON
                            }
                        })
                else:
                    # Avisamos al frontend si intentó tirar el dado fuera de turno
                    await websocket.send_json({
                        "event": "ERROR",
                        "payload": {"message": "No puedes tirar el dado, no es tu turno."}
                    })

            elif action == "ANSWER_TRIVIA":
                if room.status != "playing":
                    await websocket.send_json({
                        "event": "ERROR",
                        "payload": {"message": "La partida no está activa."}
                    })
                    continue

                question_id = data.get("question_id")
                selected_index = data.get("selected_index")
                dice_roll = data.get("dice_roll")
                
                # --- SOLUCIÓN TELETRANSPORTACIÓN: Guardar estado inicial ---
                player = room.players[player_id]
                old_position = player.position
                
                # Buscamos la pregunta en la base de datos
                correct = False
                for q in state.trivia_database:
                    if q.id == question_id:
                        correct = (q.correct_index == selected_index)
                        break
                
                try:
                    # Procesamos el turno (esto mutará la posición del jugador y avanzará el turno)
                    process_turn_result(room, player_id, dice_roll, correct)
                    
                    # Guardamos la posición final después de aplicar movimientos, serpientes o escaleras
                    new_position = player.position
                    
                    # 1. Emitir la "crónica" del resultado a TODOS los jugadores de la sala.
                    # Esto le da al frontend la información histórica necesaria para orquestar animaciones.
                    for connection in manager.active_connections[room_id].values():
                        await connection.send_json({
                            "event": "TURN_RESULT",
                            "payload": {
                                "player_id": player_id,
                                "is_correct": correct,
                                "dice_roll": dice_roll if correct else 0,
                                "old_position": old_position,
                                "new_position": new_position
                            }
                        })
                    
                    # 2. Emitir el estado actualizado de la sala para sincronizar los datos duros
                    await manager.broadcast_state(room_id)
                    
                except ValueError as e:
                    await websocket.send_json({
                        "event": "ERROR",
                        "payload": {"message": str(e)}
                    })

    except WebSocketDisconnect:
        # Manejo de desconexiones (ej: a un estudiante se le apaga la pantalla del celular)
        manager.disconnect(room_id, player_id)
        if room_id in state.active_rooms:
            if player_id in state.active_rooms[room_id].players:
                state.active_rooms[room_id].players[player_id].is_online = False
            await manager.broadcast_state(room_id)