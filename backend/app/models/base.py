from sqlalchemy import BigInteger, Integer
from sqlalchemy.orm import DeclarativeBase

# Use BigInteger on MySQL and Integer on SQLite so autoincrement functions properly in tests
PK_BIGINT = BigInteger().with_variant(Integer, "sqlite")


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy declarative models."""
    pass
