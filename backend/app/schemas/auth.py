from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    """User registration request."""
    email: str = Field(..., min_length=3, max_length=191, examples=["user@gmail.com"])
    password: str = Field(..., min_length=4, max_length=128, examples=["secret123"])
    full_name: Optional[str] = Field(default=None, max_length=100, examples=["Nguyen Van A"])


class LoginRequest(BaseModel):
    """User login request with optional password for backward compatibility."""
    email: str = Field(..., min_length=3, max_length=191, examples=["user@gmail.com"])
    password: Optional[str] = Field(default=None, max_length=128, examples=["secret123"])
    full_name: Optional[str] = Field(default=None, max_length=100, examples=["Nguyen Van A"])


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    role: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
