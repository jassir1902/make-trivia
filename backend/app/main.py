from fastapi import FastAPI
import json
import os
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from app.core import state  # Importamos nuestro estado global
from app.api.routes import router as api_router
from app.api.websockets import router as ws_router
from app.models.trivia import TriviaQuestion

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- CÓDIGO DE INICIO (Startup) ---
    # 1. Construir la ruta absoluta al archivo JSON de forma segura
    current_dir = os.path.dirname(os.path.realpath(__file__))
    json_path = os.path.join(current_dir, "data", "leyes_sistemicas.json")
    
    # 2. Leer el archivo y cargarlo en la memoria global
    try:
        with open(json_path, 'r', encoding='utf-8') as file:
            raw_data = json.load(file)
            # Convertimos la lista de dicts en una lista de objetos TriviaQuestion
            state.trivia_database = [TriviaQuestion(**q) for q in raw_data]
            print(f"✅ Éxito: {len(state.trivia_database)} preguntas de trivia cargadas como modelos Pydantic.")
    except FileNotFoundError:
        print(f"❌ Error: No se encontró el archivo JSON en {json_path}")
    except json.JSONDecodeError:
        print("❌ Error: El archivo JSON tiene un formato inválido.")
        
    yield # Aquí el servidor se queda corriendo y aceptando peticiones
    
    # --- CÓDIGO DE APAGADO (Shutdown) ---
    print("🛑 Apagando servidor, limpiando memoria...")
    state.active_rooms.clear()
    state.trivia_database.clear()

# Inicializamos la aplicación de FastAPI pasándole el lifespan
app = FastAPI(title="Trivia Game API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permite peticiones de cualquier frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix="/api")
app.include_router(ws_router)

@app.get("/")
def read_root():
    return {"message": "Servidor de Juego Activo", "salas_activas": len(state.active_rooms)}