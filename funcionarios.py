import mysql.connector
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from database import conectar_banco
from security import gerar_hash_senha, obter_usuario_atual


router = APIRouter(
    prefix="/api/v1/funcionarios",
    tags=["Funcionários"],
)


class FuncionarioCriar(BaseModel):
    nome: str
    email: EmailStr
    senha: str = Field(min_length=6)
    status: bool = True

class FuncionarioAtualizar(BaseModel):
    nome: str
    email: EmailStr
    status: bool = True


def exigir_funcionario(usuario=Depends(obter_usuario_atual)):
    if usuario.perfil not in ('funcionario','admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso permitido somente para funcionários.",
        )
    return usuario

def exigir_admin(usuario=Depends(obter_usuario_atual)):
    if usuario.perfil != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso permitido somente para administradores."
        )

    return usuario


@router.post("", status_code=status.HTTP_201_CREATED)
def cadastrar_funcionario(
    funcionario: FuncionarioCriar,
    usuario=Depends(exigir_admin),
):
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute(
            "SELECT email FROM Funcionario WHERE email = %s",
            (str(funcionario.email),),
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado.")

        cursor.execute(
            "SELECT email FROM Clientes WHERE email = %s",
            (str(funcionario.email),),
        )
        if cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail="Este e-mail já está cadastrado como cliente. Uma conta não pode ser cliente e funcionário ao mesmo tempo.",
            )

        senha_hash = gerar_hash_senha(funcionario.senha)
        cursor.execute(
            """
            INSERT INTO Funcionario (nome, email, senha, status)
            VALUES (%s, %s, %s, %s)
            """,
            (
                funcionario.nome,
                str(funcionario.email),
                senha_hash,
                funcionario.status,
            ),
        )
        id_funcionario = cursor.lastrowid
        conexao.commit()

        return {
            "id_funcionario": id_funcionario,
            "nome": funcionario.nome,
            "email": str(funcionario.email),
            "status": funcionario.status,
        }

    except HTTPException:
        if conexao is not None and conexao.is_connected():
            conexao.rollback()
        raise
    except mysql.connector.Error:
        if conexao is not None and conexao.is_connected():
            conexao.rollback()
        raise HTTPException(
            status_code=500,
            detail="Erro ao cadastrar funcionário no banco de dados.",
        )
    finally:
        if cursor is not None:
            cursor.close()
        if conexao is not None and conexao.is_connected():
            conexao.close()


@router.get("")
def listar_funcionarios(usuario=Depends(exigir_funcionario)):
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id_funcionario, nome, email, status
            FROM Funcionario
            ORDER BY id_funcionario DESC
            """
        )
        funcionarios = cursor.fetchall()

        for funcionario in funcionarios:
            funcionario["status"] = bool(funcionario["status"])

        return funcionarios

    except mysql.connector.Error:
        raise HTTPException(
            status_code=500,
            detail="Erro ao consultar funcionários.",
        )
    finally:
        if cursor is not None:
            cursor.close()
        if conexao is not None and conexao.is_connected():
            conexao.close()

@router.put("/{id_funcionario}")
def alterar_funcionario(
    id_funcionario: int,
    funcionario: FuncionarioAtualizar,
    usuario=Depends(exigir_admin)
):
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute(
            "SELECT id_funcionario FROM Funcionario WHERE id_funcionario = %s",
            (id_funcionario,)
        )

        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=404,
                detail="Funcionário não encontrado."
            )

        cursor.execute(
            """
            SELECT id_funcionario FROM Funcionario
            WHERE email = %s AND id_funcionario <> %s
            """,
            (str(funcionario.email), id_funcionario)
        )

        if cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail="Este e-mail já pertence a outro funcionário."
            )

        cursor.execute(
            "SELECT email FROM Clientes WHERE email = %s",
            (str(funcionario.email),)
        )

        if cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail="Este e-mail já está cadastrado como cliente."
            )

        cursor.execute(
            """
            UPDATE Funcionario
            SET nome = %s,
                email = %s,
                status = %s
            WHERE id_funcionario = %s
            """,
            (
                funcionario.nome,
                str(funcionario.email),
                funcionario.status,
                id_funcionario
            )
        )

        conexao.commit()

        return {
            "mensagem": "Funcionário atualizado com sucesso!",
            "id_funcionario": id_funcionario
        }

    except HTTPException:
        raise

    except mysql.connector.Error:
        if conexao is not None:
            conexao.rollback()

        raise HTTPException(
            status_code=500,
            detail="Erro ao atualizar funcionário."
        )

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()

@router.delete("/{id_funcionario}")
def excluir_funcionario(
    id_funcionario: int,
    usuario=Depends(exigir_admin)
):
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id_funcionario, perfil
            FROM Funcionario
            WHERE id_funcionario = %s
            """,
            (id_funcionario,)
        )

        funcionario = cursor.fetchone()

        if funcionario is None:
            raise HTTPException(
                status_code=404,
                detail="Funcionário não encontrado."
            )

        if funcionario["perfil"] == "admin":
            raise HTTPException(
                status_code=403,
                detail="Não é permitido excluir administradores por esta rota."
            )

        cursor.execute(
            "DELETE FROM Funcionario WHERE id_funcionario = %s",
            (id_funcionario,)
        )

        conexao.commit()

        return {
            "mensagem": "Funcionário excluído com sucesso!",
            "id_funcionario": id_funcionario
        }

    except HTTPException:
        raise

    except mysql.connector.Error:
        if conexao is not None:
            conexao.rollback()

        raise HTTPException(
            status_code=500,
            detail="Erro ao excluir funcionário. Verifique se existem registros vinculados."
        )

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()