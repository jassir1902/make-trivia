from typing import Dict, List
from app.models.game import GameRoom
from app.models.trivia import TriviaQuestion

# Diccionario global para almacenar todas las partidas activas
# La llave (key) será el ID de la sala (ej. "A1B2") y el valor el objeto GameRoom
active_rooms: Dict[str, GameRoom] = {}

# Lista global que mantendrá las preguntas cargadas desde el JSON
trivia_database: List[TriviaQuestion] = []