from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt
from backend.app.core.config import settings
import hashlib
import os

print("LOADING SECURITY.PY (MANUAL HASHING)")

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    print("create_access_token called")
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    print("verify_password called")
    salt = hashed_password[:32]
    stored_key = hashed_password[32:]
    key = hashlib.pbkdf2_hmac(
        'sha256',
        plain_password.encode('utf-8'),
        bytes.fromhex(salt),
        100000
    ).hex()
    return key == stored_key

def hash_password_manual(password: str) -> str:
    print("hash_password_manual called")
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt,
        100000
    ).hex()
    return salt.hex() + key
