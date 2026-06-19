from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_
from fastapi import HTTPException, status
from models.product import Product
from schemas.product import ProductCreate, ProductUpdate


def get_all(db: Session, skip: int = 0, limit: int = 100) -> list[Product]:
    stmt = select(Product).offset(skip).limit(limit)
    return list(db.scalars(stmt).all())


def search(
    db: Session,
    q: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    min_stock: int | None = None,
    skip: int = 0,
    limit: int = 100,
) -> tuple[int, list[Product]]:
    """
    Search products with optional filters.
    - q: case-insensitive substring match on name OR sku
    - min_price / max_price: price range filter
    - min_stock: minimum stock level filter
    Returns (total_count, page_of_results).
    """
    stmt = select(Product)

    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                Product.name.ilike(pattern),
                Product.sku.ilike(pattern),
            )
        )
    if min_price is not None:
        stmt = stmt.where(Product.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Product.price <= max_price)
    if min_stock is not None:
        stmt = stmt.where(Product.stock >= min_stock)

    # Count total matches before pagination
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    results = list(db.scalars(stmt.offset(skip).limit(limit)).all())
    return total, results


def get_by_id(db: Session, product_id: int) -> Product:
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found",
        )
    return product


def create(db: Session, payload: ProductCreate) -> Product:
    # Check SKU uniqueness
    existing = db.scalar(select(Product).where(Product.sku == payload.sku))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Product with SKU '{payload.sku}' already exists",
        )
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update(db: Session, product_id: int, payload: ProductUpdate) -> Product:
    product = get_by_id(db, product_id)
    updates = payload.model_dump(exclude_unset=True)

    # If SKU is being changed, verify it's not taken
    if "sku" in updates and updates["sku"] != product.sku:
        existing = db.scalar(select(Product).where(Product.sku == updates["sku"]))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Product with SKU '{updates['sku']}' already exists",
            )

    for field, value in updates.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


def delete(db: Session, product_id: int) -> None:
    product = get_by_id(db, product_id)
    db.delete(product)
    db.commit()
