from pydantic import BaseModel, Field, ConfigDict
from decimal import Decimal


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=100)
    price: Decimal = Field(..., gt=0, decimal_places=2)
    stock: int = Field(default=0, ge=0)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    """All fields optional for partial updates (PATCH semantics)."""
    name: str | None = Field(default=None, min_length=1, max_length=255)
    sku: str | None = Field(default=None, min_length=1, max_length=100)
    price: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    stock: int | None = Field(default=None, ge=0)


class ProductResponse(ProductBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class ProductSearchResponse(BaseModel):
    """Paginated search result envelope."""
    total: int
    skip: int
    limit: int
    results: list[ProductResponse]
