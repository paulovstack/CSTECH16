import hashlib
import hmac
import os

from datetime import datetime, timedelta, timezone
from typing import Optional

import mysql.connector
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from database import conectar_banco
from schemas import TokenData, UsuarioOut


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login"
)


def gerar_hash_senha(senha_plana: str) -> str:
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        senha_plana.encode("utf-8"),
        salt,
        600000,
    )
    return f"{salt.hex()}:{key.hex()}"


def verificar_senha(senha_plana: str, senha_armazenada: str) -> bool:
    try:
        salt_hex, key_hex = senha_armazenada.split(":", 1)
        salt = bytes.fromhex(salt_hex)
        chave_armazenada = bytes.fromhex(key_hex)
        nova_chave = hashlib.pbkdf2_hmac(
            "sha256",
            senha_plana.encode("utf-8"),
            salt,
            600000,
        )
        return hmac.compare_digest(nova_chave, chave_armazenada)
    except (ValueError, TypeError, AttributeError):
        return False


def criar_token_acesso(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    dados_token = data.copy()
    dados_token["exp"] = datetime.now(timezone.utc) + (
        expires_delta
        or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return jwt.encode(dados_token, SECRET_KEY, algorithm=ALGORITHM)


def obter_usuario_atual(
    token: str = Depends(oauth2_scheme),
) -> UsuarioOut:
    erro_credenciais = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        perfil = payload.get("perfil")
        identificador = payload.get("id")

        if (
            not isinstance(email, str)
            or not email
            or perfil not in ("CLIENTE", "funcionario", "admin")
            or identificador is None
            or str(identificador).strip() == ""
        ):
            raise erro_credenciais

        token_data = TokenData(
            email=email,
            perfil=perfil,
            id=str(identificador),
        )
    except JWTError:
        raise erro_credenciais

    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        if token_data.perfil == "CLIENTE":
            cursor.execute(
                """
                SELECT cpf, nome, telefone, email, status
                FROM Clientes
                WHERE email = %s AND cpf = %s
                """,
                (token_data.email, token_data.id),
            )
            usuario = cursor.fetchone()

            if usuario is None:
                raise erro_credenciais
            if not usuario["status"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Usuário inativo.",
                )

            return UsuarioOut(
                id=str(usuario["cpf"]),
                nome=usuario["nome"],
                telefone=usuario["telefone"],
                email=usuario["email"],
                perfil="CLIENTE",
                status=bool(usuario["status"]),
            )

        cursor.execute(
            """
            SELECT id_funcionario, nome, email, status, perfil
            FROM Funcionario
            WHERE email = %s AND id_funcionario = %s
            """,
            (token_data.email, token_data.id),
        )
        usuario = cursor.fetchone()

        if usuario is None:
            raise erro_credenciais
        if not usuario["status"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Funcionário inativo.",
            )

        return UsuarioOut(
            id=str(usuario["id_funcionario"]),
            nome=usuario["nome"],
            telefone=None,
            email=usuario["email"],
            perfil=usuario["perfil"],
            status=bool(usuario["status"]),
        )

    except HTTPException:
        raise
    except mysql.connector.Error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao validar o usuário no banco de dados.",
        )
    finally:
        if cursor is not None:
            cursor.close()
        if conexao is not None and conexao.is_connected():
            conexao.close()
