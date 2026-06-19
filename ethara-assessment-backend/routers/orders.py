from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from schemas.order import OrderCreate, OrderResponse
from services import order_service

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.get("/", response_model=list[OrderResponse])
def list_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return order_service.get_all(db, skip=skip, limit=limit)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    return order_service.get_by_id(db, order_id)


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    return order_service.create(db, payload)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order_service.delete(db, order_id)
