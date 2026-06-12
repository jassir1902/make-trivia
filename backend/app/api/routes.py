from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import random
import string
import uuid
from app.core import state
from app.models.game import GameRoom, Player
from app.services.game_engine import generate_standard_board

# Creamos un router para agrupar nuestros endpoints HTTP
router = APIRouter()

# --- Modelos de Petición (Lo que nos envía el Frontend) ---
class CreateRoomRequest(BaseModel):
    host_name: str

class JoinRoomRequest(BaseModel):
    player_name: str

# --- Función Auxiliar ---
def generate_room_code(length=4):
    """Genera un código corto alfanumérico para la sala (ej: 'X7K9')"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

# --- Endpoints ---

@router.post("/rooms", status_code=201)
def create_room(req: CreateRoomRequest):
    # 1. Generar un código único que no exista ya en memoria
    room_id = generate_room_code()
    while room_id in state.active_rooms:
        room_id = generate_room_code()
        
    # 2. Inicializar la sala y generar el tablero
    new_room = GameRoom(
        id=room_id,
        board_cells=generate_standard_board(),
        status="waiting"
    )
    
    # 3. Crear al jugador "Host"
    host_id = str(uuid.uuid4())
    host_player = Player(id=host_id, name=req.host_name)
    
    # 4. Añadir el jugador a la sala
    new_room.players[host_id] = host_player
    new_room.player_order.append(host_id)
    
    # 5. Guardar la sala en la memoria global
    state.active_rooms[room_id] = new_room
    
    return {
        "message": "Sala creada exitosamente",
        "room_id": room_id,
        "player_id": host_id
    }

@router.post("/rooms/{room_id}/join")
def join_room(room_id: str, req: JoinRoomRequest):
    room_id = room_id.upper()
    
    # 1. Validar que la sala exista
    if room_id not in state.active_rooms:
        raise HTTPException(status_code=404, detail="La sala no existe")
        
    room = state.active_rooms[room_id]
    
    # 2. Validar que la sala siga en estado de espera
    if room.status != "waiting":
        raise HTTPException(status_code=403, detail="La partida ya comenzó")
        
    # 3. Limitar a 5 jugadores máximo (tu regla del MVP)
    if len(room.players) >= 5:
        raise HTTPException(status_code=403, detail="La sala está llena")
        
    # 4. Crear al nuevo jugador y añadirlo
    new_player_id = str(uuid.uuid4())
    new_player = Player(id=new_player_id, name=req.player_name)
    
    room.players[new_player_id] = new_player
    room.player_order.append(new_player_id)
    
    return {
        "message": "Te has unido a la sala",
        "room_id": room_id,
        "player_id": new_player_id
    }