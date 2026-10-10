from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from produtos import router as produtos_router
from auth import router as auth_router
from funcionarios import router as funcionarios_router


# ==========================================
# CONFIGURAÇÃO
# ==========================================

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
INDEX_FILE = STATIC_DIR / "index.html"
DASHBOARD_FILE = STATIC_DIR / "dashboard.html"
LOJA_FILE = STATIC_DIR / "loja.html"


# ==========================================
# APLICAÇÃO FASTAPI
# ==========================================

app = FastAPI(
    title="CSTECH16 - API",
    version="1.0.0",
)


# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# ARQUIVOS ESTÁTICOS
# ==========================================

if STATIC_DIR.is_dir():
    app.mount(
        "/static",
        StaticFiles(directory=STATIC_DIR),
        name="static",
    )


# ==========================================
# ROTAS DA API
# ==========================================

app.include_router(auth_router)
app.include_router(funcionarios_router)
app.include_router(produtos_router)

# ==========================================
# PÁGINA INICIAL
# ==========================================

@app.get("/")
def inicio():
    if not LOJA_FILE.is_file():
        raise HTTPException(
            status_code=404,
            detail="Arquivo static/index.html não encontrado.",
        )

    return FileResponse(LOJA_FILE)


# ==========================================
# DASHBOARD
# ==========================================

@app.get("/dashboard.html")
def dashboard():
    if not DASHBOARD_FILE.is_file():
        raise HTTPException(
            status_code=404,
            detail="Arquivo static/dashboard.html não encontrado.",
        )

    return FileResponse(DASHBOARD_FILE)


# ==========================================
# STATUS DA API
# ==========================================

@app.get("/api")
def api_status():
    return {
        "mensagem": "API CSTECH16 funcionando!"
    }
