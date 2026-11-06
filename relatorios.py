
import logging

import mysql.connector
from fastapi import APIRouter, Depends, HTTPException

from database import conectar_banco
from security import obter_usuario_atual
from schemas import UsuarioOut
from datetime import date
from typing import Optional


router = APIRouter(
    prefix="/api/v1/relatorios",
    tags=["Relatórios"]
)

logger = logging.getLogger(__name__)


def verificar_administrador(
    usuario: UsuarioOut = Depends(obter_usuario_atual)
):
    if str(usuario.perfil).lower() != "admin":
        raise HTTPException(
            status_code=403,
            detail="Acesso permitido apenas para administradores."
        )

    return usuario


@router.get(
    "/resumo",
    dependencies=[Depends(verificar_administrador)]
)
def obter_resumo_vendas():
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                COALESCE(SUM(valor_total), 0) AS faturamento_total,
                COUNT(id_compra) AS pedidos_concluidos
            FROM compras
            WHERE status = 'CONCLUIDA'
        """)

        resumo = cursor.fetchone()

        cursor.execute("""
            SELECT
                COALESCE(SUM(ic.quantidade), 0) AS unidades_vendidas
            FROM itenscompra ic
            INNER JOIN compras c
                ON ic.compra_id = c.id_compra
            WHERE c.status = 'CONCLUIDA'
        """)

        resultado_itens = cursor.fetchone()

        faturamento = float(resumo["faturamento_total"])
        pedidos = int(resumo["pedidos_concluidos"])
        unidades = int(resultado_itens["unidades_vendidas"])

        ticket_medio = (
            faturamento / pedidos if pedidos > 0 else 0
        )

        return {
            "faturamento_total": round(faturamento, 2),
            "unidades_vendidas": unidades,
            "pedidos_concluidos": pedidos,
            "ticket_medio": round(ticket_medio, 2)
        }

    except mysql.connector.Error:
        logger.exception("Erro ao consultar resumo de vendas")

        raise HTTPException(
            status_code=500,
            detail="Erro ao consultar os relatórios de vendas."
        )

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()


@router.get(
    "/produtos",
    dependencies=[Depends(verificar_administrador)]
)
def obter_ranking_produtos():
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                p.id_produto,
                p.nome,
                SUM(ic.quantidade) AS unidades_vendidas,
                SUM(ic.quantidade * ic.preco_unit) AS valor_arrecadado,
                COUNT(DISTINCT c.id_compra) AS pedidos

            FROM compras c

            INNER JOIN itenscompra ic
                ON c.id_compra = ic.compra_id

            INNER JOIN produtos p
                ON ic.produto_id = p.id_produto

            WHERE c.status = 'CONCLUIDA'

            GROUP BY p.id_produto, p.nome

            ORDER BY unidades_vendidas DESC
        """)

        produtos = cursor.fetchall()

        for produto in produtos:
            produto["unidades_vendidas"] = int(
                produto["unidades_vendidas"]
            )

            produto["valor_arrecadado"] = float(
                produto["valor_arrecadado"]
            )

            produto["pedidos"] = int(produto["pedidos"])

        return produtos

    except mysql.connector.Error:
        logger.exception("Erro ao consultar ranking de produtos")

        raise HTTPException(
            status_code=500,
            detail="Erro ao consultar o ranking de produtos."
        )

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()


@router.get(
    "/historico",
    dependencies=[Depends(verificar_administrador)]
)
def obter_historico_compras(
    status: Optional[str] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None
):
    conexao = None
    cursor = None

    try:
        if status and status.upper() not in [
            "PENDENTE", "CONCLUIDA", "CANCELADA"
        ]:
            raise HTTPException(
                status_code=400,
                detail="Status inválido."
            )

        if data_inicio and data_fim and data_inicio > data_fim:
            raise HTTPException(
                status_code=400,
                detail="A data inicial não pode ser maior que a data final."
            )

        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        sql = """
            SELECT
                co.id_compra,
                co.cpf,
                c.nome AS nome_cliente,
                p.nome AS nome_produto,
                ic.quantidade,
                ic.preco_unit,
                co.valor_total,
                co.data_compra,
                co.status,
                co.forma_pagamento
            FROM compras co
            INNER JOIN clientes c
                ON co.cpf = c.cpf
            INNER JOIN itenscompra ic
                ON co.id_compra = ic.compra_id
            INNER JOIN produtos p
                ON ic.produto_id = p.id_produto
            WHERE 1=1
        """

        parametros = []

        if status:
            sql += " AND co.status = %s"
            parametros.append(status.upper())

        if data_inicio:
            sql += " AND co.data_compra >= %s"
            parametros.append(data_inicio)

        if data_fim:
            sql += " AND co.data_compra < DATE_ADD(%s, INTERVAL 1 DAY)"
            parametros.append(data_fim)

        sql += " ORDER BY co.data_compra DESC, co.id_compra DESC"

        cursor.execute(sql, parametros)

        historico = cursor.fetchall()

        for compra in historico:
            compra["quantidade"] = int(compra["quantidade"])
            compra["preco_unit"] = float(compra["preco_unit"])
            compra["valor_total"] = float(compra["valor_total"])

        return historico

    except mysql.connector.Error:
        logger.exception("Erro ao consultar histórico de compras")

        raise HTTPException(
            status_code=500,
            detail="Erro ao consultar o histórico de compras."
        )

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()


@router.get(
    "/vendas-periodo",
    dependencies=[Depends(verificar_administrador)]
)
def obter_vendas_por_periodo(
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None
):
    conexao = None
    cursor = None

    try:
        if data_inicio and data_fim and data_inicio > data_fim:
            raise HTTPException(
                status_code=400,
                detail="A data inicial não pode ser maior que a data final."
            )

        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        sql = """
            SELECT
                DATE(c.data_compra) AS data,
                SUM(c.valor_total) AS faturamento,
                COUNT(c.id_compra) AS pedidos,
                COALESCE(SUM(ic.unidades), 0) AS unidades_vendidas

            FROM compras c

            LEFT JOIN (
                SELECT
                    compra_id,
                    SUM(quantidade) AS unidades
                FROM itenscompra
                GROUP BY compra_id
            ) ic
                ON c.id_compra = ic.compra_id

            WHERE c.status = 'CONCLUIDA'
        """

        parametros = []

        if data_inicio:
            sql += " AND c.data_compra >= %s"
            parametros.append(data_inicio)

        if data_fim:
            sql += " AND c.data_compra < DATE_ADD(%s, INTERVAL 1 DAY)"
            parametros.append(data_fim)

        sql += """
            GROUP BY DATE(c.data_compra)
            ORDER BY data ASC
        """

        cursor.execute(sql, parametros)

        resultados = cursor.fetchall()

        vendas = []

        for registro in resultados:
            vendas.append({
                "data": registro["data"].isoformat(),
                "faturamento": round(
                    float(registro["faturamento"] or 0), 2
                ),
                "pedidos": int(registro["pedidos"]),
                "unidades_vendidas": int(
                    registro["unidades_vendidas"]
                )
            })

        return vendas

    except mysql.connector.Error:
        logger.exception("Erro ao consultar vendas por período")

        raise HTTPException(
            status_code=500,
            detail="Erro ao consultar vendas por período."
        )

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()
