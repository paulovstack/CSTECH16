from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class UsuarioCriar(BaseModel):
    cpf: str
    nome: str
    telefone: Optional[str] = None
    email: EmailStr
    senha: str = Field(min_length=6)

    @field_validator("telefone")
    @classmethod
    def validar_telefone(cls, telefone):
      if telefone is None or telefone.strip() == "":
          return None

      numeros = "".join(filter(str.isdigit, telefone))

      if not __import__("re").fullmatch(r"[1-9]{2}9[0-9]{8}", numeros):
          raise ValueError("O celular deve conter DDD e 9 números válidos.")

      return numeros

    @field_validator("cpf")
    @classmethod
    def validar_cpf(cls, cpf):
        cpf = "".join(filter(str.isdigit, cpf))

        if len(cpf) != 11:
            raise ValueError("O CPF deve conter exatamente 11 números.")

        return cpf

    @field_validator("senha")
    @classmethod
    def validar_senha(cls, senha: str) -> str: 
        if not any(char.isdigit() for char in senha):
            raise ValueError("A senha deve conter pelo menos um número.")
        if not any(char.isupper() for char in senha):
            raise ValueError("A senha deve conter pelo menos uma letra maiúscula.")
        if not any(char.islower() for char in senha):
            raise ValueError("A senha deve conter pelo menos uma letra minúscula.")
        if not any(char in "!@#$%^&*()-_=+[{]}\\|;:'\",<.>/?`~" for char in senha):
            raise ValueError("A senha deve conter pelo menos um caractere especial.")
        return senha


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

class SolicitarRecuperacaoSenha(BaseModel):
    email: EmailStr

class RedefinirSenha(BaseModel):
    token: str
    nova_senha: str = Field(min_length=6)
    confirmar_senha: str = Field(min_length=6)


class RecuperarSenha(BaseModel):
    token: str
    email: EmailStr
    nova_senha: str = Field(min_length=6)


class ClienteAtualizar(BaseModel):
    nome: str = Field(min_length=1, max_length=50)
    telefone: Optional[str] = None
    email: EmailStr
    senha_atual: Optional[str] = None
    nova_senha: Optional[str] = Field(default=None, min_length=6)
