import re
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse

router = APIRouter()

EMAIL_REGEX = re.compile(r"^[\w\.-]+@([\w-]+\.)+[\w-]{2,}$")


def validate_email_format(email: str) -> str:
    clean = email.strip().lower()
    if not EMAIL_REGEX.match(clean):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Địa chỉ email không đúng định dạng. Ví dụ: user@gmail.com",
        )
    return clean


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="User Registration",
    description="Register a new user account with any valid email and password.",
)
def register(
    payload: RegisterRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    clean_email = validate_email_format(payload.email)

    # Check if user already exists
    stmt = select(User).where(User.email == clean_email)
    existing_user = db.execute(stmt).scalar_one_or_none()

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{clean_email}' đã được đăng ký trong hệ thống. Vui lòng chọn Đăng Nhập.",
        )

    # Hash password and create user
    hashed_pw = hash_password(payload.password)
    new_user = User(
        email=clean_email,
        password_hash=hashed_pw,
        full_name=payload.full_name or clean_email.split("@")[0],
        role="user",
        status="active",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": str(new_user.id), "email": new_user.email})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="User Login",
    description="Sign in using email and optional/required password.",
)
def login(
    payload: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    clean_email = validate_email_format(payload.email)

    stmt = select(User).where(User.email == clean_email)
    user = db.execute(stmt).scalar_one_or_none()

    if user is None:
        # If no password provided (MVP test flow compatibility)
        if not payload.password:
            user = User(
                email=clean_email,
                full_name=payload.full_name or clean_email.split("@")[0],
                role="user",
                status="active",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Tài khoản với email '{clean_email}' chưa tồn tại. Vui lòng bấm 'Đăng Ký' để tạo tài khoản.",
            )
    else:
        if user.status != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản này đã bị khóa hoặc ngừng hoạt động.",
            )

        # If user has a password set, verify it
        if user.password_hash and payload.password:
            if not verify_password(payload.password, user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Mật khẩu không chính xác. Vui lòng kiểm tra lại.",
                )
        elif payload.password and not user.password_hash:
            # Set password for legacy user
            user.password_hash = hash_password(payload.password)
            db.commit()
            db.refresh(user)

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get Current User Profile",
)
def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    return UserResponse.model_validate(current_user)
