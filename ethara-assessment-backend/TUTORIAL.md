# Inventory & Order Management API — Build Tutorial

A step-by-step guide for freshers on how this FastAPI backend was built from scratch.

---

## Table of Contents

1. [What Are We Building?](#1-what-are-we-building)
2. [Tech Stack Explained](#2-tech-stack-explained)
3. [Project Structure](#3-project-structure)
4. [Step 1 — Set Up the Environment](#step-1--set-up-the-environment)
5. [Step 2 — Configure the Database Connection](#step-2--configure-the-database-connection)
6. [Step 3 — Create the Base Model](#step-3--create-the-base-model)
7. [Step 4 — Write SQLAlchemy Models](#step-4--write-sqlalchemy-models)
8. [Step 5 — Write Pydantic Schemas](#step-5--write-pydantic-schemas)
9. [Step 6 — Write the Service Layer](#step-6--write-the-service-layer)
10. [Step 7 — Write the Routers](#step-7--write-the-routers)
11. [Step 8 — Wire Everything in main.py](#step-8--wire-everything-in-mainpy)
12. [Step 9 — Set Up Alembic Migrations](#step-9--set-up-alembic-migrations)
13. [Step 10 — Add the Search Feature](#step-10--add-the-search-feature)
14. [How a Request Flows End to End](#how-a-request-flows-end-to-end)
15. [Running the Server](#running-the-server)
16. [Common Mistakes and How to Avoid Them](#common-mistakes-and-how-to-avoid-them)

---

## 1. What Are We Building?

A REST API backend for a business that sells products to customers and tracks orders.

The system can:
- Manage a product catalogue (add/edit/delete/search products)
- Manage customers (register/update/delete customers)
- Place orders (creates an order, deducts stock, calculates total price)
- Cancel orders (restores stock automatically)

There is no frontend here — just an API that a frontend (React, mobile app, etc.) can call.

---

## 2. Tech Stack Explained

| Tool | What It Does |
|------|-------------|
| **FastAPI** | The web framework. Handles HTTP requests and routes them to your Python functions. |
| **PostgreSQL** | The database. Stores all data permanently. We use NeonDB (hosted Postgres). |
| **SQLAlchemy 2.0** | Lets you work with the database using Python classes instead of raw SQL. |
| **Alembic** | Manages database migrations — tracks changes to your table structure over time. |
| **Pydantic** | Validates request and response data. Ensures users send correct data types. |
| **python-dotenv** | Loads secrets (like database URL) from a `.env` file so they're not hardcoded. |
| **uvicorn** | The server that runs your FastAPI app. |

---

## 3. Project Structure

```
ether-assessment-backend/
├── app/
│   ├── main.py          ← App entry point. Creates FastAPI app, registers routers.
│   └── database.py      ← Database connection setup. Provides get_db() dependency.
├── models/
│   ├── base.py          ← Shared SQLAlchemy Base class all models inherit from.
│   ├── product.py       ← Product table definition.
│   ├── customer.py      ← Customer table definition.
│   ├── order.py         ← Order table definition.
│   └── order_item.py    ← OrderItem table definition (the lines inside an order).
├── schemas/
│   ├── product.py       ← Pydantic schemas for Product (what data comes in/out).
│   ├── customer.py      ← Pydantic schemas for Customer.
│   └── order.py         ← Pydantic schemas for Order.
├── routers/
│   ├── products.py      ← HTTP route handlers for /api/v1/products
│   ├── customers.py     ← HTTP route handlers for /api/v1/customers
│   └── orders.py        ← HTTP route handlers for /api/v1/orders
├── services/
│   ├── product_service.py   ← Business logic for products (DB queries, validations).
│   ├── customer_service.py  ← Business logic for customers.
│   └── order_service.py     ← Business logic for orders (stock deduction, totals).
├── alembic/
│   ├── env.py           ← Alembic config that connects to your DB.
│   └── versions/        ← Auto-generated migration files live here.
├── alembic.ini          ← Alembic settings file.
├── .env                 ← Your secrets (DATABASE_URL). Never commit this.
└── requirements.txt     ← All Python packages this project needs.
```

**Why this structure?** Each layer has one job:
- **models** = what the database looks like
- **schemas** = what the API accepts and returns
- **services** = the business rules
- **routers** = the URL definitions

This is called **clean architecture** or **separation of concerns**. It makes code easier to test, change, and understand.

---

## Step 1 — Set Up the Environment

### Create a virtual environment

A virtual environment keeps this project's packages separate from other Python projects on your machine.

```bash
python -m venv venv          # creates a venv/ folder
source venv/bin/activate     # macOS/Linux
# venv\Scripts\activate      # Windows
```

### Install dependencies

```bash
pip install fastapi "uvicorn[standard]" sqlalchemy alembic psycopg2-binary \
            pydantic pydantic-settings python-dotenv email-validator
```

Save them so others can install the same versions:

```bash
pip freeze > requirements.txt
```

Or just run `pip install -r requirements.txt` if requirements.txt already exists.

### Create a .env file

Never hardcode database credentials in your code. Put them in `.env`:

```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

This project uses NeonDB (a cloud Postgres provider). You get the URL from your NeonDB dashboard.

> **Important:** `.env` is listed in `.gitignore` so it never gets committed to git.

---

## Step 2 — Configure the Database Connection

**File: `app/database.py`**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import os
from dotenv import load_dotenv

load_dotenv()  # reads DATABASE_URL from .env into os.environ

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # checks connection is alive before using it
    pool_size=5,         # keep 5 connections open at all times
    max_overflow=10,     # allow 10 extra connections if needed
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db       # give the session to the route handler
    finally:
        db.close()     # always close it, even if an error happens
```

**What is `get_db()`?**

It is a FastAPI **dependency**. Instead of opening a database connection manually in every route, you declare `db: Session = Depends(get_db)` and FastAPI injects a fresh session automatically for each request, then closes it when done.

`pool_pre_ping=True` is important for cloud databases like NeonDB because idle connections can be dropped by the server. This option silently reconnects when that happens.

---

## Step 3 — Create the Base Model

**File: `models/base.py`**

```python
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass
```

This is a shared parent class. Every SQLAlchemy model inherits from `Base`. It is how SQLAlchemy knows which classes represent database tables.

In SQLAlchemy 2.0, you use `DeclarativeBase` instead of the older `declarative_base()` function. All models that inherit from `Base` will have their table metadata collected in `Base.metadata`, which Alembic uses to detect schema changes.

---

## Step 4 — Write SQLAlchemy Models

Models describe your database tables in Python. Each class = one table. Each attribute = one column.

### Product model

**File: `models/product.py`**

```python
from sqlalchemy import Integer, String, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base

class Product(Base):
    __tablename__ = "products"           # actual table name in Postgres

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    order_items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="product")
```

**Key concepts:**

- `Mapped[int]` — SQLAlchemy 2.0 style. The type hint tells Python what type this column holds.
- `mapped_column(...)` — configures the actual column (type, constraints, indexes).
- `Numeric(10, 2)` — stores price as a decimal with up to 10 digits, 2 after the decimal point. Never use `Float` for money — floating point arithmetic is imprecise.
- `unique=True` — SKU must be unique across all products.
- `index=True` — creates a database index on this column for faster lookups.
- `relationship(...)` — a logical link to the `OrderItem` model. Not a real column, just tells SQLAlchemy how to JOIN the tables.

### Customer model

**File: `models/customer.py`**

```python
class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    orders: Mapped[list["Order"]] = relationship("Order", back_populates="customer")
```

`phone: Mapped[str | None]` — the `| None` means this column is optional. The `nullable=True` in `mapped_column` mirrors that in the database.

### Order model

**File: `models/order.py`**

```python
class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    customer: Mapped["Customer"] = relationship("Customer", back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )
```

- `ForeignKey("customers.id", ondelete="RESTRICT")` — links `customer_id` to the `customers` table. `RESTRICT` means you cannot delete a customer who has orders.
- `server_default=func.now()` — the database sets `created_at` automatically when a row is inserted. You never need to pass it manually.
- `cascade="all, delete-orphan"` — if an Order is deleted, all its OrderItems are automatically deleted too.

### OrderItem model

**File: `models/order_item.py`**

```python
class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
```

`unit_price` stores the price **at the time of the order**. This is important — if the product price changes later, old orders should still show the original price.

---

## Step 5 — Write Pydantic Schemas

Schemas control what data the API accepts from users and what it sends back. They are separate from models because the database shape and the API shape are not always the same.

**The pattern used here:**
- `XxxBase` — shared fields
- `XxxCreate` — what the user sends to CREATE a record (inherits Base)
- `XxxUpdate` — what the user sends to UPDATE a record (all fields optional)
- `XxxResponse` — what the API sends back (includes `id`, etc.)

### Product schemas

**File: `schemas/product.py`**

```python
from pydantic import BaseModel, Field, ConfigDict
from decimal import Decimal

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=100)
    price: Decimal = Field(..., gt=0, decimal_places=2)  # gt=0 means > 0
    stock: int = Field(default=0, ge=0)                  # ge=0 means >= 0

class ProductCreate(ProductBase):
    pass  # same as Base — no extra fields needed

class ProductUpdate(BaseModel):
    # All fields are Optional (None by default) for partial updates
    name: str | None = Field(default=None, min_length=1, max_length=255)
    sku: str | None = Field(default=None, min_length=1, max_length=100)
    price: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    stock: int | None = Field(default=None, ge=0)

class ProductResponse(ProductBase):
    id: int
    model_config = ConfigDict(from_attributes=True)  # allows reading from SQLAlchemy objects
```

`from_attributes=True` (formerly `orm_mode=True`) tells Pydantic it can read data from SQLAlchemy model objects, not just dictionaries. Without this, the response serialization would fail.

`Field(..., gt=0)` — the `...` means the field is **required**. `gt=0` validates that price is greater than 0. This validation runs automatically before your function is even called.

### Order schemas

**File: `schemas/order.py`**

```python
class OrderItemCreate(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)

class OrderCreate(BaseModel):
    customer_id: int = Field(..., gt=0)
    items: list[OrderItemCreate] = Field(..., min_length=1)  # at least 1 item required
```

Notice `OrderCreate` does NOT include `total_amount`. The API calculates it from the items — the user should never send a price because they could lie about it.

---

## Step 6 — Write the Service Layer

Services contain the business logic. Routers just call services — they don't touch the database directly.

### Why have a service layer?

Without it, all logic lives in the router. That creates fat route functions that are hard to test and reuse. With services, you can call `product_service.create(db, payload)` from a router, from a test, or from another service.

### Product service (key functions)

**File: `services/product_service.py`**

```python
def create(db: Session, payload: ProductCreate) -> Product:
    # Check if SKU already exists before inserting
    existing = db.scalar(select(Product).where(Product.sku == payload.sku))
    if existing:
        raise HTTPException(status_code=409, detail="SKU already exists")

    product = Product(**payload.model_dump())  # convert Pydantic model → dict → SQLAlchemy model
    db.add(product)
    db.commit()
    db.refresh(product)  # reload from DB to get the auto-generated id
    return product
```

`payload.model_dump()` converts the Pydantic object into a plain Python dictionary. `**` unpacks it so `Product(name="Pen", sku="PEN-001", ...)` is called automatically.

`db.refresh(product)` is important — after `commit()`, the object in memory may be stale. `refresh()` re-reads it from the database so you get the correct `id`, `created_at`, etc.

### Order service — the interesting one

**File: `services/order_service.py`**

Creating an order involves multiple steps that must all succeed or all fail together:

```python
def create(db: Session, payload: OrderCreate) -> Order:
    # 1. Check customer exists
    customer = db.get(Customer, payload.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    total_amount = Decimal("0.00")
    order_items = []

    for item_data in payload.items:
        product = db.get(Product, item_data.product_id)

        # 2. Check product exists and has enough stock
        if product.stock < item_data.quantity:
            raise HTTPException(status_code=422, detail="Insufficient stock")

        unit_price = Decimal(str(product.price))
        total_amount += unit_price * item_data.quantity
        order_items.append(OrderItem(...))

    # 3. Create order row
    order = Order(customer_id=payload.customer_id, total_amount=total_amount)
    db.add(order)
    db.flush()  # write to DB but don't commit yet — gets us the order.id

    # 4. Create each order item row and deduct stock
    for item in order_items:
        item.order_id = order.id
        db.add(item)
        product = db.get(Product, item.product_id)
        product.stock -= item.quantity

    db.commit()  # commit everything at once — atomic!
```

**Why `db.flush()` before `db.commit()`?**

`flush()` sends the SQL to the database but doesn't finalize the transaction. This gives us `order.id` (auto-generated by the DB) so we can set it on each `OrderItem`. Then `commit()` finalizes everything in one atomic operation — if anything fails, the whole thing rolls back.

---

## Step 7 — Write the Routers

Routers map URLs to Python functions. They should be thin — just parse the request, call the service, return the response.

### Products router

**File: `routers/products.py`**

```python
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
def search_products(q: str | None = Query(default=None), ...):
    total, results = product_service.search(db, q=q, ...)
    return ProductSearchResponse(total=total, skip=skip, limit=limit, results=results)

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    return product_service.get_by_id(db, product_id)

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    return product_service.create(db, payload)
```

**Key things to notice:**

1. `APIRouter(prefix="/products")` — all routes in this file automatically start with `/products`. You don't repeat it on every function.

2. `tags=["Products"]` — groups these routes under a "Products" section in the Swagger docs.

3. `db: Session = Depends(get_db)` — FastAPI calls `get_db()` automatically and injects the session. You never call `get_db()` yourself.

4. `response_model=ProductResponse` — FastAPI uses this to serialize the return value. It also shows the schema in Swagger docs and strips any extra fields you don't want to expose.

5. `status_code=status.HTTP_201_CREATED` — POST returns 201 (resource created), not 200. This is correct HTTP semantics.

6. **`/search` is declared BEFORE `/{product_id}`** — this is critical. If it were after, FastAPI would try to match `"search"` as an integer id and return a 422 validation error.

---

## Step 8 — Wire Everything in main.py

**File: `app/main.py`**

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
# ↑ Adds the project root to Python's import path so "from routers import products" works
#   regardless of which directory you run uvicorn from.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import products, customers, orders

app = FastAPI(
    title="Inventory & Order Management API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # in production, restrict to your frontend domain
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register each router under /api/v1
app.include_router(products.router, prefix="/api/v1")
app.include_router(customers.router, prefix="/api/v1")
app.include_router(orders.router, prefix="/api/v1")

@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok"}
```

`app.include_router(products.router, prefix="/api/v1")` combines the global prefix `/api/v1` with the router's own prefix `/products`, resulting in URLs like `/api/v1/products/`.

**What is CORS?** When your browser app (on `localhost:3000`) talks to your API (on `localhost:8000`), the browser blocks the request by default because the origins differ. The `CORSMiddleware` tells the browser "this API allows cross-origin requests", unblocking it. `allow_origins=["*"]` means allow any domain — fine for development, tighten it in production.

---

## Step 9 — Set Up Alembic Migrations

Alembic tracks changes to your database schema over time, like Git does for code. When you add a column or a new table, you create a migration instead of manually running `ALTER TABLE`.

### Initialize Alembic

```bash
alembic init alembic
```

This creates the `alembic/` folder and `alembic.ini`.

### Configure alembic/env.py

This is the most important file. You need to tell Alembic where your database is and which models to inspect.

```python
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))  # add project root
from dotenv import load_dotenv
load_dotenv()

from models import Base   # import ALL models so Alembic can see all tables

config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])

target_metadata = Base.metadata  # tells Alembic what the schema should look like
```

**Why import all models in `models/__init__.py`?**

```python
# models/__init__.py
from models.product import Product
from models.customer import Customer
from models.order import Order
from models.order_item import OrderItem
```

When Alembic runs, it imports `Base` from `models`. Since `Base.metadata` only knows about tables from models that have been imported, you must import all models before Alembic compares the schema. If you forget one, Alembic won't generate the migration for it.

### Create and apply a migration

```bash
# Auto-detect all changes and generate a migration file
alembic revision --autogenerate -m "initial_schema"

# Apply all pending migrations to the database
alembic upgrade head
```

`--autogenerate` compares `Base.metadata` (your Python models) against the actual database and writes the SQL diff as a Python file in `alembic/versions/`.

`upgrade head` runs all migrations that haven't been applied yet.

### Other useful Alembic commands

```bash
alembic current          # see which migration is currently applied
alembic history          # list all migrations
alembic downgrade -1     # undo the last migration
alembic downgrade base   # undo ALL migrations (drop everything)
```

---

## Step 10 — Add the Search Feature

After the base CRUD was working, a search endpoint was added to products. Here is how it was built incrementally.

### 1. Add the service function

```python
# services/product_service.py

def search(db, q=None, min_price=None, max_price=None, min_stock=None, skip=0, limit=100):
    stmt = select(Product)

    if q:
        pattern = f"%{q}%"          # SQL LIKE pattern — % is a wildcard
        stmt = stmt.where(
            or_(
                Product.name.ilike(pattern),   # ilike = case-insensitive LIKE
                Product.sku.ilike(pattern),
            )
        )
    if min_price is not None:
        stmt = stmt.where(Product.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Product.price <= max_price)
    if min_stock is not None:
        stmt = stmt.where(Product.stock >= min_stock)

    # Count total BEFORE applying pagination
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    results = list(db.scalars(stmt.offset(skip).limit(limit)).all())
    return total, results
```

`ilike` does case-insensitive pattern matching. `%pen%` matches "Pen", "PEN", "pencil", "ballpen".

The total count is calculated before `offset/limit` so the caller knows how many total results exist — needed to build pagination controls on the frontend ("Page 1 of 5").

### 2. Add the response schema

```python
# schemas/product.py

class ProductSearchResponse(BaseModel):
    total: int
    skip: int
    limit: int
    results: list[ProductResponse]
```

Wrapping results in an envelope gives the frontend the total count alongside the page of results.

### 3. Add the route

```python
# routers/products.py

@router.get("/search", response_model=ProductSearchResponse)
def search_products(
    q: str | None = Query(default=None, description="Match on name or SKU"),
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    min_stock: int | None = Query(default=None, ge=0),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    total, results = product_service.search(db, q=q, ...)
    return ProductSearchResponse(total=total, skip=skip, limit=limit, results=results)
```

`Query(default=None, ge=0)` — query parameters are optional (default None). `ge=0` validates that if provided, the value must be >= 0. FastAPI validates this automatically before your function runs.

### Example search requests

```
GET /api/v1/products/search                            → all products (paginated)
GET /api/v1/products/search?q=pen                      → products named/skued "pen"
GET /api/v1/products/search?min_price=10&max_price=100 → products between ₹10–100
GET /api/v1/products/search?q=pen&min_stock=5          → "pen" products with stock >= 5
GET /api/v1/products/search?skip=20&limit=10           → page 3 (items 21–30)
```

---

## How a Request Flows End to End

Let's trace exactly what happens when someone calls `POST /api/v1/products/`:

```
HTTP Request: POST /api/v1/products/
Body: { "name": "Pen", "sku": "PEN-001", "price": 15.00, "stock": 100 }
```

**1. FastAPI receives the request**
   - It matches the URL to `create_product()` in `routers/products.py`

**2. Pydantic validates the body**
   - FastAPI deserializes the JSON into a `ProductCreate` Pydantic object
   - It checks: name is not empty, sku is not empty, price > 0, stock >= 0
   - If validation fails → automatically returns `422 Unprocessable Entity`

**3. FastAPI injects the database session**
   - `Depends(get_db)` calls `get_db()`, opens a DB session, passes it as `db`

**4. Router calls the service**
   ```python
   return product_service.create(db, payload)
   ```

**5. Service runs business logic**
   - Checks if SKU already exists → if yes, raises `409 Conflict`
   - Creates `Product(name="Pen", sku="PEN-001", price=15.00, stock=100)`
   - `db.add(product)` → stages the insert
   - `db.commit()` → executes `INSERT INTO products ...`
   - `db.refresh(product)` → loads the new `id` from DB

**6. Router returns the product**
   - FastAPI serializes it through `ProductResponse` schema
   - `from_attributes=True` reads the SQLAlchemy object as a dict

**7. HTTP Response**
   ```json
   HTTP 201 Created
   { "id": 1, "name": "Pen", "sku": "PEN-001", "price": "15.00", "stock": 100 }
   ```

**8. Session closes**
   - `get_db()` runs the `finally: db.close()` block

---

## Running the Server

```bash
# Activate your virtual environment first
source venv/bin/activate

# Start the server
uvicorn app.main:app --reload
```

`--reload` restarts the server automatically whenever you save a Python file. Use this in development only.

The server starts on `http://localhost:8000`.

**Swagger UI (interactive docs):** `http://localhost:8000/docs`
You can test every endpoint directly from the browser here — no Postman needed.

**ReDoc (alternative docs):** `http://localhost:8000/redoc`

### Complete list of endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/v1/products/` | List all products |
| GET | `/api/v1/products/search` | Search products with filters |
| GET | `/api/v1/products/{id}` | Get one product |
| POST | `/api/v1/products/` | Create a product |
| PATCH | `/api/v1/products/{id}` | Update a product (partial) |
| DELETE | `/api/v1/products/{id}` | Delete a product |
| GET | `/api/v1/customers/` | List all customers |
| GET | `/api/v1/customers/{id}` | Get one customer |
| POST | `/api/v1/customers/` | Create a customer |
| PATCH | `/api/v1/customers/{id}` | Update a customer |
| DELETE | `/api/v1/customers/{id}` | Delete a customer |
| GET | `/api/v1/orders/` | List all orders |
| GET | `/api/v1/orders/{id}` | Get one order |
| POST | `/api/v1/orders/` | Place an order |
| DELETE | `/api/v1/orders/{id}` | Cancel an order |

---

## Common Mistakes and How to Avoid Them

### 1. Forgetting `db.refresh()` after commit

```python
# Wrong
db.add(product)
db.commit()
return product  # id might be None or stale

# Correct
db.add(product)
db.commit()
db.refresh(product)  # reload from DB
return product
```

### 2. Putting `/search` after `/{id}` in the router

```python
# Wrong — FastAPI tries to cast "search" as an integer and returns 422
@router.get("/{product_id}")
@router.get("/search")   # ← never reached

# Correct — specific routes before dynamic ones
@router.get("/search")
@router.get("/{product_id}")
```

### 3. Using `Float` for money

```python
# Wrong — floating point imprecision
price: float   # 0.1 + 0.2 = 0.30000000000000004

# Correct — exact decimal arithmetic
from decimal import Decimal
price: Mapped[float] = mapped_column(Numeric(10, 2))  # stored as exact decimal in DB
```

### 4. Forgetting to import models in `models/__init__.py`

If you add a new model but don't import it in `__init__.py`, Alembic won't see it and won't generate a migration for it.

### 5. Committing `.env` to git

```bash
# Check .gitignore has this line:
.env

# Check what's staged before committing:
git status
```

### 6. Not using `exclude_unset=True` in PATCH endpoints

```python
# Wrong — sends all fields including None, overwriting existing data
updates = payload.model_dump()

# Correct — only sends fields the user actually provided
updates = payload.model_dump(exclude_unset=True)
```

### 7. Hardcoding the database URL

```python
# Wrong
engine = create_engine("postgresql://user:pass@host/db")

# Correct — read from environment
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
```

---

## Quick Reference: SQLAlchemy 2.0 Query Patterns

```python
from sqlalchemy import select, or_, func

# Get one by primary key
product = db.get(Product, product_id)

# Get one by condition
product = db.scalar(select(Product).where(Product.sku == "PEN-001"))

# Get all with filters
products = db.scalars(
    select(Product)
    .where(Product.price >= 10)
    .offset(0)
    .limit(20)
).all()

# Count rows
count = db.scalar(select(func.count()).select_from(Product))

# OR condition
stmt = select(Product).where(
    or_(Product.name.ilike("%pen%"), Product.sku.ilike("%pen%"))
)

# Load related objects (avoid N+1 queries)
from sqlalchemy.orm import selectinload
orders = db.scalars(
    select(Order).options(selectinload(Order.items))
).all()
```

---

That covers the entire project from zero to a working API. The pattern here — models → schemas → services → routers — scales well. Adding a new resource (e.g., a `Supplier`) means creating the same four files and registering the router in `main.py`.
