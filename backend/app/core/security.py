from base64 import urlsafe_b64encode
from datetime import datetime, timedelta, timezone
import hashlib
import secrets
import string
from typing import Any, Dict, Optional
from cryptography.fernet import Fernet, InvalidToken
import jwt

from app.core.config import settings

ALGORITHM = "HS256"


def hash_token(raw_token: str) -> str:
    """Hash a raw device token using SHA-256 for secure storage."""
    return hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 100000)
    return f"{salt}:{key.hex()}"


def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    """Verify plain password against hashed password."""
    if not hashed_password or ":" not in hashed_password:
        return False
    try:
        salt, key_hex = hashed_password.split(":", 1)
        new_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), bytes.fromhex(salt), 100000)
        return secrets.compare_digest(new_key.hex(), key_hex)
    except Exception:
        return False


def generate_device_token(prefix: str = "sdb_dev_") -> tuple[str, str, str]:
    """
    Generate a new device token.
    Returns:
        (raw_token, token_hash, token_prefix)
    """
    token_entropy = secrets.token_urlsafe(32)
    raw_token = f"{prefix}{token_entropy}"
    token_hash = hash_token(raw_token)
    token_prefix = raw_token[:12]
    return raw_token, token_hash, token_prefix


def generate_channel_api_key(key_type: str) -> tuple[str, str, str]:
    """Generate a 16-character channel-scoped API key and return raw value, hash and display prefix."""
    if key_type not in {"read", "write"}:
        raise ValueError("key_type must be 'read' or 'write'")
    alphabet = string.ascii_letters + string.digits
    raw_token = "".join(secrets.choice(alphabet) for _ in range(16))
    return raw_token, hash_token(raw_token), f"{raw_token[:6]}..."


def _channel_api_key_cipher() -> Fernet:
    """Build a stable encryption key from the application's secret key."""
    cipher_key = urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest())
    return Fernet(cipher_key)


def encrypt_channel_api_key(raw_key: str) -> str:
    """Encrypt a channel API key for owner-only copy/retrieval."""
    return _channel_api_key_cipher().encrypt(raw_key.encode("utf-8")).decode("ascii")


def decrypt_channel_api_key(ciphertext: Optional[str]) -> Optional[str]:
    """Decrypt a stored channel API key, returning None for legacy/invalid data."""
    if not ciphertext:
        return None
    try:
        return _channel_api_key_cipher().decrypt(ciphertext.encode("ascii")).decode("utf-8")
    except (InvalidToken, UnicodeError, ValueError, TypeError):
        return None


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generate a JWT access token for user authentication."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and verify a JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
