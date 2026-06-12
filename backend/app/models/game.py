from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class Player(BaseModel):
    id: str
    name: str
    position: int = 0  # Todos empiezan en la casilla 0
    is_online: bool = True
    has_finished: bool = False

class Cell(BaseModel):
    index: int  # Número de casilla (0 a N)
    cell_type: str = "normal"  # "normal", "ladder" (avanza), "snake" (retrocede)
    effect_value: int = 0  # Cuántas casillas desplaza (ej: +3 o -5)

class GameRoom(BaseModel):
    id: str  # Código único de la sala (ej: "X7Y2")
    players: Dict[str, Player] = {}  # Mapeo de player_id -> Player para acceso rápido O(1)
    player_order: List[str] = []  # Lista ordenada de IDs para controlar la rotación de turnos
    current_turn_index: int = 0  # Índice que apunta a quién le toca en player_order
    board_cells: List[Cell] = []  # El mapa de casillas autogenerado
    status: str = "waiting"  # "waiting" (en lobby), "playing", "finished"
    asked_questions: List[str] = []  # IDs de preguntas ya respondidas para no repetir
    leaderboard: List[str] = []  # IDs de jugadores en el orden que llegaron a la meta

    @property
    def current_player_id(self) -> Optional[str]:
        """Helper para obtener el ID del jugador del turno actual"""
        if not self.player_order:
            return None
        return self.player_order[self.current_turn_index]