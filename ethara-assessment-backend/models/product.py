from sqlalchemy import Integer, String, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    order_items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="product")
