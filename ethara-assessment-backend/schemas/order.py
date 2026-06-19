from pydantic import BaseModel, Field, ConfigDict
from decimal import Decimal
from datetime import datetime


class OrderItemCreate(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: Decimal

    model_config = ConfigDict(from_attributes=True)


class OrderCreate(BaseModel):
    customer_id: int = Field(..., gt=0)
    items: list[OrderItemCreate] = Field(..., min_length=1)


class OrderResponse(BaseModel):
    id: int
    customer_id: int
    total_amount: Decimal
    created_at: datetime
    items: list[OrderItemResponse] = []

    model_config = ConfigDict(from_attributes=True)
