from pydantic import BaseModel, Field, EmailStr, ConfigDict


class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    """All fields optional for partial updates (PATCH semantics)."""
    name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=20)


class CustomerResponse(CustomerBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
