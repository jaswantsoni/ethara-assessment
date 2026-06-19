import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import products, customers, orders

app = FastAPI(
    title="Inventory & Order Management API",
    description="FastAPI backend for managing products, customers, and orders.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router, prefix="/api/v1")
app.include_router(customers.router, prefix="/api/v1")
app.include_router(orders.router, prefix="/api/v1")


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "Inventory & Order Management API is running"}
