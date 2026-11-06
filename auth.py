
import logging
import hashlib
import secrets

from datetime import datetime, timedelta

import mysql.connector
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from config import ACCESS_TOKEN_EXPIRE_MINUTES
from database import conectar_banco
from schemas import (
    RedefinirSenha,
    UsuarioCriar,
    UsuarioOut,
    Token,
    RecuperarSenha,
    ClienteAtualizar,
    SolicitarRecuperacaoSenha,
)
from security import (
    gerar_hash_senha,
    verificar_senha,
    criar_token_acesso,
    obter_usuario_atual,
)


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Autenticação"]
)


@router.post(
    "/registrar",
    response_model=UsuarioOut,
    status_code=status.HTTP_201_CREATED,
)
def registrar_usuario(usuario_in: UsuarioCriar):
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT cpf, email
            FROM clientes
            WHERE cpf = %s OR email = %s
            """,
            (usuario_in.cpf, str(usuario_in.email)),
        )

        existente = cursor.fetchone()

        if existente:
            if existente["cpf"] == usuario_in.cpf:
                raise HTTPException(
                    status_code=400,
                    detail="CPF já cadastrado.",
                )

            raise HTTPException(
                status_code=400,
                detail="E-mail já cadastrado.",
            )

        cursor.execute(
            """
            SELECT email
            FROM funcionario
            WHERE email = %s
            """,
            (str(usuario_in.email),),
        )

        if cursor.fetchone():
            raise HTTPException(
                status_code=409,
                detail=(
                    "Este e-mail já está cadastrado como funcionário. "
                    "Uma conta não pode ser cliente e funcionário ao mesmo tempo."
                ),
            )

        senha_hash = gerar_hash_senha(usuario_in.senha)
        status_ativo = True

        cursor.execute(
            """
            INSERT INTO clientes
                (cpf, nome, telefone, email, senha, status)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                usuario_in.cpf,
                usuario_in.nome,
                usuario_in.telefone,
                str(usuario_in.email),
                senha_hash,
                status_ativo,
            ),
        )

        conexao.commit()

        return UsuarioOut(
            id=usuario_in.cpf,
            nome=usuario_in.nome,
            telefone=usuario_in.telefone,
            email=usuario_in.email,
            perfil="CLIENTE",
            status=status_ativo,
        )

    except HTTPException:
        if conexao is not None and conexao.is_connected():
            conexao.rollback()
        raise

    except mysql.connector.Error:
        logger.exception("Erro ao cadastrar cliente no banco de dados")

        if conexao is not None and conexao.is_connected():
            conexao.rollback()

        raise HTTPException(
            status_code=500,
            detail="Erro ao cadastrar cliente no banco de dados.",
        )

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT cpf, nome, telefone, email, senha, status
            FROM clientes
            WHERE email = %s
            """,
            (form_data.username,),
        )

        cliente = cursor.fetchone()

        if cliente:
            if not cliente["status"]:
                raise HTTPException(
                    status_code=403,
                    detail="Cliente inativo. Acesso não permitido.",
                )

            if not verificar_senha(
                form_data.password,
                cliente["senha"],
            ):
                raise HTTPException(
                    status_code=401,
                    detail="E-mail ou senha inválidos.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            token = criar_token_acesso(
                {
                    "sub": cliente["email"],
                    "perfil": "CLIENTE",
                    "id": str(cliente["cpf"]),
                },
                timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
            )

            return {
                "access_token": token,
                "token_type": "bearer",
            }

        cursor.execute(
            """
            SELECT id_funcionario, nome, email, senha, status, perfil
            FROM funcionario
            WHERE email = %s
            """,
            (form_data.username,),
        )

        funcionario = cursor.fetchone()

        if funcionario:
            if not funcionario["status"]:
                raise HTTPException(
                    status_code=403,
                    detail="Funcionário inativo. Acesso não permitido.",
                )

            if not verificar_senha(
                form_data.password,
                funcionario["senha"],
            ):
                raise HTTPException(
                    status_code=401,
                    detail="E-mail ou senha inválidos.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            token = criar_token_acesso(
                {
                    "sub": funcionario["email"],
                    "perfil": funcionario["perfil"],
                    "id": str(funcionario["id_funcionario"]),
                },
                timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
            )

            return {
                "access_token": token,
                "token_type": "bearer",
            }

        raise HTTPException(
            status_code=401,
            detail="E-mail ou senha inválidos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    except HTTPException:
        raise

    except mysql.connector.Error:
        logger.exception("Erro ao realizar login no banco de dados")

        raise HTTPException(
            status_code=500,
            detail="Erro ao realizar login no banco de dados.",
        )

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()


@router.post("/recuperar-senha")
def recuperar_senha(dados: SolicitarRecuperacaoSenha):
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        email = str(dados.email)

        cursor.execute(
            """
            SELECT email
            FROM clientes
            WHERE email = %s AND status = 1
            """,
            (email,),
        )

        cliente = cursor.fetchone()

        if not cliente:
            raise HTTPException(
                status_code=404,
                detail="E-mail não encontrado ou cliente inativo.",
            )

        cursor.execute(
            """
            UPDATE recuperacaosenha
            SET utilizado = TRUE
            WHERE email = %s AND utilizado = FALSE
            """,
            (email,),
        )

        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        expiracao = datetime.utcnow() + timedelta(minutes=15)

        cursor.execute(
            """
            INSERT INTO recuperacaosenha
                (email, token_hash, expiracao)
            VALUES (%s, %s, %s)
            """,
            (email, token_hash, expiracao),
        )

        conexao.commit()

        return {
            "mensagem": "Solicitação de recuperação criada.",
            "token_demonstracao": token,
            "validade_minutos": 15,
        }

    except HTTPException:
        if conexao is not None and conexao.is_connected():
            conexao.rollback()
        raise

    except mysql.connector.Error:
        logger.exception("Erro ao solicitar recuperação de senha")

        if conexao is not None and conexao.is_connected():
            conexao.rollback()

        raise HTTPException(
            status_code=500,
            detail="Não foi possível iniciar a recuperação.",
        )

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()


@router.post("/redefinir-senha")
def redefinir_senha(dados: RedefinirSenha):
    conexao = None
    cursor = None

    try:
        if dados.nova_senha != dados.confirmar_senha:
            raise HTTPException(
                status_code=400,
                detail="A nova senha e a confirmação não coincidem.",
            )

        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        token_hash = hashlib.sha256(dados.token.encode()).hexdigest()

        cursor.execute(
            """
            SELECT id_, email, expiracao, utilizado
            FROM recuperacaosenha
            WHERE token_hash = %s
            """,
            (token_hash,),
        )

        recuperacao = cursor.fetchone()

        if not recuperacao:
            raise HTTPException(
                status_code=404,
                detail="Token de recuperação inválido.",
            )

        if recuperacao["utilizado"]:
            raise HTTPException(
                status_code=404,
                detail="Token já foi utilizado.",
            )

        if recuperacao["expiracao"] <= datetime.utcnow():
            raise HTTPException(
                status_code=400,
                detail="Token de recuperação expirado.",
            )

        senha_hash = gerar_hash_senha(dados.nova_senha)

        cursor.execute(
            """
            UPDATE clientes
            SET senha = %s
            WHERE email = %s
            """,
            (senha_hash, recuperacao["email"]),
        )

        if cursor.rowcount != 1:
            raise HTTPException(
                status_code=404,
                detail="Cliente não encontrado para o e-mail fornecido.",
            )

        cursor.execute(
            """
            UPDATE recuperacaosenha
            SET utilizado = TRUE
            WHERE id_ = %s
            """,
            (recuperacao["id_"],),
        )

        conexao.commit()

        return {
            "mensagem": "Senha redefinida com sucesso."
        }

    except HTTPException:
        if conexao is not None and conexao.is_connected():
            conexao.rollback()
        raise

    except mysql.connector.Error:
        logger.exception("Erro ao redefinir senha")

        if conexao is not None and conexao.is_connected():
            conexao.rollback()

        raise HTTPException(
            status_code=500,
            detail="Não foi possível redefinir a senha.",
        )

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()


@router.get("/me", response_model=UsuarioOut)
def usuario_logado(
    usuario: UsuarioOut = Depends(obter_usuario_atual),
):
    return usuario


@router.put(
    "/clientes/me",
    response_model=UsuarioOut,
    tags=["Minha conta"],
)
def atualizar_meus_dados(
    dados: ClienteAtualizar,
    usuario: UsuarioOut = Depends(obter_usuario_atual),
):
    if str(usuario.perfil).upper() != "CLIENTE":
        raise HTTPException(
            status_code=403,
            detail="Apenas clientes podem alterar seus dados nesta área.",
        )

    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT cpf, email, senha, status
            FROM clientes
            WHERE cpf = %s
            """,
            (usuario.id,),
        )

        atual = cursor.fetchone()

        if not atual or not atual["status"]:
            raise HTTPException(
                status_code=404,
                detail="Cliente não encontrado ou inativo.",
            )

        novo_email = str(dados.email)

        if novo_email != atual["email"]:
            cursor.execute(
                """
                SELECT cpf
                FROM clientes
                WHERE email = %s AND cpf <> %s
                """,
                (novo_email, usuario.id),
            )

            if cursor.fetchone():
                raise HTTPException(
                    status_code=409,
                    detail="Este e-mail já pertence a outro cliente.",
                )

            cursor.execute(
                """
                SELECT id_funcionario
                FROM funcionario
                WHERE email = %s
                """,
                (novo_email,),
            )

            if cursor.fetchone():
                raise HTTPException(
                    status_code=409,
                    detail="Este e-mail já está em uso.",
                )

        senha_hash = None

        if dados.nova_senha:
            if (
                not dados.senha_atual
                or not verificar_senha(
                    dados.senha_atual,
                    atual["senha"],
                )
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Informe a senha atual correta para definir uma nova senha.",
                )

            senha_hash = gerar_hash_senha(dados.nova_senha)

        if senha_hash:
            cursor.execute(
                """
                UPDATE clientes
                SET nome = %s,
                    telefone = %s,
                    email = %s,
                    senha = %s
                WHERE cpf = %s
                """,
                (
                    dados.nome.strip(),
                    dados.telefone,
                    novo_email,
                    senha_hash,
                    usuario.id,
                ),
            )
        else:
            cursor.execute(
                """
                UPDATE clientes
                SET nome = %s,
                    telefone = %s,
                    email = %s
                WHERE cpf = %s
                """,
                (
                    dados.nome.strip(),
                    dados.telefone,
                    novo_email,
                    usuario.id,
                ),
            )

        conexao.commit()

        return UsuarioOut(
            id=str(usuario.id),
            nome=dados.nome.strip(),
            telefone=dados.telefone,
            email=dados.email,
            perfil="CLIENTE",
            status=True,
        )

    except HTTPException:
        if conexao is not None and conexao.is_connected():
            conexao.rollback()
        raise

    except mysql.connector.Error:
        logger.exception("Erro ao atualizar cadastro do cliente")

        if conexao is not None and conexao.is_connected():
            conexao.rollback()

        raise HTTPException(
            status_code=500,
            detail="Não foi possível atualizar seus dados.",
        )

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()
