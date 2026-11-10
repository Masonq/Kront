from datetime import datetime
from sqlalchemy import String, Integer, Float, Boolean, ForeignKey, Text, DateTime, Table, Column, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

master_districts = Table(
    "master_districts", Base.metadata,
    Column("master_id", ForeignKey("masters.id", ondelete="CASCADE"), primary_key=True),
    Column("district_id", ForeignKey("districts.id", ondelete="CASCADE"), primary_key=True),
)


class Category(Base):
    __tablename__ = "categories"
    id: Mapped[int] = mapped_column(primary_key=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), index=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name_ru: Mapped[str] = mapped_column(String(120))
    name_sr: Mapped[str] = mapped_column(String(120))
    plural_ru: Mapped[str] = mapped_column(String(120), default="")
    plural_sr: Mapped[str] = mapped_column(String(120), default="")
    synonyms: Mapped[str] = mapped_column(Text, default="")
    icon: Mapped[str] = mapped_column(String(40), default="")
    unit: Mapped[str] = mapped_column(String(20), default="visit")
    urgent: Mapped[bool] = mapped_column(Boolean, default=False)
    sort: Mapped[int] = mapped_column(Integer, default=0)
    children: Mapped[list["Category"]] = relationship(order_by="Category.sort")


class District(Base):
    __tablename__ = "districts"
    id: Mapped[int] = mapped_column(primary_key=True)
    city: Mapped[str] = mapped_column(String(60), default="beograd", index=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name_ru: Mapped[str] = mapped_column(String(120))
    name_sr: Mapped[str] = mapped_column(String(120))
    loc_ru: Mapped[str] = mapped_column(String(120), default="")  # «во Врачаре»
    loc_sr: Mapped[str] = mapped_column(String(120), default="")  # «na Vračaru»
    sort: Mapped[int] = mapped_column(Integer, default=0)


class Master(Base):
    __tablename__ = "masters"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    kind: Mapped[str] = mapped_column(String(20), default="private")  # private | entrepreneur | company
    about_ru: Mapped[str] = mapped_column(Text, default="")
    about_sr: Mapped[str] = mapped_column(Text, default="")
    photo: Mapped[str] = mapped_column(String(255), default="")
    cover: Mapped[str] = mapped_column(String(255), default="")
    level: Mapped[int] = mapped_column(Integer, default=0)  # 0..3 верификация
    rating: Mapped[float] = mapped_column(Float, default=0)
    reviews_count: Mapped[int] = mapped_column(Integer, default=0)
    orders_count: Mapped[int] = mapped_column(Integer, default=0)
    reply_min: Mapped[int] = mapped_column(Integer, default=30)
    langs: Mapped[str] = mapped_column(String(40), default="sr")
    experience_years: Mapped[int] = mapped_column(Integer, default=0)
    warranty_months: Mapped[int] = mapped_column(Integer, default=0)
    online: Mapped[bool] = mapped_column(Boolean, default=False)
    urgent: Mapped[bool] = mapped_column(Boolean, default=False)
    claimed: Mapped[bool] = mapped_column(Boolean, default=True)
    demo: Mapped[bool] = mapped_column(Boolean, default=False)
    user_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    phone: Mapped[str] = mapped_column(String(60), default="")
    hidden: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    services: Mapped[list["MasterService"]] = relationship(cascade="all, delete-orphan", lazy="selectin")
    districts: Mapped[list[District]] = relationship(secondary=master_districts, lazy="selectin")
    works: Mapped[list["Work"]] = relationship(cascade="all, delete-orphan", lazy="selectin", order_by="Work.sort")


class MasterService(Base):
    __tablename__ = "master_services"
    __table_args__ = (UniqueConstraint("master_id", "category_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    master_id: Mapped[int] = mapped_column(ForeignKey("masters.id", ondelete="CASCADE"), index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), index=True)
    price_from: Mapped[int] = mapped_column(Integer, default=0)
    category: Mapped[Category] = relationship(lazy="selectin")


class Work(Base):
    __tablename__ = "works"
    id: Mapped[int] = mapped_column(primary_key=True)
    master_id: Mapped[int] = mapped_column(ForeignKey("masters.id", ondelete="CASCADE"), index=True)
    photo: Mapped[str] = mapped_column(String(255))
    caption_ru: Mapped[str] = mapped_column(String(200), default="")
    caption_sr: Mapped[str] = mapped_column(String(200), default="")
    sort: Mapped[int] = mapped_column(Integer, default=0)


class Review(Base):
    __tablename__ = "reviews"
    id: Mapped[int] = mapped_column(primary_key=True)
    master_id: Mapped[int] = mapped_column(ForeignKey("masters.id", ondelete="CASCADE"), index=True)
    author: Mapped[str] = mapped_column(String(80))
    rating: Mapped[int] = mapped_column(Integer)
    quality: Mapped[int] = mapped_column(Integer, default=5)
    punctuality: Mapped[int] = mapped_column(Integer, default=5)
    price_fair: Mapped[int] = mapped_column(Integer, default=5)
    tags: Mapped[str] = mapped_column(String(255), default="")
    text: Mapped[str] = mapped_column(Text, default="")
    lang: Mapped[str] = mapped_column(String(5), default="sr")
    service: Mapped[str] = mapped_column(String(120), default="")
    order_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ServiceRequest(Base):
    __tablename__ = "requests"
    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"))
    district_id: Mapped[int | None] = mapped_column(ForeignKey("districts.id"))
    master_id: Mapped[int | None] = mapped_column(ForeignKey("masters.id"))
    user_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    masters: Mapped[str] = mapped_column(String(400), default="")  # до 3 выбранных мастеров (slug через запятую)
    description: Mapped[str] = mapped_column(Text)
    when: Mapped[str] = mapped_column(String(40), default="asap")
    budget: Mapped[str] = mapped_column(String(40), default="")
    contact_name: Mapped[str] = mapped_column(String(80), default="")
    contact: Mapped[str] = mapped_column(String(120), default="")
    lang: Mapped[str] = mapped_column(String(10), default="sr")
    urgent: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="new")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MasterLead(Base):
    """Мастер оставил контакт до открытия регистрации."""
    __tablename__ = "master_leads"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    contact: Mapped[str] = mapped_column(String(120))
    service: Mapped[str] = mapped_column(String(200), default="")
    district: Mapped[str] = mapped_column(String(80), default="")
    lang: Mapped[str] = mapped_column(String(10), default="sr")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ===================== Аккаунты, чат, заказы =====================

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str | None] = mapped_column(String(200), unique=True, index=True)
    tg_id: Mapped[int | None] = mapped_column(Integer, unique=True, index=True)
    google_sub: Mapped[str | None] = mapped_column(String(64), unique=True, index=True, nullable=True)
    tg_username: Mapped[str] = mapped_column(String(80), default="")
    name: Mapped[str] = mapped_column(String(120), default="")
    photo: Mapped[str] = mapped_column(String(255), default="")
    role: Mapped[str] = mapped_column(String(20), default="user")  # user | admin
    lang: Mapped[str] = mapped_column(String(10), default="sr")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Session(Base):
    __tablename__ = "sessions"
    token: Mapped[str] = mapped_column(String(80), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)


class LoginCode(Base):
    __tablename__ = "login_codes"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(200), index=True)
    code: Mapped[str] = mapped_column(String(10))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime] = mapped_column(DateTime)


class TgLogin(Base):
    __tablename__ = "tg_logins"
    token: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "master_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    master_id: Mapped[int] = mapped_column(ForeignKey("masters.id", ondelete="CASCADE"))


class RequestMatch(Base):
    """Заявка, отправленная конкретному мастеру (максимум 3 на заявку)."""
    __tablename__ = "request_matches"
    __table_args__ = (UniqueConstraint("request_id", "master_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id", ondelete="CASCADE"), index=True)
    master_id: Mapped[int] = mapped_column(ForeignKey("masters.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | taken | declined
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (UniqueConstraint("client_id", "master_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    master_id: Mapped[int] = mapped_column(ForeignKey("masters.id", ondelete="CASCADE"), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    client_read_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    master_read_at: Mapped[datetime] = mapped_column(DateTime, default=datetime(2000, 1, 1))


class Order(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    request_id: Mapped[int | None] = mapped_column(ForeignKey("requests.id"))
    title: Mapped[str] = mapped_column(String(200))
    details: Mapped[str] = mapped_column(Text, default="")
    price: Mapped[int] = mapped_column(Integer, default=0)
    visit: Mapped[str] = mapped_column(String(40), default="")  # «2026-11-12 12:00»
    final_price: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="offer")  # offer | agreed | done | confirmed | canceled
    reviewed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    sender_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))  # None = системное
    kind: Mapped[str] = mapped_column(String(20), default="text")  # text | photo | order | system
    body: Mapped[str] = mapped_column(Text, default="")
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
