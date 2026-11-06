
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

# Autenticação
SECRET_KEY = os.environ["SECRET_KEY"]
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Banco de dados
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.environ["DB_PASSWORD"]
DB_NAME = os.getenv("DB_NAME", "CSTECH16")

# Certificado SSL
DB_SSL_ENABLED = os.getenv(
    "DB_SSL_ENABLED", "false"
).lower() == "true"

DB_SSL_CA = os.getenv(
    "DB_SSL_CA",
    str(BASE_DIR / "certs" / "ca.pem")
)
