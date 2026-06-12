import random
from app.models.game import Cell
from app.models.game import GameRoom
from app.models.trivia import TriviaQuestion

def generate_standard_board() -> list[Cell]:
    total_cells = 17
    # Inicializamos todas las casillas como normales
    board = [Cell(index=i, cell_type="normal", effect_value=0) for i in range(total_cells)]
    
    # Definimos Inicio y Fin
    board[0].cell_type = "start"
    board[16].cell_type = "end"
    
    # Seleccionamos 4 índices aleatorios únicos entre la casilla 1 y la 15
    # para ubicar las trampas y ayudas sin pisar el inicio o el fin
    special_indices = random.sample(range(1, 16), 4)
    
    # Asignamos 2 casillas positivas (Escaleras)
    board[special_indices[0]].cell_type = "ladder"
    board[special_indices[0]].effect_value = random.choice([1, 2]) # Avanza 1 o 2
    
    board[special_indices[1]].cell_type = "ladder"
    board[special_indices[1]].effect_value = random.choice([1, 2])
    
    # Asignamos 2 casillas negativas (Serpientes)
    board[special_indices[2]].cell_type = "snake"
    board[special_indices[2]].effect_value = random.choice([-1, -2]) # Retrocede 1 o 2
    
    board[special_indices[3]].cell_type = "snake"
    board[special_indices[3]].effect_value = random.choice([-1, -2])
    
    return board



def advance_turn(room: GameRoom):
    """
    Avanza el turno al siguiente jugador activo.
    Si todos han terminado, no hace nada.
    """
    # Si el juego ya terminó, abortar
    if room.status == "finished":
        return

    original_index = room.current_turn_index
    
    while True:
        # Avanzamos el índice de forma circular (vuelve a 0 si llega al final)
        room.current_turn_index = (room.current_turn_index + 1) % len(room.player_order)
        next_player_id = room.player_order[room.current_turn_index]
        
        # Si el jugador al que le toca NO ha terminado, es su turno. Rompemos el ciclo.
        if not room.players[next_player_id].has_finished:
            break
            
        # Medida de seguridad: Si dimos la vuelta completa y todos terminaron
        if room.current_turn_index == original_index:
            break


def execute_movement(room: GameRoom, player_id: str, dice_roll: int):
    """
    Ejecuta la lógica de movimiento, aplica efectos de casillas y verifica victorias.
    """
    player = room.players[player_id]
    
    # 1. Calcular posición inicial esperada
    target_position = player.position + dice_roll
    
    # 2. Limitar al final del tablero (Casilla 16)
    if target_position >= 16:
        target_position = 16
    else:
        # 3. Aplicar físicas del tablero (Escaleras y Serpientes)
        # Solo aplicamos el efecto si NO llegó a la meta
        cell = room.board_cells[target_position]
        
        if cell.cell_type in ["ladder", "snake"]:
            target_position += cell.effect_value
            
            # Limitar para que una serpiente no lo mande a posiciones negativas
            target_position = max(0, target_position)
            # Limitar por si una escalera lo empuja más allá de la meta
            target_position = min(16, target_position)
            
    # 4. Actualizar la posición del jugador
    player.position = target_position
    
    # 5. Revisar si cruzó la meta en este turno
    if player.position == 16 and not player.has_finished:
        player.has_finished = True
        room.leaderboard.append(player.id) # Se añade al final de la lista de ganadores
        
    # 6. Revisar condición de fin de juego
    if len(room.leaderboard) == len(room.players):
        room.status = "finished"


def get_question_for_turn(room: GameRoom, trivia_database: list[TriviaQuestion]) -> TriviaQuestion:
    """
    Obtiene una pregunta aleatoria utilizando instancias del modelo TriviaQuestion.
    """
    # 1. Verificar si nos quedamos sin preguntas
    if len(room.asked_questions) >= len(trivia_database):
        room.asked_questions.clear()
        
    # 2. Filtrar usando atributos del objeto (.id) en lugar de llaves de dict (["id"])
    available_questions = [
        q for q in trivia_database 
        if q.id not in room.asked_questions
    ]
    
    # 3. Seleccionar una al azar
    selected_question = random.choice(available_questions)
    
    # 4. Registrarla en la sala
    room.asked_questions.append(selected_question.id)
    
    return selected_question

def process_turn_result(room: GameRoom, player_id: str, dice_roll: int, is_correct: bool):
    """
    Resuelve el turno evaluando la condición de movimiento.
    Lanza un error si un jugador intenta actuar fuera de su turno.
    """
    # En lugar de un return silencioso, disparamos una excepción descriptiva
    if room.current_player_id != player_id:
        raise ValueError(f"Acción rechazada: Es el turno de {room.current_player_id}, no de {player_id}.")
        
    if is_correct:
        execute_movement(room, player_id, dice_roll)
        
    advance_turn(room)