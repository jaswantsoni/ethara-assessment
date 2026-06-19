from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Relationships
    orders: Mapped[list["Order"]] = relationship("Order", back_populates="customer")
