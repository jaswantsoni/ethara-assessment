from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select
from fastapi import HTTPException, status
from decimal import Decimal
from models.order import Order
from models.order_item import OrderItem
from models.product import Product
from models.customer import Customer
from schemas.order import OrderCreate


def get_all(db: Session, skip: int = 0, limit: int = 100) -> list[Order]:
    stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .offset(skip)
        .limit(limit)
    )
    return list(db.scalars(stmt).all())


def get_by_id(db: Session, order_id: int) -> Order:
    stmt = (
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items))
    )
    order = db.scalar(stmt)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with id {order_id} not found",
        )
    return order


def create(db: Session, payload: OrderCreate) -> Order:
    # Validate customer exists
    customer = db.get(Customer, payload.customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with id {payload.customer_id} not found",
        )

    # Validate all products exist and have sufficient stock
    order_items: list[OrderItem] = []
    total_amount = Decimal("0.00")

    for item_data in payload.items:
        product = db.get(Product, item_data.product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id {item_data.product_id} not found",
            )
        if product.stock < item_data.quantity:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Insufficient stock for product '{product.name}' (SKU: {product.sku}). "
                    f"Requested: {item_data.quantity}, Available: {product.stock}"
                ),
            )

        unit_price = Decimal(str(product.price))
        total_amount += unit_price * item_data.quantity

        order_items.append(
            OrderItem(
                product_id=item_data.product_id,
                quantity=item_data.quantity,
                unit_price=unit_price,
            )
        )

    # Create order and deduct stock atomically
    order = Order(customer_id=payload.customer_id, total_amount=total_amount)
    db.add(order)
    db.flush()  # get order.id before adding items

    for item in order_items:
        item.order_id = order.id
        db.add(item)

        # Deduct stock
        product = db.get(Product, item.product_id)
        product.stock -= item.quantity

    db.commit()
    db.refresh(order)

    # Reload with items
    return get_by_id(db, order.id)


def delete(db: Session, order_id: int) -> None:
    order = get_by_id(db, order_id)

    # Restore stock for each item before deletion
    for item in order.items:
        product = db.get(Product, item.product_id)
        if product:
            product.stock += item.quantity

    db.delete(order)
    db.commit()
