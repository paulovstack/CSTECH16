
import mysql.connector

from config import (
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
    DB_SSL_ENABLED,
    DB_SSL_CA
)


def conectar_banco():
    configuracao = {
        "host": DB_HOST,
        "port": DB_PORT,
        "user": DB_USER,
        "password": DB_PASSWORD,
        "database": DB_NAME,
        "connection_timeout": 10,
    }

    if DB_SSL_ENABLED:
        configuracao.update({
            "ssl_ca": DB_SSL_CA,
            "ssl_verify_cert": True,
        })

    return mysql.connector.connect(**configuracao)
