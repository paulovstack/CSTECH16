from database import conectar_banco
from security import gerar_hash_senha
from getpass import getpass

from database import conectar_banco
from security import gerar_hash_senha

def criar_primeiro_adm():
    conexao = None
    cursor = None

    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True, buffered=True)

        cursor.execute("SELECT id_funcionario FROM Funcionario WHERE perfil = %s LIMIT 1",("admin",)),

        print("=== Cadastro do primeiro administrador ===")

        nome = input("Nome: ").strip()
        email = input("E-mail: ").strip()
        senha = getpass("Senha: ")

        if not nome or not email or len(senha) < 6:
            print("Dados inválidos. A senha deve ter pelo menos 6 caracteres.")
            return

        cursor.execute(
            "SELECT email FROM Funcionario WHERE email = %s",
            (email,),
        )

        if cursor.fetchone():
            print("Este e-mail já está cadastrado.")
            return

        cursor.execute(
            "SELECT email FROM Clientes WHERE email = %s",
            (email,),
        )

        if cursor.fetchone():
            print("Este e-mail já pertence a um cliente.")
            return

        senha_hash = gerar_hash_senha(senha)

        cursor.execute(
            """
            INSERT INTO Funcionario (nome, email, senha, status, perfil)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (nome, email, senha_hash, True, "admin"),
        )

        conexao.commit()
        print("Primeiro administrador cadastrado com sucesso!")

    except Exception as erro:
        if conexao is not None:
            conexao.rollback()
        print(f"Erro ao criar administrador: {erro}")

    finally:
        if cursor is not None:
            cursor.close()

        if conexao is not None and conexao.is_connected():
            conexao.close()


if __name__ == "__main__":
    criar_primeiro_adm()

      