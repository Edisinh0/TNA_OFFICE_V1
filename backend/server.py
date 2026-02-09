"""
TNA Office API - Backend FastAPI Completo
Versión: 2.0.0 - Corregido para Producción
Compatibilidad: cPanel con Phusion Passenger
"""

from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Any
from datetime import datetime, timezone, timedelta, date, time
import bcrypt
import jwt
import uuid
import os
import enum
import io
import logging
from contextlib import asynccontextmanager
from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, Text, DateTime, Date, Time, Enum, JSON, ForeignKey, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.pool import QueuePool
from dotenv import load_dotenv
from pathlib import Path
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.staticfiles import StaticFiles
# ============ CONFIGURACIÓN DE LOGGING ============

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ CARGAR VARIABLES DE ENTORNO ============

ROOT_DIR = Path(__file__).parent
env_path = ROOT_DIR / '.env'
if env_path.exists():
    load_dotenv(env_path)
    logger.info(f"Archivo .env cargado desde: {env_path}")
else:
    logger.warning(f"Archivo .env no encontrado en: {env_path}")

# ============ CONFIGURACIÓN ============

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("ERROR: La variable DATABASE_URL no está configurada en .env")

JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET or JWT_SECRET == 'cambia-esto-por-una-clave-muy-segura-y-larga':
    logger.warning("ADVERTENCIA: JWT_SECRET no está configurado o usa el valor por defecto. Cambiar en producción.")
    JWT_SECRET = 'tna-office-default-secret-change-in-production'

JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 24))

# ============ DATABASE SETUP ============

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=5,
    max_overflow=10,
    pool_recycle=3600,
    pool_pre_ping=True,  # Verifica conexiones antes de usarlas
    echo=False  # Cambiar a True para debug SQL
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Error en sesión de base de datos: {e}")
        db.rollback()
        raise
    finally:
        db.close()

# ============ ENUMS ============

class UserRole(str, enum.Enum):
    admin = "admin"
    comisionista = "comisionista"
    cliente = "cliente"

class OfficeStatus(str, enum.Enum):
    available = "available"
    occupied = "occupied"
    maintenance = "maintenance"

class BookingStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"

class TicketStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    cancelled = "cancelled"

class PaymentStatus(str, enum.Enum):
    pending = "pending"
    partial = "partial"
    paid = "paid"
    refunded = "refunded"

class CommissionStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"

class RequestStatus(str, enum.Enum):
    new = "new"
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"

class ServiceStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    suspended = "suspended"

class ParkingType(str, enum.Enum):
    parking = "parking"
    storage = "storage"

# ============ SQLALCHEMY MODELS ============

class ProfileDB(Base):
    __tablename__ = "profiles"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    allowed_modules = Column(JSON)
    is_system = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserDB(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.cliente)
    profile_id = Column(String(36), ForeignKey('profiles.id'))
    commission_percentage = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    profile = relationship("ProfileDB")

class CategoryDB(Base):
    __tablename__ = "categories"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    description = Column(Text)
    parent_id = Column(String(36), ForeignKey('categories.id'))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ProductDB(Base):
    __tablename__ = "products"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category_id = Column(String(36), ForeignKey('categories.id'))
    category = Column(String(100))
    base_price = Column(Float, default=0.0)
    sale_price = Column(Float, default=0.0)
    cost = Column(Float, default=0.0)
    unit = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    commission_percentage = Column(Float, default=0.0)
    min_order = Column(Integer, default=1)
    provider = Column(String(255), default='')
    image_url = Column(Text, default='')
    featured = Column(Boolean, default=False)
    featured_text = Column(String(255), default='')
    stock_control_enabled = Column(Boolean, default=False)
    current_stock = Column(Integer, default=0)
    min_stock_alert = Column(Integer, default=5)

class ClientDB(Base):
    __tablename__ = "clients"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_name = Column(String(255), nullable=False)
    rut = Column(String(20))
    business_type = Column(String(100))
    address = Column(Text)
    phone = Column(String(50))
    email = Column(String(255))
    contact_name = Column(String(255))
    contact_phone = Column(String(50))
    contact_email = Column(String(255))
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    documents = relationship("ClientDocumentDB", back_populates="client", cascade="all, delete-orphan")
    contacts = relationship("ClientContactDB", back_populates="client", cascade="all, delete-orphan")

class ClientDocumentDB(Base):
    __tablename__ = "client_documents"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String(36), ForeignKey('clients.id'), nullable=False)
    name = Column(String(255), nullable=False)
    file_url = Column(Text)
    document_type = Column(String(100))
    expiry_date = Column(Date)
    notifications_enabled = Column(Boolean, default=False)
    notification_days = Column(Integer, default=30)
    contract_start_date = Column(Date)
    contract_end_date = Column(Date)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    client = relationship("ClientDB", back_populates="documents")

class ClientContactDB(Base):
    __tablename__ = "client_contacts"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String(36), ForeignKey('clients.id'), nullable=False)
    name = Column(String(255), nullable=False)
    position = Column(String(255))
    phone = Column(String(50))
    email = Column(String(255))
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    client = relationship("ClientDB", back_populates="contacts")

class OfficeDB(Base):
    __tablename__ = "offices"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    office_number = Column(String(20), nullable=False)
    floor = Column(Integer)
    location = Column(String(100))
    square_meters = Column(Float)
    capacity = Column(Integer)
    status = Column(Enum(OfficeStatus), default=OfficeStatus.available)
    client_id = Column(String(36), ForeignKey('clients.id'))
    sale_value_uf = Column(Float, default=0.0)
    billed_value_uf = Column(Float, default=0.0)
    cost_uf = Column(Float, default=0.0)
    cost_difference_uf = Column(Float, default=0.0)
    contract_start = Column(Date)
    contract_end = Column(Date)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    client = relationship("ClientDB")

class ParkingStorageDB(Base):
    __tablename__ = "parking_storage"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    number = Column(String(20), nullable=False)
    type = Column(Enum(ParkingType), default=ParkingType.parking)
    location = Column(String(100))
    status = Column(Enum(OfficeStatus), default=OfficeStatus.available)
    client_id = Column(String(36), ForeignKey('clients.id'))
    sale_value_uf = Column(Float, default=0.0)
    billed_value_uf = Column(Float, default=0.0)
    cost_uf = Column(Float, default=0.0)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    client = relationship("ClientDB")

class RoomDB(Base):
    __tablename__ = "rooms"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    capacity = Column(Integer)
    hourly_rate = Column(Float, default=0.0)
    half_day_rate = Column(Float, default=0.0)
    full_day_rate = Column(Float, default=0.0)
    amenities = Column(JSON)
    color = Column(String(20))
    status = Column(String(20), default='active')
    blocks_rooms = Column(JSON)
    related_rooms = Column(JSON)
    image_url = Column(Text, default='')
    description = Column(Text, default='')
    created_at = Column(DateTime, default=datetime.utcnow)

class BoothDB(Base):
    __tablename__ = "booths"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    capacity = Column(Integer)
    hourly_rate = Column(Float, default=0.0)
    half_day_rate = Column(Float, default=0.0)
    full_day_rate = Column(Float, default=0.0)
    color = Column(String(20))
    status = Column(String(20), default='active')
    image_url = Column(Text, default='')
    description = Column(Text, default='')
    created_at = Column(DateTime, default=datetime.utcnow)

class BookingDB(Base):
    __tablename__ = "bookings"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    resource_type = Column(Enum('room', 'booth', name='resource_type_enum'), nullable=False)
    resource_id = Column(String(36), nullable=False)
    resource_name = Column(String(100))
    client_id = Column(String(36))
    client_name = Column(String(255), nullable=False)
    client_email = Column(String(255))
    client_phone = Column(String(50))
    date = Column(Date)
    start_time = Column(Time)
    end_time = Column(Time)
    duration_hours = Column(Float)
    total_price = Column(Float, default=0.0)
    status = Column(Enum('pending', 'confirmed', 'cancelled', 'completed', name='booking_status_enum'), default='pending')
    notes = Column(Text)
    created_by = Column(String(36))
    created_at = Column(DateTime, default=datetime.utcnow)

class MonthlyServiceCatalogDB(Base):
    __tablename__ = "monthly_services_catalog"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    base_price_uf = Column(Float, default=0.0)
    sale_value_uf = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class MonthlyServiceDB(Base):
    __tablename__ = "monthly_services"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    service_name = Column(String(255), nullable=False)
    category = Column(String(100))
    client_id = Column(String(36), ForeignKey('clients.id'))
    sale_value_uf = Column(Float, default=0.0)
    billed_value_uf = Column(Float, default=0.0)
    cost_uf = Column(Float, default=0.0)
    status = Column(Enum(ServiceStatus), default=ServiceStatus.active)
    start_date = Column(Date)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    client = relationship("ClientDB")

# ============ MODELOS DE TICKETS (ACTIVADOS) ============

class TicketDB(Base):
    __tablename__ = "tickets"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_number = Column(Integer, autoincrement=True, unique=True)
    client_id = Column(String(36), ForeignKey('clients.id'))
    client_name = Column(String(255), nullable=False)
    client_email = Column(String(255))
    ticket_date = Column(DateTime, default=datetime.utcnow)
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    total_commission = Column(Float, default=0.0)
    comisionista_id = Column(String(36), ForeignKey('users.id'))
    comisionista_name = Column(String(255))
    payment_status = Column(Enum('pending', 'paid', 'partial', 'refunded', name='payment_status_enum'), default='pending')
    payment_method = Column(String(50))
    payment_date = Column(DateTime)
    commission_status = Column(Enum('pending', 'paid', name='commission_status_enum'), default='pending')
    commission_paid_date = Column(DateTime)
    status = Column(Enum('pending', 'completed', 'cancelled', name='ticket_status_enum'), default='pending')
    notes = Column(Text)
    created_by = Column(String(36), ForeignKey('users.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    items = relationship("TicketItemDB", back_populates="ticket", cascade="all, delete-orphan")
    client = relationship("ClientDB")
    comisionista = relationship("UserDB", foreign_keys=[comisionista_id])

class TicketItemDB(Base):
    __tablename__ = "ticket_items"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id = Column(String(36), ForeignKey('tickets.id'), nullable=False)
    product_id = Column(String(36), ForeignKey('products.id'))
    product_name = Column(String(255), nullable=False)
    category = Column(String(100))
    description = Column(Text)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0)
    commission_percentage = Column(Float, default=0.0)
    commission_amount = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    ticket = relationship("TicketDB", back_populates="items")
    product = relationship("ProductDB")

class RequestDB(Base):
    __tablename__ = "requests"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_number = Column(Integer, autoincrement=True, unique=True)
    type = Column(String(50), default='contact')
    name = Column(String(255))
    client_name = Column(String(255))
    client_email = Column(String(255))
    email = Column(String(255))
    client_phone = Column(String(50))
    phone = Column(String(50))
    company = Column(String(255))
    company_name = Column(String(255))
    message = Column(Text)
    request_type = Column(String(100))
    description = Column(Text)
    source = Column(String(50))
    status = Column(Enum('new', 'pending', 'in_progress', 'completed', 'cancelled', 'confirmed', 'rejected', name='request_status_enum'), default='new')
    priority = Column(Enum('low', 'medium', 'high', name='request_priority_enum'), default='medium')
    assigned_to = Column(String(36))
    notes = Column(Text)
    details = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class QuoteDB(Base):
    __tablename__ = "quotes"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quote_number = Column(Integer, autoincrement=True, unique=True)
    client_id = Column(String(36), ForeignKey('clients.id'))
    client_name = Column(String(255))
    client_email = Column(String(255))
    client_phone = Column(String(50))
    company_name = Column(String(255))
    items = Column(JSON)
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    status = Column(Enum('draft', 'pre-cotizacion', 'sent', 'accepted', 'rejected', 'expired', name='quote_status_enum'), default='draft')
    valid_until = Column(Date)
    notes = Column(Text)
    created_by = Column(String(36))
    created_at = Column(DateTime, default=datetime.utcnow)

class QuoteTemplateDB(Base):
    __tablename__ = "quote_templates"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    content = Column(Text)
    variables = Column(JSON)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class SaleDB(Base):
    __tablename__ = "sales"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id = Column(String(36))
    product_id = Column(String(36))
    product_name = Column(String(255))
    category = Column(String(100))
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    sale_date = Column(Date)
    client_id = Column(String(36))
    client_name = Column(String(255))
    client_email = Column(String(255))
    comisionista_id = Column(String(36))
    comisionista_name = Column(String(255))
    commission_percentage = Column(Float, default=0.0)
    commission_amount = Column(Float, default=0.0)
    payment_status = Column(String(20), default='pending')
    commission_status = Column(String(20), default='pending')
    notes = Column(Text)
    created_by = Column(String(36))
    created_at = Column(DateTime, default=datetime.utcnow)

class FloorPlanCoordinateDB(Base):
    __tablename__ = "floor_plan_coordinates"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    office_id = Column(String(36), ForeignKey('offices.id'))
    office_number = Column(String(20))
    x = Column(Float)
    y = Column(Float)
    width = Column(Float)
    height = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

class InvoiceDB(Base):
    __tablename__ = "invoices"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_number = Column(String(50))
    ticket_id = Column(String(36))
    client_id = Column(String(36), ForeignKey('clients.id'))
    client_name = Column(String(255))
    items = Column(JSON)
    sales_ids = Column(JSON)
    issue_date = Column(Date)
    due_date = Column(Date)
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    status = Column(String(50), default='pending')
    invoiced_at = Column(DateTime)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

# ============ PYDANTIC MODELS ============

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "cliente"
    profile_id: Optional[str] = None
    commission_percentage: Optional[float] = 0.0

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role: Optional[str] = None
    profile_id: Optional[str] = None
    commission_percentage: Optional[float] = None
    password: Optional[str] = None

class ProfileCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    allowed_modules: List[str] = []

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    allowed_modules: Optional[List[str]] = None

class TicketCreate(BaseModel):
    items: List[dict]
    client_id: Optional[str] = None
    client_name: str
    client_email: Optional[str] = None
    comisionista_id: Optional[str] = None
    notes: Optional[str] = None

class TicketUpdate(BaseModel):
    items: Optional[List[dict]] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    comisionista_id: Optional[str] = None
    payment_status: Optional[str] = None
    payment_method: Optional[str] = None
    commission_status: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class BookingCreate(BaseModel):
    resource_type: str
    resource_id: str
    resource_name: str
    client_id: Optional[str] = None
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    total_price: Optional[float] = 0.0
    status: Optional[str] = "pending"
    notes: Optional[str] = None

class BookingUpdate(BaseModel):
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    resource_name: Optional[str] = None
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    total_price: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None

# ============ SECURITY ============

security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña contra su hash bcrypt"""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception as e:
        logger.error(f"Error verificando contraseña: {e}")
        return False

def get_password_hash(password: str) -> str:
    """Genera un hash bcrypt para una contraseña"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> UserDB:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido: falta identificador de usuario")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado. Por favor, inicia sesión nuevamente")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Token inválido: {str(e)}")

    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Usuario desactivado")
    return user

def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> Optional[UserDB]:
    """Obtiene el usuario actual si está autenticado, sino retorna None"""
    try:
        return get_current_user(credentials, db)
    except:
        return None

# ============ HELPER FUNCTIONS ============

def db_to_dict(obj, exclude: Optional[List[str]] = None) -> dict:
    """Convert SQLAlchemy object to dictionary"""
    if obj is None:
        return None
    exclude = exclude or []
    result = {}
    for column in obj.__table__.columns:
        if column.name not in exclude:
            value = getattr(obj, column.name)
            if isinstance(value, datetime):
                value = value.isoformat()
            elif isinstance(value, date):
                value = value.isoformat()
            elif isinstance(value, time):
                value = value.strftime("%H:%M")
            elif isinstance(value, timedelta):
                total_seconds = int(value.total_seconds())
                hours, remainder = divmod(total_seconds, 3600)
                minutes = remainder // 60
                value = f"{hours:02d}:{minutes:02d}"
            elif isinstance(value, enum.Enum):
                value = value.value
            result[column.name] = value
    return result

def parse_date(date_str: Optional[str]) -> Optional[date]:
    """Parsea una fecha string a objeto date"""
    if not date_str:
        return None
    try:
        if 'T' in date_str:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00')).date()
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except Exception as e:
        logger.warning(f"Error parseando fecha '{date_str}': {e}")
        return None

def parse_time(time_str: Optional[str]) -> Optional[time]:
    """Parsea una hora string a objeto time (formato: HH:MM o HH:MM:SS)"""
    if not time_str:
        return None
    try:
        if 'T' in time_str:  # ISO format
            return datetime.fromisoformat(time_str).time()
        # Intenta con HH:MM:SS
        try:
            return datetime.strptime(time_str, '%H:%M:%S').time()
        except:
            # Si falla, intenta con HH:MM
            return datetime.strptime(time_str, '%H:%M').time()
    except Exception as e:
        logger.warning(f"Error parseando hora '{time_str}': {e}")
        return None

# ============ CREAR TABLAS AL IMPORTAR EL MÓDULO ============
# Esto es necesario porque Passenger (WSGI) no ejecuta lifespan de ASGI
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Tablas de base de datos verificadas/creadas")
except Exception as e:
    logger.error(f"Error creando tablas: {e}")

# ============ APP SETUP ============

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Iniciando TNA Office API...")
    try:
        # Crear tablas si no existen
        Base.metadata.create_all(bind=engine)
        logger.info("Tablas de base de datos verificadas/creadas")
        # Test database connection
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Conexión a base de datos verificada")
    except Exception as e:
        logger.error(f"Error conectando a la base de datos: {e}")
    yield
    # Shutdown
    logger.info("Cerrando TNA Office API...")
    engine.dispose()

# --- MODIFICACIÓN EN SERVER.PY ---

# 1. Definición de la App sin rutas automáticas
app = FastAPI(
    title="TNA Office API",
    version="2.0.0",
    lifespan=lifespan,
    docs_url=None,     # Desactivado
    redoc_url=None,    # Desactivado
    openapi_url=None   # Desactivado
)



# CORS Configuration
cors_origins_str = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173')
cors_origins = [origin.strip() for origin in cors_origins_str.split(',') if origin.strip()]

# Middleware personalizado para manejar CORS en respuestas de error
class CORSErrorMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as e:
            logger.error(f"Error no manejado: {e}")
            origin = request.headers.get("origin", "")
            response = JSONResponse(
                status_code=500,
                content={"detail": "Error interno del servidor"}
            )
            if origin in cors_origins:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "*"
                response.headers["Access-Control-Allow-Headers"] = "*"
            return response



# Añadir middleware CORS (el orden es importante - este va primero)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Añadir middleware de errores CORS (se ejecuta después del CORS middleware)
app.add_middleware(CORSErrorMiddleware)

# Exception handler global para asegurar headers CORS en errores HTTP
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Excepción global capturada: {exc}")
    origin = request.headers.get("origin", "")
    response = JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor"}
    )
    if origin in cors_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    origin = request.headers.get("origin", "")
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )
    if origin in cors_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

api_router = APIRouter()

# ============ UF PROXY ENDPOINT ============

@api_router.get("/uf")
def get_uf_value():
    """Proxy para obtener el valor de la UF desde mindicador.cl"""
    import urllib.request
    import json as json_module
    try:
        req = urllib.request.Request('https://mindicador.cl/api/uf', headers={'User-Agent': 'TNA-Office/2.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json_module.loads(resp.read().decode())
            return data
    except Exception as e:
        logger.error(f"Error obteniendo valor UF: {e}")
        raise HTTPException(status_code=502, detail="No se pudo obtener el valor de la UF")

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.email == user_data.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if not verify_password(user_data.password, user.password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Usuario desactivado")

    token = create_access_token({"sub": user.id})
    user_dict = db_to_dict(user, exclude=['password'])

    if user.profile:
        user_dict['allowed_modules'] = user.profile.allowed_modules or []
    else:
        user_dict['allowed_modules'] = []

    logger.info(f"Usuario {user.email} inició sesión exitosamente")
    return {"token": token, "user": user_dict}

@api_router.post("/auth/register")
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(UserDB).filter(UserDB.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")

    new_user = UserDB(
        id=str(uuid.uuid4()),
        email=user_data.email,
        password=get_password_hash(user_data.password),
        name=user_data.name,
        role=user_data.role,
        profile_id=user_data.profile_id,
        commission_percentage=user_data.commission_percentage or 0.0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    logger.info(f"Nuevo usuario registrado: {new_user.email}")
    return db_to_dict(new_user, exclude=['password'])

@api_router.get("/auth/me")
def get_me(current_user: UserDB = Depends(get_current_user)):
    user_dict = db_to_dict(current_user, exclude=['password'])
    if current_user.profile:
        user_dict['allowed_modules'] = current_user.profile.allowed_modules or []
    return user_dict

# ============ PROFILES ENDPOINTS ============

AVAILABLE_MODULES = [
    'dashboard', 'resources', 'products', 'clients', 'offices',
    'parking-storage', 'monthly-services', 'quotes', 'comisionistas',
    'tickets', 'requests', 'reports', 'users'
]

@api_router.get("/profiles")
def get_profiles(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    profiles = db.query(ProfileDB).all()
    return [db_to_dict(p) for p in profiles]

@api_router.post("/profiles")
def create_profile(data: ProfileCreate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Solo administradores pueden crear perfiles")

    profile = ProfileDB(
        id=str(uuid.uuid4()),
        name=data.name,
        description=data.description,
        allowed_modules=data.allowed_modules
    )
    db.add(profile)
    db.commit()
    return db_to_dict(profile)

@api_router.put("/profiles/{profile_id}")
def update_profile(profile_id: str, data: ProfileUpdate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Solo administradores pueden editar perfiles")

    profile = db.query(ProfileDB).filter(ProfileDB.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")

    if data.name is not None:
        profile.name = data.name
    if data.description is not None:
        profile.description = data.description
    if data.allowed_modules is not None:
        profile.allowed_modules = data.allowed_modules

    db.commit()
    return db_to_dict(profile)

@api_router.delete("/profiles/{profile_id}")
def delete_profile(profile_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Solo administradores pueden eliminar perfiles")

    profile = db.query(ProfileDB).filter(ProfileDB.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    if profile.is_system:
        raise HTTPException(status_code=400, detail="No se puede eliminar un perfil del sistema")

    db.delete(profile)
    db.commit()
    return {"message": "Perfil eliminado"}

@api_router.get("/modules")
def get_modules(current_user: UserDB = Depends(get_current_user)):
    return [
        {"id": "dashboard", "name": "Dashboard", "description": "Panel principal"},
        {"id": "resources", "name": "Recursos", "description": "Salas y casetas"},
        {"id": "products", "name": "Productos", "description": "Catálogo"},
        {"id": "clients", "name": "Clientes", "description": "Gestión de clientes"},
        {"id": "offices", "name": "Oficinas", "description": "Gestión de oficinas"},
        {"id": "parking-storage", "name": "Estacionamientos", "description": "Estacionamientos y bodegas"},
        {"id": "monthly-services", "name": "Servicios Mensuales", "description": "Servicios recurrentes"},
        {"id": "quotes", "name": "Cotizaciones", "description": "Cotizaciones"},
        {"id": "comisionistas", "name": "Comisionistas", "description": "Comisionistas"},
        {"id": "tickets", "name": "Ventas", "description": "Ventas"},
        {"id": "requests", "name": "Solicitudes", "description": "Solicitudes"},
        {"id": "reports", "name": "Reportes", "description": "Reportes"},
        {"id": "users", "name": "Usuarios", "description": "Usuarios y perfiles"}
    ]

# ============ USERS ENDPOINTS ============

@api_router.get("/users")
def get_users(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Solo administradores pueden ver usuarios")

    users = db.query(UserDB).all()
    result = []
    for user in users:
        user_dict = db_to_dict(user, exclude=['password'])
        if user.profile:
            user_dict['profile_name'] = user.profile.name
            user_dict['allowed_modules'] = user.profile.allowed_modules or []
        result.append(user_dict)
    return result

@api_router.get("/users/{user_id}")
def get_user(user_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user_dict = db_to_dict(user, exclude=['password'])
    if user.profile:
        user_dict['profile_name'] = user.profile.name
        user_dict['allowed_modules'] = user.profile.allowed_modules or []
    else:
        user_dict['allowed_modules'] = AVAILABLE_MODULES if user.role == 'admin' else []
    return user_dict

@api_router.put("/users/{user_id}")
def update_user(user_id: str, data: UserUpdate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.role != 'admin' and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="No tienes permisos para editar este usuario")

    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if data.email is not None:
        user.email = data.email
    if data.name is not None:
        user.name = data.name
    if data.role is not None and current_user.role == 'admin':
        user.role = data.role
    if data.profile_id is not None and current_user.role == 'admin':
        user.profile_id = data.profile_id if data.profile_id else None
    if data.commission_percentage is not None:
        user.commission_percentage = data.commission_percentage
    if data.password:
        user.password = get_password_hash(data.password)

    db.commit()
    return db_to_dict(user, exclude=['password'])

@api_router.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Solo administradores pueden eliminar usuarios")
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")

    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    db.delete(user)
    db.commit()
    return {"message": "Usuario eliminado"}

# ============ CLIENTS ENDPOINTS ============

@api_router.get("/clients")
def get_clients(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    clients = db.query(ClientDB).filter(ClientDB.is_active == True).all()
    result = []
    for client in clients:
        client_dict = db_to_dict(client)
        client_dict['documents'] = [db_to_dict(d) for d in client.documents]
        client_dict['contacts'] = [db_to_dict(c) for c in client.contacts]
        result.append(client_dict)
    return result

@api_router.post("/clients")
def create_client(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    client = ClientDB(
        id=str(uuid.uuid4()),
        company_name=data.get('company_name'),
        rut=data.get('rut'),
        business_type=data.get('business_type'),
        address=data.get('address'),
        phone=data.get('phone'),
        email=data.get('email'),
        contact_name=data.get('contact_name'),
        contact_phone=data.get('contact_phone'),
        contact_email=data.get('contact_email'),
        notes=data.get('notes')
    )
    db.add(client)
    db.commit()
    return db_to_dict(client)

@api_router.get("/clients/{client_id}")
def get_client(client_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    client = db.query(ClientDB).filter(ClientDB.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    client_dict = db_to_dict(client)
    client_dict['documents'] = [db_to_dict(d) for d in client.documents]
    client_dict['contacts'] = [db_to_dict(c) for c in client.contacts]
    return client_dict

@api_router.put("/clients/{client_id}")
def update_client(client_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    client = db.query(ClientDB).filter(ClientDB.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    for key, value in data.items():
        if hasattr(client, key) and key != 'id':
            setattr(client, key, value)

    db.commit()
    return db_to_dict(client)

@api_router.delete("/clients/{client_id}")
def delete_client(client_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    client = db.query(ClientDB).filter(ClientDB.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    client.is_active = False
    db.commit()
    return {"message": "Cliente eliminado"}

# ============ CLIENT DOCUMENTS ENDPOINTS ============

@api_router.post("/clients/{client_id}/documents")
def add_client_document(client_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    client = db.query(ClientDB).filter(ClientDB.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    doc = ClientDocumentDB(
        id=str(uuid.uuid4()),
        client_id=client_id,
        name=data.get('name'),
        file_url=data.get('file_url'),
        document_type=data.get('document_type'),
        expiry_date=parse_date(data.get('expiry_date')),
        notifications_enabled=data.get('notifications_enabled', False),
        notification_days=data.get('notification_days', 30),
        contract_start_date=parse_date(data.get('contract_start_date')),
        contract_end_date=parse_date(data.get('contract_end_date')),
        notes=data.get('notes')
    )
    db.add(doc)
    db.commit()
    return db_to_dict(doc)

@api_router.put("/clients/{client_id}/documents/{document_id}")
def update_client_document(client_id: str, document_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    doc = db.query(ClientDocumentDB).filter(ClientDocumentDB.id == document_id, ClientDocumentDB.client_id == client_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    for key, value in data.items():
        if hasattr(doc, key) and key != 'id':
            if key in ['expiry_date', 'contract_start_date', 'contract_end_date']:
                value = parse_date(value)
            setattr(doc, key, value)

    db.commit()
    return db_to_dict(doc)

@api_router.delete("/clients/{client_id}/documents/{document_id}")
def delete_client_document(client_id: str, document_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    doc = db.query(ClientDocumentDB).filter(ClientDocumentDB.id == document_id, ClientDocumentDB.client_id == client_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    db.delete(doc)
    db.commit()
    return {"message": "Documento eliminado"}

# ============ CLIENT CONTACTS ENDPOINTS ============

@api_router.post("/clients/{client_id}/contacts")
def add_client_contact(client_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    client = db.query(ClientDB).filter(ClientDB.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    contact = ClientContactDB(
        id=str(uuid.uuid4()),
        client_id=client_id,
        name=data.get('name'),
        position=data.get('position'),
        phone=data.get('phone'),
        email=data.get('email'),
        is_primary=data.get('is_primary', False)
    )
    db.add(contact)
    db.commit()
    return db_to_dict(contact)

@api_router.put("/clients/{client_id}/contacts/{contact_id}")
def update_client_contact(client_id: str, contact_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    contact = db.query(ClientContactDB).filter(ClientContactDB.id == contact_id, ClientContactDB.client_id == client_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

    for key, value in data.items():
        if hasattr(contact, key) and key != 'id':
            setattr(contact, key, value)

    db.commit()
    return db_to_dict(contact)

@api_router.delete("/clients/{client_id}/contacts/{contact_id}")
def delete_client_contact(client_id: str, contact_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    contact = db.query(ClientContactDB).filter(ClientContactDB.id == contact_id, ClientContactDB.client_id == client_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

    db.delete(contact)
    db.commit()
    return {"message": "Contacto eliminado"}

# ============ OFFICES ENDPOINTS ============

@api_router.get("/offices")
def get_offices(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    offices = db.query(OfficeDB).all()
    result = []
    for office in offices:
        office_dict = db_to_dict(office)
        if office.client:
            office_dict['client_name'] = office.client.company_name
        # Ensure status is consistent with client assignment
        if office.client_id and office_dict.get('status') != 'occupied':
            office_dict['status'] = 'occupied'
        elif not office.client_id and office_dict.get('status') != 'available':
            office_dict['status'] = 'available'
        # Calculate margin percentage
        if office.billed_value_uf and office.billed_value_uf > 0:
            margin = ((office.billed_value_uf - office.cost_uf) / office.billed_value_uf) * 100
            office_dict['margin_percentage'] = round(margin, 2)
        else:
            office_dict['margin_percentage'] = 0
        result.append(office_dict)
    return result

@api_router.post("/offices")
def create_office(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    client_id = data.get('client_id')
    status = 'occupied' if client_id else 'available'
    office = OfficeDB(
        id=str(uuid.uuid4()),
        office_number=data.get('office_number'),
        floor=data.get('floor'),
        location=data.get('location'),
        square_meters=data.get('square_meters'),
        capacity=data.get('capacity'),
        status=status,
        client_id=client_id,
        sale_value_uf=data.get('sale_value_uf', 0),
        billed_value_uf=data.get('billed_value_uf', 0),
        cost_uf=data.get('cost_uf', 0),
        contract_start=parse_date(data.get('contract_start')),
        contract_end=parse_date(data.get('contract_end')),
        notes=data.get('notes')
    )
    db.add(office)
    db.commit()
    return db_to_dict(office)

@api_router.put("/offices/{office_id}")
def update_office(office_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    office = db.query(OfficeDB).filter(OfficeDB.id == office_id).first()
    if not office:
        raise HTTPException(status_code=404, detail="Oficina no encontrada")

    for key, value in data.items():
        if hasattr(office, key) and key != 'id':
            if key in ['contract_start', 'contract_end']:
                value = parse_date(value)
            setattr(office, key, value)

    # Auto-set status based on client assignment
    if office.client_id:
        office.status = 'occupied'
    else:
        office.status = 'available'

    db.commit()
    return db_to_dict(office)

@api_router.delete("/offices/{office_id}")
def delete_office(office_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    office = db.query(OfficeDB).filter(OfficeDB.id == office_id).first()
    if not office:
        raise HTTPException(status_code=404, detail="Oficina no encontrada")

    db.delete(office)
    db.commit()
    return {"message": "Oficina eliminada"}

@api_router.get("/offices/public/all")
def get_public_offices_all(db: Session = Depends(get_db)):
    offices = db.query(OfficeDB).all()
    return [db_to_dict(o) for o in offices]

# ============ PARKING STORAGE ENDPOINTS ============

@api_router.get("/parking-storage")
def get_parking_storage(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    items = db.query(ParkingStorageDB).all()
    result = []
    for item in items:
        item_dict = db_to_dict(item)
        if item.client:
            item_dict['client_name'] = item.client.company_name
        result.append(item_dict)
    return result

@api_router.post("/parking-storage")
def create_parking_storage(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    item = ParkingStorageDB(
        id=str(uuid.uuid4()),
        number=data.get('number'),
        type=data.get('type', 'parking'),
        location=data.get('location'),
        status=data.get('status', 'available'),
        client_id=data.get('client_id'),
        sale_value_uf=data.get('sale_value_uf', 0),
        billed_value_uf=data.get('billed_value_uf', 0),
        cost_uf=data.get('cost_uf', 0)
    )
    db.add(item)
    db.commit()
    return db_to_dict(item)

@api_router.put("/parking-storage/{item_id}")
def update_parking_storage(item_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    item = db.query(ParkingStorageDB).filter(ParkingStorageDB.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    for key, value in data.items():
        if hasattr(item, key) and key != 'id':
            setattr(item, key, value)

    db.commit()
    return db_to_dict(item)

@api_router.delete("/parking-storage/{item_id}")
def delete_parking_storage(item_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    item = db.query(ParkingStorageDB).filter(ParkingStorageDB.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    db.delete(item)
    db.commit()
    return {"message": "Item eliminado"}

# ============ ROOMS ENDPOINTS ============

@api_router.get("/rooms/public")
def get_rooms_public(db: Session = Depends(get_db)):
    """Endpoint público para obtener salas (sin autenticación)"""
    rooms = db.query(RoomDB).filter(RoomDB.status == 'active').all()
    return [db_to_dict(r) for r in rooms]

@api_router.get("/rooms")
def get_rooms(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    rooms = db.query(RoomDB).filter(RoomDB.status == 'active').all()
    return [db_to_dict(r) for r in rooms]

@api_router.post("/rooms")
def create_room(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    room = RoomDB(
        id=str(uuid.uuid4()),
        name=data.get('name'),
        capacity=data.get('capacity'),
        hourly_rate=data.get('hourly_rate', 0),
        half_day_rate=data.get('half_day_rate', 0),
        full_day_rate=data.get('full_day_rate', 0),
        amenities=data.get('amenities'),
        color=data.get('color'),
        blocks_rooms=data.get('blocks_rooms'),
        related_rooms=data.get('related_rooms'),
        image_url=data.get('image_url', ''),
        description=data.get('description', '')
    )
    db.add(room)
    db.commit()
    return db_to_dict(room)

@api_router.put("/rooms/{room_id}")
def update_room(room_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    room = db.query(RoomDB).filter(RoomDB.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    for key, value in data.items():
        if hasattr(room, key) and key != 'id':
            setattr(room, key, value)

    db.commit()
    return db_to_dict(room)

@api_router.delete("/rooms/{room_id}")
def delete_room(room_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    room = db.query(RoomDB).filter(RoomDB.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    room.status = 'inactive'
    db.commit()
    return {"message": "Sala eliminada"}

# ============ BOOTHS ENDPOINTS ============

@api_router.get("/booths/public")
def get_booths_public(db: Session = Depends(get_db)):
    """Endpoint público para obtener casetas (sin autenticación)"""
    booths = db.query(BoothDB).filter(BoothDB.status == 'active').all()
    return [db_to_dict(b) for b in booths]

@api_router.get("/booths")
def get_booths(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    booths = db.query(BoothDB).filter(BoothDB.status == 'active').all()
    return [db_to_dict(b) for b in booths]

@api_router.post("/booths")
def create_booth(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    booth = BoothDB(
        id=str(uuid.uuid4()),
        name=data.get('name'),
        capacity=data.get('capacity'),
        hourly_rate=data.get('hourly_rate', 0),
        half_day_rate=data.get('half_day_rate', 0),
        full_day_rate=data.get('full_day_rate', 0),
        color=data.get('color'),
        image_url=data.get('image_url', ''),
        description=data.get('description', '')
    )
    db.add(booth)
    db.commit()
    return db_to_dict(booth)

@api_router.put("/booths/{booth_id}")
def update_booth(booth_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    booth = db.query(BoothDB).filter(BoothDB.id == booth_id).first()
    if not booth:
        raise HTTPException(status_code=404, detail="Caseta no encontrada")

    for key, value in data.items():
        if hasattr(booth, key) and key != 'id':
            setattr(booth, key, value)

    db.commit()
    return db_to_dict(booth)

# ============ BOOKINGS ENDPOINTS ============

@api_router.get("/bookings")
def get_bookings(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    bookings = db.query(BookingDB).all()
    result = []
    for b in bookings:
        booking_dict = db_to_dict(b)
        # Agregar campos combinados para el calendario del frontend
        if b.date and b.start_time:
            booking_dict['start_datetime'] = f"{b.date.isoformat()}T{b.start_time.strftime('%H:%M:%S')}"
        if b.date and b.end_time:
            booking_dict['end_datetime'] = f"{b.date.isoformat()}T{b.end_time.strftime('%H:%M:%S')}"
        result.append(booking_dict)
    return result

@api_router.post("/bookings")
def create_booking(data: BookingCreate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    try:
        # Extraer fecha de start_time si date no se proporciona
        booking_date = parse_date(data.date)
        if not booking_date and data.start_time and 'T' in data.start_time:
            booking_date = parse_date(data.start_time)

        booking = BookingDB(
            id=str(uuid.uuid4()),
            resource_type=data.resource_type,
            resource_id=data.resource_id,
            resource_name=data.resource_name,
            client_id=data.client_id,
            client_name=data.client_name,
            client_email=data.client_email,
            client_phone=data.client_phone,
            date=booking_date,
            start_time=parse_time(data.start_time),
            end_time=parse_time(data.end_time),
            status=data.status,
            total_price=data.total_price,
            notes=data.notes,
            created_by=current_user.id
        )
        db.add(booking)
        db.commit()
        db.refresh(booking)
        return db_to_dict(booking)
    except Exception as e:
        db.rollback()
        logger.error(f"Error creando booking: {e}")
        raise HTTPException(status_code=500, detail=f"Error creando reserva: {str(e)}")

@api_router.put("/bookings/{booking_id}")
def update_booking(booking_id: str, data: BookingUpdate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    try:
        booking = db.query(BookingDB).filter(BookingDB.id == booking_id).first()
        if not booking:
            raise HTTPException(status_code=404, detail="Reserva no encontrada")

        # Actualizar solo los campos que fueron proporcionados
        if data.resource_type is not None:
            booking.resource_type = data.resource_type
        if data.resource_id is not None:
            booking.resource_id = data.resource_id
        if data.resource_name is not None:
            booking.resource_name = data.resource_name
        if data.client_id is not None:
            booking.client_id = data.client_id
        if data.client_name is not None:
            booking.client_name = data.client_name
        if data.client_email is not None:
            booking.client_email = data.client_email
        if data.client_phone is not None:
            booking.client_phone = data.client_phone
        if data.date is not None:
            booking.date = parse_date(data.date)
        if data.start_time is not None:
            booking.start_time = parse_time(data.start_time)
            # Si start_time contiene fecha (formato ISO), también actualizar el campo date
            if 'T' in data.start_time:
                booking.date = parse_date(data.start_time)
        if data.end_time is not None:
            booking.end_time = parse_time(data.end_time)
        if data.total_price is not None:
            booking.total_price = data.total_price
        if data.status is not None:
            booking.status = data.status
        if data.notes is not None:
            booking.notes = data.notes

        db.commit()
        db.refresh(booking)

        # Agregar campos combinados para el frontend
        result = db_to_dict(booking)
        if booking.date and booking.start_time:
            result['start_datetime'] = f"{booking.date.isoformat()}T{booking.start_time.strftime('%H:%M:%S')}"
        if booking.date and booking.end_time:
            result['end_datetime'] = f"{booking.date.isoformat()}T{booking.end_time.strftime('%H:%M:%S')}"
        return result
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error actualizando booking: {e}")
        raise HTTPException(status_code=500, detail=f"Error actualizando reserva: {str(e)}")

@api_router.delete("/bookings/{booking_id}")
def delete_booking(booking_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    booking = db.query(BookingDB).filter(BookingDB.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    db.delete(booking)
    db.commit()
    return {"message": "Reserva eliminada"}

@api_router.get("/bookings/public/{resource_type}/{resource_id}")
def get_public_bookings(resource_type: str, resource_id: str, db: Session = Depends(get_db)):
    bookings = db.query(BookingDB).filter(
        BookingDB.resource_type == resource_type,
        BookingDB.resource_id == resource_id,
        BookingDB.status != 'cancelled'
    ).all()
    return [db_to_dict(b) for b in bookings]

# ============ PRODUCTS ENDPOINTS ============

@api_router.get("/products")
def get_products(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    products = db.query(ProductDB).filter(ProductDB.is_active == True).all()
    result = []
    for p in products:
        d = db_to_dict(p)
        d['cost_price'] = d.get('cost', 0) or 0
        result.append(d)
    return result

@api_router.post("/products")
def create_product(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    product = ProductDB(
        id=str(uuid.uuid4()),
        name=data.get('name'),
        description=data.get('description', ''),
        category_id=data.get('category_id'),
        category=data.get('category'),
        base_price=data.get('base_price', 0),
        sale_price=data.get('sale_price') or data.get('base_price', 0),
        cost=data.get('cost_price', data.get('cost', 0)),
        unit=data.get('unit'),
        commission_percentage=data.get('commission_percentage', 0),
        min_order=data.get('min_order', 1),
        provider=data.get('provider', ''),
        image_url=data.get('image_url', ''),
        featured=data.get('featured', False),
        featured_text=data.get('featured_text', ''),
        stock_control_enabled=data.get('stock_control_enabled', False),
        current_stock=data.get('current_stock', 0),
        min_stock_alert=data.get('min_stock_alert', 5)
    )
    db.add(product)
    db.commit()
    result = db_to_dict(product)
    result['cost_price'] = result.get('cost', 0)
    return result

@api_router.put("/products/{product_id}")
def update_product(product_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Map cost_price to cost
    if 'cost_price' in data:
        data['cost'] = data.pop('cost_price')

    for key, value in data.items():
        if hasattr(product, key) and key != 'id':
            setattr(product, key, value)

    db.commit()
    result = db_to_dict(product)
    result['cost_price'] = result.get('cost', 0)
    return result

@api_router.delete("/products/{product_id}")
def delete_product(product_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    product.is_active = False
    db.commit()
    return {"message": "Producto eliminado"}

@api_router.post("/products/{product_id}/toggle-stock-control")
def toggle_stock_control(product_id: str, enabled: bool = True, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    product.stock_control_enabled = enabled
    if not enabled:
        product.current_stock = 0
    db.commit()
    result = db_to_dict(product)
    result['cost_price'] = result.get('cost', 0) or 0
    return result

@api_router.post("/products/{product_id}/add-stock")
def add_stock(product_id: str, quantity: int = 1, notes: str = '', db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if not product.stock_control_enabled:
        raise HTTPException(status_code=400, detail="El control de stock no está habilitado para este producto")
    product.current_stock = (product.current_stock or 0) + quantity
    db.commit()
    result = db_to_dict(product)
    result['cost_price'] = result.get('cost', 0) or 0
    return result

@api_router.get("/products/public")
def get_public_products(db: Session = Depends(get_db)):
    products = db.query(ProductDB).filter(ProductDB.is_active == True).all()
    result = []
    for p in products:
        d = db_to_dict(p)
        d['cost_price'] = d.get('cost', 0) or 0
        result.append(d)
    return result

# ============ CATEGORIES ENDPOINTS ============

@api_router.get("/categories")
def get_categories(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    categories = db.query(CategoryDB).all()
    return [db_to_dict(c) for c in categories]

@api_router.post("/categories")
def create_category(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    category = CategoryDB(
        id=str(uuid.uuid4()),
        name=data.get('name'),
        description=data.get('description'),
        parent_id=data.get('parent_id')
    )
    db.add(category)
    db.commit()
    return db_to_dict(category)

@api_router.get("/categories/public")
def get_public_categories(db: Session = Depends(get_db)):
    categories = db.query(CategoryDB).all()
    return [db_to_dict(c) for c in categories]

# ============ MONTHLY SERVICES ENDPOINTS ============

@api_router.get("/monthly-services")
def get_monthly_services(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    services = db.query(MonthlyServiceDB).all()
    result = []
    for service in services:
        service_dict = db_to_dict(service)
        if service.client:
            service_dict['client_name'] = service.client.company_name
        result.append(service_dict)
    return result

@api_router.post("/monthly-services")
def create_monthly_service(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    service = MonthlyServiceDB(
        id=str(uuid.uuid4()),
        service_name=data.get('service_name'),
        category=data.get('category'),
        client_id=data.get('client_id'),
        sale_value_uf=data.get('sale_value_uf', 0),
        billed_value_uf=data.get('billed_value_uf', 0),
        cost_uf=data.get('cost_uf', 0),
        status=data.get('status', 'active'),
        start_date=parse_date(data.get('start_date')),
        notes=data.get('notes')
    )
    db.add(service)
    db.commit()
    return db_to_dict(service)

@api_router.put("/monthly-services/{service_id}")
def update_monthly_service(service_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    service = db.query(MonthlyServiceDB).filter(MonthlyServiceDB.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    for key, value in data.items():
        if hasattr(service, key) and key != 'id':
            if key == 'start_date':
                value = parse_date(value)
            setattr(service, key, value)

    db.commit()
    return db_to_dict(service)

@api_router.delete("/monthly-services/{service_id}")
def delete_monthly_service(service_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    service = db.query(MonthlyServiceDB).filter(MonthlyServiceDB.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    db.delete(service)
    db.commit()
    return {"message": "Servicio eliminado"}

@api_router.get("/monthly-services-catalog")
def get_monthly_services_catalog(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    catalog = db.query(MonthlyServiceCatalogDB).filter(MonthlyServiceCatalogDB.is_active == True).all()
    return [db_to_dict(c) for c in catalog]

# ============ TICKETS ENDPOINTS (COMPLETOS) ============

@api_router.get("/tickets")
def get_tickets(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    """Obtiene todos los tickets con sus items"""
    try:
        tickets = db.query(TicketDB).order_by(TicketDB.ticket_date.desc()).all()
        result = []
        for ticket in tickets:
            ticket_dict = db_to_dict(ticket)
            ticket_dict['items'] = [db_to_dict(item) for item in ticket.items]
            result.append(ticket_dict)
        return result
    except Exception as e:
        logger.error(f"Error obteniendo tickets: {e}")
        raise HTTPException(status_code=500, detail=f"Error al obtener tickets: {str(e)}")

@api_router.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    """Obtiene un ticket específico por ID"""
    ticket = db.query(TicketDB).filter(TicketDB.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    ticket_dict = db_to_dict(ticket)
    ticket_dict['items'] = [db_to_dict(item) for item in ticket.items]
    return ticket_dict

@api_router.post("/tickets")
def create_ticket(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    """Crea un nuevo ticket de venta"""
    try:
        # Validate required fields
        if not data.get('items') or len(data.get('items', [])) == 0:
            raise HTTPException(status_code=400, detail="El ticket debe tener al menos un item")

        client_name = data.get('client_name', '').strip()
        if not client_name:
            raise HTTPException(status_code=400, detail="El nombre del cliente es requerido")

        # Get comisionista info if provided
        comisionista_name = None
        commission_percentage = 0.0
        if data.get('comisionista_id'):
            comisionista = db.query(UserDB).filter(UserDB.id == data['comisionista_id']).first()
            if comisionista:
                comisionista_name = comisionista.name
                commission_percentage = comisionista.commission_percentage or 0.0

        # Create ticket
        ticket = TicketDB(
            id=str(uuid.uuid4()),
            client_id=data.get('client_id'),
            client_name=client_name,
            client_email=data.get('client_email', ''),
            comisionista_id=data.get('comisionista_id'),
            comisionista_name=comisionista_name,
            notes=data.get('notes', ''),
            created_by=current_user.id
        )
        db.add(ticket)
        db.flush()  # Get ticket ID

        # Process items
        total_amount = 0.0
        total_commission = 0.0

        for item_data in data.get('items', []):
            product_id = item_data.get('product_id')
            quantity = int(item_data.get('quantity', 1))

            # Get product info
            product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
            if product:
                unit_price = product.sale_price or product.base_price or 0
                product_name = product.name
                category = product.category or ''
            else:
                unit_price = float(item_data.get('unit_price', 0))
                product_name = item_data.get('product_name', 'Producto')
                category = item_data.get('category', '')

            subtotal = quantity * unit_price
            commission_amount = subtotal * (commission_percentage / 100)

            ticket_item = TicketItemDB(
                id=str(uuid.uuid4()),
                ticket_id=ticket.id,
                product_id=product_id,
                product_name=product_name,
                category=category,
                quantity=quantity,
                unit_price=unit_price,
                subtotal=subtotal,
                commission_percentage=commission_percentage,
                commission_amount=commission_amount
            )
            db.add(ticket_item)

            total_amount += subtotal
            total_commission += commission_amount

        # Update ticket totals
        ticket.total_amount = total_amount
        ticket.total_commission = total_commission

        db.commit()
        db.refresh(ticket)

        ticket_dict = db_to_dict(ticket)
        ticket_dict['items'] = [db_to_dict(item) for item in ticket.items]

        logger.info(f"Ticket #{ticket.ticket_number} creado exitosamente por {current_user.email}")
        return ticket_dict

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creando ticket: {e}")
        raise HTTPException(status_code=500, detail=f"Error al crear ticket: {str(e)}")

@api_router.put("/tickets/{ticket_id}")
def update_ticket(ticket_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    """Actualiza un ticket existente"""
    try:
        ticket = db.query(TicketDB).filter(TicketDB.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")

        # Update basic fields
        if data.get('client_name'):
            ticket.client_name = data['client_name']
        if 'client_email' in data:
            ticket.client_email = data['client_email']
        if 'notes' in data:
            ticket.notes = data['notes']
        if 'status' in data:
            ticket.status = data['status']

        # Update comisionista if changed
        if 'comisionista_id' in data:
            if data['comisionista_id']:
                comisionista = db.query(UserDB).filter(UserDB.id == data['comisionista_id']).first()
                if comisionista:
                    ticket.comisionista_id = comisionista.id
                    ticket.comisionista_name = comisionista.name
            else:
                ticket.comisionista_id = None
                ticket.comisionista_name = None

        # If items are provided, recreate them
        if 'items' in data and data['items']:
            # Delete existing items
            db.query(TicketItemDB).filter(TicketItemDB.ticket_id == ticket_id).delete()

            # Get commission percentage
            commission_percentage = 0.0
            if ticket.comisionista_id:
                comisionista = db.query(UserDB).filter(UserDB.id == ticket.comisionista_id).first()
                if comisionista:
                    commission_percentage = comisionista.commission_percentage or 0.0

            total_amount = 0.0
            total_commission = 0.0

            for item_data in data['items']:
                product_id = item_data.get('product_id')
                quantity = int(item_data.get('quantity', 1))

                product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
                if product:
                    unit_price = product.sale_price or product.base_price or 0
                    product_name = product.name
                    category = product.category or ''
                else:
                    unit_price = float(item_data.get('unit_price', 0))
                    product_name = item_data.get('product_name', 'Producto')
                    category = item_data.get('category', '')

                subtotal = quantity * unit_price
                commission_amount = subtotal * (commission_percentage / 100)

                ticket_item = TicketItemDB(
                    id=str(uuid.uuid4()),
                    ticket_id=ticket.id,
                    product_id=product_id,
                    product_name=product_name,
                    category=category,
                    quantity=quantity,
                    unit_price=unit_price,
                    subtotal=subtotal,
                    commission_percentage=commission_percentage,
                    commission_amount=commission_amount
                )
                db.add(ticket_item)

                total_amount += subtotal
                total_commission += commission_amount

            ticket.total_amount = total_amount
            ticket.total_commission = total_commission

        db.commit()
        db.refresh(ticket)

        ticket_dict = db_to_dict(ticket)
        ticket_dict['items'] = [db_to_dict(item) for item in ticket.items]
        return ticket_dict

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error actualizando ticket: {e}")
        raise HTTPException(status_code=500, detail=f"Error al actualizar ticket: {str(e)}")

@api_router.delete("/tickets/{ticket_id}")
def delete_ticket(ticket_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    """Elimina un ticket"""
    ticket = db.query(TicketDB).filter(TicketDB.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    db.delete(ticket)
    db.commit()
    logger.info(f"Ticket #{ticket.ticket_number} eliminado por {current_user.email}")
    return {"message": "Ticket eliminado"}

@api_router.put("/tickets/{ticket_id}/payment")
def update_ticket_payment(ticket_id: str, payment_status: str, payment_method: Optional[str] = None, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    """Actualiza el estado de pago de un ticket"""
    ticket = db.query(TicketDB).filter(TicketDB.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    ticket.payment_status = payment_status
    if payment_method:
        ticket.payment_method = payment_method
    if payment_status == 'paid':
        ticket.payment_date = datetime.utcnow()
        ticket.status = 'completed'

    db.commit()

    ticket_dict = db_to_dict(ticket)
    ticket_dict['items'] = [db_to_dict(item) for item in ticket.items]
    return ticket_dict

@api_router.put("/tickets/{ticket_id}/commission")
def update_ticket_commission(ticket_id: str, commission_status: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    """Actualiza el estado de comisión de un ticket"""
    ticket = db.query(TicketDB).filter(TicketDB.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    ticket.commission_status = commission_status
    if commission_status == 'paid':
        ticket.commission_paid_date = datetime.utcnow()

    db.commit()

    ticket_dict = db_to_dict(ticket)
    ticket_dict['items'] = [db_to_dict(item) for item in ticket.items]
    return ticket_dict

# ============ REQUESTS ENDPOINTS ============

@api_router.get("/requests")
def get_requests(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    requests = db.query(RequestDB).order_by(RequestDB.created_at.desc()).all()
    return [db_to_dict(r) for r in requests]

@api_router.post("/requests")
def create_request(data: dict, db: Session = Depends(get_db)):
    request = RequestDB(
        id=str(uuid.uuid4()),
        type=data.get('type', 'contact'),
        name=data.get('name'),
        client_name=data.get('client_name') or data.get('name'),
        email=data.get('email'),
        client_email=data.get('client_email') or data.get('email'),
        phone=data.get('phone'),
        client_phone=data.get('client_phone') or data.get('phone'),
        company=data.get('company'),
        company_name=data.get('company_name') or data.get('company'),
        message=data.get('message'),
        request_type=data.get('request_type', 'contact'),
        description=data.get('description'),
        source=data.get('source'),
        details=data.get('details'),
        notes=data.get('notes'),
        status='new'
    )
    db.add(request)
    db.commit()
    return db_to_dict(request)

@api_router.put("/requests/{request_id}")
def update_request(request_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    request = db.query(RequestDB).filter(RequestDB.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    for key, value in data.items():
        if hasattr(request, key) and key != 'id':
            setattr(request, key, value)

    db.commit()
    return db_to_dict(request)

@api_router.get("/requests/count")
def get_requests_count(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    count = db.query(RequestDB).filter(RequestDB.status == 'new').count()
    return {"count": count}

# ============ QUOTES ENDPOINTS ============

@api_router.get("/quotes")
def get_quotes(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    quotes = db.query(QuoteDB).order_by(QuoteDB.created_at.desc()).all()
    return [db_to_dict(q) for q in quotes]

@api_router.get("/quotes/pending/count")
def get_pending_quotes_count(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    count = db.query(QuoteDB).filter(QuoteDB.status == 'draft').count()
    return {"count": count}

@api_router.get("/quotes/pending-count")
def get_pending_quotes_count_alt(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    count = db.query(QuoteDB).filter(QuoteDB.status.in_(['draft', 'pre-cotizacion'])).count()
    return {"count": count}

@api_router.get("/quotes/{quote_id}")
def get_quote(quote_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    quote = db.query(QuoteDB).filter(QuoteDB.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    return db_to_dict(quote)

@api_router.post("/quotes")
def create_quote(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    items_data = data.get('items', [])

    quote = QuoteDB(
        id=str(uuid.uuid4()),
        client_id=data.get('client_id'),
        client_name=data.get('client_name'),
        client_email=data.get('client_email'),
        client_phone=data.get('client_phone'),
        company_name=data.get('client_company') or data.get('company_name'),
        items=items_data,
        status=data.get('status', 'draft'),
        valid_until=parse_date(data.get('valid_until')),
        subtotal=data.get('subtotal', 0),
        tax=data.get('tax', 0),
        total=data.get('total', 0),
        notes=data.get('notes'),
        created_by=current_user.id
    )
    db.add(quote)
    db.commit()
    return db_to_dict(quote)

@api_router.put("/quotes/{quote_id}")
def update_quote(quote_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    quote = db.query(QuoteDB).filter(QuoteDB.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    for key, value in data.items():
        if hasattr(quote, key) and key not in ['id']:
            if key == 'valid_until':
                value = parse_date(value)
            setattr(quote, key, value)

    db.commit()
    return db_to_dict(quote)

@api_router.delete("/quotes/{quote_id}")
def delete_quote(quote_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    quote = db.query(QuoteDB).filter(QuoteDB.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    db.delete(quote)
    db.commit()
    return {"message": "Cotización eliminada"}

@api_router.post("/quotes/public")
def create_public_quote(data: dict, db: Session = Depends(get_db)):
    quote = QuoteDB(
        id=str(uuid.uuid4()),
        client_name=data.get('client_name'),
        client_email=data.get('client_email'),
        client_phone=data.get('client_phone'),
        company_name=data.get('client_company'),
        status='pre-cotizacion',
        notes=data.get('message')
    )
    db.add(quote)

    request = RequestDB(
        id=str(uuid.uuid4()),
        type='quote',
        name=data.get('client_name'),
        email=data.get('client_email'),
        phone=data.get('client_phone'),
        company=data.get('client_company'),
        message=data.get('message'),
        source='fanpage',
        status='new'
    )
    db.add(request)

    db.commit()
    return db_to_dict(quote)

# ============ INVOICES ENDPOINTS ============

@api_router.get("/invoices")
def get_invoices(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    invoices = db.query(InvoiceDB).order_by(InvoiceDB.created_at.desc()).all()
    return [db_to_dict(i) for i in invoices]

@api_router.get("/invoices/pending")
def get_pending_invoices(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    invoices = db.query(InvoiceDB).filter(InvoiceDB.status.in_(['draft', 'pending', 'sent'])).all()
    return [db_to_dict(i) for i in invoices]

@api_router.get("/invoices/history")
def get_invoice_history(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    invoices = db.query(InvoiceDB).filter(InvoiceDB.status == 'invoiced').order_by(InvoiceDB.invoiced_at.desc()).all()
    return [db_to_dict(i) for i in invoices]

@api_router.post("/invoices")
def create_invoice(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    invoice = InvoiceDB(
        id=str(uuid.uuid4()),
        invoice_number=data.get('invoice_number', f"INV-{datetime.now().strftime('%Y%m%d%H%M%S')}"),
        ticket_id=data.get('ticket_id'),
        client_id=data.get('client_id'),
        client_name=data.get('client_name'),
        items=data.get('items'),
        sales_ids=data.get('sales_ids'),
        issue_date=parse_date(data.get('issue_date')),
        due_date=parse_date(data.get('due_date')),
        subtotal=data.get('subtotal', 0),
        tax=data.get('tax', 0),
        total_amount=data.get('total_amount') or data.get('total', 0),
        status=data.get('status', 'pending'),
        notes=data.get('notes')
    )
    db.add(invoice)
    db.commit()
    return db_to_dict(invoice)

@api_router.put("/invoices/{invoice_id}/status")
def update_invoice_status(invoice_id: str, status: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    invoice = db.query(InvoiceDB).filter(InvoiceDB.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    invoice.status = status
    if status == 'invoiced':
        invoice.invoiced_at = datetime.utcnow()

    db.commit()
    return db_to_dict(invoice)

# ============ SALES ENDPOINTS ============

@api_router.get("/sales")
def get_sales(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    sales = db.query(SaleDB).order_by(SaleDB.sale_date.desc()).all()
    return [db_to_dict(s) for s in sales]

@api_router.post("/sales")
def create_sale(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    # Get product info
    product_id = data.get('product_id')
    product = db.query(ProductDB).filter(ProductDB.id == product_id).first()

    if product:
        product_name = product.name
        category = product.category or ''
        unit_price = product.sale_price or product.base_price or 0
    else:
        product_name = data.get('product_name', 'Producto')
        category = data.get('category', '')
        unit_price = float(data.get('unit_price', 0))

    quantity = int(data.get('quantity', 1))
    total_amount = quantity * unit_price

    # Get comisionista info
    comisionista_name = None
    commission_percentage = 0.0
    commission_amount = 0.0

    if data.get('comisionista_id'):
        comisionista = db.query(UserDB).filter(UserDB.id == data['comisionista_id']).first()
        if comisionista:
            comisionista_name = comisionista.name
            commission_percentage = comisionista.commission_percentage or 0.0
            commission_amount = total_amount * (commission_percentage / 100)

    sale = SaleDB(
        id=str(uuid.uuid4()),
        product_id=product_id,
        product_name=product_name,
        category=category,
        quantity=quantity,
        unit_price=unit_price,
        total_amount=total_amount,
        sale_date=date.today(),
        client_name=data.get('client_name', ''),
        client_email=data.get('client_email', ''),
        comisionista_id=data.get('comisionista_id'),
        comisionista_name=comisionista_name,
        commission_percentage=commission_percentage,
        commission_amount=commission_amount,
        notes=data.get('notes', ''),
        created_by=current_user.id
    )
    db.add(sale)
    db.commit()
    return db_to_dict(sale)

@api_router.put("/sales/{sale_id}/payment")
def update_sale_payment(sale_id: str, payment_status: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    sale = db.query(SaleDB).filter(SaleDB.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    sale.payment_status = payment_status
    db.commit()
    return db_to_dict(sale)

@api_router.put("/sales/{sale_id}/commission")
def update_sale_commission(sale_id: str, commission_status: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    sale = db.query(SaleDB).filter(SaleDB.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    sale.commission_status = commission_status
    db.commit()
    return db_to_dict(sale)

# ============ REPORTS ENDPOINTS ============

@api_router.get("/reports/{report_type}/excel")
def generate_report_excel(report_type: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    """Genera reportes en formato Excel"""
    try:
        import csv

        if report_type == 'sales':
            # Generate sales report
            tickets = db.query(TicketDB).order_by(TicketDB.ticket_date.desc()).all()

            output = io.StringIO()
            writer = csv.writer(output)

            # Header
            writer.writerow([
                'Numero Ticket', 'Fecha', 'Cliente', 'Email', 'Producto', 'Categoria',
                'Cantidad', 'Precio Unitario', 'Subtotal', 'Comisionista', 'Comision',
                'Estado Pago', 'Metodo Pago', 'Estado Comision'
            ])

            # Data
            for ticket in tickets:
                for item in ticket.items:
                    writer.writerow([
                        ticket.ticket_number,
                        ticket.ticket_date.strftime('%Y-%m-%d') if ticket.ticket_date else '',
                        ticket.client_name,
                        ticket.client_email or '',
                        item.product_name,
                        item.category or '',
                        item.quantity,
                        item.unit_price,
                        item.subtotal,
                        ticket.comisionista_name or '',
                        item.commission_amount,
                        ticket.payment_status,
                        ticket.payment_method or '',
                        ticket.commission_status
                    ])

            content = output.getvalue()
            output.close()

            return Response(
                content=content.encode('utf-8-sig'),
                media_type='text/csv',
                headers={
                    'Content-Disposition': f'attachment; filename=ventas_tna_office_{datetime.now().strftime("%Y%m%d")}.csv'
                }
            )

        elif report_type == 'commissions':
            # Generate commissions report
            comisionistas = db.query(UserDB).filter(UserDB.role == 'comisionista').all()

            output = io.StringIO()
            writer = csv.writer(output)

            # Header
            writer.writerow([
                'Comisionista', 'Email', 'Porcentaje Comision', 'Total Ventas',
                'Total Comisiones', 'Comisiones Pendientes', 'Comisiones Pagadas'
            ])

            # Data
            for comisionista in comisionistas:
                tickets = db.query(TicketDB).filter(TicketDB.comisionista_id == comisionista.id).all()
                total_ventas = sum(t.total_amount for t in tickets)
                total_comisiones = sum(t.total_commission for t in tickets)
                comisiones_pendientes = sum(t.total_commission for t in tickets if t.commission_status == 'pending')
                comisiones_pagadas = sum(t.total_commission for t in tickets if t.commission_status == 'paid')

                writer.writerow([
                    comisionista.name,
                    comisionista.email,
                    comisionista.commission_percentage,
                    total_ventas,
                    total_comisiones,
                    comisiones_pendientes,
                    comisiones_pagadas
                ])

            content = output.getvalue()
            output.close()

            return Response(
                content=content.encode('utf-8-sig'),
                media_type='text/csv',
                headers={
                    'Content-Disposition': f'attachment; filename=comisiones_tna_office_{datetime.now().strftime("%Y%m%d")}.csv'
                }
            )
        else:
            raise HTTPException(status_code=400, detail=f"Tipo de reporte no válido: {report_type}")

    except Exception as e:
        logger.error(f"Error generando reporte {report_type}: {e}")
        raise HTTPException(status_code=500, detail=f"Error generando reporte: {str(e)}")

# ============ COMISIONISTAS ENDPOINTS ============

@api_router.get("/comisionistas")
def get_comisionistas(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    comisionistas = db.query(UserDB).filter(UserDB.role == 'comisionista', UserDB.is_active == True).all()
    return [db_to_dict(c, exclude=['password']) for c in comisionistas]

# ============ DASHBOARD STATS ============

@api_router.get("/dashboard/stats")
def get_dashboard_stats_full(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    try:
        total_clients = db.query(ClientDB).filter(ClientDB.is_active == True).count()
        total_offices = db.query(OfficeDB).count()
        occupied_offices = db.query(OfficeDB).filter(OfficeDB.status == 'occupied').count()
        available_offices = db.query(OfficeDB).filter(OfficeDB.status == 'available').count()

        total_billed = db.query(func.sum(OfficeDB.billed_value_uf)).scalar() or 0
        total_cost = db.query(func.sum(OfficeDB.cost_uf)).scalar() or 0

        total_parking = db.query(ParkingStorageDB).filter(ParkingStorageDB.type == 'parking').count()
        occupied_parking = db.query(ParkingStorageDB).filter(ParkingStorageDB.type == 'parking', ParkingStorageDB.status == 'occupied').count()
        total_storage = db.query(ParkingStorageDB).filter(ParkingStorageDB.type == 'storage').count()
        occupied_storage = db.query(ParkingStorageDB).filter(ParkingStorageDB.type == 'storage', ParkingStorageDB.status == 'occupied').count()

        new_requests = db.query(RequestDB).filter(RequestDB.status == 'new').count()
        pending_quotes = db.query(QuoteDB).filter(QuoteDB.status.in_(['draft', 'pre-cotizacion'])).count()

        return {
            "total_clients": total_clients,
            "total_offices": total_offices,
            "occupied_offices": occupied_offices,
            "available_offices": available_offices,
            "occupancy_rate": round((occupied_offices / total_offices * 100) if total_offices > 0 else 0, 1),
            "total_billed_uf": float(total_billed),
            "total_cost_uf": float(total_cost),
            "margin_uf": float(total_billed - total_cost),
            "total_parking": total_parking,
            "occupied_parking": occupied_parking,
            "total_storage": total_storage,
            "occupied_storage": occupied_storage,
            "new_requests": new_requests,
            "pending_quotes": pending_quotes
        }
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas: {e}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo estadísticas: {str(e)}")

@api_router.get("/stats/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    return get_dashboard_stats_full(db, current_user)

# ============ CONTRACTS EXPIRING SOON ============

@api_router.get("/contracts/expiring-soon")
def get_expiring_contracts(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    today = date.today()
    threshold = today + timedelta(days=30)
    expired_threshold = today - timedelta(days=90)  # Show expired up to 90 days ago

    expiring = []

    # Check offices - expiring soon
    offices = db.query(OfficeDB).filter(
        OfficeDB.contract_end != None,
        OfficeDB.contract_end <= threshold,
        OfficeDB.contract_end >= expired_threshold
    ).all()

    for office in offices:
        client_name = office.client.company_name if office.client else "Sin cliente"
        days_remaining = (office.contract_end - today).days if office.contract_end else 0
        expiring.append({
            "type": "office",
            "id": office.id,
            "name": f"Oficina {office.office_number}",
            "client_name": client_name,
            "client_id": office.client_id if office.client else None,
            "expiry_date": office.contract_end.isoformat() if office.contract_end else None,
            "days_remaining": days_remaining,
            "status": "expired" if days_remaining < 0 else ("critical" if days_remaining <= 7 else "expiring")
        })

    # Check client documents with notifications enabled
    # Use each document's notification_days setting for threshold
    from sqlalchemy import or_

    documents = db.query(ClientDocumentDB).filter(
        ClientDocumentDB.notifications_enabled == True,
        or_(
            ClientDocumentDB.expiry_date != None,
            ClientDocumentDB.contract_end_date != None
        )
    ).all()

    for doc in documents:
        check_date = doc.contract_end_date or doc.expiry_date
        if not check_date:
            continue
        days_remaining = (check_date - today).days
        doc_threshold_days = doc.notification_days or 30
        # Show if within notification window or expired up to 90 days ago
        if days_remaining <= doc_threshold_days and days_remaining >= -90:
            client_name = doc.client.company_name if doc.client else "Sin cliente"
            expiring.append({
                "type": "document",
                "id": doc.id,
                "name": doc.name,
                "client_name": client_name,
                "client_id": doc.client_id,
                "expiry_date": check_date.isoformat() if check_date else None,
                "days_remaining": days_remaining,
                "status": "expired" if days_remaining < 0 else ("critical" if days_remaining <= 7 else "expiring")
            })

    return sorted(expiring, key=lambda x: x.get('days_remaining', 999))

# ============ FLOOR PLAN ENDPOINTS ============

@api_router.get("/floor-plan-coordinates")
def get_floor_plan_coordinates(db: Session = Depends(get_db)):
    coords = db.query(FloorPlanCoordinateDB).all()
    return {"coordinates": {c.office_number: db_to_dict(c) for c in coords}}

@api_router.post("/floor-plan-coordinates")
def save_floor_plan_coordinates(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Solo administradores pueden editar el plano")

    db.query(FloorPlanCoordinateDB).delete()

    for office_num, coord in data.get('coordinates', {}).items():
        new_coord = FloorPlanCoordinateDB(
            id=str(uuid.uuid4()),
            office_number=office_num,
            x=coord.get('x'),
            y=coord.get('y'),
            width=coord.get('width'),
            height=coord.get('height')
        )
        db.add(new_coord)

    db.commit()
    return {"message": "Coordenadas guardadas"}

@api_router.get("/floor-plan/coordinates")
def get_floor_plan_coords_legacy(db: Session = Depends(get_db)):
    return get_floor_plan_coordinates(db)

@api_router.post("/floor-plan/coordinates")
def save_floor_plan_coords_legacy(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    return save_floor_plan_coordinates(data, db, current_user)

# ============ TEMPLATES ENDPOINTS ============

@api_router.get("/templates")
def get_templates(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    templates = db.query(QuoteTemplateDB).all()
    return [db_to_dict(t) for t in templates]

@api_router.post("/templates")
def create_template(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    template = QuoteTemplateDB(
        id=str(uuid.uuid4()),
        name=data.get('name'),
        content=data.get('content'),
        variables=data.get('variables'),
        is_default=data.get('is_default', False)
    )
    db.add(template)
    db.commit()
    return db_to_dict(template)

@api_router.get("/templates/{template_id}")
def get_template(template_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    template = db.query(QuoteTemplateDB).filter(QuoteTemplateDB.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    return db_to_dict(template)

@api_router.put("/templates/{template_id}")
def update_template(template_id: str, data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    template = db.query(QuoteTemplateDB).filter(QuoteTemplateDB.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    for key, value in data.items():
        if hasattr(template, key) and key != 'id':
            setattr(template, key, value)

    db.commit()
    return db_to_dict(template)

@api_router.delete("/templates/{template_id}")
def delete_template(template_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    template = db.query(QuoteTemplateDB).filter(QuoteTemplateDB.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    db.delete(template)
    db.commit()
    return {"message": "Plantilla eliminada"}

# ============ SEED ENDPOINTS ============

@api_router.post("/seed-profiles")
def seed_profiles(db: Session = Depends(get_db)):
    existing = db.query(ProfileDB).count()
    if existing > 0:
        return {"message": "Perfiles ya existen"}

    admin_profile = ProfileDB(
        id=str(uuid.uuid4()),
        name="ADMIN",
        description="Administrador con acceso total",
        allowed_modules=AVAILABLE_MODULES,
        is_system=True
    )

    receptionist_profile = ProfileDB(
        id=str(uuid.uuid4()),
        name="Recepcionista",
        description="Acceso a módulos de atención",
        allowed_modules=["dashboard", "resources", "requests", "tickets", "clients"],
        is_system=False
    )

    db.add(admin_profile)
    db.add(receptionist_profile)
    db.commit()

    admin_user = db.query(UserDB).filter(UserDB.role == 'admin').first()
    if admin_user:
        admin_user.profile_id = admin_profile.id
        db.commit()

    return {"message": "Perfiles creados", "profiles": [admin_profile.name, receptionist_profile.name]}

@api_router.api_route("/seed", methods=["GET", "POST"])
def seed_database(db: Session = Depends(get_db)):
    existing_profiles = db.query(ProfileDB).count()
    if existing_profiles == 0:
        admin_profile = ProfileDB(
            id=str(uuid.uuid4()),
            name="ADMIN",
            description="Administrador con acceso total",
            allowed_modules=AVAILABLE_MODULES,
            is_system=True
        )
        receptionist_profile = ProfileDB(
            id=str(uuid.uuid4()),
            name="Recepcionista",
            description="Acceso a módulos de atención",
            allowed_modules=["dashboard", "resources", "requests", "tickets", "clients"],
            is_system=False
        )
        db.add(admin_profile)
        db.add(receptionist_profile)
        db.commit()

    existing_admin = db.query(UserDB).filter(UserDB.email == 'admin@tnaoffice.cl').first()
    if not existing_admin:
        admin_profile = db.query(ProfileDB).filter(ProfileDB.name == 'ADMIN').first()
        admin_user = UserDB(
            id=str(uuid.uuid4()),
            email='admin@tnaoffice.cl',
            password=get_password_hash('admin123'),
            name='Administrador',
            role='admin',
            profile_id=admin_profile.id if admin_profile else None
        )
        db.add(admin_user)
        db.commit()

    return {"message": "Base de datos inicializada"}

# ============ REGISTER ROUTER ============

app.include_router(api_router)

# ============ HEALTH CHECK ============

@app.get("/health")
def health_check():
    return {"status": "healthy", "database": "MariaDB", "version": "2.0.0"}

@app.get("/debug-db")
def debug_db():
    """Endpoint temporal para diagnosticar problemas de conexión a DB. ELIMINAR EN PRODUCCIÓN."""
    import traceback
    result = {"database_url_preview": DATABASE_URL[:30] + "...", "steps": []}
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        result["steps"].append("Conexión: OK")
    except Exception as e:
        result["steps"].append(f"Conexión: FALLÓ - {str(e)}")
        result["traceback"] = traceback.format_exc()
        return result
    try:
        Base.metadata.create_all(bind=engine)
        result["steps"].append("Crear tablas: OK")
    except Exception as e:
        result["steps"].append(f"Crear tablas: FALLÓ - {str(e)}")
        result["traceback"] = traceback.format_exc()
        return result
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            tables = conn.execute(text("SHOW TABLES")).fetchall()
        result["steps"].append(f"Tablas encontradas: {[t[0] for t in tables]}")
    except Exception as e:
        result["steps"].append(f"Listar tablas: FALLÓ - {str(e)}")
    return result

@app.get("/")
def root():
    return {"message": "TNA Office API v2.0.0", "status": "running"}
    

# ============ ENTRY POINT ============

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('PORT', 8001))
    host = os.environ.get('HOST', '0.0.0.0')
    uvicorn.run(app, host=host, port=port)


