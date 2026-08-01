# rag-service/database.py
import os
import psycopg2

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "dbname": os.getenv("DB_NAME", "ats_matcher"),
    "user": os.getenv("DB_USER", "ats_user"),
    "password": os.getenv("DB_PASSWORD", "ats_pass"),
}

def get_connection():
    return psycopg2.connect(**DB_CONFIG)