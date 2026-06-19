from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductSearchResponse
from services import product_service

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("/", response_model=list[ProductResponse])
def list_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return product_service.get_all(db, skip=skip, limit=limit)


@router.get("/search", response_model=ProductSearchResponse)
def search_products(
    q: str | None = Query(default=None, description="Substring match on name or SKU"),
    min_price: float | None = Query(default=None, ge=0, description="Minimum price"),
    max_price: float | None = Query(default=None, ge=0, description="Maximum price"),
    min_stock: int | None = Query(default=None, ge=0, description="Minimum stock level"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    total, results = product_service.search(
        db,
        q=q,
        min_price=min_price,
        max_price=max_price,
        min_stock=min_stock,
        skip=skip,
        limit=limit,
    )
    return ProductSearchResponse(total=total, skip=skip, limit=limit, results=results)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    return product_service.get_by_id(db, product_id)


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    return product_service.create(db, payload)


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    return product_service.update(db, product_id, payload)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product_service.delete(db, product_id)
