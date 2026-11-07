from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import DateTime, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, PK_BIGINT


class Channel(Base):
    """A user-owned sensor channel, compatible with the MVP's ThingSpeak-like flow."""

    __tablename__ = "channels"

    id: Mapped[int] = mapped_column(PK_BIGINT, primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(
        PK_BIGINT, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped["User"] = relationship("User", back_populates="channels")
    fields: Mapped[List["ChannelField"]] = relationship(
        "ChannelField", back_populates="channel", cascade="all, delete-orphan", order_by="ChannelField.position"
    )
    api_keys: Mapped[List["ChannelApiKey"]] = relationship(
        "ChannelApiKey", back_populates="channel", cascade="all, delete-orphan"
    )
    feeds: Mapped[List["ChannelFeed"]] = relationship(
        "ChannelFeed", back_populates="channel", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Channel id={self.id} name={self.name!r} owner_id={self.owner_id}>"


class ChannelField(Base):
    """Definition of one numeric field in a channel (field1 ... field8)."""

    __tablename__ = "channel_fields"

    id: Mapped[int] = mapped_column(PK_BIGINT, primary_key=True, autoincrement=True)
    channel_id: Mapped[int] = mapped_column(
        PK_BIGINT, ForeignKey("channels.id", ondelete="CASCADE"), nullable=False, index=True
    )
    key: Mapped[str] = mapped_column(String(16), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    channel: Mapped["Channel"] = relationship("Channel", back_populates="fields")

    __table_args__ = (
        UniqueConstraint("channel_id", "key", name="uq_channel_fields_channel_key"),
        Index("idx_channel_fields_position", "channel_id", "position"),
    )


class ChannelApiKey(Base):
    """Hashed Read/Write secret scoped to exactly one channel."""

    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(PK_BIGINT, primary_key=True, autoincrement=True)
    channel_id: Mapped[int] = mapped_column(
        PK_BIGINT, ForeignKey("channels.id", ondelete="CASCADE"), nullable=False, index=True
    )
    key_type: Mapped[str] = mapped_column(String(16), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(24), nullable=False)
    # Kept encrypted at rest so the owner can copy an active key after reload.
    # Older rows may be NULL because their plaintext secret was never recoverable.
    key_ciphertext: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    channel: Mapped["Channel"] = relationship("Channel", back_populates="api_keys")

    __table_args__ = (
        Index("idx_api_keys_channel_type_active", "channel_id", "key_type", "revoked_at"),
    )


class ChannelFeed(Base):
    """One received measurement payload for a channel."""

    __tablename__ = "channel_feeds"

    id: Mapped[int] = mapped_column(PK_BIGINT, primary_key=True, autoincrement=True)
    channel_id: Mapped[int] = mapped_column(
        PK_BIGINT, ForeignKey("channels.id", ondelete="CASCADE"), nullable=False, index=True
    )
    values_json: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    channel: Mapped["Channel"] = relationship("Channel", back_populates="feeds")

    __table_args__ = (
        Index("idx_channel_feeds_history", "channel_id", "received_at", "id"),
    )
