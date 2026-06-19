from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status
from models.customer import Customer
from schemas.customer import CustomerCreate, CustomerUpdate


def get_all(db: Session, skip: int = 0, limit: int = 100) -> list[Customer]:
    stmt = select(Customer).offset(skip).limit(limit)
    return list(db.scalars(stmt).all())


def get_by_id(db: Session, customer_id: int) -> Customer:
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with id {customer_id} not found",
        )
    return customer


def create(db: Session, payload: CustomerCreate) -> Customer:
    existing = db.scalar(select(Customer).where(Customer.email == payload.email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Customer with email '{payload.email}' already exists",
        )
    customer = Customer(**payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def update(db: Session, customer_id: int, payload: CustomerUpdate) -> Customer:
    customer = get_by_id(db, customer_id)
    updates = payload.model_dump(exclude_unset=True)

    if "email" in updates and updates["email"] != customer.email:
        existing = db.scalar(select(Customer).where(Customer.email == updates["email"]))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Customer with email '{updates['email']}' already exists",
            )

    for field, value in updates.items():
        setattr(customer, field, value)

    db.commit()
    db.refresh(customer)
    return customer


def delete(db: Session, customer_id: int) -> None:
    customer = get_by_id(db, customer_id)
    db.delete(customer)
    db.commit()
