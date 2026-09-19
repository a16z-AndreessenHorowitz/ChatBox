from database.auth import initialize_auth_database
from database.chat import initialize_chat_database

def init_db():
    initialize_auth_database()
    initialize_chat_database()