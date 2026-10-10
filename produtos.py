from fastapi import APIRouter, HTTPException, Depends
from funcionarios import exigir_funcionario
from database import conectar_banco
import mysql.connector
from pydantic import BaseModel, Field
from decimal import Decimal


router = APIRouter(
   prefix="/api/v1/produtos",
   tags=["Produtos"]
)

class ProdutosCadastro(BaseModel):
    nome: str = Field(min_length=1, max_length=50)
    marca: str = Field(min_length=1, max_length=30)
    preco_venda: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    quantidade: int = Field(ge=0)
    categoria: str = Field(min_length=1, max_length=100)
    imagem_url: str | None = None


@router.get("/")
def listar_produtos():
    conexao = None
    cursor = None
    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute("SELECT * FROM Produtos")
        
        produtos = cursor.fetchall()
        return produtos

    except mysql.connector.Error:
        raise HTTPException(status_code=500, detail="Erro ao consultar produtos.")

    finally:
        if cursor is not None:
           cursor.close()

        if conexao is not None and conexao.is_connected():
           conexao.close()

@router.post("/", status_code=201)
def cadastrar_produto(produto: ProdutosCadastro, usuario=Depends(exigir_funcionario)):
    conexao=None
    cursor=None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute("""INSERT INTO Produtos(nome, quantidade, marca, preco_venda, categoria, imagem_url) 
          VALUES (%s, %s, %s, %s, %s, %s) """,
          (
            produto.nome,
            produto.quantidade,
            produto.marca,
            produto.preco_venda,
            produto.categoria,
            produto.imagem_url
          )
        )
        conexao.commit()
        return {"mensagem": "Produto Cadastrado com sucesso!", "id_produto": cursor.lastrowid}

    except mysql.connector.Error:
        raise HTTPException(status_code=500, detail="Erro ao cadastrar item!")

    finally:
       if cursor is not None:
         cursor.close()

       if conexao is not None and conexao.is_connected():
         conexao.close()

@router.put("/{id_produto}")
def alterar_produto(
    id_produto: int,
    produto: ProdutosCadastro,
    usuario=Depends(exigir_funcionario)
):
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute(
            "SELECT id_produto FROM Produtos WHERE id_produto = %s",
            (id_produto,)
        )

        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=404,
                detail="Produto não encontrado."
            )

        cursor.execute(
            """
            UPDATE Produtos
            SET nome = %s,
                quantidade = %s,
                marca = %s,
                preco_venda = %s,
                categoria = %s,
                imagem_url = %s
            WHERE id_produto = %s
            """,
            (
                produto.nome,
                produto.quantidade,
                produto.marca,
                produto.preco_venda,
                produto.categoria,
                produto.imagem_url,
                id_produto
            )
        )

        conexao.commit()

        return {
            "mensagem": "Produto atualizado com sucesso!",
            "id_produto": id_produto
        }

    except HTTPException:
        raise

    except mysql.connector.Error:
        raise HTTPException(
            status_code=500,
            detail="Erro ao atualizar produto."
        )

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()

@router.delete("/{id_produto}")
def excluir_produto(
    id_produto: int,
    usuario=Depends(exigir_funcionario)
):
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute(
            "SELECT id_produto FROM Produtos WHERE id_produto = %s",
            (id_produto,)
        )

        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=404,
                detail="Produto não encontrado."
            )

        cursor.execute(
            "DELETE FROM Produtos WHERE id_produto = %s",
            (id_produto,)
        )

        conexao.commit()

        return {
            "mensagem": "Produto excluído com sucesso!",
            "id_produto": id_produto
        }

    except HTTPException:
        raise

    except mysql.connector.Error:
        raise HTTPException(
            status_code=500,
            detail="Erro ao excluir produto. Verifique se ele está vinculado a alguma compra."
        )

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()

    