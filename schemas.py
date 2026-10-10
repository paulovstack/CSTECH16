from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UsuarioCriar(BaseModel):
    cpf: str
    nome: str
    telefone: Optional[str] = None
    email: EmailStr
    senha: str = Field(min_length=6)
    status: bool = True


class UsuarioOut(BaseModel):
    id: str
    nome: str
    telefone: Optional[str] = None
    email: EmailStr
    perfil: str
    status: bool


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
    perfil: Optional[str] = None
    id: Optional[str] = None


class RecuperarSenha(BaseModel):
    email: EmailStr
    nova_senha: str = Field(min_length=6)


class ClienteAtualizar(BaseModel):
    nome: str = Field(min_length=1, max_length=50)
    telefone: Optional[str] = None
    email: EmailStr
    senha_atual: Optional[str] = None
    nova_senha: Optional[str] = Field(default=None, min_length=6)
