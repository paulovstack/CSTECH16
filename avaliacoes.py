
import logging

import mysql.connector
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from database import conectar_banco
from security import obter_usuario_atual
from schemas import UsuarioOut


router = APIRouter(
    prefix="/api/v1/avaliacoes",
    tags=["Avaliações"]
)

logger = logging.getLogger(__name__)


class CriarAvaliacao(BaseModel):
    id_produto: int = Field(gt=0)
    nota: int = Field(ge=1, le=5)
    comentario: str = Field(min_length=1)


# =========================================================
# CADASTRAR AVALIAÇÃO
# =========================================================

@router.post("/")
def criar_avaliacao(
    avaliacao: CriarAvaliacao,
    usuario: UsuarioOut = Depends(obter_usuario_atual)
):
    if str(usuario.perfil).upper() != "CLIENTE":
        raise HTTPException(
            status_code=403,
            detail="Apenas clientes podem avaliar produtos."
        )

    comentario = avaliacao.comentario.strip()

    if not comentario:
        raise HTTPException(
            status_code=400,
            detail="O comentário não pode ficar vazio."
        )

    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        # Verifica se o produto existe.
        cursor.execute("""
            SELECT id_produto
            FROM produtos
            WHERE id_produto = %s
        """, (avaliacao.id_produto,))

        produto = cursor.fetchone()

        if produto is None:
            raise HTTPException(
                status_code=404,
                detail="Produto não encontrado."
            )

        # Verifica se o cliente comprou o produto
        # e se a compra foi concluída.
        cursor.execute("""
            SELECT c.id_compra
            FROM compras c
            INNER JOIN itenscompra ic
                ON c.id_compra = ic.compra_id
            WHERE c.cpf = %s
              AND ic.produto_id = %s
              AND c.status = 'CONCLUIDA'
            LIMIT 1
        """, (usuario.id, avaliacao.id_produto))

        compra = cursor.fetchone()

        if compra is None:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Você precisa ter uma compra concluída "
                    "desse produto para avaliá-lo."
                )
            )

        # Registra a avaliação.
        cursor.execute("""
            INSERT INTO avaliacoes (
                id_produto,
                cpf,
                nota,
                comentario
            )
            VALUES (%s, %s, %s, %s)
        """, (
            avaliacao.id_produto,
            usuario.id,
            avaliacao.nota,
            comentario
        ))

        id_avaliacao = cursor.lastrowid

        conexao.commit()

        return {
            "mensagem": "Avaliação cadastrada com sucesso!",
            "id_avaliacao": id_avaliacao,
            "id_produto": avaliacao.id_produto,
            "nota": avaliacao.nota,
            "comentario": comentario
        }

    except HTTPException:
        if conexao is not None:
            conexao.rollback()
        raise

    except mysql.connector.IntegrityError as erro:
        if conexao is not None:
            conexao.rollback()

        if erro.errno == 1062:
            raise HTTPException(
                status_code=409,
                detail="Você já avaliou este produto."
            )

        logger.exception(
            "Erro de integridade ao cadastrar avaliação"
        )

        raise HTTPException(
            status_code=400,
            detail="Não foi possível registrar esta avaliação."
        )

    except mysql.connector.Error:
        if conexao is not None:
            conexao.rollback()

        logger.exception(
            "Erro de banco ao cadastrar avaliação"
        )

        raise HTTPException(
            status_code=500,
            detail="Erro no banco de dados ao cadastrar avaliação."
        )

    except Exception:
        if conexao is not None:
            conexao.rollback()

        logger.exception(
            "Erro inesperado ao cadastrar avaliação"
        )

        raise HTTPException(
            status_code=500,
            detail="Erro interno ao cadastrar avaliação."
        )

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()


# =========================================================
# LISTAR AVALIAÇÕES DE UM PRODUTO
# =========================================================

@router.get("/produto/{id_produto}")
def listar_avaliacoes(id_produto: int):
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                a.id_avaliacao,
                a.id_produto,
                a.nota,
                a.comentario,
                a.data_avaliacao,
                c.nome AS nome_cliente
            FROM avaliacoes a
            INNER JOIN clientes c
                ON a.cpf = c.cpf
            WHERE a.id_produto = %s
            ORDER BY a.data_avaliacao DESC
        """, (id_produto,))

        avaliacoes = cursor.fetchall()

        return avaliacoes

    except mysql.connector.Error:
        logger.exception("Erro ao listar avaliações")

        raise HTTPException(
            status_code=500,
            detail="Erro ao consultar avaliações."
        )

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()


# =========================================================
# CONSULTAR MÉDIA E QUANTIDADE DE AVALIAÇÕES
# =========================================================

@router.get("/produto/{id_produto}/resumo")
def resumo_avaliacoes(id_produto: int):
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                COUNT(*) AS quantidade_avaliacoes,
                COALESCE(ROUND(AVG(nota), 1), 0) AS media_avaliacoes
            FROM avaliacoes
            WHERE id_produto = %s
        """, (id_produto,))

        resultado = cursor.fetchone()

        return {
            "id_produto": id_produto,
            "quantidade_avaliacoes": resultado["quantidade_avaliacoes"],
            "media_avaliacoes": float(resultado["media_avaliacoes"])
        }

    except mysql.connector.Error:
        logger.exception(
            "Erro ao consultar resumo das avaliações"
        )

        raise HTTPException(
            status_code=500,
            detail="Erro ao consultar média das avaliações."
        )

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()
