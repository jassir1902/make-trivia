from pydantic import BaseModel
from typing import List

class TriviaQuestion(BaseModel):
    id: str
    law_number: int  # Para saber a qué ley pertenece
    question_type: str  # "concepto", "aplicacion", "analisis", "metafora"
    text: str
    options: List[str]
    correct_index: int  # El índice del arreglo options (0, 1, 2 o 3)
    explanation: str  # Explicación de la respuesta correcta, para mostrar después de responder