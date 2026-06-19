from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
from services import customer_service

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("/", response_model=list[CustomerResponse])
def list_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return customer_service.get_all(db, skip=skip, limit=limit)


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    return customer_service.get_by_id(db, customer_id)


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    return customer_service.create(db, payload)


@router.patch("/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: int, payload: CustomerUpdate, db: Session = Depends(get_db)):
    return customer_service.update(db, customer_id, payload)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer_service.delete(db, customer_id)
