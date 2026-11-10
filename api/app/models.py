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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ServiceRequest(Base):
    __tablename__ = "requests"
    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"))
    district_id: Mapped[int | None] = mapped_column(ForeignKey("districts.id"))
    master_id: Mapped[int | None] = mapped_column(ForeignKey("masters.id"))
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
