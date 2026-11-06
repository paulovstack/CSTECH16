
from typing import Literal
import logging

import mysql.connector
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from database import conectar_banco
from security import obter_usuario_atual
from schemas import UsuarioOut


router = APIRouter(
    prefix="/api/v1/compras",
    tags=["Compras"]
)

logger = logging.getLogger(__name__)


class ItensCompras(BaseModel):
    produto_id: int
    quantidade: int = Field(ge=1)


class CriarCompra(BaseModel):
    itens: list[ItensCompras] = Field(min_length=1)


class ConfirmarPagamento(BaseModel):
    forma_pagamento: Literal["pix", "cartao", "boleto"]


def cancelar_compras_expiradas():
    """
    Cancela compras cujo prazo de pagamento venceu e devolve
    o estoque reservado. A verificação do status dentro da
    transação impede a devolução duplicada.
    """
    conexao = None
    cursor = None
    canceladas = 0

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute("""
            SELECT id_compra
            FROM compras
            WHERE status = 'EM_PROCESSAMENTO'
              AND data_limite_pagamento IS NOT NULL
              AND data_limite_pagamento <= NOW()
        """)

        compras_expiradas = cursor.fetchall()

        for compra_expirada in compras_expiradas:
            id_compra = compra_expirada["id_compra"]

            try:
                cursor.execute("""
                    SELECT id_compra
                    FROM compras
                    WHERE id_compra = %s
                      AND status = 'EM_PROCESSAMENTO'
                      AND data_limite_pagamento <= NOW()
                    FOR UPDATE
                """, (id_compra,))

                compra = cursor.fetchone()

                if compra is None:
                    conexao.rollback()
                    continue

                cursor.execute("""
                    SELECT produto_id, quantidade
                    FROM itenscompra
                    WHERE compra_id = %s
                """, (id_compra,))

                itens = cursor.fetchall()

                for item in itens:
                    cursor.execute("""
                        UPDATE produtos
                        SET quantidade = quantidade + %s
                        WHERE id_produto = %s
                    """, (
                        item["quantidade"],
                        item["produto_id"]
                    ))

                cursor.execute("""
                    UPDATE compras
                    SET status = 'CANCELADA'
                    WHERE id_compra = %s
                      AND status = 'EM_PROCESSAMENTO'
                """, (id_compra,))

                conexao.commit()
                canceladas += 1

            except Exception:
                conexao.rollback()
                logger.exception(
                    "Erro ao cancelar a compra %s",
                    id_compra
                )

        return canceladas

    except mysql.connector.Error:
        if conexao is not None:
            conexao.rollback()

        logger.exception("Erro ao verificar compras expiradas")
        return 0

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()


@router.post("/")
def realizar_compra(
    compra: CriarCompra,
    usuario: UsuarioOut = Depends(obter_usuario_atual)
):
    if str(usuario.perfil).upper() != "CLIENTE":
        raise HTTPException(
            status_code=403,
            detail="Apenas clientes podem realizar compras."
        )

    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        quantidade_por_produto = {}

        for item in compra.itens:
            quantidade_por_produto[item.produto_id] = (
                quantidade_por_produto.get(item.produto_id, 0)
                + item.quantidade
            )

        valor_total = 0
        itens_validados = []

        for prod_id, qtd_solicitada in quantidade_por_produto.items():
            cursor.execute("""
                SELECT *
                FROM produtos
                WHERE id_produto = %s
                FOR UPDATE
            """, (prod_id,))

            produto = cursor.fetchone()

            if produto is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Produto ID {prod_id} não encontrado."
                )

            if qtd_solicitada > produto["quantidade"]:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Estoque insuficiente para {produto['nome']}. "
                        f"Disponível: {produto['quantidade']}"
                    )
                )

            valor_total += qtd_solicitada * produto["preco_venda"]

            itens_validados.append({
                "produto_id": prod_id,
                "quantidade": qtd_solicitada,
                "preco_unit": produto["preco_venda"]
            })

        cursor.execute("""
            INSERT INTO compras (
                cpf,
                valor_total,
                status,
                data_limite_pagamento
            )
            VALUES (
                %s,
                %s,
                'EM_PROCESSAMENTO',
                DATE_ADD(NOW(), INTERVAL 1 MINUTE)
            )
        """, (usuario.id, valor_total))

        id_compra = cursor.lastrowid

        for item in itens_validados:
            cursor.execute("""
                INSERT INTO itenscompra (
                    compra_id,
                    produto_id,
                    quantidade,
                    preco_unit
                )
                VALUES (%s, %s, %s, %s)
            """, (
                id_compra,
                item["produto_id"],
                item["quantidade"],
                item["preco_unit"]
            ))

            cursor.execute("""
                UPDATE produtos
                SET quantidade = quantidade - %s
                WHERE id_produto = %s
            """, (
                item["quantidade"],
                item["produto_id"]
            ))

        cursor.execute("""
            SELECT
                GREATEST(
                    TIMESTAMPDIFF(
                        SECOND,
                        NOW(),
                        data_limite_pagamento
                    ),
                    0
                ) AS segundos_restantes
            FROM compras
            WHERE id_compra = %s
        """, (id_compra,))

        prazo = cursor.fetchone()

        conexao.commit()

        return {
            "status": "EM_PROCESSAMENTO",
            "mensagem": "Compra criada. Escolha a forma de pagamento.",
            "compra_id": id_compra,
            "valor_total": valor_total,
            "segundos_restantes": prazo["segundos_restantes"]
        }

    except HTTPException:
        if conexao is not None:
            conexao.rollback()
        raise

    except mysql.connector.Error:
        if conexao is not None:
            conexao.rollback()

        logger.exception("Erro de banco ao realizar compra")

        raise HTTPException(
            status_code=500,
            detail="Erro no banco de dados ao processar a compra."
        )

    except Exception:
        if conexao is not None:
            conexao.rollback()

        logger.exception("Erro inesperado ao realizar compra")

        raise HTTPException(
            status_code=500,
            detail="Erro interno inesperado ao processar a compra."
        )

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()


@router.get("/{id_compra}/status")
def consultar_status_pagamento(
    id_compra: int,
    usuario: UsuarioOut = Depends(obter_usuario_atual)
):
    if str(usuario.perfil).upper() != "CLIENTE":
        raise HTTPException(
            status_code=403,
            detail="Apenas clientes podem consultar este pagamento."
        )

    cancelar_compras_expiradas()

    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id_compra,
                valor_total,
                status,
                forma_pagamento,
                GREATEST(
                    TIMESTAMPDIFF(
                        SECOND,
                        NOW(),
                        data_limite_pagamento
                    ),
                    0
                ) AS segundos_restantes
            FROM compras
            WHERE id_compra = %s
              AND cpf = %s
        """, (id_compra, usuario.id))

        compra = cursor.fetchone()

        if compra is None:
            raise HTTPException(
                status_code=404,
                detail="Compra não encontrada."
            )

        return compra

    except HTTPException:
        raise

    except mysql.connector.Error:
        logger.exception("Erro ao consultar status do pagamento")

        raise HTTPException(
            status_code=500,
            detail="Erro ao consultar o pagamento."
        )

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()


@router.patch("/{id_compra}/pagamento")
def confirmar_pagamento(
    id_compra: int,
    pagamento: ConfirmarPagamento,
    usuario: UsuarioOut = Depends(obter_usuario_atual)
):
    if str(usuario.perfil).upper() != "CLIENTE":
        raise HTTPException(
            status_code=403,
            detail="Apenas clientes podem confirmar pagamentos."
        )

    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id_compra,
                status,
                data_limite_pagamento
            FROM compras
            WHERE id_compra = %s
              AND cpf = %s
            FOR UPDATE
        """, (id_compra, usuario.id))

        compra = cursor.fetchone()

        if compra is None:
            raise HTTPException(
                status_code=404,
                detail="Compra não encontrada."
            )

        if compra["status"] != "EM_PROCESSAMENTO":
            raise HTTPException(
                status_code=400,
                detail=f"Esta compra está com status {compra['status']}."
            )

        cursor.execute("""
            SELECT data_limite_pagamento > NOW() AS prazo_valido
            FROM compras
            WHERE id_compra = %s
        """, (id_compra,))

        prazo = cursor.fetchone()

        if not prazo or not prazo["prazo_valido"]:
            conexao.rollback()

            cancelar_compras_expiradas()

            raise HTTPException(
                status_code=410,
                detail="O prazo de pagamento expirou. A compra foi cancelada."
            )

        cursor.execute("""
            UPDATE compras
            SET status = 'CONCLUIDA',
                forma_pagamento = %s
            WHERE id_compra = %s
              AND status = 'EM_PROCESSAMENTO'
        """, (
            pagamento.forma_pagamento,
            id_compra
        ))

        conexao.commit()

        return {
            "status": "CONCLUIDA",
            "mensagem": "Pagamento simulado confirmado com sucesso!",
            "compra_id": id_compra,
            "forma_pagamento": pagamento.forma_pagamento
        }

    except HTTPException:
        if conexao is not None:
            conexao.rollback()
        raise

    except mysql.connector.Error:
        if conexao is not None:
            conexao.rollback()

        logger.exception("Erro de banco ao confirmar pagamento")

        raise HTTPException(
            status_code=500,
            detail="Erro no banco de dados ao confirmar o pagamento."
        )

    except Exception:
        if conexao is not None:
            conexao.rollback()

        logger.exception("Erro inesperado ao confirmar pagamento")

        raise HTTPException(
            status_code=500,
            detail="Erro interno ao confirmar o pagamento."
        )

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()


@router.get("/minhas_compras")
def listar_compras(
    usuario: UsuarioOut = Depends(obter_usuario_atual)
):
    if str(usuario.perfil).upper() != "CLIENTE":
        raise HTTPException(
            status_code=403,
            detail="Apenas clientes podem visualizar suas compras."
        )

    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                c.id_compra,
                c.valor_total,
                c.status,
                c.forma_pagamento,
                c.data_limite_pagamento,
                ic.produto_id,
                ic.quantidade,
                ic.preco_unit,
                p.nome AS nome_produto,
                p.imagem_url
            FROM compras c
            LEFT JOIN itenscompra ic
                ON c.id_compra = ic.compra_id
            LEFT JOIN produtos p
                ON ic.produto_id = p.id_produto
            WHERE c.cpf = %s
            ORDER BY c.id_compra DESC
        """, (usuario.id,))

        resultados = cursor.fetchall()
        compras = {}

        for item in resultados:
            compra_id = item["id_compra"]

            if compra_id not in compras:
                compras[compra_id] = {
                    "id_compra": compra_id,
                    "valor_total": item["valor_total"],
                    "status": item["status"],
                    "forma_pagamento": item["forma_pagamento"],
                    "data_limite_pagamento": item["data_limite_pagamento"],
                    "itens": []
                }

            if item["produto_id"] is not None:
                compras[compra_id]["itens"].append({
                    "produto_id": item["produto_id"],
                    "nome_produto": item["nome_produto"],
                    "imagem_url": item["imagem_url"],
                    "quantidade": item["quantidade"],
                    "preco_unit": item["preco_unit"]
                })

        return list(compras.values())

    except mysql.connector.Error:
        logger.exception("Erro ao consultar compras")

        raise HTTPException(
            status_code=500,
            detail="Erro ao consultar suas compras."
        )

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()
