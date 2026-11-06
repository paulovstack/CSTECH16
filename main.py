
import asyncio
import logging
from contextlib import asynccontextmanager, suppress
from pathlib import Path
from avaliacoes import router as avaliacoes_router
from relatorios import router as relatorios_router


from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from produtos import router as produtos_router
from auth import router as auth_router
from funcionarios import router as funcionarios_router
from compras import (
    router as compras_router,
    cancelar_compras_expiradas
)


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==========================================
# CONFIGURAÇÃO
# ==========================================

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
INDEX_FILE = STATIC_DIR / "index.html"
DASHBOARD_FILE = STATIC_DIR / "dashboard.html"
LOJA_FILE = STATIC_DIR / "loja.html"


# ==========================================
# VERIFICAÇÃO AUTOMÁTICA DE PAGAMENTOS
# ==========================================

async def verificar_pagamentos_expirados():
    while True:
        try:
            canceladas = await asyncio.to_thread(
                cancelar_compras_expiradas
            )

            if canceladas:
                logger.info(
                    "%s compra(s) expirada(s) cancelada(s).",
                    canceladas
                )

        except Exception:
            logger.exception(
                "Erro na rotina automática de pagamentos."
            )

        await asyncio.sleep(5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    tarefa_pagamentos = asyncio.create_task(
        verificar_pagamentos_expirados()
    )

    logger.info("Verificação automática de pagamentos iniciada.")

    try:
        yield
    finally:
        tarefa_pagamentos.cancel()

        with suppress(asyncio.CancelledError):
            await tarefa_pagamentos

        logger.info("Verificação automática de pagamentos encerrada.")


# ==========================================
# APLICAÇÃO FASTAPI
# ==========================================

app = FastAPI(
    title="CSLOG16 - API",
    version="1.0.0",
    lifespan=lifespan
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
    print("PASTA STATIC:", STATIC_DIR)
    print("API.JS EXISTE:", (STATIC_DIR / "js" / "api.js").is_file())


# ==========================================
# ROTAS DA API
# ==========================================

app.include_router(auth_router)
app.include_router(funcionarios_router)
app.include_router(produtos_router)
app.include_router(compras_router)
app.include_router(avaliacoes_router)
app.include_router(relatorios_router)


# ==========================================
# PÁGINA INICIAL
# ==========================================

@app.get("/")
def inicio():
    if not LOJA_FILE.is_file():
        raise HTTPException(
            status_code=404,
            detail="Arquivo static/loja.html não encontrado.",
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
        "mensagem": "API CSLOG16 funcionando!"
    }
